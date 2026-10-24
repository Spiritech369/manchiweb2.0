# Configuración de solicitudes y CRM de KDL

El formulario genera un folio público, `contact_id`, `quote_id` e
`idempotency_key` antes de abrir WhatsApp o correo.

El navegador conserva únicamente:

- Un identificador técnico de contacto sin datos personales.
- Recibos mínimos con folio, estado, origen y fecha.
- Claves temporales de idempotencia durante 30 minutos.

Nombre, teléfono, empresa y mensaje no se almacenan en `localStorage`.

## Flujo recomendado en Vercel

1. El navegador envía la solicitud a `/api/lead`.
2. `api/lead.js` intenta persistirla mediante `kdl_create_quote`.
3. PostgreSQL aplica la restricción única de `idempotency_key`.
4. Sólo una solicitud nueva se entrega a webhook, correo o CRM.
5. Un retry devuelve la cotización existente sin repetir notificaciones.
6. WhatsApp y correo permanecen como recuperación para el usuario.

## Crear la base CRM

La migración está en:

```txt
database/kdl-crm.sql
```

Ejecuta el archivo completo en PostgreSQL o en el SQL Editor de Supabase. Crea:

- `contacts`
- `quotes`
- `quote_items`
- `activity_events`
- `quote_events`
- `audit_logs`
- `assignment_history`
- `status_history`
- Función transaccional `kdl_create_quote(jsonb)`

Las tablas tienen RLS habilitado y no exponen políticas públicas. La función
RPC sólo concede ejecución a `service_role`.

### Migración v2 (obligatoria después de `kdl-crm.sql`)

```txt
database/kdl-crm-v2.sql
```

Ejecútala **después** de `kdl-crm.sql`. Es idempotente (puede correrse varias
veces) y:

- Agrega `email` y `rfc` a `contacts`.
- Agrega `required_date`, `photo_url` y `channel` a `quotes`.
- Reemplaza `kdl_create_quote(jsonb)`: además de lo anterior guarda los campos
  nuevos y, si `items` es un arreglo no vacío, crea una fila de `quote_items`
  por partida (`<quote_id>_item_1`, `_item_2`, ...). Sin `items` conserva la
  partida única basada en `part` / `quantity`.
- Crea `kdl_lookup_quote(text, text)` para la consulta pública de folio. Sólo
  devuelve folio, estado, fechas y partidas (nombre y cantidad); nunca nombre,
  empresa, teléfono, correo ni RFC.
- Revoca la ejecución de ambas funciones a `public`, `anon` y `authenticated`
  y la concede sólo a `service_role`.

`unit_price` de las partidas se envía a webhook/correo, pero no se guarda en
`quote_items` (la tabla no tiene esa columna).

## Fotos en Supabase Storage

1. En Supabase → Storage crea un bucket **privado** llamado `kdl-uploads`
   (no lo marques como público). Si usas otro nombre, configura
   `KDL_UPLOAD_BUCKET`.
2. No agregues políticas de Storage para `anon` ni `authenticated`: la API sube
   y firma con `service_role` desde el servidor.
3. Los archivos se guardan en `YYYY/MM/<uuid>.<ext>`; el nombre original del
   archivo nunca se usa como ruta.
4. Cada foto se comparte mediante una URL firmada válida por 30 días.

## Variables de entorno

Configura en Vercel:

```txt
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
KDL_REQUIRE_DURABLE_PERSISTENCE=true
KDL_UPLOAD_BUCKET=kdl-uploads

LEAD_TO_EMAIL=ventas@kdl.com.mx
KDL_CRM_WEBHOOK_URL=https://hook.make.com/...
FORMSPREE_ENDPOINT=https://formspree.io/f/...
HUBSPOT_PORTAL_ID=...
HUBSPOT_FORM_ID=...
RESEND_API_KEY=...
LEAD_FROM_EMAIL=KDL Web <leads@kdl.com.mx>
LEAD_ALLOWED_ORIGIN=https://kdl.com.mx
```

Nunca incluyas `SUPABASE_SERVICE_ROLE_KEY` en `kdl-config.js`, HTML o
JavaScript del navegador.

`KDL_REQUIRE_DURABLE_PERSISTENCE=true` impide enviar notificaciones si la base
no está disponible. Esto evita que un retry genere notificaciones duplicadas.

Si se omite o vale `false`, la API puede entregar el lead sin persistencia, pero
la respuesta incluye `durable: false`.

## Respuestas de la API

- `200`: retry reconocido; no se repitieron notificaciones.
- `202`: solicitud nueva entregada.
- `409`: header y body contienen claves de idempotencia diferentes.
- `422`: faltan IDs, folio, fecha o datos obligatorios.
- `502`: todos los canales configurados fallaron.
- `503 persistence_not_configured`: se exige persistencia, pero no está lista.
- `503 persistence_failed`: la base falló; no se notificaron canales.
- `503 delivery_not_configured`: la solicitud pudo persistirse, pero no existe
  un canal de notificación.

Una respuesta puede incluir:

```json
{
  "ok": true,
  "delivered": true,
  "durable": true,
  "duplicate": false,
  "partial_success": false,
  "public_folio": "KDL-20260728-AB12",
  "quote_id": "quote_..."
}
```

### Campos opcionales de `POST /api/lead`

