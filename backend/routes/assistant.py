from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

# ── Load model once at server startup ────────────────────────────────────────
# mlx_lm only works on Apple Silicon. On other platforms the import will fail
# and the endpoint returns a clear error rather than crashing the server.
try:
    from gemini_model import run_query as _run_query  # noqa: E402
    MODEL_AVAILABLE = True
    print("✅ Gemini Cricket-SQL assistant ready.")
except Exception as _load_err:
    MODEL_AVAILABLE = False
    _load_err_msg = str(_load_err)
    print(f"⚠️  Could not load gemini_model: {_load_err_msg}")


class AskRequest(BaseModel):
    question: str


@router.post("/assistant")
def ask(req: AskRequest):
    if not MODEL_AVAILABLE:
        return {
            "error": "Model unavailable — mlx_lm could not be loaded on this machine.",
            "sql": None,
            "columns": [],
            "rows": [],
        }

    sql, columns, rows, error = _run_query(req.question)

    if error:
        return {"error": error, "sql": sql, "columns": [], "rows": []}

    return {"sql": sql, "columns": columns, "rows": rows, "error": None}
