#!/bin/sh
# entrypoint.sh — espera que Postgres esté listo, migra y arranca gunicorn.

set -e

echo ">>> Esperando que la base de datos esté disponible..."
until python - <<'EOF'
import os, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()
from django.db import connections
try:
    connections['default'].ensure_connection()
    print("BD lista.")
except Exception as e:
    print(f"BD no disponible: {e}")
    sys.exit(1)
EOF
do
    echo "    Reintentando en 2 segundos..."
    sleep 2
done

echo ">>> Aplicando migraciones..."
python manage.py migrate

echo ">>> Recopilando archivos estáticos..."
python manage.py collectstatic --noinput

echo ">>> Iniciando gunicorn..."
exec gunicorn backend.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --timeout 120
