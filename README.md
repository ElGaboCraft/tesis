# Task Management con Django + React

Aplicacion full-stack para gestion profesional de tareas.

Incluye:

- Backend con Django + Django REST Framework
- Frontend con React + Vite
- Base de datos SQLite (persistente en volumen Docker)
- Tablero por estados, resumen operativo, filtros y CRUD completo

## Arquitectura

El despliegue principal usa un unico Docker Compose con dos contenedores:

1. backend (Django + gunicorn)
2. nginx (sirve React y hace proxy a /api/)

Flujo:

cliente -> nginx -> frontend React
cliente -> nginx -> /api/ -> backend Django

No requiere servicio extra de base de datos, ya que usa SQLite.

## Estructura del proyecto

- backend/: configuracion Django
- tasks/: modelos, vistas API, admin, tests y comandos
- frontend/: app React + Vite
- docker-compose.yml: orquestacion completa
- Dockerfile: imagen backend
- frontend/Dockerfile.nginx: build frontend + nginx

## Despliegue rapido con Docker (recomendado)

### 1) Clonar repositorio

```bash
git clone https://github.com/ElGaboCraft/tesis.git
cd tesis
```

### 2) Crear archivo de entorno

```bash
cp .env.example .env
```

Editar .env y definir al menos:

```env
SECRET_KEY=TU_SECRET_KEY_SEGURA
DEBUG=False
ALLOWED_HOSTS=TU_IP_O_DOMINIO
PORT=8088
DATABASE_URL=sqlite:////app/data/db.sqlite3
USE_X_FORWARDED_HOST=True
TRUST_X_FORWARDED_PROTO=True
```

### 3) Construir y levantar

```bash
docker compose up -d --build
```

### 4) Verificar

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f nginx
```

### 5) Acceso

- Por IP y puerto: http://TU_IP:8088

## Actualizar despliegue despues de un push

```bash
cd ~/tesis && git pull --ff-only && docker compose up -d --build --force-recreate
```

## Auto deploy simple (opcional)

```bash
nohup bash -lc 'cd ~/tesis && while true; do git fetch origin main >/dev/null 2>&1; if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then git pull --ff-only && docker compose up -d --build --force-recreate; fi; sleep 20; done' > ~/tesis/autodeploy.log 2>&1 &
```

Ver log:

```bash
tail -f ~/tesis/autodeploy.log
```

Detener:

```bash
pkill -f "git fetch origin main"
```

## Endpoints API principales

- GET /api/tasks/
- POST /api/tasks/
- PATCH /api/tasks/:id/
- DELETE /api/tasks/:id/
- GET /api/tasks/summary/
- GET /api/tasks/board/

## Desarrollo local (sin Docker)

Backend:

```powershell
c:/Desarrollos/Tesis/.venv/Scripts/python.exe -m pip install -r requirements.txt
c:/Desarrollos/Tesis/.venv/Scripts/python.exe manage.py migrate
c:/Desarrollos/Tesis/.venv/Scripts/python.exe manage.py runserver
```

Frontend:

```powershell
Set-Location frontend
npm install
npm run dev
```

## Credenciales admin por defecto

- Usuario: root
- Contrasena: tavf^P^tT8Rvdm!=gbLA
