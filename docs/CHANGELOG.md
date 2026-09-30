# Changelog

## 2026-09-30 — Sesión 2 (Fase 0, infraestructura GCP, paso a paso con el usuario)
- Proyecto GCP `capacitaciongemeseg` creado por el usuario. Había llegado al límite de 5 proyectos por cuenta de facturación; se liberó cupo quitando la facturación a un "Default Gemini Project" sin uso detectado, y se vinculó el proyecto nuevo.
- APIs habilitadas: Cloud Run, Cloud SQL Admin, Cloud Build, Artifact Registry, Secret Manager, Cloud Storage, Identity Toolkit y Firebase.
- Firebase agregado al proyecto; Authentication con correo/contraseña habilitado.
- App web registrada en Firebase (`1:636310739015:web:f795554051ec1629c7f962`); su configuración pública va en `.env` (local, ignorado) y los nombres de variable en `.env.example`.
- Pendiente: Cloud SQL, Artifact Registry, secretos, bucket, permisos, trigger de Cloud Build, despliegue.

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
