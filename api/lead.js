const TO_EMAIL = process.env.LEAD_TO_EMAIL || 'ventas@kdl.com.mx';
const crmStore = require('./crm-store');

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', process.env.LEAD_ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Idempotency-Key');
  res.end(JSON.stringify(body));
}

function clean(value, max = 800) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

const MAX_ITEMS = 100;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RFC_PATTERN = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function cleanEmail(value) {
  const email = clean(value, 400).toLowerCase();
  if (email.length > 160 || !EMAIL_PATTERN.test(email)) return '';
  return email;
}

function cleanRfc(value) {
  const rfc = clean(value, 40).toUpperCase().replace(/[\s-]+/g, '');
  if (rfc.length > 13 || !RFC_PATTERN.test(rfc)) return '';
  return rfc;
}

function cleanDate(value) {
  const text = clean(value, 20);
  const match = DATE_PATTERN.exec(text);
  if (!match) return '';
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) return '';
  return text;
}

function cleanHttpsUrl(value) {
  const text = clean(value, 2000);
  if (!text || text.length > 600) return '';
  try {
    const url = new URL(text);
    return url.protocol === 'https:' && url.hostname ? text : '';
  } catch (error) {
    return '';
  }
}

function cleanChannel(value) {
  const channel = clean(value, 20).toLowerCase();
  return channel === 'whatsapp' || channel === 'email' ? channel : '';
}

function cleanQuantity(value) {
  const number = typeof value === 'number' ? value : Number(clean(value, 40));
  return Number.isFinite(number) && number > 0 ? number : 1;
}

function cleanPrice(value) {
  if (value == null || value === '') return null;
  const number = typeof value === 'number' ? value : Number(clean(value, 40));
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function normalizeItems(value) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MAX_ITEMS)
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .map((item) => ({
      sku: clean(item.sku, 160),
      model: clean(item.model, 160),
      title: clean(item.title, 240),
      brand: clean(item.brand, 160),
      quantity: cleanQuantity(item.quantity),
      unit_price: cleanPrice(item.unit_price),
      manual_reference: clean(item.manual_reference, 240)
    }))
    .filter((item) => item.sku || item.model || item.title || item.manual_reference);
}

function normalize(input, headerKey) {
  const body = typeof input === 'string' ? JSON.parse(input || '{}') : (input || {});
  return {
    id: clean(body.id, 80),
    quote_id: clean(body.quote_id || body.id, 100),
    public_folio: clean(body.public_folio || body.folio, 80),
    contact_id: clean(body.contact_id, 100),
    idempotency_key: clean(body.idempotency_key || headerKey, 120),
    createdAt: clean(body.createdAt, 80),
    created_at: clean(body.created_at || body.createdAt, 80),
    updated_at: clean(body.updated_at || body.createdAt, 80),
    first_contact_at: clean(body.first_contact_at || body.createdAt, 80),
    last_interaction_at: clean(body.last_interaction_at || body.createdAt, 80),
    source: clean(body.source, 80) || 'kdl_web',
    original_source: clean(body.original_source, 80) || 'kdl_web',
    created_by: clean(body.created_by, 80) || 'website',
    actor_type: clean(body.actor_type, 40) || 'system',
    quote_status: clean(body.quote_status, 40) || 'requested',
    catalog_version: clean(body.catalog_version, 80),
    contact_status: clean(body.contact_status, 40) || 'new',
    owner_user_id: clean(body.owner_user_id, 100),
    consent_status: clean(body.consent_status, 40) || 'not_recorded',
    product_id: clean(body.product_id, 120),
    product_name: clean(body.product_name, 240),
    brand: clean(body.brand, 160),
    part_number: clean(body.part_number, 160),
    application: clean(body.application, 800),
    expires_at: clean(body.expires_at, 80),
    page: clean(body.page, 500),
    form: clean(body.form, 80) || 'quote',
    name: clean(body.name, 120),
    company: clean(body.company, 160),
    whatsapp: clean(body.whatsapp, 60),
    email: cleanEmail(body.email),
    rfc: cleanRfc(body.rfc),
    city: clean(body.city, 160),
    part: clean(body.part, 240),
    quantity: clean(body.quantity, 60),
    category: clean(body.category, 160),
    urgency: clean(body.urgency, 80),
    machineDown: clean(body.machineDown, 40),
    message: clean(body.message, 1600),
    fileName: clean(body.fileName, 240),
    required_date: cleanDate(body.required_date),
    photo_url: cleanHttpsUrl(body.photo_url),
    channel: cleanChannel(body.channel),
    items: normalizeItems(body.items)
  };
}

