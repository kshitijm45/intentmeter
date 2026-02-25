from fastapi import APIRouter, Query
from typing import List
from database import get_db

router = APIRouter()

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

def build_event_clause(events):
    if not events:
        events = ["IPL", "SA20", "T20I"]
    filters = [COMP_FILTERS[e] for e in events if e in COMP_FILTERS]
    return f"AND ({' OR '.join(filters)})"

def get_batting_stats(cursor, player, event_clause, phase_filter="1=1"):
    cursor.execute(f"""
        SELECT
            COUNT(DISTINCT d.match_id) AS matches,
            COUNT(DISTINCT CASE WHEN d.inning IN (1,2)
                THEN d.match_id || '-' || d.inning END) AS innings,
            SUM(CASE WHEN d.batter = ? THEN d.runs_batter ELSE 0 END) AS runs,
            COUNT(CASE WHEN d.batter = ?
                AND (d.extras_type IS NULL OR d.extras_type != 'wides')
                THEN 1 END) AS balls_faced,
            COUNT(CASE WHEN d.player_out = ?
                AND d.wicket_kind NOT IN ('retired hurt', 'retired not out')
                THEN 1 END) +
            (SELECT COUNT(*) FROM deliveries d2
                JOIN matches m2 ON d2.match_id = m2.match_id
                WHERE d2.non_striker = ?
                AND d2.player_out = ?
                AND d2.wicket_kind NOT IN ('retired hurt', 'retired not out')
                AND d2.inning IN (1, 2)
                AND ({phase_filter.replace('d.', 'd2.')})
                {event_clause.replace('m.', 'm2.')}
            ) AS dismissals,
            ROUND(SUM(CASE WHEN d.batter = ? THEN d.runs_batter ELSE 0 END) * 1.0 /
                NULLIF(
                    COUNT(CASE WHEN d.player_out = ?
                        AND d.wicket_kind NOT IN ('retired hurt', 'retired not out')
                        THEN 1 END) +
                    (SELECT COUNT(*) FROM deliveries d2
                        JOIN matches m2 ON d2.match_id = m2.match_id
                        WHERE d2.non_striker = ?
                        AND d2.player_out = ?
                        AND d2.wicket_kind NOT IN ('retired hurt', 'retired not out')
                        AND d2.inning IN (1, 2)
                        AND ({phase_filter.replace('d.', 'd2.')})
                        {event_clause.replace('m.', 'm2.')}
                    )
                , 0), 2) AS avg,
            ROUND(SUM(CASE WHEN d.batter = ? THEN d.runs_batter ELSE 0 END) * 100.0 /
                NULLIF(COUNT(CASE WHEN d.batter = ?
                    AND (d.extras_type IS NULL OR d.extras_type != 'wides')
                    THEN 1 END), 0), 2) AS sr,
            ROUND(SUM(CASE WHEN d.batter = ? AND d.runs_batter IN (4,6)
                    THEN d.runs_batter ELSE 0 END) * 100.0 /
                NULLIF(SUM(CASE WHEN d.batter = ? THEN d.runs_batter ELSE 0 END), 0), 2) AS boundary_pct,
            ROUND(COUNT(CASE WHEN d.batter = ? AND d.runs_batter = 0
                    AND (d.extras_type IS NULL OR d.extras_type != 'wides')
                    THEN 1 END) * 100.0 /
                NULLIF(COUNT(CASE WHEN d.batter = ?
                    AND (d.extras_type IS NULL OR d.extras_type != 'wides')
                    THEN 1 END), 0), 2) AS dot_ball_pct,
            ROUND(COUNT(CASE WHEN d.batter = ?
                    AND (d.extras_type IS NULL OR d.extras_type != 'wides')
                    THEN 1 END) * 1.0 /
                NULLIF(COUNT(CASE WHEN d.batter = ?
                    AND d.runs_batter IN (4,6) THEN 1 END), 0), 2) AS balls_per_bdy
        FROM deliveries d
        JOIN matches m ON d.match_id = m.match_id
        WHERE (d.batter = ? OR d.non_striker = ?)
        AND d.inning IN (1, 2)
        AND ({phase_filter})
        {event_clause}
    """, (
        player,          # runs
        player,          # balls_faced
        player,          # dismissals striker
        player, player,  # dismissals non-striker subquery
        player,          # avg numerator
        player,          # avg denom striker
        player, player,  # avg denom non-striker subquery
        player, player,  # sr
        player, player,  # boundary_pct
        player, player,  # dot_ball_pct
        player, player,  # balls_per_bdy
        player, player,  # WHERE
    ))
    row = cursor.fetchone()
    return dict(row) if row else {}