Los campos obligatorios no cambian (`name`, `whatsapp`, `quote_id`,
`public_folio`, `idempotency_key`, `contact_id`, `created_at`). Además se
aceptan, y se descartan en silencio si no son válidos:

| Campo | Regla |
| --- | --- |
| `email` | Máx. 160, minúsculas, formato de correo. |
| `rfc` | Mayúsculas, 12–13 caracteres con formato SAT (`[A-ZÑ&]{3,4}` + 6 dígitos + 3 alfanuméricos). |
| `required_date` | `YYYY-MM-DD` válida. |
| `photo_url` | URL `https://` de máx. 600 caracteres (normalmente la de `/api/upload`). |
| `channel` | `whatsapp` o `email`. |
| `items` | Arreglo (máx. 100) de `{ sku, model, title, brand, quantity, unit_price, manual_reference }`. `quantity` positiva (default 1); `unit_price` ≥ 0 o `null`. Otras propiedades se ignoran. |

El texto enviado por correo/Formspree/HubSpot lista cada partida como
`1) MODELO — Cant: 2 · Clave: SKU` y muestra `Email`, `RFC`,
`Fecha requerida` y `Foto` cuando existen. El webhook recibe el objeto `lead`
normalizado completo, incluido `items`.

## Consulta de folio: `GET /api/folio`

```txt
GET /api/folio?folio=KDL-20260728-AB12&tel=5678
```

`tel` son los últimos 4 dígitos del WhatsApp registrado. La API llama al RPC
`kdl_lookup_quote` con `service_role` y responde con `Cache-Control: no-store`.

- `200`:

  ```json
  {
    "ok": true,
    "folio": "KDL-20260728-AB12",
    "status": "in_review",
    "status_label": "En revisión",
    "created_at": "2026-07-28T12:00:00+00:00",
    "updated_at": "2026-07-29T09:30:00+00:00",
    "items": [{ "name": "MHZ2-16D", "quantity": 2 }]
  }
  ```

  `status_label`: `requested` → Recibida, `in_review` → En revisión,
  `quoted` → Cotizada, `won` → Pedido confirmado, `lost` → Cerrada; cualquier
  otro estado → En proceso.
- `400 invalid_request`: folio con formato distinto a `KDL-YYYYMMDD-XXXX` o
  `tel` que no sea exactamente 4 dígitos.
- `404 not_found`: el folio no existe **o** los dígitos no coinciden (misma
  respuesta para no revelar cuál).
- `405 method_not_allowed`: método distinto de `GET` (`OPTIONS` → `204`).
- `502 lookup_failed`: error de Supabase.
- `503 lookup_not_configured`: faltan `SUPABASE_URL` o
  `SUPABASE_SERVICE_ROLE_KEY`.

## Subida de foto: `POST /api/upload`

```json
{ "fileName": "foto.jpg", "contentType": "image/jpeg", "data": "<base64>" }
```

`data` es base64 sin prefijo (si llega `data:image/...;base64,` se elimina).
Tipos permitidos: `image/jpeg`, `image/png`, `image/webp`, `image/heic`,
`image/heif`; además se verifica la firma binaria del archivo. `fileName` sólo
se usa para validar que tenga extensión de imagen.

Vercel limita el cuerpo a ~4.5 MB, así que el límite es **3 MB decodificados**
(~4 MB en base64). El front end comprime la foto (≤1600 px, JPEG) antes de
subirla.

- `200`:

  ```json
  {
    "ok": true,
    "url": "https://TU-PROYECTO.supabase.co/storage/v1/object/sign/kdl-uploads/2026/07/<uuid>.jpg?token=...",
    "path": "2026/07/<uuid>.jpg",
    "expires_at": "2026-08-27T12:00:00.000Z"
  }
  ```

  La `url` firmada se envía después como `photo_url` en `/api/lead`.
- `400 invalid_json` / `400 empty_file` / `400 invalid_data`.
- `405 method_not_allowed` (`OPTIONS` → `204`).
- `413 file_too_large`: más de 3 MB decodificados.
- `415 unsupported_type`: tipo, extensión o contenido no permitido.
- `502 upload_failed`: falló la subida o la firma en Storage.
- `503 upload_not_configured`: faltan `SUPABASE_URL` o
  `SUPABASE_SERVICE_ROLE_KEY`.

La API nunca registra ni devuelve el contenido del archivo.

### Sin Supabase configurado

Sin `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`, `/api/folio` y `/api/upload`
responden `503`. El sitio sigue funcionando: la consulta de folio no está
disponible y, para la foto, el sitio pide al cliente adjuntarla directamente en
WhatsApp o en el correo.

## Hosting exclusivamente estático

Un hosting estático no puede ofrecer persistencia durable ni proteger una
credencial `service_role`. Puede apuntar a Formspree, Make, Zapier o HubSpot,
pero el receptor externo debe implementar idempotencia con
`idempotency_key`.

## Pruebas

```bash
node --test tests/*.js tests/*.mjs
node --check api/lead.js
node --check api/crm-store.js
node --check api/folio.js
node --check api/upload.js
node --check kdl-leads.js
```

## SEO

Después de modificar `kdl-data.js`:

```bash
node tools/generate-seo-pages.js
node tools/generate-sitemap.js
```
