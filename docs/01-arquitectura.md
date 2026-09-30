# 01 · Arquitectura

> Estado: **stack confirmado por el usuario el 2026-09-30.**
>
> Esquema de datos: [prisma/schema.prisma](../prisma/schema.prisma). Infraestructura: [02-gcp-setup.md](02-gcp-setup.md).
>
> Versiones en uso: Next.js 16, React 19, Tailwind 4, Prisma 7.10 (fijada; la 8 sigue en release candidate) con `@prisma/adapter-pg`, PostgreSQL 16.

## Stack recomendado

| Capa | Tecnología | Motivo |
|---|---|---|
| App (UI + API) | Next.js (TypeScript) en **Cloud Run** | Un solo proyecto full-stack, contenedor Docker, escala a cero |
| Base de datos | **Cloud SQL (PostgreSQL)** + Prisma | Modelo jerárquico y relacional; reportes con agregaciones |
| Autenticación | **Firebase Authentication** | Email/contraseña, verificación y reset ya resueltos; Google Sign-In opcional |
| Archivos | **Cloud Storage** (URLs firmadas) | Subida propia de videos e imágenes |
| CI/CD | **Cloud Build** (trigger desde GitHub) | Build de imagen → deploy a Cloud Run; secretos en Secret Manager |
| Dominio | `capacitacion.gemeseg.com` → Cloud Run | Registro DNS + certificado gestionado |
| Correo | SendGrid/Resend o Firebase Trigger Email | Verificación, asignación, recordatorios |
| Recordatorios | Cloud Scheduler → endpoint protegido | Pendientes y vencimientos de certificado |
| Certificados PDF | Generación en servidor + código QR | Verificación pública por código |
| UI | Tailwind, mobile-first | Móvil y PC por igual |

## Flujo general

```
Navegador ──> Cloud Run (Next.js) ──> Cloud SQL (Postgres)
   │               │  └──> Cloud Storage (archivos)
   └─ Firebase Auth (login) ──> token validado por el backend
Cloud Scheduler ──> Cloud Run (recordatorios) ──> proveedor de correo
GitHub (main) ──> Cloud Build ──> Cloud Run
```

## Decisiones (ADR resumidas)

1. **SQL sobre Firestore**: el contenido es jerárquico y los reportes (avance por usuario/módulo/curso) requieren joins y agregaciones.
2. **Firebase Auth**: evita implementar verificación de correo, reset y seguridad de contraseñas; el rol vive en Postgres.
3. **Cloud Run**: alineado con el entorno Google solicitado, sin administrar servidores.
4. **Progresión configurable por curso**: campo en `Course` (secuencial | libre) que valida el backend, no solo la UI.
5. **Exámenes calificados en servidor**: las respuestas correctas nunca se envían al navegador antes de enviar el intento.
