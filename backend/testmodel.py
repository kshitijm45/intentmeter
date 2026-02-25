from mlx_lm import load, generate
import sqlite3
import re

# ============================================================
# LOAD THE FUSED MODEL
# ============================================================
model_id = "./fused_model"
print("🏏 Loading Cricket-SQL Model...")
model, tokenizer = load(model_id)

# ============================================================
# PLAYER NAME RESOLVER
# Build a lookup of {lowercase alias -> unique_name} at startup
# so user-typed names ("Virat Kohli") map to DB keys ("V Kohli")
# ============================================================
def _build_alias_map():
    try:
        conn = sqlite3.connect("./cricket_assistant.db")
        cur = conn.cursor()
        cur.execute("SELECT unique_name, full_name, known_as FROM players")
        rows = cur.fetchall()
        conn.close()
    except Exception as e:
        print(f"⚠️  Could not build player alias map: {e}")
        return {}, []

    alias_map = {}
    for unique_name, full_name, known_as in rows:
        for alias in [known_as, full_name, unique_name]:
            if alias and len(alias.strip()) >= 4:
                key = alias.strip().lower()
                # Don't overwrite an existing mapping with a shorter alias
                if key not in alias_map:
                    alias_map[key] = unique_name

    # Sort longest first so greedy matching prefers longer names
    sorted_aliases = sorted(alias_map.keys(), key=len, reverse=True)
    return alias_map, sorted_aliases

_ALIAS_MAP, _SORTED_ALIASES = _build_alias_map()
print(f"✅ Player alias map built: {len(_ALIAS_MAP)} aliases for name resolution.")


def resolve_player_names(question):
    """Replace player name aliases in the question with their unique_name.

    E.g. "Rohit Sharma strike rate" → "RG Sharma strike rate"
    Uses longest-match-first to avoid partial overlaps.
    """
    lower_q = question.lower()
    used = [False] * len(question)
    replacements = []  # (start, end, unique_name)

    for alias in _SORTED_ALIASES:
        alen = len(alias)
        idx = 0
        while idx <= len(lower_q) - alen:
            pos = lower_q.find(alias, idx)
            if pos == -1:
                break
            end = pos + alen

            # Word-boundary check: character before/after must not be alphanumeric
            before_ok = pos == 0 or not lower_q[pos - 1].isalnum()
            after_ok  = end >= len(lower_q) or not lower_q[end].isalnum()
            no_overlap = not any(used[pos:end])

            if before_ok and after_ok and no_overlap:
                unique_name = _ALIAS_MAP[alias]
                original    = question[pos:end]
                if original != unique_name:
                    replacements.append((pos, end, unique_name, original))
                    for i in range(pos, end):
                        used[i] = True
            idx = pos + 1

    if not replacements:
        return question

    # Apply right-to-left so earlier indices stay valid
    replacements.sort(key=lambda x: x[0], reverse=True)
    result = question
    for start, end, unique_name, original in replacements:
        print(f"🔁 Resolved: '{original}' → '{unique_name}'")
        result = result[:start] + unique_name + result[end:]

    return result

