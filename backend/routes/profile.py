from fastapi import APIRouter, Query
from typing import List
from database import get_db
from routes.stats import _run_batting, _run_bowling, PHASE_FILTERS, COMP_FILTERS

router = APIRouter()

BOWLING_NOT_COUNTED = "('run out', 'retired hurt', 'retired out', 'obstructing the field')"


def _display_name(row) -> str:
    known = (row["known_as"] or "").strip()
    if known:
        return known
    full = (row["full_name"] or "").strip()
    parts = full.split()
    if len(parts) <= 2:
        return full
    return f"{parts[0]} {parts[-1]}"


def _build_event_where(events):
    if not events:
        return ""
    parts = [COMP_FILTERS[e] for e in events if e in COMP_FILTERS]
    if not parts:
        return ""
    return f"AND ({' OR '.join(parts)})"


def _batting_by_season(cursor, player, events):
    ew = _build_event_where(events)
    cursor.execute(f"""
        SELECT
            SUBSTR(m.date, 1, 4)                                    AS year,
            COUNT(DISTINCT d.match_id)                              AS matches,
            SUM(d.runs_batter)                                      AS runs,
            COUNT(CASE WHEN d.extras_type IS NULL
                OR d.extras_type != 'wides' THEN 1 END)            AS balls_faced,
            ROUND(SUM(d.runs_batter) * 100.0 /
                NULLIF(COUNT(CASE WHEN d.extras_type IS NULL
                    OR d.extras_type != 'wides' THEN 1 END), 0), 2) AS sr,
            COUNT(CASE WHEN d.is_wicket = 1
                AND d.player_out = d.batter
                AND d.wicket_kind NOT IN ('retired hurt', 'retired not out')
                THEN 1 END)                                         AS dismissals
        FROM deliveries d
        JOIN matches m ON d.match_id = m.match_id
        WHERE d.batter = ?
        AND d.inning IN (1, 2)
        {ew}
        GROUP BY SUBSTR(m.date, 1, 4)
        ORDER BY SUBSTR(m.date, 1, 4)
    """, (player,))
    result = []
    for row in cursor.fetchall():
        d = dict(row)
        runs = d.get("runs") or 0
        dism = d.get("dismissals") or 0
        d["avg"] = round(runs / dism, 2) if dism > 0 else None
        result.append(d)
    return result


def _bowling_by_season(cursor, player, events):
    ew = _build_event_where(events)
    cursor.execute(f"""
        SELECT
            SUBSTR(m.date, 1, 4)                                    AS year,
            COUNT(DISTINCT d.match_id)                              AS matches,
            SUM(CASE WHEN d.is_wicket = 1
                AND d.wicket_kind NOT IN {BOWLING_NOT_COUNTED}
                THEN 1 ELSE 0 END)                                  AS wickets,
            COUNT(CASE WHEN d.extras_type IS NULL
                OR d.extras_type NOT IN ('wides', 'noballs')
                THEN 1 END)                                         AS legal_balls,
            ROUND(
                SUM(CASE WHEN d.extras_type NOT IN ('byes', 'legbyes')
                    OR d.extras_type IS NULL THEN d.runs_total ELSE 0 END) * 6.0 /
                NULLIF(COUNT(CASE WHEN d.extras_type IS NULL
                    OR d.extras_type NOT IN ('wides', 'noballs') THEN 1 END), 0)
            , 2) AS economy
        FROM deliveries d
        JOIN matches m ON d.match_id = m.match_id
        WHERE d.bowler = ?
        AND d.inning IN (1, 2)
        {ew}
        GROUP BY SUBSTR(m.date, 1, 4)
        ORDER BY SUBSTR(m.date, 1, 4)
    """, (player,))
    return [dict(row) for row in cursor.fetchall()]


@router.get("/profile")
def get_profile(
    player: str,
    events: List[str] = Query(default=[]),
):
    conn = get_db()
    cursor = conn.cursor()

    # ── Player metadata ────────────────────────────────────────────────────────
    cursor.execute("""
        SELECT unique_name, full_name, known_as, country, batting_style, bowling_style
        FROM players
        WHERE unique_name = ?
    """, (player,))
    row = cursor.fetchone()
    if row:
        player_meta = {
            "unique_name":   row["unique_name"],
            "display_name":  _display_name(row),
            "country":       row["country"],
            "batting_style": row["batting_style"],
            "bowling_style": row["bowling_style"],
        }
    else:
        player_meta = {
            "unique_name":   player,
            "display_name":  player.replace("-", " ").title(),
            "country":       None,
            "batting_style": None,
            "bowling_style": None,
        }

    # ── Batting ────────────────────────────────────────────────────────────────
    batting_overall  = _run_batting(cursor, player, "all",  events, None,   None, None, None, None)
    batting_phases   = {
        ph: _run_batting(cursor, player, ph, events, None, None, None, None, None)
        for ph in PHASE_FILTERS
    }
    batting_vs_pace  = _run_batting(cursor, player, "all",  events, "pace", None, None, None, None)
    batting_vs_spin  = _run_batting(cursor, player, "all",  events, "spin", None, None, None, None)
    batting_seasons  = _batting_by_season(cursor, player, events)

    # ── Bowling ────────────────────────────────────────────────────────────────
    bowling_overall  = _run_bowling(cursor, player, "all",  events, None,    None, None, None)
    bowling_phases   = {
        ph: _run_bowling(cursor, player, ph, events, None, None, None, None)
        for ph in PHASE_FILTERS
    }
    bowling_vs_left  = _run_bowling(cursor, player, "all",  events, "left",  None, None, None)
    bowling_vs_right = _run_bowling(cursor, player, "all",  events, "right", None, None, None)
    bowling_seasons  = _bowling_by_season(cursor, player, events)

    conn.close()
    return {
        "player": player_meta,
        "batting": {
            "overall":   batting_overall,
            "phases":    batting_phases,
            "vs_pace":   batting_vs_pace,
            "vs_spin":   batting_vs_spin,
            "by_season": batting_seasons,
        },
        "bowling": {
            "overall":   bowling_overall,
            "phases":    bowling_phases,
            "vs_left":   bowling_vs_left,
            "vs_right":  bowling_vs_right,
            "by_season": bowling_seasons,
        },
    }
