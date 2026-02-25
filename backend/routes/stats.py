from fastapi import APIRouter, Query
from typing import List, Optional
from database import get_db

router = APIRouter()

# ─── Constants ────────────────────────────────────────────────────────────────

COMP_FILTERS = {
    "IPL":  "m.event_name = 'Indian Premier League'",
    "SA20": "m.event_name = 'SA20'",
    "T20I": "m.event_name NOT IN ('Indian Premier League', 'SA20')",
}

PHASE_FILTERS = {
    "pp":     "d.over >= 0 AND d.over < 6",
    "middle": "d.over >= 6 AND d.over < 16",
    "death":  "d.over >= 16",
}

PHASE_LABELS = {
    "pp":     "Powerplay",
    "middle": "Middle Overs",
    "death":  "Death Overs",
}

# bowling_style values from players table mapped to query-friendly keys
BOWLER_TYPE_FILTERS = {
    "right-pace":    "bp.bowling_style LIKE 'Right-arm pace%'",
    "left-pace":     "bp.bowling_style LIKE 'Left-arm pace%'",
    "off-spin":      "bp.bowling_style LIKE 'off-spin%'",
    "leg-spin":      "(bp.bowling_style LIKE '%wrist-spin%')",
    "right-orthodox": "bp.bowling_style LIKE 'Right-arm off-spin%'",
    "left-orthodox":  "bp.bowling_style LIKE 'Left-arm off-spin%'",
    "right-wrist":    "bp.bowling_style LIKE 'Right-arm wrist-spin%'",
    "left-wrist":     "bp.bowling_style LIKE 'Left-arm wrist-spin%'",
    "pace":          "(bp.bowling_style LIKE '%pace%')",
    "spin":          "(bp.bowling_style LIKE '%spin%')",
}

BOWLER_TYPE_LABELS = {
    "right-pace":    "Right-arm Pace",
    "left-pace":     "Left-arm Pace",
    "off-spin":      "Off-spin",
    "leg-spin":      "Leg-spin / Wrist-spin",
    "right-orthodox": "Right-arm Orthodox",
    "left-orthodox":  "Left-arm Orthodox",
    "right-wrist":    "Right-arm Wrist-spin",
    "left-wrist":     "Left-arm Wrist-spin",
}

BATTER_HAND_FILTERS = {
    "left":  "bp.batting_style = 'Left-hand bat'",
    "right": "bp.batting_style = 'Right-hand bat'",
}

BATTER_HAND_LABELS = {
    "left":  "Left-hand batters",
    "right": "Right-hand batters",
}

WICKETS_NOT_COUNTED = "('retired hurt', 'retired not out')"


# ─── Filter builders ──────────────────────────────────────────────────────────

def _build_batting_filter(player, phase, events, bowler_type, opposition, venue, year_from):
    """Returns (extra_join: str, where_clause: str, params: list)"""
    joins = []
    where = [
        "d.batter = ?",
        "d.inning IN (1, 2)",
        "(d.extras_type IS NULL OR d.extras_type != 'wides')",
    ]
    params = [player]

    if phase and phase != "all" and phase in PHASE_FILTERS:
        where.append(PHASE_FILTERS[phase])

    if events:
        parts = [COMP_FILTERS[e] for e in events if e in COMP_FILTERS]
        if parts:
            where.append(f"({' OR '.join(parts)})")

    if bowler_type and bowler_type in BOWLER_TYPE_FILTERS:
        joins.append("LEFT JOIN players bp ON d.bowler = bp.unique_name")
        where.append(BOWLER_TYPE_FILTERS[bowler_type])

    if opposition:
        # opposition is the fielding team — team1 or team2 must be the opposition
        # and the batter's batting_team is NOT the opposition (they're batting against them)
        where.append("(m.team1 = ? OR m.team2 = ?)")
        where.append("d.batting_team != ?")
        params += [opposition, opposition, opposition]

    if venue:
        where.append("d.venue LIKE ?")
        params.append(f"%{venue}%")

    if year_from:
        where.append("CAST(SUBSTR(d.date, 1, 4) AS INTEGER) >= ?")
        params.append(int(year_from))

    return " ".join(joins), " AND ".join(where), params


def _build_bowling_filter(player, phase, events, batter_hand, opposition, venue, year_from):
    """Returns (extra_join: str, where_clause: str, params: list)"""
    joins = []
    where = [
        "d.bowler = ?",
        "d.inning IN (1, 2)",
    ]
    params = [player]

    if phase and phase != "all" and phase in PHASE_FILTERS:
        where.append(PHASE_FILTERS[phase])

    if events:
        parts = [COMP_FILTERS[e] for e in events if e in COMP_FILTERS]
        if parts:
            where.append(f"({' OR '.join(parts)})")

    if batter_hand and batter_hand in BATTER_HAND_FILTERS:
        joins.append("LEFT JOIN players bp ON d.batter = bp.unique_name")
        where.append(BATTER_HAND_FILTERS[batter_hand])

    if opposition:
        # opposition = batting team (they're batting against our bowler)
        where.append("d.batting_team = ?")
        params.append(opposition)

    if venue:
        where.append("d.venue LIKE ?")
        params.append(f"%{venue}%")

    if year_from:
        where.append("CAST(SUBSTR(d.date, 1, 4) AS INTEGER) >= ?")
        params.append(int(year_from))

    return " ".join(joins), " AND ".join(where), params