# ============================================================
# LOGIC BLOCK - ALL CORRECT FORMULAS (BATTLE-TESTED)
# ============================================================
LOGIC_BLOCK = """### DATABASE SCHEMA
**DELIVERIES (d):**
match_id, inning, batting_team, over, ball, batter, bowler, non_striker,
runs_batter, extras_type, runs_extras, runs_total, is_wicket, player_out, wicket_kind, is_powerplay

**MATCHES (m):**
match_id, event_name, season, date, venue, city, team1, team2, winner

**PLAYERS (p):**
unique_name, name, full_name, bowling_style, batting_style, playing_role, country

### BOWLING STYLES (EXACT VALUES - no abbreviations)
'Left-arm off-spin', 'Left-arm pace', 'Left-arm wrist-spin'
'Right-arm off-break', 'Right-arm off-spin', 'Right-arm pace', 'Right-arm wrist-spin'

### BATTING STYLES (EXACT VALUES)
'Left-hand bat', 'Right-hand bat'

### BOWLING TYPE PATTERNS
- Leg spinner (any arm):  p_bowler.bowling_style LIKE '%wrist-spin%'
- Off spinner (any arm):  p_bowler.bowling_style LIKE '%off-spin%' OR p_bowler.bowling_style LIKE '%off-break%'
- Pace (any arm):         p_bowler.bowling_style LIKE '%pace%'
- Left arm pace:          p_bowler.bowling_style = 'Left-arm pace'
- Right arm pace:         p_bowler.bowling_style = 'Right-arm pace'
- Left arm spin:          p_bowler.bowling_style LIKE 'Left-arm%' AND p_bowler.bowling_style LIKE '%spin%'
- Right arm spin:         p_bowler.bowling_style LIKE 'Right-arm%' AND p_bowler.bowling_style LIKE '%spin%'

### COMPETITIONS
- T20Is:  m.event_name NOT IN ('Indian Premier League', 'SA20')
- IPL:    m.event_name = 'Indian Premier League'
- SA20:   m.event_name = 'SA20'

### OVER PHASES
- Powerplay:    d.is_powerplay = 1
- Middle overs: d.over >= 6 AND d.over < 16
- Death overs:  d.over >= 16

### SUPER OVER EXCLUSION
- ALWAYS add: d.inning IN (1, 2)
- This filters out super overs (inning = 3+)

### VENUE FILTERING
- Use m.venue LIKE '%VenueName%'  (NOT m.city — city matches multiple venues)
- Examples: m.venue LIKE '%Wankhede%', m.venue LIKE '%Eden Gardens%'
- Exception: for city-wide questions (e.g. "in Mumbai") you may use m.city LIKE '%Mumbai%'

### YEAR / DATE FILTERING
- CAST(SUBSTR(m.date, 1, 4) AS INTEGER) >= 2024

### BATTING FORMULAS

**Balls Faced (excludes wides, includes no-balls):**
COUNT(CASE WHEN d.extras_type IS NULL OR d.extras_type != 'wides' THEN 1 END)

**Batting Runs:**
SUM(CASE WHEN d.batter = 'PLAYER' THEN d.runs_batter ELSE 0 END)

**Batting Strike Rate:**
(SUM(d.runs_batter) * 100.0 /
 NULLIF(COUNT(CASE WHEN d.extras_type IS NULL OR d.extras_type != 'wides' THEN 1 END), 0))

**Batting Average:**
SUM(CASE WHEN d.batter = 'PLAYER' THEN d.runs_batter ELSE 0 END) * 1.0 /
NULLIF(COUNT(CASE WHEN d.player_out = 'PLAYER'
    AND d.wicket_kind NOT IN ('retired hurt', 'retired not out') THEN 1 END), 0)

**Innings Count:**
COUNT(DISTINCT CASE WHEN d.inning IN (1, 2) THEN d.match_id || '-' || d.inning END)

**Dot Ball % (batting):**
(COUNT(CASE WHEN d.runs_batter = 0
    AND (d.extras_type IS NULL OR d.extras_type != 'wides') THEN 1 END) * 100.0 /
 NULLIF(COUNT(CASE WHEN d.extras_type IS NULL OR d.extras_type != 'wides' THEN 1 END), 0))

**Boundary % (batting) — runs from boundaries / total runs scored:**
(SUM(CASE WHEN d.runs_batter IN (4, 6) THEN d.runs_batter ELSE 0 END) * 100.0 /
 NULLIF(SUM(d.runs_batter), 0))

### NON-STRIKER RULE (CRITICAL)
- For batting AVERAGE and total runs: WHERE (d.batter = 'X' OR d.non_striker = 'X')
  Reason: player can be dismissed as non-striker (run out) — must capture those dismissals
- For strike rate / dot balls / boundaries: WHERE d.batter = 'X'
  Reason: only the striker faces balls

### DISMISSALS (CRITICAL)
- ALWAYS use d.player_out for dismissals, NEVER d.batter
- Exclude: 'retired hurt', 'retired not out'

### BOWLING FORMULAS

**Legal Balls (bowling — excludes wides AND no-balls; neither counts as a legal delivery):**
COUNT(CASE WHEN d.extras_type IS NULL OR d.extras_type NOT IN ('wides', 'noballs') THEN 1 END)

**Bowling Runs (excludes byes and leg-byes — not charged to bowler; no-ball penalty IS charged):**
SUM(CASE WHEN d.extras_type NOT IN ('byes', 'legbyes') OR d.extras_type IS NULL
    THEN d.runs_total ELSE 0 END)

**Bowling Wickets (excludes run outs, retired, obstructions):**
SUM(CASE WHEN d.is_wicket = 1
    AND d.wicket_kind NOT IN ('run out', 'retired hurt', 'retired out', 'obstructing the field')
    THEN 1 END)

**Bowling Economy:**
(SUM(CASE WHEN d.extras_type NOT IN ('byes', 'legbyes') OR d.extras_type IS NULL
     THEN d.runs_total ELSE 0 END) * 6.0 /
 NULLIF(COUNT(CASE WHEN d.extras_type IS NULL OR d.extras_type NOT IN ('wides', 'noballs') THEN 1 END), 0))

**Bowling Average:**
SUM(CASE WHEN d.extras_type NOT IN ('byes', 'legbyes') OR d.extras_type IS NULL
    THEN d.runs_total ELSE 0 END) * 1.0 /
NULLIF(SUM(CASE WHEN d.is_wicket = 1
    AND d.wicket_kind NOT IN ('run out', 'retired hurt', 'retired out', 'obstructing the field')
    THEN 1 END), 0)

**Bowling Strike Rate:**
COUNT(CASE WHEN d.extras_type IS NULL OR d.extras_type NOT IN ('wides', 'noballs') THEN 1 END) * 1.0 /
NULLIF(SUM(CASE WHEN d.is_wicket = 1
    AND d.wicket_kind NOT IN ('run out', 'retired hurt', 'retired out', 'obstructing the field')
    THEN 1 END), 0)

**Bowling Dot Ball % (bowler's perspective):**
(COUNT(CASE WHEN d.runs_total = 0
    AND (d.extras_type IS NULL OR d.extras_type NOT IN ('wides', 'noballs')) THEN 1 END) * 100.0 /
 NULLIF(COUNT(CASE WHEN d.extras_type IS NULL OR d.extras_type NOT IN ('wides', 'noballs') THEN 1 END), 0))

### JOIN PROTOCOLS
- Filter by bowler style:   JOIN players p_bowler ON d.bowler = p_bowler.unique_name
- Filter by batter hand:    JOIN players p_batter ON d.batter = p_batter.unique_name
- Never hardcode player names to represent a style/group
- Filtering batter stats BY bowler style: JOIN players p_bowler ON d.bowler = p_bowler.unique_name (even when no specific bowler is named)

### HEAD-TO-HEAD (batter vs bowler)
SELECT
    COUNT(DISTINCT CASE WHEN d.inning IN (1,2) THEN d.match_id||'-'||d.inning END) AS innings,
    SUM(CASE WHEN d.batter='BATTER' THEN d.runs_batter ELSE 0 END) AS runs,
    COUNT(CASE WHEN d.batter='BATTER'
        AND (d.extras_type IS NULL OR d.extras_type != 'wides') THEN 1 END) AS balls,
    COUNT(CASE WHEN d.player_out='BATTER'
        AND d.wicket_kind NOT IN ('retired hurt','retired not out','retired out') THEN 1 END) AS dismissals,
    (batting_runs * 1.0 / NULLIF(dismissals, 0)) AS average,
    (batting_runs * 100.0 / NULLIF(balls, 0)) AS strike_rate
FROM deliveries d JOIN matches m ON d.match_id = m.match_id
WHERE (d.batter='BATTER' OR d.non_striker='BATTER')
AND d.bowler='BOWLER'
AND d.inning IN (1, 2)

### TEAM WIN PERCENTAGE
SELECT
    COUNT(*) AS total_matches,
    COUNT(CASE WHEN m.winner='TEAM' THEN 1 END) AS wins,
    COUNT(CASE WHEN m.winner != 'TEAM' AND m.winner IS NOT NULL THEN 1 END) AS losses,
    (COUNT(CASE WHEN m.winner='TEAM' THEN 1 END) * 100.0 /
     NULLIF(COUNT(CASE WHEN m.winner IS NOT NULL THEN 1 END), 0)) AS win_pct
FROM matches m
WHERE (m.team1='TEAM' OR m.team2='TEAM')

### MILESTONE COUNTS (fifties / hundreds)
SELECT
    COUNT(CASE WHEN runs >= 50 AND runs < 100 THEN 1 END) AS fifties,
    COUNT(CASE WHEN runs >= 100 THEN 1 END) AS hundreds,
    MAX(runs) AS highest
FROM (
    SELECT d.match_id, d.inning, SUM(d.runs_batter) AS runs
    FROM deliveries d JOIN matches m ON d.match_id = m.match_id
    WHERE d.batter = 'PLAYER' AND d.inning IN (1, 2)
    GROUP BY d.match_id, d.inning
)

### CRITICAL RULES SUMMARY
1. ALWAYS add d.inning IN (1, 2) to exclude super overs
2. Batting average WHERE: (batter='X' OR non_striker='X')
3. Strike rate / dots / boundaries WHERE: batter='X' only
4. Dismissals: use player_out, never batter
5. Bowling runs: exclude byes/legbyes
6. Bowling wickets: exclude run outs / retired / obstruction
7. Balls faced (batting): exclude wides only — no-balls DO count for batters
7b. Legal balls (bowling): exclude BOTH wides AND no-balls — no-ball is not a legal delivery
8. Venue: use venue LIKE '%X%', not city (unless city-wide)
9. Division: always NULLIF(..., 0) and use 1.0 or 100.0 for float
10. Player names: use unique_name from players table
11. If filtering by bowler style in a batting query, ALWAYS add: JOIN players p_bowler ON d.bowler = p_bowler.unique_name
12. Any filter using m.event_name, m.venue, m.season, m.date REQUIRES: JOIN matches m ON d.match_id = m.match_id
"""

