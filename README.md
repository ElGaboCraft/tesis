# Task Management con Django + React

Aplicacion full-stack para gestion profesional de tareas con:

- Backend en Django + Django REST Framework
- Base de datos SQLite
- Frontend en React + Vite
- Tablero por estados, filtros, resumen operativo y CRUD completo

## Estructura

- `backend/`: configuracion del proyecto Django
- `tasks/`: dominio, API REST, admin, pruebas y comando de demo
- `frontend/`: interfaz React conectada al backend

## Backend

Instalar dependencias:

```powershell
c:/Desarrollos/Tesis/.venv/Scripts/python.exe -m pip install -r requirements.txt
```

Migrar base de datos:

```powershell
c:/Desarrollos/Tesis/.venv/Scripts/python.exe manage.py migrate
```

Cargar datos demo opcionales:

```powershell
c:/Desarrollos/Tesis/.venv/Scripts/python.exe manage.py seed_tasks
```

Levantar backend:

```powershell
c:/Desarrollos/Tesis/.venv/Scripts/python.exe manage.py runserver
```

## Frontend

Instalar dependencias:

```powershell
Set-Location frontend
npm install
```

Levantar frontend:

```powershell
Set-Location frontend
npm run dev
```

## Endpoints principales

- `GET /api/tasks/`
- `POST /api/tasks/`
- `PATCH /api/tasks/:id/`
- `DELETE /api/tasks/:id/`
- `GET /api/tasks/summary/`
- `GET /api/tasks/board/`

## Validacion ejecutada

- `manage.py migrate`
- `manage.py test`
- `npm run build`

## Despliegue en Dokploy (Nixpacks)

Este repositorio esta preparado para desplegarse como dos servicios:

1. Backend Django (raiz del repo)
2. Frontend React (carpeta `frontend`)

### Backend

- Usa `Procfile` para arrancar con `gunicorn`.
- Variables recomendadas en produccion:
  - `SECRET_KEY`
  - `DEBUG=False`
  - `ALLOWED_HOSTS`
  - `CORS_ALLOWED_ORIGINS`
  - `CSRF_TRUSTED_ORIGINS`
  - `FRONTEND_URL`
  - `DATABASE_URL`

Referencia: `.env.example`

### Frontend

- Nixpacks usa `npm start` (ya configurado en `frontend/package.json`).
- Variable clave:
  - `VITE_API_BASE_URL=https://api.tu-dominio.com/api`

Referencia: `frontend/.env.example`

### Guia extendida

Usuario: `root`
Contraseña: `Teyvat2025*`