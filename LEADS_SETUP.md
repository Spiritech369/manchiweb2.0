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

## Variables de entorno

Configura en Vercel:

```txt
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
KDL_REQUIRE_DURABLE_PERSISTENCE=true

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

## Hosting exclusivamente estático

Un hosting estático no puede ofrecer persistencia durable ni proteger una
credencial `service_role`. Puede apuntar a Formspree, Make, Zapier o HubSpot,
pero el receptor externo debe implementar idempotencia con
`idempotency_key`.

## Pruebas

```bash
node --test tests/lead-api.test.js
node --check api/lead.js
node --check api/crm-store.js
node --check kdl-leads.js
```

## SEO

Después de modificar `kdl-data.js`:

```bash
node tools/generate-seo-pages.js
node tools/generate-sitemap.js
```
