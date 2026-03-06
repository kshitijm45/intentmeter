#!/bin/sh
# On Render (no persistent disk), download the DB from a GitHub Release
# if it's not already present. Set DB_DOWNLOAD_URL as an env var in Render.
python -c "
import os, urllib.request, sys

db  = os.environ.get('DATABASE_URL', './cricket_assistant.db')
url = os.environ.get('DB_DOWNLOAD_URL', '')

if not os.path.exists(db):
    if not url:
        print('ERROR: DB not found and DB_DOWNLOAD_URL is not set.', flush=True)
        sys.exit(1)
    print(f'Downloading database from GitHub Release...', flush=True)
    urllib.request.urlretrieve(url, db)
    print('Database ready.', flush=True)
else:
    print(f'Database found at {db}.', flush=True)
"

exec uvicorn main:app --host 0.0.0.0 --port 8080
