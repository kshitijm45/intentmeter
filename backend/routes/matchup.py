from fastapi import APIRouter, Query
from typing import List
from database import get_db

router = APIRouter()

@router.get("/matchup")
def get_matchup(batter: str, bowler: str, events: List[str] = Query(default=["IPL", "SA20", "T20I"])):

    # If nothing selected, default to all
    if not events:
        events = ["IPL", "SA20", "T20I"]

    event_filters = []
    if "IPL" in events:
        event_filters.append("m.event_name = 'Indian Premier League'")
    if "SA20" in events:
        event_filters.append("m.event_name = 'SA20'")
    if "T20I" in events:
        event_filters.append("m.event_name NOT IN ('Indian Premier League', 'SA20')")

    event_clause = f"AND ({' OR '.join(event_filters)})"

    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute(f"""
        SELECT
            COUNT(DISTINCT CASE WHEN d.inning IN (1, 2) 
                THEN d.match_id || '-' || d.inning END) AS innings,

            SUM(CASE WHEN d.batter = ? THEN d.runs_batter ELSE 0 END) AS runs,

            COUNT(CASE WHEN d.batter = ?
                AND (d.extras_type IS NULL OR d.extras_type != 'wides') 
                THEN 1 END) AS balls_faced,

            COUNT(CASE WHEN d.batter = ? AND d.runs_batter = 0
                AND (d.extras_type IS NULL OR d.extras_type != 'wides') THEN 1 END) AS dot_balls,
            COUNT(CASE WHEN d.batter = ? AND d.runs_batter = 1 THEN 1 END) AS ones,
            COUNT(CASE WHEN d.batter = ? AND d.runs_batter = 2 THEN 1 END) AS twos,
            COUNT(CASE WHEN d.batter = ? AND d.runs_batter = 3 THEN 1 END) AS threes,
            COUNT(CASE WHEN d.batter = ? AND d.runs_batter = 4 THEN 1 END) AS fours,
            COUNT(CASE WHEN d.batter = ? AND d.runs_batter = 5 THEN 1 END) AS fives,
            COUNT(CASE WHEN d.batter = ? AND d.runs_batter = 6 THEN 1 END) AS sixes,

            COUNT(CASE WHEN d.player_out = ?
                AND d.wicket_kind NOT IN ('retired hurt', 'retired not out', 'retired out') 
                THEN 1 END) AS dismissals,

            ROUND(SUM(CASE WHEN d.batter = ? THEN d.runs_batter ELSE 0 END) * 100.0 /
                NULLIF(COUNT(CASE WHEN d.batter = ?
                AND (d.extras_type IS NULL OR d.extras_type != 'wides') 
                THEN 1 END), 0), 2) AS batter_sr,

            ROUND(SUM(CASE WHEN d.batter = ? THEN d.runs_batter ELSE 0 END) * 1.0 /
                NULLIF(COUNT(CASE WHEN d.player_out = ?
                AND d.wicket_kind NOT IN ('retired hurt', 'retired not out', 'retired out') 
                THEN 1 END), 0), 2) AS batting_avg,
                   
            ROUND(COUNT(CASE WHEN d.batter = ? AND d.runs_batter = 0
                AND (d.extras_type IS NULL OR d.extras_type != 'wides') THEN 1 END) * 100.0 /
                NULLIF(COUNT(CASE WHEN d.batter = ?
                AND (d.extras_type IS NULL OR d.extras_type != 'wides') 
                THEN 1 END), 0), 2) AS dot_ball_pct,

            ROUND(SUM(CASE WHEN d.batter = ? AND d.runs_batter IN (4, 6) 
                THEN d.runs_batter ELSE 0 END) * 100.0 /
                NULLIF(SUM(CASE WHEN d.batter = ? 
                THEN d.runs_batter ELSE 0 END), 0), 2) AS boundary_pct

        FROM deliveries d
        JOIN matches m ON d.match_id = m.match_id
        WHERE (d.batter = ? OR d.non_striker = ?)
        AND d.bowler = ?
        AND d.inning IN (1, 2)
        {event_clause}
    """, (
        batter,           # runs
        batter,           # balls_faced
        batter,           # dot_balls
        batter,           # ones
        batter,           # twos
        batter,           # threes
        batter,           # fours
        batter,           # fives
        batter,           # sixes
        batter,           # dismissals
        batter, batter,   # batter_sr
        batter, batter,   # batting_avg
        batter, batter,   # dot_ball_pct
        batter, batter,   # boundary_pct
        batter, batter,   # WHERE clause
        bowler            # WHERE clause
    ))
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return dict(row)
    return {"message": "No data found"}