def get_bowling_stats(cursor, player, event_clause, phase_filter="1=1"):
    cursor.execute(f"""
        SELECT
            COUNT(DISTINCT d.match_id) AS matches,
            COUNT(DISTINCT d.match_id || '-' || d.inning) AS innings_bowled,
            SUM(CASE WHEN d.is_wicket = 1
                AND d.wicket_kind NOT IN ('run out', 'retired hurt', 'retired out', 'obstructing the field')
                THEN 1 ELSE 0 END) AS wickets,
            COUNT(CASE WHEN d.extras_type IS NULL
                OR d.extras_type NOT IN ('wides', 'noballs')
                THEN 1 END) AS legal_balls,
            ROUND(SUM(CASE WHEN d.extras_type NOT IN ('byes', 'legbyes')
                    OR d.extras_type IS NULL THEN d.runs_total ELSE 0 END) * 6.0 /
                NULLIF(COUNT(CASE WHEN d.extras_type IS NULL
                    OR d.extras_type NOT IN ('wides', 'noballs') THEN 1 END), 0), 2) AS economy,
            ROUND(SUM(CASE WHEN d.extras_type NOT IN ('byes', 'legbyes')
                    OR d.extras_type IS NULL THEN d.runs_total ELSE 0 END) * 1.0 /
                NULLIF(SUM(CASE WHEN d.is_wicket = 1
                    AND d.wicket_kind NOT IN ('run out', 'retired hurt', 'retired out', 'obstructing the field')
                    THEN 1 ELSE 0 END), 0), 2) AS avg,
            ROUND(COUNT(CASE WHEN d.extras_type IS NULL
                    OR d.extras_type NOT IN ('wides', 'noballs') THEN 1 END) * 1.0 /
                NULLIF(SUM(CASE WHEN d.is_wicket = 1
                    AND d.wicket_kind NOT IN ('run out', 'retired hurt', 'retired out', 'obstructing the field')
                    THEN 1 ELSE 0 END), 0), 2) AS bowling_sr,
            ROUND(COUNT(CASE WHEN d.runs_total = 0
                    AND (d.extras_type IS NULL OR d.extras_type NOT IN ('wides', 'noballs'))
                    THEN 1 END) * 100.0 /
                NULLIF(COUNT(CASE WHEN d.extras_type IS NULL
                    OR d.extras_type NOT IN ('wides', 'noballs') THEN 1 END), 0), 2) AS dot_ball_pct,
            ROUND(COUNT(CASE WHEN d.runs_batter IN (4,6) THEN 1 END) * 100.0 /
                NULLIF(COUNT(CASE WHEN d.extras_type IS NULL
                    OR d.extras_type NOT IN ('wides', 'noballs') THEN 1 END), 0), 2) AS boundary_given_pct,
            ROUND(SUM(CASE WHEN d.is_wicket = 1
                    AND d.wicket_kind NOT IN ('run out', 'retired hurt', 'retired out', 'obstructing the field')
                    THEN 1 ELSE 0 END) * 1.0 /
                NULLIF(COUNT(DISTINCT d.match_id || '-' || d.inning), 0), 2) AS wkts_per_innings
        FROM deliveries d
        JOIN matches m ON d.match_id = m.match_id
        WHERE d.bowler = ?
        AND d.inning IN (1, 2)
        AND ({phase_filter})
        {event_clause}
    """, (player,))
    row = cursor.fetchone()
    return dict(row) if row else {}

@router.get("/comparison")
def get_comparison(
    player1: str,
    player2: str,
    events: List[str] = Query(default=["IPL", "SA20", "T20I"])
):
    if not events:
        events = ["IPL", "SA20", "T20I"]

    event_clause = build_event_clause(events)
    conn = get_db()
    cursor = conn.cursor()

    response = {}

    for label, player in [("player1", player1), ("player2", player2)]:
        # Overall batting
        batting_overall = get_batting_stats(cursor, player, event_clause)

        # Phase batting
        batting_phases = {}
        for phase, phase_filter in PHASE_FILTERS.items():
            batting_phases[phase] = get_batting_stats(cursor, player, event_clause, phase_filter)

        # Overall bowling
        bowling_overall = get_bowling_stats(cursor, player, event_clause)

        # Phase bowling
        bowling_phases = {}
        for phase, phase_filter in PHASE_FILTERS.items():
            bowling_phases[phase] = get_bowling_stats(cursor, player, event_clause, phase_filter)

        response[label] = {
            "batting": {
                "overall": batting_overall,
                "phases":  batting_phases,
            },
            "bowling": {
                "overall": bowling_overall,
                "phases":  bowling_phases,
            }
        }

    conn.close()
    return response