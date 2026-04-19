import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import matchup, players, compare, stats, assistant, profile, query

app = FastAPI()

_extra = os.environ.get("ALLOWED_ORIGINS", "")
_origins = ["http://localhost:3000"] + [o.strip() for o in _extra.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.api_route("/", methods=["GET", "HEAD"])
def health():
    return {"status": "ok"}

app.include_router(matchup.router, prefix="/api")
app.include_router(players.router, prefix="/api")
app.include_router(compare.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(assistant.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(query.router, prefix="/api")