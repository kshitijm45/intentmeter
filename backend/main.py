from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import matchup, players, compare, stats, assistant

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(matchup.router, prefix="/api")
app.include_router(players.router, prefix="/api")
app.include_router(compare.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(assistant.router, prefix="/api")