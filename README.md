# Capacitador Gemeseg

Plataforma de capacitación en línea de Gemeseg — `capacitacion.gemeseg.com`.

Cursos → módulos → submódulos → lecciones (video, imagen, enlace, texto, archivo) con exámenes por submódulo, asignación de cursos, seguimiento de avance para RR.HH./instructores con exportación a Excel, certificados en PDF con verificación pública y recertificación, **sesiones en vivo (Meet, Zoom, Teams) con asistencia**, campos de registro configurables, importación de usuarios por CSV y auditoría de acciones.

## Desarrollo local

Requisitos: Node.js 24, Docker.

```bash
npm install
cp .env.example .env
docker compose up -d db          # PostgreSQL en localhost:5433
npx prisma migrate dev           # aplica migraciones y genera el cliente
npm run dev                      # http://localhost:3000  (salud: /api/health)
```

Imagen de producción: `docker build -t capacitador-gemeseg .`

### Cursos de ejemplo

`scripts/seed-ejemplos.mjs` carga seis cursos de ejemplo (secuencial y libre, todos los tipos de lección y de pregunta, con y sin examen, borrador). Se puede repetir: reemplaza los cursos cuyo título termina en «(Ejemplo)» o «(Borrador de ejemplo)».

```bash
DATABASE_URL=postgresql://gemeseg:gemeseg@localhost:5433/capacitador node scripts/seed-ejemplos.mjs --inscribir
```

Con `--solo=TEXTO` carga o reemplaza únicamente los ejemplos cuyo título contenga ese texto (no toca los demás). Con `--archivos` sube también la imagen y el PDF de ejemplo al bucket (requiere `gcloud`), y con `--inscribir` inscribe a los estudiantes activos (no a administradores ni instructores). Necesita que exista al menos un administrador (`sistemas@gemeseg.com` o cualquier usuario con rol ADMIN).

Para probar el inicio de sesión con Firebase en local hace falta `gcloud auth application-default login` con la cuenta del proyecto y `GOOGLE_CLOUD_QUOTA_PROJECT=capacitaciongemeseg` en `.env`.

## Documentación

- [Requisitos y bitácora de respuestas](docs/00-requisitos.md)
- [Arquitectura](docs/01-arquitectura.md)
- [Configuración de Google Cloud](docs/02-gcp-setup.md)
- [Roadmap](docs/05-roadmap.md)
- [Changelog](docs/CHANGELOG.md)

> Estado: Fases 0, 1, 2 y 3 completas y en producción. Pendiente solo el dominio propio (opcional); ver roadmap.
