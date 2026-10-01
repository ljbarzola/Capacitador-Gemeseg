# Cambio: el administrador no tiene cursos pendientes

**Fecha:** 2026-10-02 · **Pedido por:** usuario (Gemeseg) · **Aplicado por:** Claude

## Por qué

Al cargar los cursos de ejemplo, el script (`scripts/seed-ejemplos.mjs --inscribir`) inscribió a **todas** las cuentas
activas, incluida la del administrador `sistemas@gemeseg.com`. Por eso su panel «Mis cursos» mostraba cuatro cursos
pendientes. Un administrador no debe recibir cursos: revisa el contenido con «Vista previa» y sigue el avance en
«Avance».

## Qué se cambió

### Datos de producción (Cloud SQL)

| Cambio | Detalle |
|---|---|
| Se quitaron **4 inscripciones pendientes** (estado «Sin iniciar») de `sistemas@gemeseg.com` | Inducción a Gemeseg Seguridad, Prevención de riesgos y uso de extintores, Primeros auxilios básicos y Uso proporcional de la fuerza (todos «(Ejemplo)») |
| **No se tocó** la inscripción completada de esa cuenta | «Atención al cliente y comunicación por radio (Ejemplo)» y su certificado `GMS-9EZE-PLS4` siguen igual |
| No se tocó ningún dato de `test@gemeseg.com` | Esa cuenta es de estudiante y conserva sus 5 cursos |
| Se reemplazó el comentario de prueba «bien» | De `test@gemeseg.com` sobre «Atención al cliente…»; ahora dice: *«Curso breve y muy práctico. El procedimiento por radio y el alfabeto fonético fueron lo más útil para el trabajo diario. Sería bueno agregar un ejercicio con audios para practicar la transmisión de placas y nombres.»* |
| Quedó constancia en **Auditoría** | Dos entradas del «Sistema» (`inscripcion.quitar` y `comentario.reemplazar`) |

### Código

- `scripts/seed-ejemplos.mjs`: con `--inscribir` ahora solo inscribe a cuentas con rol **Estudiante**.
- `src/app/(app)/panel/page.tsx`: si una cuenta de gestión no tiene cursos, el panel lo explica y ofrece
  ir a los cursos o al avance (antes decía «aún no tiene cursos asignados»).

## Cómo volver atrás

**Restaurar las 4 inscripciones** (con sus mismas fechas límite y estados): ejecutar el contenido de
[`restaurar-inscripciones-admin.sql.txt`](restaurar-inscripciones-admin.sql.txt) en la base de producción, por
ejemplo con Cloud SQL Studio (consola de Google Cloud → Cloud SQL → `capacitador-db` → Cloud SQL Studio, usuario `app`).
Son 4 sentencias `INSERT`; si alguna ya existe, la base la rechaza sin duplicar.

**Restaurar el comentario original**:

```sql
UPDATE "CourseFeedback" SET comment = 'bien' WHERE id = 'cmuputdxs000a01s6fimu3gxn';
```

**Revertir el código**: `git log --grep="administración sin cursos pendientes"` para ubicar el commit y
`git revert <commit>`; el despliegue es automático al subirlo a `main`.

## Nota

Si más adelante un instructor o administrador necesita **tomar un curso** (por ejemplo, para certificarse), se le puede
asignar a mano desde «Asignar → Asignar a personas». Lo que ya no ocurre es que reciba cursos por asignación masiva
(que siempre fue solo para estudiantes) ni por el script de ejemplos.
