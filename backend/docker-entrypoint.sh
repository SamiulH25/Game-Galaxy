#!/bin/sh
set -e
cd "$(dirname "$0")/.."
cd backend
alembic upgrade head
exec uvicorn app.main:app --host "${HOST:-0.0.0.0}" --port "${PORT:-4321}"