# ============================================================
# FEW-SHOT EXAMPLES (one per query pattern)
# ============================================================
FEW_SHOTS = """<|start_header_id|>user<|end_header_id|>
Question: Virat Kohli batting average vs off spinners in middle overs in T20Is?<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
SELECT
    COUNT(DISTINCT CASE WHEN d.inning IN (1, 2) THEN d.match_id || '-' || d.inning END) AS innings,
    SUM(CASE WHEN d.batter = 'V Kohli' THEN d.runs_batter ELSE 0 END) AS runs,
    COUNT(CASE WHEN d.player_out = 'V Kohli' AND d.wicket_kind NOT IN ('retired hurt', 'retired not out', 'retired out') THEN 1 END) AS dismissals,
    SUM(CASE WHEN d.batter = 'V Kohli' THEN d.runs_batter ELSE 0 END) * 1.0 /
        NULLIF(COUNT(CASE WHEN d.player_out = 'V Kohli' AND d.wicket_kind NOT IN ('retired hurt', 'retired not out', 'retired out') THEN 1 END), 0) AS average
FROM deliveries d
JOIN matches m ON d.match_id = m.match_id
JOIN players p_bowler ON d.bowler = p_bowler.unique_name
WHERE (d.batter = 'V Kohli' OR d.non_striker = 'V Kohli')
AND m.event_name NOT IN ('Indian Premier League', 'SA20')
AND d.inning IN (1, 2)
AND d.over >= 6 AND d.over < 16
AND (p_bowler.bowling_style LIKE '%off-spin%' OR p_bowler.bowling_style LIKE '%off-break%');<|eot_id|>

<|start_header_id|>user<|end_header_id|>
Question: Rohit Sharma strike rate vs leg spinners in powerplay in IPL?<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
SELECT
    SUM(d.runs_batter) AS runs,
    COUNT(CASE WHEN d.extras_type IS NULL OR d.extras_type != 'wides' THEN 1 END) AS balls,
    (SUM(d.runs_batter) * 100.0 /
        NULLIF(COUNT(CASE WHEN d.extras_type IS NULL OR d.extras_type != 'wides' THEN 1 END), 0)) AS strike_rate
FROM deliveries d
JOIN matches m ON d.match_id = m.match_id
JOIN players p_bowler ON d.bowler = p_bowler.unique_name
WHERE d.batter = 'RG Sharma'
AND m.event_name = 'Indian Premier League'
AND d.inning IN (1, 2)
AND d.is_powerplay = 1
AND p_bowler.bowling_style LIKE '%wrist-spin%';<|eot_id|>

<|start_header_id|>user<|end_header_id|>
Question: Tilak Varma dot ball percentage vs left arm pace in IPL?<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
SELECT
    COUNT(CASE WHEN d.extras_type IS NULL OR d.extras_type != 'wides' THEN 1 END) AS balls_faced,
    COUNT(CASE WHEN d.runs_batter = 0 AND (d.extras_type IS NULL OR d.extras_type != 'wides') THEN 1 END) AS dot_balls,
    (COUNT(CASE WHEN d.runs_batter = 0 AND (d.extras_type IS NULL OR d.extras_type != 'wides') THEN 1 END) * 100.0 /
        NULLIF(COUNT(CASE WHEN d.extras_type IS NULL OR d.extras_type != 'wides' THEN 1 END), 0)) AS dot_ball_pct
FROM deliveries d
JOIN matches m ON d.match_id = m.match_id
JOIN players p_bowler ON d.bowler = p_bowler.unique_name
WHERE d.batter = 'Tilak Varma'
AND m.event_name = 'Indian Premier League'
AND d.inning IN (1, 2)
AND p_bowler.bowling_style = 'Left-arm pace';<|eot_id|>

<|start_header_id|>user<|end_header_id|>
Question: Abhishek Sharma boundary percentage in IPL?<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
SELECT
    SUM(d.runs_batter) AS total_runs,
    SUM(CASE WHEN d.runs_batter IN (4, 6) THEN d.runs_batter ELSE 0 END) AS boundary_runs,
    COUNT(CASE WHEN d.runs_batter = 4 THEN 1 END) AS fours,
    COUNT(CASE WHEN d.runs_batter = 6 THEN 1 END) AS sixes,
    (SUM(CASE WHEN d.runs_batter IN (4, 6) THEN d.runs_batter ELSE 0 END) * 100.0 /
        NULLIF(SUM(d.runs_batter), 0)) AS boundary_pct
FROM deliveries d
JOIN matches m ON d.match_id = m.match_id
WHERE d.batter = 'Abhishek Sharma'
AND m.event_name = 'Indian Premier League'
AND d.inning IN (1, 2);<|eot_id|>

<|start_header_id|>user<|end_header_id|>
Question: Jasprit Bumrah bowling average and economy in IPL?<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
SELECT
    COUNT(DISTINCT d.match_id) AS matches,
    COUNT(CASE WHEN d.extras_type IS NULL OR d.extras_type NOT IN ('wides', 'noballs') THEN 1 END) AS balls,
    ROUND(COUNT(CASE WHEN d.extras_type IS NULL OR d.extras_type NOT IN ('wides', 'noballs') THEN 1 END) * 1.0 / 6, 1) AS overs,
    SUM(CASE WHEN d.extras_type NOT IN ('byes', 'legbyes') OR d.extras_type IS NULL THEN d.runs_total ELSE 0 END) AS runs,
    SUM(CASE WHEN d.is_wicket = 1 AND d.wicket_kind NOT IN ('run out', 'retired hurt', 'retired out', 'obstructing the field') THEN 1 END) AS wickets,
    SUM(CASE WHEN d.extras_type NOT IN ('byes', 'legbyes') OR d.extras_type IS NULL THEN d.runs_total ELSE 0 END) * 1.0 /
        NULLIF(SUM(CASE WHEN d.is_wicket = 1 AND d.wicket_kind NOT IN ('run out', 'retired hurt', 'retired out', 'obstructing the field') THEN 1 END), 0) AS bowling_average,
    (SUM(CASE WHEN d.extras_type NOT IN ('byes', 'legbyes') OR d.extras_type IS NULL THEN d.runs_total ELSE 0 END) * 6.0 /
        NULLIF(COUNT(CASE WHEN d.extras_type IS NULL OR d.extras_type NOT IN ('wides', 'noballs') THEN 1 END), 0)) AS economy
FROM deliveries d
JOIN matches m ON d.match_id = m.match_id
WHERE d.bowler = 'JJ Bumrah'
AND m.event_name = 'Indian Premier League'
AND d.inning IN (1, 2);<|eot_id|>

<|start_header_id|>user<|end_header_id|>
Question: Keshav Maharaj economy vs left handers in middle overs in SA20?<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
SELECT
    COUNT(CASE WHEN d.extras_type IS NULL OR d.extras_type NOT IN ('wides', 'noballs') THEN 1 END) AS balls,
    SUM(CASE WHEN d.extras_type NOT IN ('byes', 'legbyes') OR d.extras_type IS NULL THEN d.runs_total ELSE 0 END) AS runs,
    (SUM(CASE WHEN d.extras_type NOT IN ('byes', 'legbyes') OR d.extras_type IS NULL THEN d.runs_total ELSE 0 END) * 6.0 /
        NULLIF(COUNT(CASE WHEN d.extras_type IS NULL OR d.extras_type NOT IN ('wides', 'noballs') THEN 1 END), 0)) AS economy
FROM deliveries d
JOIN matches m ON d.match_id = m.match_id
JOIN players p_batter ON d.batter = p_batter.unique_name
WHERE d.bowler = 'Keshav Maharaj'
AND m.event_name = 'SA20'
AND d.inning IN (1, 2)
AND d.over >= 6 AND d.over < 16
AND p_batter.batting_style = 'Left-hand bat';<|eot_id|>

<|start_header_id|>user<|end_header_id|>
Question: Rashid Khan dot ball percentage as a bowler in SA20?<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
SELECT
    COUNT(CASE WHEN d.extras_type IS NULL OR d.extras_type NOT IN ('wides', 'noballs') THEN 1 END) AS balls,
    COUNT(CASE WHEN d.runs_total = 0 AND (d.extras_type IS NULL OR d.extras_type NOT IN ('wides', 'noballs')) THEN 1 END) AS dot_balls,
    (COUNT(CASE WHEN d.runs_total = 0 AND (d.extras_type IS NULL OR d.extras_type NOT IN ('wides', 'noballs')) THEN 1 END) * 100.0 /
        NULLIF(COUNT(CASE WHEN d.extras_type IS NULL OR d.extras_type NOT IN ('wides', 'noballs') THEN 1 END), 0)) AS dot_ball_pct
FROM deliveries d
JOIN matches m ON d.match_id = m.match_id
WHERE d.bowler = 'Rashid Khan'
AND m.event_name = 'SA20'
AND d.inning IN (1, 2);<|eot_id|>

<|start_header_id|>user<|end_header_id|>
Question: Corbin Bosch bowling strike rate in powerplay in T20Is since 2024?<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
SELECT
    COUNT(CASE WHEN d.extras_type IS NULL OR d.extras_type NOT IN ('wides', 'noballs') THEN 1 END) AS balls,
    SUM(CASE WHEN d.is_wicket = 1 AND d.wicket_kind NOT IN ('run out', 'retired hurt', 'retired out', 'obstructing the field') THEN 1 END) AS wickets,
    (COUNT(CASE WHEN d.extras_type IS NULL OR d.extras_type NOT IN ('wides', 'noballs') THEN 1 END) * 1.0 /
        NULLIF(SUM(CASE WHEN d.is_wicket = 1 AND d.wicket_kind NOT IN ('run out', 'retired hurt', 'retired out', 'obstructing the field') THEN 1 END), 0)) AS bowling_sr
FROM deliveries d
JOIN matches m ON d.match_id = m.match_id
WHERE d.bowler = 'Corbin Bosch'
AND m.event_name NOT IN ('Indian Premier League', 'SA20')
AND d.inning IN (1, 2)
AND d.is_powerplay = 1
AND CAST(SUBSTR(m.date, 1, 4) AS INTEGER) >= 2024;<|eot_id|>

<|start_header_id|>user<|end_header_id|>
Question: Mitchell Starc vs Rohit Sharma in Indian Premier League?<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
SELECT
    COUNT(DISTINCT CASE WHEN d.inning IN (1, 2) THEN d.match_id || '-' || d.inning END) AS innings,
    SUM(CASE WHEN d.batter = 'RG Sharma' THEN d.runs_batter ELSE 0 END) AS runs,
    COUNT(CASE WHEN d.batter = 'RG Sharma' AND (d.extras_type IS NULL OR d.extras_type != 'wides') THEN 1 END) AS balls_faced,
    COUNT(CASE WHEN d.player_out = 'RG Sharma' AND d.wicket_kind NOT IN ('retired hurt', 'retired not out', 'retired out') THEN 1 END) AS dismissals,
    SUM(CASE WHEN d.batter = 'RG Sharma' THEN d.runs_batter ELSE 0 END) * 1.0 /
        NULLIF(COUNT(CASE WHEN d.player_out = 'RG Sharma' AND d.wicket_kind NOT IN ('retired hurt', 'retired not out', 'retired out') THEN 1 END), 0) AS average,
    (SUM(CASE WHEN d.batter = 'RG Sharma' THEN d.runs_batter ELSE 0 END) * 100.0 /
        NULLIF(COUNT(CASE WHEN d.batter = 'RG Sharma' AND (d.extras_type IS NULL OR d.extras_type != 'wides') THEN 1 END), 0)) AS strike_rate
FROM deliveries d
JOIN matches m ON d.match_id = m.match_id
WHERE (d.batter = 'RG Sharma' OR d.non_striker = 'RG Sharma')
AND d.bowler = 'MA Starc'
AND m.event_name = 'Indian Premier League'
AND d.inning IN (1, 2);<|eot_id|>

<|start_header_id|>user<|end_header_id|>
Question: Quinton De Kock batting average vs India at Eden Gardens?<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
SELECT
    COUNT(DISTINCT CASE WHEN d.inning IN (1, 2) THEN d.match_id || '-' || d.inning END) AS innings,
    SUM(CASE WHEN d.batter = 'Q de Kock' THEN d.runs_batter ELSE 0 END) AS runs,
    COUNT(CASE WHEN d.player_out = 'Q de Kock' AND d.wicket_kind NOT IN ('retired hurt', 'retired not out') THEN 1 END) AS dismissals,
    SUM(CASE WHEN d.batter = 'Q de Kock' THEN d.runs_batter ELSE 0 END) * 1.0 /
        NULLIF(COUNT(CASE WHEN d.player_out = 'Q de Kock' AND d.wicket_kind NOT IN ('retired hurt', 'retired not out') THEN 1 END), 0) AS average
FROM deliveries d
JOIN matches m ON d.match_id = m.match_id
WHERE (d.batter = 'Q de Kock' OR d.non_striker = 'Q de Kock')
AND d.batting_team != 'India'
AND (m.team1 = 'India' OR m.team2 = 'India')
AND m.venue LIKE '%Eden Gardens%'
AND d.inning IN (1, 2);<|eot_id|>

<|start_header_id|>user<|end_header_id|>
Question: Mumbai Indians win percentage at Wankhede Stadium in IPL?<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
SELECT
    COUNT(*) AS total_matches,
    COUNT(CASE WHEN m.winner = 'Mumbai Indians' THEN 1 END) AS wins,
    COUNT(CASE WHEN m.winner != 'Mumbai Indians' AND m.winner IS NOT NULL THEN 1 END) AS losses,
    (COUNT(CASE WHEN m.winner = 'Mumbai Indians' THEN 1 END) * 100.0 /
        NULLIF(COUNT(CASE WHEN m.winner IS NOT NULL THEN 1 END), 0)) AS win_pct
FROM matches m
WHERE (m.team1 = 'Mumbai Indians' OR m.team2 = 'Mumbai Indians')
AND m.event_name = 'Indian Premier League'
AND m.venue LIKE '%Wankhede%';<|eot_id|>

<|start_header_id|>user<|end_header_id|>
Question: Percentage of wins by chasing team at MA Chidambaram Stadium in IPL?<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
SELECT
    COUNT(DISTINCT m.match_id) AS total_matches,
    COUNT(DISTINCT CASE WHEN m.winner IN (
        SELECT DISTINCT d2.batting_team FROM deliveries d2
        WHERE d2.match_id = m.match_id AND d2.inning = 2 LIMIT 1
    ) THEN m.match_id END) AS chasing_wins,
    (COUNT(DISTINCT CASE WHEN m.winner IN (
        SELECT DISTINCT d2.batting_team FROM deliveries d2
        WHERE d2.match_id = m.match_id AND d2.inning = 2 LIMIT 1
    ) THEN m.match_id END) * 100.0 /
    NULLIF(COUNT(DISTINCT CASE WHEN m.winner IS NOT NULL THEN m.match_id END), 0)) AS chasing_win_pct
FROM matches m
WHERE m.venue LIKE '%Chidambaram%'
AND m.event_name = 'Indian Premier League';<|eot_id|>

<|start_header_id|>user<|end_header_id|>
Question: India vs Pakistan head to head in T20Is?<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
SELECT
    COUNT(*) AS total_matches,
    COUNT(CASE WHEN m.winner = 'India' THEN 1 END) AS india_wins,
    COUNT(CASE WHEN m.winner = 'Pakistan' THEN 1 END) AS pakistan_wins,
    COUNT(CASE WHEN m.winner IS NULL THEN 1 END) AS no_result,
    (COUNT(CASE WHEN m.winner = 'India' THEN 1 END) * 100.0 /
        NULLIF(COUNT(CASE WHEN m.winner IS NOT NULL THEN 1 END), 0)) AS india_win_pct
FROM matches m
WHERE ((m.team1 = 'India' AND m.team2 = 'Pakistan')
    OR (m.team1 = 'Pakistan' AND m.team2 = 'India'))
AND m.event_name NOT IN ('Indian Premier League', 'SA20');<|eot_id|>

<|start_header_id|>user<|end_header_id|>
Question: Tim David fifties and hundreds vs South Africa in T20Is?<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
SELECT
    COUNT(CASE WHEN runs >= 50 AND runs < 100 THEN 1 END) AS fifties,
    COUNT(CASE WHEN runs >= 100 THEN 1 END) AS hundreds,
    MAX(runs) AS highest_score
FROM (
    SELECT d.match_id, d.inning, SUM(d.runs_batter) AS runs
    FROM deliveries d
    JOIN matches m ON d.match_id = m.match_id
    WHERE d.batter = 'Tim David'
    AND d.inning IN (1, 2)
    AND m.event_name NOT IN ('Indian Premier League', 'SA20')
    AND (m.team1 = 'South Africa' OR m.team2 = 'South Africa')
    GROUP BY d.match_id, d.inning
);<|eot_id|>

<|start_header_id|>user<|end_header_id|>
Question: Virat Kohli IPL stats season by season?<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
SELECT
    m.season,
    COUNT(DISTINCT CASE WHEN d.inning IN (1, 2) THEN d.match_id || '-' || d.inning END) AS innings,
    SUM(CASE WHEN d.batter = 'V Kohli' THEN d.runs_batter ELSE 0 END) AS runs,
    SUM(CASE WHEN d.batter = 'V Kohli' THEN d.runs_batter ELSE 0 END) * 1.0 /
        NULLIF(COUNT(CASE WHEN d.player_out = 'V Kohli' AND d.wicket_kind NOT IN ('retired hurt', 'retired not out') THEN 1 END), 0) AS average,
    (SUM(CASE WHEN d.batter = 'V Kohli' THEN d.runs_batter ELSE 0 END) * 100.0 /
        NULLIF(COUNT(CASE WHEN d.batter = 'V Kohli' AND (d.extras_type IS NULL OR d.extras_type != 'wides') THEN 1 END), 0)) AS strike_rate
FROM deliveries d
JOIN matches m ON d.match_id = m.match_id
WHERE (d.batter = 'V Kohli' OR d.non_striker = 'V Kohli')
AND m.event_name = 'Indian Premier League'
AND d.inning IN (1, 2)
GROUP BY m.season
ORDER BY m.season DESC;<|eot_id|>

<|start_header_id|>user<|end_header_id|>
Question: Rohit Sharma batting average vs spinners in IPL?<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
SELECT
    SUM(CASE WHEN d.batter = 'RG Sharma' THEN d.runs_batter ELSE 0 END) AS runs,
    COUNT(CASE WHEN d.player_out = 'RG Sharma' AND d.wicket_kind NOT IN ('retired hurt', 'retired not out', 'retired out') THEN 1 END) AS dismissals,
    SUM(CASE WHEN d.batter = 'RG Sharma' THEN d.runs_batter ELSE 0 END) * 1.0 /
        NULLIF(COUNT(CASE WHEN d.player_out = 'RG Sharma' AND d.wicket_kind NOT IN ('retired hurt', 'retired not out', 'retired out') THEN 1 END), 0) AS average
FROM deliveries d
JOIN matches m ON d.match_id = m.match_id
JOIN players p_bowler ON d.bowler = p_bowler.unique_name
WHERE (d.batter = 'RG Sharma' OR d.non_striker = 'RG Sharma')
AND m.event_name = 'Indian Premier League'
AND d.inning IN (1, 2)
AND p_bowler.bowling_style LIKE '%spin%';<|eot_id|>

<|start_header_id|>user<|end_header_id|>
Question: Virat Kohli strike rate vs pace bowlers in death overs in IPL?<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>
SELECT
    SUM(d.runs_batter) AS runs,
    COUNT(CASE WHEN d.extras_type IS NULL OR d.extras_type != 'wides' THEN 1 END) AS balls,
    (SUM(d.runs_batter) * 100.0 /
        NULLIF(COUNT(CASE WHEN d.extras_type IS NULL OR d.extras_type != 'wides' THEN 1 END), 0)) AS strike_rate
FROM deliveries d
JOIN matches m ON d.match_id = m.match_id
JOIN players p_bowler ON d.bowler = p_bowler.unique_name
WHERE d.batter = 'V Kohli'
AND m.event_name = 'Indian Premier League'
AND d.inning IN (1, 2)
AND d.over >= 16
AND p_bowler.bowling_style LIKE '%pace%';<|eot_id|>"""