function itemLines(items) {
  return (items || []).map((item, index) => {
    const label = item.model || item.title || item.manual_reference || item.sku || '-';
    const parts = [`${index + 1}) ${label} — Cant: ${item.quantity}`];
    if (item.sku) parts.push(`Clave: ${item.sku}`);
    return parts.join(' · ');
  });
}

function leadText(lead) {
  const optional = [];
  if (lead.email) optional.push(`Email: ${lead.email}`);
  if (lead.rfc) optional.push(`RFC: ${lead.rfc}`);
  if (lead.required_date) optional.push(`Fecha requerida: ${lead.required_date}`);
  if (lead.channel) optional.push(`Canal: ${lead.channel}`);
  const items = itemLines(lead.items);
  return [
    'Nuevo lead KDL',
    '',
    `Folio: ${lead.public_folio || '-'}`,
    `Nombre: ${lead.name || '-'}`,
    `Empresa: ${lead.company || '-'}`,
    `WhatsApp: ${lead.whatsapp || '-'}`,
    ...optional,
    `Ciudad/planta: ${lead.city || '-'}`,
    `Categoria: ${lead.category || '-'}`,
    `Urgencia: ${lead.urgency || '-'}`,
    `Maquina detenida: ${lead.machineDown || '-'}`,
    `Marca / No. de parte: ${lead.part || '-'}`,
    `Cantidad: ${lead.quantity || '-'}`,
    ...(items.length ? ['', `Partidas (${items.length}):`, ...items, ''] : []),
    `Mensaje: ${lead.message || '-'}`,
    `Foto seleccionada: ${lead.fileName || '-'}`,
    ...(lead.photo_url ? [`Foto: ${lead.photo_url}`] : []),
    '',
    `Origen: ${lead.page || '-'}`
  ].join('\n');
}

async function postJson(url, payload, headers = {}) {
  if (!url) return { skipped: true };
  const response = await fetch(url, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
    body: JSON.stringify(payload)
  });
  return { ok: response.ok, status: response.status };
}

async function sendWebhook(lead) {
  const url = process.env.KDL_CRM_WEBHOOK_URL || process.env.MAKE_WEBHOOK_URL || process.env.ZAPIER_WEBHOOK_URL;
  return postJson(url, { source: 'kdl.com.mx', lead }, { 'Idempotency-Key': lead.idempotency_key });
}

async function sendFormspree(lead) {
  if (!process.env.FORMSPREE_ENDPOINT) return { skipped: true };
  return postJson(process.env.FORMSPREE_ENDPOINT, {
    _subject: `Lead KDL - ${lead.category || 'Refaccion industrial'}`,
    name: lead.name,
    whatsapp: lead.whatsapp,
    email: TO_EMAIL,
    message: leadText(lead),
    category: lead.category,
    urgency: lead.urgency,
    page: lead.page
  });
}

async function sendHubSpot(lead) {
  const portalId = process.env.HUBSPOT_PORTAL_ID;
  const formId = process.env.HUBSPOT_FORM_ID;
  if (!portalId || !formId) return { skipped: true };
  return postJson(`https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`, {
    fields: [
      { name: 'firstname', value: lead.name },
      { name: 'company', value: lead.company },
      { name: 'phone', value: lead.whatsapp },
      { name: 'email', value: lead.email },
      { name: 'city', value: lead.city },
      { name: 'message', value: leadText(lead) },
      { name: 'lead_source', value: 'Sitio KDL' }
    ].filter((field) => field.value),
    context: {
      pageUri: lead.page,
      pageName: 'KDL quote form'
    }
  });
}

