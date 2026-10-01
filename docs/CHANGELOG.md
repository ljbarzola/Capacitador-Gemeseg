# Changelog

## 2026-09-30 — Sesión 2 (Fase 0, infraestructura GCP, paso a paso con el usuario)
- Proyecto GCP `capacitaciongemeseg` creado por el usuario. Había llegado al límite de 5 proyectos por cuenta de facturación; se liberó cupo quitando la facturación a un "Default Gemini Project" sin uso detectado, y se vinculó el proyecto nuevo.
- APIs habilitadas: Cloud Run, Cloud SQL Admin, Cloud Build, Artifact Registry, Secret Manager, Cloud Storage, Identity Toolkit y Firebase.
- Firebase agregado al proyecto; Authentication con correo/contraseña habilitado.
- App web registrada en Firebase (`1:636310739015:web:f795554051ec1629c7f962`); su configuración pública va en `.env` (local, ignorado) y los nombres de variable en `.env.example`.
- Región elegida: `us-east1`. Cloud SQL `capacitador-db` (PostgreSQL 16, edición Enterprise, `db-f1-micro`, sin alta disponibilidad, 10 GB con autoaumento, respaldo diario 05:00 UTC). Conexión: `capacitaciongemeseg:us-east1:capacitador-db`. Se subirá a `db-custom-1-3840` cuando haya usuarios reales.
- Base `capacitador` y usuario `app`; la contraseña se generó al azar y vive **solo** en el secreto `DATABASE_URL` de Secret Manager.
- Artifact Registry `capacitador` (Docker, `us-east1`) y bucket privado `gs://capacitaciongemeseg-media` (acceso público bloqueado).
- Permisos de la cuenta de servicio de Compute (la que ejecuta Cloud Run): `cloudsql.client`, acceso al secreto `DATABASE_URL` y `storage.objectAdmin` sobre el bucket.
- GitHub conectado a Cloud Build (1.ª generación). Activador `deploy-main`: push a `^main$` ejecuta `cloudbuild.yaml`. En proyectos nuevos hay que indicar la cuenta de servicio del activador; se usa la de Compute (`636310739015-compute@developer.gserviceaccount.com`) con `run.admin`, `artifactregistry.writer`, `logging.logWriter`, `cloudbuild.builds.builder` y `iam.serviceAccountUser` sobre sí misma.
- Primer despliegue en Cloud Run: https://capacitador-gemeseg-lshoj7uz4q-ue.a.run.app (`/api/health` responde ok con la base conectada).
- El usuario `app` pasó a ser dueño de la base `capacitador` (hecho a mano en Cloud SQL Studio como `postgres`; así puede crear tablas en `public`).
- `cloudbuild.yaml` ahora tiene el paso `migrate`: corre `prisma migrate deploy` con el Cloud SQL Auth Proxy (socket `/cloudsql`) antes de desplegar. Migraciones `init` y `rename_dni_to_cedula` aplicadas en producción.
- Pendiente: agregar la URL `*.run.app` a los dominios autorizados de Firebase (cuando exista el login).

## 2026-09-30 — Sesión 2 (Fase 0, parte local)
- Stack confirmado; DNI obligatorio y en el certificado ([00-requisitos.md](00-requisitos.md)).
- Proyecto Next.js 16 + TypeScript + Tailwind 4 creado en la raíz del repo, con `output: "standalone"`.
- Prisma 7.10.0 (fijada, sin usar el release candidate 8) con adaptador `pg`. Esquema completo y migración inicial `init` en `prisma/`.
- `src/lib/prisma.ts`: cliente creado al primer uso, para que `next build` no exija `DATABASE_URL`.
- Endpoint `GET /api/health` (comprueba la base de datos).
- `docker-compose.yml` con PostgreSQL 16 local en el puerto **5433** (el 5432 estaba ocupado en la máquina de desarrollo).
- `Dockerfile` multi-etapa para Cloud Run; imagen construida y probada contra la base local.
- `cloudbuild.yaml` (build, push y deploy) y guía [02-gcp-setup.md](02-gcp-setup.md). No se ha ejecutado nada contra GCP.
- Pendiente: migraciones en producción (la imagen no incluye el CLI de Prisma).
- Decisiones posteriores: proyecto GCP nuevo; dominio propio opcional (DNS lo administra el usuario en cPanel); documento = **cédula ecuatoriana**.
- Campo `User.dni` renombrado a `cedula` (migración `rename_dni_to_cedula`, conserva datos) y validador módulo 10 en `src/lib/cedula.ts`.
- Identidad visual: logos en `public/brand/`, ícono de la app, colores `#100F31` y `#EE3B1B`; portada provisional en español reemplaza la plantilla de Next.js.

## 2026-09-30 — Sesión 1
- Repositorio `Capacitador-Gemeseg` estaba vacío; se clonó y se creó la rama `main`.
- Ronda de preguntas de requisitos con el usuario; respuestas registradas en [00-requisitos.md](00-requisitos.md).
- Propuesta de arquitectura en [01-arquitectura.md](01-arquitectura.md) y roadmap en [05-roadmap.md](05-roadmap.md).
