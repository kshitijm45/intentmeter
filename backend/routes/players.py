from fastapi import APIRouter
from database import get_db

router = APIRouter()

def get_display_name(row) -> str:
    if row["known_as"] and row["known_as"].strip():
        return row["known_as"]
    full = (row["full_name"] or "").strip()
    parts = full.split()
    if len(parts) <= 2:
        return full
    return f"{parts[0]} {parts[-1]}"

@router.get("/players")
def get_players():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
    SELECT 
        p.unique_name,
        p.full_name,
        p.known_as,
        p.country
    FROM players p
    WHERE p.unique_name IN (
        SELECT DISTINCT batter FROM deliveries
        UNION
        SELECT DISTINCT bowler FROM deliveries
    )
    AND p.full_name IS NOT NULL
    AND p.full_name != ''
    GROUP BY p.unique_name
    ORDER BY COALESCE(p.known_as, p.full_name)
    """)
    
    rows = cursor.fetchall()
    conn.close()

    seen = set()
    result = []
    for row in rows:
        display = get_display_name(row)
        if display.lower() in seen:
            display = f"{display} ({row['country']})"
        seen.add(display.lower())
        result.append({
            "unique_name": row["unique_name"],
            "display_name": display,
            "country": row["country"]
        })
    
    return result