#!/usr/bin/env python3
"""
Incrementally pulls new T20I, IPL, and SA20 match data from cricsheet.org
and inserts it into cricket_assistant.db.

Only processes match files that are NOT already in the database, so it is
safe to run as often as you like.

Usage
-----
  cd backend/
  source venv/bin/activate
  python scripts/update_db.py

Cron (see scripts/update.sh for the shell wrapper)
"""

import csv
import json
import logging
import sqlite3
import tempfile
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

# ── Config ─────────────────────────────────────────────────────────────────────

# On Fly.io the volume is at /data; locally falls back to backend/cricket_assistant.db
import os
_default_db = Path(__file__).resolve().parent.parent / "cricket_assistant.db"
DB_PATH     = Path(os.environ.get("DATABASE_URL", str(_default_db)))
ETAG_FILE  = Path(__file__).resolve().parent / ".etags.json"

SOURCES = {
    "IPL":  "https://cricsheet.org/downloads/ipl_male_json.zip",
    "SA20": "https://cricsheet.org/downloads/sat_male_json.zip",
    "T20I": "https://cricsheet.org/downloads/t20s_male_json.zip",
}

PEOPLE_URL = "https://cricsheet.org/register/people.csv"

# ── ETag cache ────────────────────────────────────────────────────────────────

def _load_etags() -> dict:
    if ETAG_FILE.exists():
        return json.loads(ETAG_FILE.read_text())
    return {}


def _save_etags(etags: dict):
    ETAG_FILE.write_text(json.dumps(etags, indent=2))


def _download_if_changed(url: str, dest: Path, saved: dict) -> bool:
    """
    Conditional GET using ETag / Last-Modified.
    Returns True if a fresh file was downloaded, False if server said 304.
    `saved` is the dict entry for this URL from the etag cache (mutated in-place).
    """
    req = urllib.request.Request(url)
    if saved.get("etag"):
        req.add_header("If-None-Match", saved["etag"])
    if saved.get("last_modified"):
        req.add_header("If-Modified-Since", saved["last_modified"])

    try:
        with urllib.request.urlopen(req) as resp:
            dest.write_bytes(resp.read())
            saved["etag"]          = resp.headers.get("ETag") or saved.get("etag")
            saved["last_modified"] = resp.headers.get("Last-Modified") or saved.get("last_modified")
            return True
    except urllib.error.HTTPError as exc:
        if exc.code == 304:
            return False
        raise


# ── Logging ────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)


# ── DB helpers ─────────────────────────────────────────────────────────────────

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def existing_match_ids(conn):
    return {r[0] for r in conn.execute("SELECT match_id FROM matches")}


def existing_player_names(conn):
    return {r[0] for r in conn.execute("SELECT unique_name FROM players")}


# ── People CSV ─────────────────────────────────────────────────────────────────

