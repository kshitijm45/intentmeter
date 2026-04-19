from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_db

router = APIRouter()


class QueryRequest(BaseModel):
    sql: str


@router.post("/query")
def run_query(body: QueryRequest):
    sql = body.sql.strip()
    if not sql:
        raise HTTPException(status_code=400, detail="Empty query")

    # Block writes — this endpoint is read-only
    first = sql.split()[0].upper()
    if first not in ("SELECT", "WITH", "EXPLAIN", "PRAGMA"):
        raise HTTPException(status_code=400, detail="Only SELECT/WITH/EXPLAIN/PRAGMA queries are allowed")

    try:
        with get_db() as db:
            cur = db.execute(sql)
            columns = [d[0] for d in cur.description] if cur.description else []
            rows = cur.fetchmany(500)
            return {
                "columns": columns,
                "rows": [list(r) for r in rows],
                "count": len(rows),
            }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
