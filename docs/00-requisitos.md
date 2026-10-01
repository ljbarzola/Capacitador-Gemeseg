# 00 · Requisitos y bitácora de respuestas

> Este documento registra **lo que el usuario (Gemeseg) ha decidido**, con fecha. Es la fuente de verdad de los requisitos. Cada vez que se responda una pregunta nueva, se agrega aquí.

## Objetivo

Plataforma de capacitación en línea para Gemeseg (empresa de seguridad), desplegada en **capacitacion.gemeseg.com**, con login y registro, cursos organizados en módulos → submódulos → lecciones, y exámenes por submódulo.

## Sesión 1 — 2026-09-30

### Decisiones

| Tema | Decisión |
|---|---|
| Infraestructura | Entorno Google: Firebase, Cloud SQL, Cloud Build (+ Cloud Run, Cloud Storage) |
| Roles | Estudiante/Colaborador, Administrador, Instructor/Editor de contenido (Supervisor fuera del MVP) |
| Audiencia | Personal interno + clientes/terceros (guardias). 100–1000 usuarios (actualmente +200) |
| Registro | Abierto a cualquiera. Mínimo: nombres, apellidos, correo, contraseña. Campos adicionales **configurables** |
| Asignación | El instructor/RR.HH. ve la lista de registrados y **asigna** cursos; debe existir un botón de **asignación masiva** ("a todos de una sola vez") |
| Acceso a cursos | Gratuitos, con **inscripción/asignación controlada**. Sin pagos |
| Estructura de contenido | Curso → Módulo → Submódulo → Lección |
| Tipos de lección | Video, imagen, enlace, texto, "todo" (archivos, etc.) |
| Multimedia | Mixta: subida propia + enlaces embebidos YouTube/Vimeo |
| Progresión | **Configurable por curso**: secuencial estricta o libre |
| Exámenes | Por submódulo (opcional). Nota mínima configurable. Orden aleatorio de preguntas y opciones |
| Tipos de pregunta | Opción única, selección múltiple, verdadero/falso. Además, un **feedback final** de texto libre (opiniones del estudiante) |
| Al finalizar un curso | Certificado PDF descargable, marca de completado, reportes para RR.HH., **recertificación periódica** |
| Dashboard | RR.HH./instructor ve avance **por usuario, por módulo, por curso y general** |
| Agrupación | Grupos simples (empresa/área/sede) para filtrar y asignar, sin aislamiento estricto entre empresas |
| Correos automáticos | Verificación de correo y recuperar contraseña; aviso de curso asignado; recordatorios de pendientes/vencimientos |
| Dispositivos | Móvil y PC por igual (responsive completo) |
| MVP | 1) Login/registro + catálogo + visor de lecciones · 2) Exámenes con nota y aprobación · 3) Panel admin/instructor para crear cursos |
| Fase 2 | Dashboard de avance, certificados PDF, recertificación |
| Stack | **Pendiente de confirmar** (el usuario pidió definirlo después de aclarar el contexto). Recomendación en [01-arquitectura.md](01-arquitectura.md) |

## Sesión 2 — 2026-09-30

| Tema | Decisión |
|---|---|
| Stack | **Confirmado**: Next.js + PostgreSQL (Cloud SQL) + Firebase Auth + Cloud Storage + Cloud Run + Cloud Build |
| Documento de identidad | **Cédula ecuatoriana** (el servicio opera en Ecuador). Obligatoria, única por usuario, validada (10 dígitos, módulo 10) y aparece en el certificado. Campo `cedula` en BD; validador en `src/lib/cedula.ts` |
| Repositorio remoto | `https://github.com/ljbarzola/Capacitador-Gemeseg` (push autorizado) |
| Infraestructura GCP | **Proyecto nuevo**: `capacitaciongemeseg` (número 636310739015), cuenta `sistemas@gemeseg.com`. Guía en [02-gcp-setup.md](02-gcp-setup.md); avance en [CHANGELOG](CHANGELOG.md) |
| Verificación de correo | **Descartada** (2026-10-01): los usuarios son muchos y poco técnicos; el registro entra directo. Se mantiene recuperar contraseña |
| Validación de la cédula | **Pospuesta** (2026-10-01): el campo es obligatorio y único, pero no se valida el dígito verificador por ahora. Se activa con `VALIDATE_CEDULA` en `src/lib/validation/auth.ts` |
| Cédula | **Exactamente 10 números**, nada más (2026-10-01). Sin validar dígito verificador ni aceptar pasaporte |
| Certificados | Solo PDF descargable en la plataforma, con logos, nombre, cédula, curso y fechas; **no se envían por correo**. Vigencia **12 meses por defecto, configurable por curso** |
| Correos automáticos | **Descartados** (asignación, recordatorios y certificados). Todo se consulta en la plataforma |
| Campos de registro | Configurables por el administrador (texto o lista); contraseñas iniciales de cuentas importadas se entregan por CSV descargable y se cambian dentro de la plataforma (2026-10-01) |
| Dominio | Prioridad baja: lo importante es que **funcione**, aunque sea con la URL por defecto de Google/Firebase. El DNS de `gemeseg.com` lo administra el usuario (cPanel); cuando se necesite, se le entregan los registros a crear |
| Identidad visual | Logos en `public/brand/`. Azul marino `#100F31` y naranja `#EE3B1B` (muestreados del logotipo). Ícono: la "M" naranja |

### No elegido / no indicado

- Intentos máximos por examen y tiempo límite: no se seleccionaron → quedan **opcionales y desactivados por defecto**.
- Rol Supervisor/Jefe de área: no seleccionado.
- Retroalimentación por respuesta y banco de preguntas con sorteo: no seleccionado (puede revisarse después).

## Preguntas abiertas

- [x] ~~Confirmar stack recomendado~~ — confirmado en sesión 2.
- [x] ~~Proyecto GCP/Firebase y DNS~~ — proyecto nuevo; el usuario administra el DNS (sesión 2).
- [x] ~~DNI obligatorio~~ — cédula ecuatoriana, obligatoria y en el certificado (sesión 2).
- [x] ~~Pasaporte para extranjeros~~ — no: la cédula son 10 números.
- [ ] Tamaño máximo de video subido y volumen esperado de multimedia (afecta costos de Storage).
- [ ] Tipografía (logos y colores ya recibidos).
- [x] ~~Vigencia de recertificación y plantilla~~ — 12 meses configurable; PDF con logos generado por la plataforma.
- [x] ~~Proveedor de correo~~ — no se enviarán correos.
- [ ] Política de privacidad / retención de datos personales (la plataforma guarda nombre, cédula, correo, avance y auditoría).
- [ ] ¿Quién crea los primeros Administradores/Instructores? (propuesta: se siembran manualmente; luego el admin promueve usuarios).
