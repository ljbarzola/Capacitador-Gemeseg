# Capacitador Gemeseg

Plataforma de capacitación en línea de Gemeseg — `capacitacion.gemeseg.com`.

Cursos → módulos → submódulos → lecciones (video, imagen, enlace, texto) con exámenes por submódulo, asignación de cursos, seguimiento de avance para RR.HH./instructores, certificados y recertificación.

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

## Documentación

- [Requisitos y bitácora de respuestas](docs/00-requisitos.md)
- [Arquitectura](docs/01-arquitectura.md)
- [Configuración de Google Cloud](docs/02-gcp-setup.md)
- [Roadmap](docs/05-roadmap.md)
- [Changelog](docs/CHANGELOG.md)

> Estado: Fase 0 (fundaciones). Aún no hay pantallas de producto; ver roadmap.
