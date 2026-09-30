# 02 · Guía de configuración de Google Cloud

> Pasos para dejar lista la infraestructura. Nada de esto está creado todavía: requiere decidir si se usa un proyecto GCP existente o uno nuevo y quién administra el DNS de `gemeseg.com` (ver preguntas abiertas en [00-requisitos.md](00-requisitos.md)).
>
> Los valores entre `<...>` se reemplazan. La región `southamerica-west1` (Santiago) es una sugerencia sin verificar: confirmar que todos los servicios (en especial el mapeo de dominio de Cloud Run) estén disponibles allí, y revisar precios y latencia antes de fijarla. Los comandos de esta guía no se han ejecutado; validarlos al crear la infraestructura.

## 0. Requisitos previos

- Cuenta de facturación de Google Cloud activa.
- `gcloud` instalado y sesión iniciada: `gcloud auth login`.
- Permisos de **Owner** (o equivalentes) sobre el proyecto.

## 1. Proyecto y APIs

```bash
gcloud projects create <PROJECT_ID> --name="Capacitador Gemeseg"   # omitir si se usa uno existente
gcloud config set project <PROJECT_ID>
gcloud billing projects link <PROJECT_ID> --billing-account=<BILLING_ACCOUNT_ID>

gcloud services enable run.googleapis.com sqladmin.googleapis.com \
  cloudbuild.googleapis.com artifactregistry.googleapis.com \
  secretmanager.googleapis.com storage.googleapis.com \
  identitytoolkit.googleapis.com
```

## 2. Artifact Registry

```bash
gcloud artifacts repositories create capacitador \
  --repository-format=docker --location=southamerica-west1
```

## 3. Cloud SQL (PostgreSQL)

```bash
gcloud sql instances create capacitador-db \
  --database-version=POSTGRES_16 --tier=db-custom-1-3840 \
  --region=southamerica-west1

gcloud sql databases create capacitador --instance=capacitador-db
gcloud sql users create app --instance=capacitador-db --password=<PASSWORD_SEGURA>
```

La conexión desde Cloud Run usa el socket de Cloud SQL, no una IP pública:

```
postgresql://app:<PASSWORD>@localhost/capacitador?host=/cloudsql/<PROJECT_ID>:southamerica-west1:capacitador-db
```

Guardar esa cadena como secreto:

```bash
printf '%s' '<CADENA_ANTERIOR>' | gcloud secrets create DATABASE_URL --data-file=-
```

## 4. Firebase Authentication

1. En la [consola de Firebase](https://console.firebase.google.com) → **Agregar proyecto** → elegir el proyecto GCP existente.
2. **Authentication → Método de acceso**: habilitar *Correo electrónico/contraseña* (y Google, si se desea).
3. **Authentication → Configuración → Dominios autorizados**: agregar `capacitacion.gemeseg.com`.
4. Crear una *app web* para obtener la configuración pública del cliente (`apiKey`, `authDomain`, `projectId`).
5. Para el backend se usa la cuenta de servicio de Cloud Run (credenciales por defecto de la aplicación); no se descarga ninguna llave.

## 5. Cloud Storage (videos e imágenes)

```bash
gcloud storage buckets create gs://<PROJECT_ID>-capacitador-media \
  --location=southamerica-west1 --uniform-bucket-level-access
```

El bucket es **privado**; la app entrega archivos con URLs firmadas. Hay que configurar CORS para subida directa desde el navegador cuando se implemente esa función.

## 6. Permisos de la cuenta de servicio

La cuenta de servicio que ejecuta Cloud Run (por defecto la de Compute) necesita:

| Rol | Para qué |
|---|---|
| `roles/cloudsql.client` | Conectarse a Cloud SQL |
| `roles/secretmanager.secretAccessor` | Leer `DATABASE_URL` |
| `roles/storage.objectAdmin` sobre el bucket | Subir y firmar URLs de archivos |

La cuenta de Cloud Build (`<PROJECT_NUMBER>@cloudbuild.gserviceaccount.com`) necesita `roles/run.admin`, `roles/iam.serviceAccountUser` y `roles/artifactregistry.writer`.

## 7. Trigger de Cloud Build desde GitHub

1. Consola → **Cloud Build → Activadores → Conectar repositorio** → GitHub → `ljbarzola/Capacitador-Gemeseg`.
2. Crear un activador con evento *Push a una rama*, rama `^main$`, archivo de configuración `cloudbuild.yaml`.
3. Definir la sustitución `_SQL_INSTANCE` = `<PROJECT_ID>:southamerica-west1:capacitador-db`.

## 8. Dominio `capacitacion.gemeseg.com`

```bash
gcloud beta run domain-mappings create \
  --service=capacitador-gemeseg --domain=capacitacion.gemeseg.com \
  --region=southamerica-west1
```

El comando devuelve los registros DNS (normalmente un `CNAME` a `ghs.googlehosted.com`). **Quien administre el DNS de `gemeseg.com` debe crearlos.** El certificado SSL lo emite Google automáticamente una vez propagado el DNS.

## 9. Migraciones en producción (pendiente)

La imagen de producción no incluye el CLI de Prisma. Opciones a evaluar al crear la instancia:

- Paso en Cloud Build que ejecute `prisma migrate deploy` con el Cloud SQL Auth Proxy.
- Un *Cloud Run Job* con una imagen que sí incluya `prisma`.

## Checklist

- [ ] Proyecto GCP decidido y facturación vinculada
- [ ] APIs habilitadas
- [ ] Artifact Registry creado
- [ ] Cloud SQL creada, base y usuario
- [ ] Secreto `DATABASE_URL`
- [ ] Firebase Auth habilitado
- [ ] Bucket de medios
- [ ] Permisos de cuentas de servicio
- [ ] Trigger de Cloud Build
- [ ] Mapeo de dominio y DNS
- [ ] Estrategia de migraciones
