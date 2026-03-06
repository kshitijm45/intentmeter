import os
import sqlite3

DB_PATH = os.environ.get("DATABASE_URL", "./cricket_assistant.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # returns dict-like rows
    return conn