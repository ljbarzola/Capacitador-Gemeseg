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

### No elegido / no indicado

- Intentos máximos por examen y tiempo límite: no se seleccionaron → quedan **opcionales y desactivados por defecto**.
- Rol Supervisor/Jefe de área: no seleccionado.
- Retroalimentación por respuesta y banco de preguntas con sorteo: no seleccionado (puede revisarse después).

## Preguntas abiertas

- [ ] Confirmar stack recomendado (Next.js + Cloud SQL (PostgreSQL) + Firebase Auth + Cloud Run).
- [ ] ¿Proyecto GCP/Firebase existente o uno nuevo? ¿Quién administra el DNS de `gemeseg.com` para apuntar `capacitacion`?
- [ ] ¿DNI/documento de identidad obligatorio (para identificar al guardia y mostrarlo en el certificado)?
- [ ] Tamaño máximo de video subido y volumen esperado de multimedia (afecta costos de Storage).
- [ ] Identidad visual: logo, colores, tipografía.
- [ ] Vigencia típica de recertificación (¿12 meses?) y plantilla del certificado.
- [ ] Proveedor de correo y remitente (p. ej. `capacitacion@gemeseg.com`).
- [ ] Política de privacidad / retención de datos personales.
- [ ] ¿Quién crea los primeros Administradores/Instructores? (propuesta: se siembran manualmente; luego el admin promueve usuarios).