# ─── Core stat runners ────────────────────────────────────────────────────────

def _run_batting(cursor, player, phase, events, bowler_type, opposition, venue, year_from, balls):
    extra_join, where_clause, params = _build_batting_filter(
        player, phase, events, bowler_type, opposition, venue, year_from
    )

    if balls and balls > 0:
        # Window function: rank each ball within a batter's innings, take first `balls` only
        sql = f"""
        WITH faced AS (
            SELECT d.*
            FROM deliveries d
            JOIN matches m ON d.match_id = m.match_id
            {extra_join}
            WHERE {where_clause}
        ),
        numbered AS (
            SELECT *,
                ROW_NUMBER() OVER (
                    PARTITION BY match_id, inning
                    ORDER BY over, ball
                ) AS ball_num
            FROM faced
        )
        SELECT
            COUNT(DISTINCT match_id)                    AS matches,
            COUNT(DISTINCT match_id || '-' || inning)   AS innings,
            SUM(runs_batter)                            AS runs,
            COUNT(*)                                    AS balls_faced,
            ROUND(SUM(runs_batter) * 1.0 /
                NULLIF(COUNT(CASE WHEN is_wicket = 1
                    AND player_out = batter
                    AND wicket_kind NOT IN {WICKETS_NOT_COUNTED} THEN 1 END), 0), 2) AS avg,
            ROUND(SUM(runs_batter) * 100.0 /
                NULLIF(COUNT(*), 0), 2)                 AS sr,
            ROUND(COUNT(CASE WHEN runs_batter IN (4,6) THEN 1 END) * 100.0 /
                NULLIF(COUNT(*), 0), 2)                 AS boundary_pct,
            ROUND(COUNT(CASE WHEN runs_batter = 0 THEN 1 END) * 100.0 /
                NULLIF(COUNT(*), 0), 2)                 AS dot_ball_pct,
            ROUND(COUNT(*) * 1.0 /
                NULLIF(COUNT(CASE WHEN runs_batter IN (4,6) THEN 1 END), 0), 2) AS balls_per_bdy,
            COUNT(CASE WHEN is_wicket = 1
                AND player_out = batter
                AND wicket_kind NOT IN {WICKETS_NOT_COUNTED} THEN 1 END) AS dismissals,
            NULL AS fifties,
            NULL AS hundreds
        FROM numbered
        WHERE ball_num <= ?
        """
        params.append(balls)
    else:
        # Full query with fifties/hundreds via per-innings score CTE
        sql = f"""
        WITH base AS (
            SELECT d.*
            FROM deliveries d
            JOIN matches m ON d.match_id = m.match_id
            {extra_join}
            WHERE {where_clause}
        ),
        inning_totals AS (
            SELECT d2.match_id, d2.inning, SUM(d2.runs_batter) AS inns_runs
            FROM deliveries d2
            JOIN (SELECT DISTINCT match_id, inning FROM base) q
                ON q.match_id = d2.match_id AND q.inning = d2.inning
            WHERE d2.batter = ?
              AND (d2.extras_type IS NULL OR d2.extras_type != 'wides')
            GROUP BY d2.match_id, d2.inning
        )
        SELECT
            COUNT(DISTINCT b.match_id)                      AS matches,
            COUNT(DISTINCT b.match_id || '-' || b.inning)   AS innings,
            SUM(b.runs_batter)                              AS runs,
            COUNT(*)                                        AS balls_faced,
            ROUND(SUM(b.runs_batter) * 1.0 /
                NULLIF(COUNT(CASE WHEN b.is_wicket = 1
                    AND b.player_out = b.batter
                    AND b.wicket_kind NOT IN {WICKETS_NOT_COUNTED} THEN 1 END), 0), 2) AS avg,
            ROUND(SUM(b.runs_batter) * 100.0 /
                NULLIF(COUNT(*), 0), 2)                     AS sr,
            ROUND(COUNT(CASE WHEN b.runs_batter IN (4,6) THEN 1 END) * 100.0 /
                NULLIF(COUNT(*), 0), 2)                     AS boundary_pct,
            ROUND(COUNT(CASE WHEN b.runs_batter = 0 THEN 1 END) * 100.0 /
                NULLIF(COUNT(*), 0), 2)                     AS dot_ball_pct,
            ROUND(COUNT(*) * 1.0 /
                NULLIF(COUNT(CASE WHEN b.runs_batter IN (4,6) THEN 1 END), 0), 2) AS balls_per_bdy,
            COUNT(CASE WHEN b.is_wicket = 1
                AND b.player_out = b.batter
                AND b.wicket_kind NOT IN {WICKETS_NOT_COUNTED} THEN 1 END) AS dismissals,
            (SELECT COUNT(CASE WHEN inns_runs >= 50 AND inns_runs < 100 THEN 1 END)
             FROM inning_totals)     AS fifties,
            (SELECT COUNT(CASE WHEN inns_runs >= 100 THEN 1 END)
             FROM inning_totals)     AS hundreds
        FROM base b
        """
        params.append(player)  # for inning_totals WHERE d2.batter = ?

    cursor.execute(sql, params)
    row = cursor.fetchone()
    return dict(row) if row else {}