def fix_joins(sql):
    # Fix old powerplay pattern
    import re
    sql = re.sub(r'd\.over\s*>=\s*0\s*AND\s*d\.over\s*<\s*[67]', 'd.is_powerplay = 1', sql)
    
    if 'FROM deliveries d' not in sql:
        return sql

    if 'JOIN matches m' not in sql:
        sql = sql.replace(
            'FROM deliveries d',
            'FROM deliveries d\nJOIN matches m ON d.match_id = m.match_id'
        )
    
    if 'p_bowler' in sql and 'JOIN players p_bowler' not in sql:
        sql = sql.replace(
            'JOIN matches m ON d.match_id = m.match_id',
            'JOIN matches m ON d.match_id = m.match_id\nLEFT JOIN players p_bowler ON d.bowler = p_bowler.unique_name'
        )
    
    if 'p_batter' in sql and 'JOIN players p_batter' not in sql:
        sql = sql.replace(
            'JOIN matches m ON d.match_id = m.match_id',
            'JOIN matches m ON d.match_id = m.match_id\nLEFT JOIN players p_batter ON d.batter = p_batter.unique_name'
        )

    return sql


# ============================================================
# QUERY RUNNER
# ============================================================
def run_query(question):
    """Generate SQL from a natural-language question and execute it.

    Returns:
        (sql, columns, rows, error)
        - sql:     the generated SQL string
        - columns: list of column name strings
        - rows:    list of dicts {column: value}
        - error:   error string if execution failed, else None
    """
    SYSTEM_PROMPT = f"""You are an expert Cricket SQL Query Generator for a SQLite database.

CRITICAL INSTRUCTIONS:
1. Use EXACT column and table names from the schema
2. Use EXACT bowling_style and batting_style values
3. ALWAYS add d.inning IN (1, 2) to exclude super overs
4. Batting average WHERE: (d.batter='X' OR d.non_striker='X')
5. Strike rate / dot balls / boundaries WHERE: d.batter='X' only
6. Dismissals: always use d.player_out, never d.batter
7. Bowling runs: exclude byes and legbyes from d.runs_total
8. Balls faced (batting strike rate): exclude wides only — no-balls count for the batter
8b. Legal balls (bowling economy/SR): exclude BOTH wides AND no-balls (not legal deliveries)
9. Boundary %: runs from boundaries / total runs scored (not count/balls)
10. Venue: use m.venue LIKE '%X%', not m.city
11. Return ONLY the SQL query, no explanation
12. Any filter using m.event_name, m.venue, m.season, m.date REQUIRES: JOIN matches m ON d.match_id = m.match_id

{LOGIC_BLOCK}"""

    prompt = f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>
{SYSTEM_PROMPT}<|eot_id|>