def load_people(tmp_dir: Path, etags: dict) -> dict:
    """
    Download cricsheet register/people.csv (conditional GET) and build
        cricsheet_name  →  { identifier, unique_name }
    The 'name' column matches what appears in delivery batter/bowler fields.
    """
    path = tmp_dir / "people.csv"
    log.info("Downloading people.csv from cricsheet register …")
    saved = etags.setdefault("people", {})
    try:
        if not _download_if_changed(PEOPLE_URL, path, saved):
            log.info("people.csv unchanged (304) — skipped")
            return {}
    except Exception as exc:
        log.warning(f"Could not download people.csv: {exc} — player metadata will be minimal")
        return {}

    people: dict = {}
    with open(path, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            short_name  = (row.get("name") or "").strip()
            unique_name = (row.get("unique_name") or short_name).strip()
            identifier  = (row.get("identifier") or "").strip()
            if short_name:
                people[short_name] = {
                    "identifier":   identifier,
                    "unique_name":  unique_name,
                    "name":         short_name,
                }
    log.info(f"Loaded {len(people):,} people entries")
    return people


# ── Match JSON parser ──────────────────────────────────────────────────────────

def _event_name(info: dict, comp_key: str) -> str:
    if comp_key == "IPL":
        return "Indian Premier League"
    if comp_key == "SA20":
        return "SA20"
    # T20I — use whatever cricsheet calls it
    return (info.get("event", {}).get("name") or "T20 International")


def parse_match(match_id: str, data: dict, comp_key: str):
    """
    Returns (match_row, [delivery_rows]) or None if the file is malformed.
    """
    info = data.get("info", {})
    teams = info.get("teams", [])
    if len(teams) < 2:
        return None

    dates   = info.get("dates", [])
    outcome = info.get("outcome", {})
    winner  = outcome.get("winner")
    if winner is None:
        # No result / tie / DLS
        winner = outcome.get("result")

    match_row = {
        "match_id":   match_id,
        "event_name": _event_name(info, comp_key),
        "season":     str(info.get("season", "")),
        "date":       dates[0] if dates else None,
        "venue":      info.get("venue"),
        "city":       info.get("city"),
        "team1":      teams[0],
        "team2":      teams[1],
        "winner":     winner,
    }

    deliveries = []
    for inning_idx, inning in enumerate(data.get("innings", []), start=1):
        batting_team = inning.get("team", "")
        for over_data in inning.get("overs", []):
            over_num     = over_data.get("over", 0)
            is_powerplay = 1 if over_num < 6 else 0
            for ball_idx, ball in enumerate(over_data.get("deliveries", []), start=1):
                runs    = ball.get("runs", {})
                extras  = ball.get("extras", {})
                wickets = ball.get("wickets", [])

                # Pick the first extras type present (priority order)
                extras_type = None
                for xt in ("wides", "noballs", "byes", "legbyes", "penalty"):
                    if xt in extras:
                        extras_type = xt
                        break

                player_out  = None
                wicket_kind = None
                if wickets:
                    w           = wickets[0]
                    player_out  = w.get("player_out")
                    wicket_kind = w.get("kind")

                deliveries.append({
                    "match_id":     match_id,
                    "inning":       inning_idx,
                    "batting_team": batting_team,
                    "over":         over_num,
                    "ball":         ball_idx,
                    "batter":       ball.get("batter"),
                    "bowler":       ball.get("bowler"),
                    "non_striker":  ball.get("non_striker"),
                    "runs_batter":  runs.get("batter", 0),
                    "extras_type":  extras_type,
                    "runs_extras":  runs.get("extras", 0),
                    "runs_total":   runs.get("total", 0),
                    "is_wicket":    1 if wickets else 0,
                    "player_out":   player_out,
                    "wicket_kind":  wicket_kind,
                    "is_powerplay": is_powerplay,
                })

    return match_row, deliveries


# ── Player upsert ──────────────────────────────────────────────────────────────

def upsert_new_players(conn, deliveries: list, known_players: set, people_map: dict):
    """
    For any batter / bowler / non_striker not yet in the players table,
    insert a minimal row.  Uses people.csv for identifier + unique_name;
    batting/bowling style is left NULL (existing players already have it).
    """
    for ball in deliveries:
        for field in ("batter", "bowler", "non_striker"):
            name = ball.get(field)
            if not name or name in known_players:
                continue
            meta = people_map.get(name, {})
            conn.execute(
                """
                INSERT OR IGNORE INTO players
                    (identifier, unique_name, name, full_name,
                     batting_style, bowling_style, playing_role, country)
                VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL)
                """,
                (
                    meta.get("identifier") or None,
                    meta.get("unique_name") or name,
                    meta.get("name") or name,
                    meta.get("unique_name") or name,   # full_name = unique_name
                ),
            )
            known_players.add(name)


# ── Core update loop ──────────────────────────────────────────────────────────

def run():
    if not DB_PATH.exists():
        log.error(f"Database not found at {DB_PATH}")
        return 1

    conn           = get_conn()
    known_matches  = existing_match_ids(conn)
    known_players  = existing_player_names(conn)
    log.info(f"DB: {len(known_matches):,} existing matches, {len(known_players):,} players")

    grand_total = 0
    etags = _load_etags()

    with tempfile.TemporaryDirectory() as tmp_str:
        tmp = Path(tmp_str)
        people_map = load_people(tmp, etags)
        _save_etags(etags)

        for comp_key, url in SOURCES.items():
            zip_path = tmp / f"{comp_key}.zip"
            saved = etags.setdefault(comp_key, {})
            log.info(f"[{comp_key}] Checking for updates …")
            try:
                changed = _download_if_changed(url, zip_path, saved)
            except Exception as exc:
                log.error(f"[{comp_key}] Download failed: {exc}")
                continue

            if not changed:
                log.info(f"[{comp_key}] No new data (304) — skipped")
                _save_etags(etags)
                continue

            added = skipped = errors = 0

            with zipfile.ZipFile(zip_path) as zf:
                json_files = sorted(n for n in zf.namelist() if n.endswith(".json"))
                log.info(f"[{comp_key}] Archive contains {len(json_files):,} match files")

                for fname in json_files:
                    match_id = Path(fname).stem      # filename without extension

                    if match_id in known_matches:
                        skipped += 1
                        continue

                    try:
                        with zf.open(fname) as fh:
                            data = json.load(fh)

                        result = parse_match(match_id, data, comp_key)
                        if result is None:
                            log.warning(f"[{comp_key}] Skipping malformed file: {fname}")
                            errors += 1
                            continue

                        match_row, deliveries = result

                        conn.execute(
                            """
                            INSERT OR IGNORE INTO matches
                                (match_id, event_name, season, date, venue,
                                 city, team1, team2, winner)
                            VALUES
                                (:match_id, :event_name, :season, :date, :venue,
                                 :city, :team1, :team2, :winner)
                            """,
                            match_row,
                        )

                        conn.executemany(
                            """
                            INSERT OR IGNORE INTO deliveries
                                (match_id, inning, batting_team, over, ball,
                                 batter, bowler, non_striker,
                                 runs_batter, extras_type, runs_extras, runs_total,
                                 is_wicket, player_out, wicket_kind, is_powerplay)
                            VALUES
                                (:match_id, :inning, :batting_team, :over, :ball,
                                 :batter, :bowler, :non_striker,
                                 :runs_batter, :extras_type, :runs_extras, :runs_total,
                                 :is_wicket, :player_out, :wicket_kind, :is_powerplay)
                            """,
                            deliveries,
                        )

                        upsert_new_players(conn, deliveries, known_players, people_map)

                        conn.commit()
                        known_matches.add(match_id)
                        added += 1

                        if added % 50 == 0:
                            log.info(f"[{comp_key}]   … {added} new matches inserted so far")

                    except Exception as exc:
                        conn.rollback()
                        log.warning(f"[{comp_key}] Error on {fname}: {exc}")
                        errors += 1

            log.info(f"[{comp_key}] Done — added={added}, skipped={skipped}, errors={errors}")
            grand_total += added
            _save_etags(etags)

    conn.close()
    log.info(f"Update complete — {grand_total} new matches added to {DB_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(run())