def _run_bowling(cursor, player, phase, events, batter_hand, opposition, venue, year_from):
    extra_join, where_clause, params = _build_bowling_filter(
        player, phase, events, batter_hand, opposition, venue, year_from
    )

    sql = f"""
    SELECT
        COUNT(DISTINCT d.match_id)                      AS matches,
        COUNT(DISTINCT d.match_id || '-' || d.inning)   AS innings,
        SUM(CASE WHEN d.is_wicket = 1
            AND d.wicket_kind NOT IN ('run out','retired hurt','retired out','obstructing the field')
            THEN 1 ELSE 0 END)                          AS wickets,
        COUNT(CASE WHEN d.extras_type IS NULL
            OR d.extras_type NOT IN ('wides','noballs') THEN 1 END) AS legal_balls,
        ROUND(
            SUM(CASE WHEN d.extras_type NOT IN ('byes','legbyes') OR d.extras_type IS NULL
                THEN d.runs_total ELSE 0 END) * 6.0 /
            NULLIF(COUNT(CASE WHEN d.extras_type IS NULL
                OR d.extras_type NOT IN ('wides','noballs') THEN 1 END), 0)
        , 2) AS economy,
        ROUND(
            SUM(CASE WHEN d.extras_type NOT IN ('byes','legbyes') OR d.extras_type IS NULL
                THEN d.runs_total ELSE 0 END) * 1.0 /
            NULLIF(SUM(CASE WHEN d.is_wicket = 1
                AND d.wicket_kind NOT IN ('run out','retired hurt','retired out','obstructing the field')
                THEN 1 ELSE 0 END), 0)
        , 2) AS avg,
        ROUND(
            COUNT(CASE WHEN d.extras_type IS NULL
                OR d.extras_type NOT IN ('wides','noballs') THEN 1 END) * 1.0 /
            NULLIF(SUM(CASE WHEN d.is_wicket = 1
                AND d.wicket_kind NOT IN ('run out','retired hurt','retired out','obstructing the field')
                THEN 1 ELSE 0 END), 0)
        , 2) AS bowling_sr,
        ROUND(
            COUNT(CASE WHEN d.runs_total = 0
                AND (d.extras_type IS NULL OR d.extras_type NOT IN ('wides','noballs'))
                THEN 1 END) * 100.0 /
            NULLIF(COUNT(CASE WHEN d.extras_type IS NULL
                OR d.extras_type NOT IN ('wides','noballs') THEN 1 END), 0)
        , 2) AS dot_ball_pct,
        ROUND(
            COUNT(CASE WHEN d.runs_batter IN (4,6) THEN 1 END) * 100.0 /
            NULLIF(COUNT(CASE WHEN d.extras_type IS NULL
                OR d.extras_type NOT IN ('wides','noballs') THEN 1 END), 0)
        , 2) AS boundary_given_pct,
        ROUND(
            SUM(CASE WHEN d.is_wicket = 1
                AND d.wicket_kind NOT IN ('run out','retired hurt','retired out','obstructing the field')
                THEN 1 ELSE 0 END) * 1.0 /
            NULLIF(COUNT(DISTINCT d.match_id || '-' || d.inning), 0)
        , 2) AS wkts_per_innings
    FROM deliveries d
    JOIN matches m ON d.match_id = m.match_id
    {extra_join}
    WHERE {where_clause}
    """

    cursor.execute(sql, params)
    row = cursor.fetchone()
    return dict(row) if row else {}


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/stats/player")
def get_player_stats(
    player: str,
    mode: str = "batting",
    phase: str = "all",
    events: List[str] = Query(default=[]),
    bowler_type: Optional[str] = None,
    batter_hand: Optional[str] = None,
    opposition: Optional[str] = None,
    venue: Optional[str] = None,
    year_from: Optional[int] = None,
    balls: Optional[int] = None,
    group_by: Optional[str] = None,
):
    conn = get_db()
    cursor = conn.cursor()

    result = {
        "player": player,
        "mode": mode,
    }

    if group_by and group_by != "none":
        groups = []

        if group_by == "bowler_type" and mode == "batting":
            for bt, label in BOWLER_TYPE_LABELS.items():
                stats = _run_batting(cursor, player, phase, events, bt, opposition, venue, year_from, balls)
                # Only include groups with meaningful data
                if stats.get("innings") and stats["innings"] > 0:
                    groups.append({"label": label, "key": bt, "stats": stats})

        elif group_by == "phase":
            for ph, label in PHASE_LABELS.items():
                if mode == "batting":
                    stats = _run_batting(cursor, player, ph, events, bowler_type, opposition, venue, year_from, balls)
                else:
                    stats = _run_bowling(cursor, player, ph, events, batter_hand, opposition, venue, year_from)
                has_data = (stats.get("innings") or 0) > 0 or (stats.get("legal_balls") or 0) > 0
                if has_data:
                    groups.append({"label": label, "key": ph, "stats": stats})

        elif group_by == "batter_hand" and mode == "bowling":
            for bh, label in BATTER_HAND_LABELS.items():
                stats = _run_bowling(cursor, player, phase, events, bh, opposition, venue, year_from)
                if (stats.get("innings") or 0) > 0:
                    groups.append({"label": label, "key": bh, "stats": stats})

        result["groups"] = groups
    else:
        if mode == "batting":
            result["stats"] = _run_batting(
                cursor, player, phase, events, bowler_type, opposition, venue, year_from, balls
            )
        else:
            result["stats"] = _run_bowling(
                cursor, player, phase, events, batter_hand, opposition, venue, year_from
            )

    conn.close()
    return result