async function sendResendEmail(lead) {
  if (!process.env.RESEND_API_KEY) return { skipped: true };
  return postJson('https://api.resend.com/emails', {
    from: process.env.LEAD_FROM_EMAIL || 'KDL Web <onboarding@resend.dev>',
    to: [TO_EMAIL],
    subject: `Lead KDL - ${lead.category || 'Refaccion industrial'}`,
    text: leadText(lead),
    reply_to: process.env.LEAD_REPLY_TO || TO_EMAIL
  }, {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`
  });
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method_not_allowed' });

  let lead;
  try {
    const headerKey = clean(req.headers && (req.headers['idempotency-key'] || req.headers['Idempotency-Key']), 120);
    const bodyKey = clean(req.body && typeof req.body === 'object' && req.body.idempotency_key, 120);
    if (headerKey && bodyKey && headerKey !== bodyKey) {
      return json(res, 409, { ok: false, error: 'idempotency_key_mismatch' });
    }
    lead = normalize(req.body, headerKey);
  } catch (error) {
    return json(res, 400, { ok: false, error: 'invalid_json' });
  }

  if (!lead.name || !lead.whatsapp || !lead.quote_id || !lead.public_folio || !lead.idempotency_key) {
    return json(res, 422, { ok: false, error: 'missing_required_fields' });
  }
  if (!/^KDL-\d{8}-[A-Z0-9]{4}$/.test(lead.public_folio)) {
    return json(res, 422, { ok: false, error: 'invalid_public_folio' });
  }
  if (!/^[A-Za-z0-9_-]{8,120}$/.test(lead.quote_id) || !/^[A-Za-z0-9_-]{8,120}$/.test(lead.contact_id)) {
    return json(res, 422, { ok: false, error: 'invalid_stable_id' });
  }
  if (!lead.created_at || Number.isNaN(Date.parse(lead.created_at))) {
    return json(res, 422, { ok: false, error: 'invalid_created_at' });
  }

  let persistence;
  try {
    persistence = await crmStore.persistQuote(lead);
  } catch (error) {
    persistence = { ok: false, durable: false, error: 'persistence_failed' };
  }

  if (persistence && persistence.ok === false) {
    return json(res, 503, {
      ok: false,
      received: true,
      delivered: false,
      durable: false,
      error: persistence.error || 'persistence_failed',
      public_folio: lead.public_folio,
      quote_id: lead.quote_id,
      persistence
    });
  }

  if (persistence && persistence.duplicate) {
    return json(res, 200, {
      ok: true,
      received: true,
      duplicate: true,
      delivered: false,
      durable: true,
      public_folio: persistence.public_folio,
      quote_id: persistence.quote_id,
      persistence
    });
  }

  if (persistence && persistence.skipped && process.env.KDL_REQUIRE_DURABLE_PERSISTENCE === 'true') {
    return json(res, 503, {
      ok: false,
      received: true,
      delivered: false,
      durable: false,
      error: 'persistence_not_configured',
      public_folio: lead.public_folio,
      quote_id: lead.quote_id,
      persistence
    });
  }

  const results = {};
  try { results.webhook = await sendWebhook(lead); } catch (error) { results.webhook = { ok: false, error: 'webhook_failed' }; }
  try { results.formspree = await sendFormspree(lead); } catch (error) { results.formspree = { ok: false, error: 'formspree_failed' }; }
  try { results.hubspot = await sendHubSpot(lead); } catch (error) { results.hubspot = { ok: false, error: 'hubspot_failed' }; }
  try { results.email = await sendResendEmail(lead); } catch (error) { results.email = { ok: false, error: 'email_failed' }; }

  const channels = Object.values(results);
  const configured = channels.filter((result) => !result.skipped);
  const delivered = configured.filter((result) => result.ok);
  if (!configured.length) {
    return json(res, 503, { ok: false, received: true, delivered: false, durable: Boolean(persistence && persistence.durable), error: 'delivery_not_configured', public_folio: lead.public_folio, quote_id: lead.quote_id, persistence, results });
  }
  if (!delivered.length) {
    return json(res, 502, { ok: false, received: true, delivered: false, durable: Boolean(persistence && persistence.durable), error: 'delivery_failed', public_folio: lead.public_folio, quote_id: lead.quote_id, persistence, results });
  }
  return json(res, 202, {
    ok: true,
    received: true,
    delivered: true,
    durable: Boolean(persistence && persistence.durable),
    partial_success: delivered.length < configured.length,
    public_folio: lead.public_folio,
    quote_id: lead.quote_id,
    persistence,
    results
  });
};

module.exports.normalize = normalize;
module.exports.leadText = leadText;
