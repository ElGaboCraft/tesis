#!/bin/sh
# entrypoint.sh — aplica migraciones y arranca gunicorn.

set -e

echo ">>> Aplicando migraciones..."
python manage.py migrate

echo ">>> Recopilando archivos estáticos..."
python manage.py collectstatic --noinput

echo ">>> Iniciando gunicorn..."
exec gunicorn backend.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --timeout 120
