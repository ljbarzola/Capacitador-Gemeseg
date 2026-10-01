# Changelog

## 2026-10-01 — Sesión 2 (Fase 3: auditoría, campos de registro, importación, perfil)
- **Auditoría** (`/admin/auditoria`, solo administrador): registra quién hizo qué y cuándo (usuarios, grupos, campos de registro, cursos, módulos, lecciones, exámenes, preguntas, asignaciones, certificados emitidos y recertificaciones, importaciones, cambios de contraseña). Filtros por texto, tipo de acción y fechas, con paginación. Nunca guarda contraseñas. Es de mejor esfuerzo: si falla el registro, la acción original no se interrumpe (`src/lib/audit.ts`).
- **Campos de registro configurables** (`/admin/campos`, solo administrador): campos de texto o de lista de opciones, obligatorios u opcionales, con orden y opción de ocultar. Aparecen en el registro, en «Mi perfil», en la ficha de la persona y como columnas del Excel de avance. Las respuestas se guardan en `User.extraFields` con una clave estable; al eliminar un campo las respuestas guardadas se conservan.
- **Importación masiva por CSV** (`/admin/usuarios/importar`): acepta coma o punto y coma, BOM y tildes; vista previa fila por fila con errores (cédula, nombres, correo, repetidos en el archivo, ya registrados) antes de crear nada; agrega el cero inicial que Excel quita a las cédulas de 9 dígitos; crea los grupos nuevos; hasta 500 filas. Cada cuenta recibe una contraseña inicial aleatoria de 10 caracteres que se descarga **una sola vez** en un CSV (no se guarda ni se audita). Plantilla descargable con los campos de registro.
- **Mi perfil** (`/perfil`): datos de la cuenta, datos adicionales y **cambio de contraseña dentro de la plataforma** (sin correos). Las cuentas importadas quedan con `mustChangePassword` y ven un aviso hasta cambiarla; quien tenga campos obligatorios sin completar ve un aviso para completar su perfil.
- **Accesibilidad:** enlace «Saltar al contenido», botón de acción con contraste AA (#D6341A con texto blanco), enlaces naranjas oscurecidos sobre fondo claro, `main` con destino, avisos con `role` adecuado, movimiento reducido respetado.
- **Rendimiento y seguridad:** pantalla de carga para la zona autenticada; `--cpu-boost` en Cloud Run para acortar el arranque en frío; cabeceras `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` y `Strict-Transport-Security`; se oculta `X-Powered-By`. No se activó una política CSP estricta porque hay que contemplar Firebase, YouTube/Vimeo y Cloud Storage; queda como mejora.
- Efecto de la pantalla de carga: las redirecciones por permisos (p. ej. un estudiante que abre `/admin`) ocurren un instante después de mostrar el esqueleto, nunca se muestra el contenido protegido.
- Pruebas en producción con navegador real: 28 comprobaciones nuevas de la Fase 3 y regresión de las anteriores. Datos de prueba borrados.
- **Pendiente por decisión del usuario:** dominio propio `capacitacion.gemeseg.com` (se hace al final). Mejora futura sugerida: política CSP, límite de intentos en el registro y alertas de uso.

## 2026-10-01 — Sesión 2 (Fase 2: avance, certificados y recertificación)
- **Decisiones del usuario:** sin correos (el certificado solo se descarga en la plataforma); vigencia del certificado de **12 meses por defecto y configurable por curso** (vacío = no vence); la **cédula acepta exactamente 10 números** y nada más (sin validar dígito verificador ni extranjeros).
- **Certificados:** se emiten solos al completar el curso (`src/lib/certificates.ts`), con copia del nombre, cédula y curso al momento de emitir. PDF A4 horizontal con logo, curso, fechas, código `GMS-XXXX-XXXX` y QR (`src/lib/certificate-pdf.ts`), descargable en «Mis certificados» y en la página del curso. Verificación pública sin iniciar sesión en `/verificar` y `/verificar/<código>` (vigente, vencido o inexistente; la cédula sale enmascarada).
- **Recertificación:** el avance se cuenta por ciclos (`Enrollment.cycleStartedAt`). Con el certificado por vencer (30 días) o vencido, el estudiante pulsa «Renovar certificación»: el ciclo se reinicia, los certificados anteriores se conservan y al completar de nuevo se emite uno nuevo.
- **Avance (instructor y administrador):** `/avance` (general: personas, completados, avance medio, certificados vigentes/por vencer/vencidos, tabla por curso y lista «requieren seguimiento»), `/avance/cursos/<id>` (por módulo, por persona, estadísticas de cada examen y de cada pregunta, comentarios) y `/avance/personas/<id>`. Filtro por grupo. Exportación a Excel (`/api/reportes/avance`, 3 hojas: resumen, detalle por persona, exámenes).
- **Comentarios finales** del curso (texto libre, opcional) al completarlo.
- **Interfaz:** Archivo (ancho variable) como única familia, encabezado azul marino con el logo claro, paneles planos con borde fino, avance segmentado (un segmento por actividad), iconos de trazo fino en lugar de emojis, pantallas de ingreso con panel de marca. Sobrio y con foco visible.
- **Cursos de ejemplo** (`scripts/seed-ejemplos.mjs`, repetible): 6 cursos que cubren progresión secuencial y libre, todos los tipos de lección (texto, video de YouTube verificado, enlace oficial, imagen y PDF subidos al bucket), los tres tipos de pregunta, exámenes con nota mínima distinta, intentos limitados, orden fijo o aleatorio, examen sin lecciones, curso sin exámenes, certificado de 12 y 24 meses y sin vencimiento, y un borrador con casos límite. Más tres grupos de ejemplo. Se inscribió a las dos cuentas existentes. Todos llevan «(Ejemplo)» en el título para borrarlos fácilmente.
- **Corregido:** al repetir una lección en un nuevo ciclo no se actualizaba la fecha y no contaba (detectado por la prueba de recertificación).
- Prueba de extremo a extremo en producción con navegador real: 65 comprobaciones (cédula, certificado, PDF, verificación pública, comentarios, avance, Excel, permisos, recertificación y segundo certificado). Datos de prueba borrados.
- Descartado por decisión del usuario: correos de aviso y recordatorios. Los pendientes y vencimientos se ven en «Mis cursos», «Mis certificados» y en `/avance`.

## 2026-10-01 — Sesión 2 (Fase 1: panel de administración, cursos y exámenes)
- **Esquema:** migración `content_order_and_filename` (el `order` de módulos/submódulos/lecciones deja de ser único para poder reordenar; `Lesson.fileName`).
- **Estudiante:** «Mis cursos» con avance y fecha límite; visor de curso con navegación lateral (plegable en móvil); lecciones de texto, video YouTube/Vimeo (iframe `youtube-nocookie`), enlace, imagen y archivo; exámenes calificados en el servidor (las respuestas correctas nunca viajan al navegador), orden aleatorio, nota mínima, intentos máximos y reintentos.
- **Progresión:** secuencial (cada actividad se desbloquea al completar la anterior, validado en el servidor) o libre, configurable por curso. La inscripción pasa sola a EN CURSO y COMPLETADO (`src/lib/progress.ts`).
- **Administración (instructor y administrador):** cursos → módulos → submódulos → lecciones con reordenado, examen por submódulo (opción única, múltiple, verdadero/falso), grupos, asignación masiva (todos los estudiantes activos o un grupo) e individual con fecha límite, lista de inscritos con avance y vista previa sin guardar avance.
- **Solo administrador:** usuarios con búsqueda, cambio de rol, grupo y activación; no puede cambiarse el propio rol ni quedar el sistema sin administradores. Un usuario desactivado pierde el acceso de inmediato.
- Páginas 404 y de error en español. `src/proxy.ts` protege `/panel`, `/cursos` y `/admin` (comprobación optimista); la real es `src/lib/dal.ts`.
- **Subida de archivos** (video propio hasta 2 GB, imagen hasta 10 MB, documento hasta 100 MB): URLs firmadas de Cloud Storage (`src/lib/storage.ts`; el tope de tamaño va firmado en la URL). Habilitado en producción: API `iamcredentials.googleapis.com`, rol `roles/iam.serviceAccountTokenCreator` de la cuenta de Compute sobre sí misma y CORS del bucket `capacitaciongemeseg-media` (solo la URL de Cloud Run). Si se agrega un dominio propio hay que añadirlo al CORS (`gcloud storage buckets update gs://capacitaciongemeseg-media --cors-file=...`). El bucket sigue privado; las lecturas usan URLs firmadas de 15 minutos.
- Prueba de extremo a extremo con navegador real contra producción (42 comprobaciones: registro, roles, grupos, curso, lecciones, reordenado, examen, secuencial, aprobado/reprobado, asignaciones, desactivación, eliminación); usuarios y datos de prueba borrados al terminar.
- Subidas probadas en producción (imagen, video, documento: subir, mostrar, descargar con nombre, bucket no público, tipo no permitido rechazado, borrar la lección borra el archivo). **Fase 1 completa.**

## 2026-10-01 — Sesión 2 (Fase 1: registro e inicio de sesión)
- Decisión del usuario: **sin verificación de correo** (más de 200 personas poco técnicas). Se quitó el envío del correo y el aviso del panel; la recuperación de contraseña se mantiene.
- Registro, inicio de sesión, recuperación de contraseña, panel protegido (`/panel`) y cierre de sesión. Firebase Auth en el navegador; el servidor intercambia el ID token por una cookie de sesión `httpOnly` de Firebase (7 días) y la verifica en `src/lib/dal.ts`. `src/proxy.ts` solo hace la comprobación optimista de cookie.
- `POST /api/auth/register` crea la cuenta con Firebase Admin y el usuario en la base (rol `STUDENT`); si falla la base, borra la cuenta de Firebase para no dejarla huérfana.
- Decisión del usuario: **la validación del dígito verificador de la cédula queda desactivada por ahora** (`VALIDATE_CEDULA = false` en `src/lib/validation/auth.ts`). El campo sigue siendo obligatorio, único y sale en el certificado; se acepta cualquier documento de 5 a 20 letras o números. El validador módulo 10 de `src/lib/cedula.ts` se conserva para activarlo después.
- La config pública de Firebase (`NEXT_PUBLIC_*`) se incrusta al compilar: se pasa como `--build-arg` desde sustituciones del activador `deploy-main` (no están en el repositorio).
- La cuenta de Compute recibió `roles/firebaseauth.admin` (crear usuarios y emitir cookies de sesión).
- Probado en producción: registro, cédula duplicada, sesión, panel y cierre de sesión. Usuarios de prueba borrados.
- Para desarrollo local con Firebase Admin hace falta `gcloud auth application-default login` con la cuenta del proyecto y `GOOGLE_CLOUD_QUOTA_PROJECT=capacitaciongemeseg` en `.env`.

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