{FEW_SHOTS}

<|start_header_id|>user<|end_header_id|>
Question: {question}<|eot_id|>
<|start_header_id|>assistant<|end_header_id|>"""

    question = resolve_player_names(question)
    print(f"📝 Question (resolved): {question}")
    print("🤔 Generating SQL...")
    output = generate(model, tokenizer, prompt=prompt, max_tokens=600)

    # Clean output
    sql = output.strip()
    if "SELECT" in sql:
        sql = sql[sql.index("SELECT"):]
    sql = sql.split("<|eot_id|>")[0].split("```")[0].strip()
    if not sql.endswith(";"):
        sql = sql.split(";")[0] + ";"

    sql = fix_joins(sql)

    print(f"\n🖥️  Generated SQL:\n{sql}\n")

    # Execute
    try:
        conn = sqlite3.connect("./cricket_assistant.db")
        cursor = conn.cursor()
        cursor.execute(sql)
        raw_rows = cursor.fetchall()
        col_names = [desc[0] for desc in cursor.description] if cursor.description else []
        rows = [dict(zip(col_names, row)) for row in raw_rows]
        conn.close()

        if rows:
            print("📊 Results:")
            print("   " + " | ".join(f"{c:<18}" for c in col_names))
            print("   " + "-" * (21 * len(col_names)))
            for row in rows:
                print("   " + " | ".join(f"{str(row[c]):<18}" for c in col_names))
        else:
            print("📊 No data found.")

        return sql, col_names, rows, None
    except Exception as e:
        print(f"⚠️  SQL Error: {e}")
        return sql, [], [], str(e)


# ============================================================
# MAIN LOOP (only when run as a script)
# ============================================================
if __name__ == "__main__":
    print("=" * 60)
    print("🏏 CRICKET SQL ANALYST - READY")
    print("=" * 60)
    print("\nExample questions:")
    print("  - Rohit Sharma strike rate vs leg spinners in powerplay IPL")
    print("  - Tilak Varma dot ball percentage in IPL")
    print("  - Abhishek Sharma boundary percentage in IPL")
    print("  - Jasprit Bumrah economy in death overs T20Is")
    print("  - Mitchell Starc vs Rohit Sharma in IPL")
    print("  - Mumbai Indians win percentage at Wankhede")
    print("  - India vs Pakistan head to head T20Is")
    print("  - Virat Kohli IPL stats season by season")
    print("\nType 'exit' to quit.\n")

    while True:
        q = input("🏏 Question: ").strip()
        if q.lower() in ["exit", "quit", "q"]:
            print("\n👋 Goodbye!")
            break
        if q:
            run_query(q)
            print()