@router.get("/stats/team")
def get_team_stats(
    team: str,
    opposition: Optional[str] = None,
    venue: Optional[str] = None,
    city: Optional[str] = None,
    events: List[str] = Query(default=[]),
    year_from: Optional[int] = None,
    innings: Optional[str] = None,  # "any" | "chasing" | "defending"
):
    conn = get_db()
    cursor = conn.cursor()

    where = ["(m.team1 = ? OR m.team2 = ?)"]
    params = [team, team]

    if opposition:
        where.append("(m.team1 = ? OR m.team2 = ?)")
        params += [opposition, opposition]

    if venue:
        where.append("m.venue LIKE ?")
        params.append(f"%{venue}%")

    if city:
        where.append("m.city LIKE ?")
        params.append(f"%{city}%")

    if events:
        parts = [COMP_FILTERS[e] for e in events if e in COMP_FILTERS]
        if parts:
            where.append(f"({' OR '.join(parts)})")

    if year_from:
        where.append("CAST(SUBSTR(m.date, 1, 4) AS INTEGER) >= ?")
        params.append(int(year_from))

    chasing_join = ""
    if innings in ("chasing", "defending"):
        chasing_join = """
        JOIN (
            SELECT DISTINCT match_id, batting_team AS chasing_team
            FROM deliveries WHERE inning = 2
        ) chase ON chase.match_id = m.match_id
        """
        if innings == "chasing":
            where.append("chase.chasing_team = ?")
            params.append(team)
        else:
            where.append("(chase.chasing_team != ? OR chase.chasing_team IS NULL)")
            params.append(team)

    where_clause = " AND ".join(where)

    sql = f"""
    SELECT
        COUNT(*)                                                    AS matches,
        COUNT(CASE WHEN m.winner = ? THEN 1 END)                    AS wins,
        COUNT(CASE WHEN m.winner IS NOT NULL
            AND m.winner != ?
            AND m.winner != 'No result' THEN 1 END)                 AS losses,
        COUNT(CASE WHEN m.winner IS NULL
            OR m.winner = 'No result' THEN 1 END)                   AS no_results,
        ROUND(COUNT(CASE WHEN m.winner = ? THEN 1.0 END) /
            NULLIF(COUNT(CASE WHEN m.winner IS NOT NULL
                AND m.winner != 'No result' THEN 1 END), 0) * 100, 1) AS win_pct
    FROM matches m
    {chasing_join}
    WHERE {where_clause}
    """
    params += [team, team, team]

    cursor.execute(sql, params)
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else {}


@router.get("/teams")
def get_teams():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT DISTINCT team1 AS t FROM matches "
        "UNION SELECT DISTINCT team2 FROM matches "
        "ORDER BY t"
    )
    teams = [row[0] for row in cursor.fetchall() if row[0]]
    conn.close()
    return teams


@router.get("/venues")
def get_venues():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT venue FROM matches WHERE venue IS NOT NULL ORDER BY venue")
    venues = [row[0] for row in cursor.fetchall()]
    conn.close()
    return venues
