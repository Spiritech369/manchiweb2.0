const TO_EMAIL = process.env.LEAD_TO_EMAIL || 'ventas@kdl.com.mx';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', process.env.LEAD_ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(body));
}

function clean(value, max = 800) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function normalize(input) {
  const body = typeof input === 'string' ? JSON.parse(input || '{}') : (input || {});
  return {
    id: clean(body.id, 80),
    createdAt: clean(body.createdAt, 80),
    page: clean(body.page, 500),
    form: clean(body.form, 80) || 'quote',
    name: clean(body.name, 120),
    company: clean(body.company, 160),
    whatsapp: clean(body.whatsapp, 60),
    city: clean(body.city, 160),
    part: clean(body.part, 240),
    quantity: clean(body.quantity, 60),
    category: clean(body.category, 160),
    urgency: clean(body.urgency, 80),
    machineDown: clean(body.machineDown, 40),
    message: clean(body.message, 1600),
    fileName: clean(body.fileName, 240)
  };
}

function leadText(lead) {
  return [
    'Nuevo lead KDL',
    '',
    `Nombre: ${lead.name || '-'}`,
    `Empresa: ${lead.company || '-'}`,
    `WhatsApp: ${lead.whatsapp || '-'}`,
    `Ciudad/planta: ${lead.city || '-'}`,
    `Categoria: ${lead.category || '-'}`,
    `Urgencia: ${lead.urgency || '-'}`,
    `Maquina detenida: ${lead.machineDown || '-'}`,
    `Marca / No. de parte: ${lead.part || '-'}`,
    `Cantidad: ${lead.quantity || '-'}`,
    `Mensaje: ${lead.message || '-'}`,
    `Foto seleccionada: ${lead.fileName || '-'}`,
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
  return postJson(url, { source: 'kdl.com.mx', lead });
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
    lead = normalize(req.body);
  } catch (error) {
    return json(res, 400, { ok: false, error: 'invalid_json' });
  }

  if (!lead.name || !lead.whatsapp) {
    return json(res, 422, { ok: false, error: 'missing_required_fields' });
  }

  const results = {};
  try { results.webhook = await sendWebhook(lead); } catch (error) { results.webhook = { ok: false, error: 'webhook_failed' }; }
  try { results.formspree = await sendFormspree(lead); } catch (error) { results.formspree = { ok: false, error: 'formspree_failed' }; }
  try { results.hubspot = await sendHubSpot(lead); } catch (error) { results.hubspot = { ok: false, error: 'hubspot_failed' }; }
  try { results.email = await sendResendEmail(lead); } catch (error) { results.email = { ok: false, error: 'email_failed' }; }

  return json(res, 202, { ok: true, received: true, results });
};
