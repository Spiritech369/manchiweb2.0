'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/upload');

const ENV_KEYS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'KDL_UPLOAD_BUCKET'];

const originalFetch = global.fetch;
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

function resetEnvironment() {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] == null) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  global.fetch = originalFetch;
}

function configure() {
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
}

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('JFIF test image body')]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('png body')]);

function photo(overrides = {}) {
  return Object.assign({ fileName: 'foto.jpg', contentType: 'image/jpeg', data: JPEG.toString('base64') }, overrides);
}

async function invoke(body, method = 'POST') {
  const output = { status: 0, headers: {}, body: null, raw: '' };
  const req = { method, body, headers: { 'content-type': 'application/json' } };
  const res = {
    set statusCode(value) { output.status = value; },
    get statusCode() { return output.status; },
    setHeader(name, value) { output.headers[name] = value; },
    end(value) { output.raw = String(value); output.body = JSON.parse(output.raw); }
  };
  await handler(req, res);
  return output;
}

function storageStub(calls, { uploadOk = true, signOk = true, signedURL } = {}) {
  return async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/storage/v1/object/sign/')) {
      const path = String(url).split('/storage/v1/object/sign/')[1];
      return {
        ok: signOk,
        status: signOk ? 200 : 500,
        json: async () => ({ signedURL: signedURL === undefined ? `/object/sign/${path}?token=signed-token` : signedURL })
      };
    }
    return { ok: uploadOk, status: uploadOk ? 200 : 400, json: async () => ({ Key: 'x' }) };
  };
}

test.afterEach(resetEnvironment);
test.after(resetEnvironment);

test('OPTIONS 204 con CORS y otros métodos 405', async () => {
  const options = await invoke(undefined, 'OPTIONS');
  assert.equal(options.status, 204);
  assert.equal(options.headers['Access-Control-Allow-Methods'], 'POST, OPTIONS');
  const get = await invoke(undefined, 'GET');
  assert.equal(get.status, 405);
  assert.deepEqual(get.body, { ok: false, error: 'method_not_allowed' });
});

test('rechaza JSON inválido, tipos no permitidos y archivos vacíos', async () => {
  configure();
  let calls = 0;
  global.fetch = async () => { calls += 1; return { ok: true, status: 200, json: async () => ({}) }; };

  assert.equal((await invoke('{no json')).status, 400);
  for (const contentType of ['image/gif', 'image/svg+xml', 'application/pdf', 'text/html', '']) {
    const result = await invoke(photo({ contentType }));
    assert.equal(result.status, 415, contentType);
    assert.deepEqual(result.body, { ok: false, error: 'unsupported_type' });
  }
  assert.equal((await invoke(photo({ fileName: 'malware.exe' }))).status, 415);
  assert.equal((await invoke(photo({ fileName: 'pagina.html' }))).status, 415);
  // Bytes that are not a JPEG even though the declared type says so.
  assert.equal((await invoke(photo({ data: Buffer.from('<svg onload=alert(1)>').toString('base64') }))).status, 415);

  const empty = await invoke(photo({ data: '' }));
  assert.equal(empty.status, 400);
  assert.equal(empty.body.ok, false);
  assert.equal((await invoke(photo({ data: 'data:image/jpeg;base64,' }))).status, 400);
  assert.equal((await invoke(photo({ data: '***no base64***' }))).status, 400);
  assert.equal(calls, 0);
});

test('acepta nombres con extensión de imagen distinta tras recomprimir', async () => {
  configure();
  global.fetch = storageStub([]);
  for (const fileName of ['IMG_0001.HEIC', 'captura.png', 'sin-extension', '', undefined]) {
    const result = await invoke(photo({ fileName }));
    assert.equal(result.status, 200, String(fileName));
  }
});

test('limita el archivo decodificado a 3 MB', async () => {
  configure();
  let calls = 0;
  global.fetch = async () => { calls += 1; return { ok: true, status: 200, json: async () => ({}) }; };

  const oversized = Buffer.alloc(3 * 1024 * 1024 + 1, 0);
  JPEG.copy(oversized);
  const result = await invoke(photo({ data: oversized.toString('base64') }));
  assert.equal(result.status, 413);
  assert.deepEqual(result.body, { ok: false, error: 'file_too_large' });
  assert.equal(calls, 0);
  assert.equal(handler.MAX_BYTES, 3 * 1024 * 1024);

  global.fetch = storageStub([]);
  const exact = Buffer.alloc(3 * 1024 * 1024, 0);
  JPEG.copy(exact);
  assert.equal((await invoke(photo({ data: exact.toString('base64') }))).status, 200);
});

test('503 cuando Supabase no está configurado', async () => {
  let calls = 0;
  global.fetch = async () => { calls += 1; return { ok: true, status: 200, json: async () => ({}) }; };
  const result = await invoke(photo());
  assert.equal(result.status, 503);
  assert.deepEqual(result.body, { ok: false, error: 'upload_not_configured' });
  assert.equal(calls, 0);
});

test('sube a Storage privado y devuelve URL firmada por 30 días', async () => {
  configure();
  const calls = [];
  global.fetch = storageStub(calls);
  const before = Date.now();

  const result = await invoke(photo({ fileName: '../../etc/passwd.jpg', data: `data:image/jpeg;base64,${JPEG.toString('base64')}` }));

  assert.equal(result.status, 200);
  assert.equal(calls.length, 2);
  const now = new Date();
  const prefix = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/`;
  const pathPattern = new RegExp(`^${prefix}[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.jpg$`);
  assert.match(result.body.path, pathPattern);
  assert.doesNotMatch(result.body.path, /passwd|\.\./);

  const [upload, sign] = calls;
  assert.equal(upload.url, `https://project.supabase.co/storage/v1/object/kdl-uploads/${result.body.path}`);
  assert.equal(upload.options.method, 'POST');
  assert.deepEqual(upload.options.headers, {
    apikey: 'service-role-test',
    Authorization: 'Bearer service-role-test',
    'Content-Type': 'image/jpeg',
    'x-upsert': 'false'
  });
  assert.ok(Buffer.isBuffer(upload.options.body));
  assert.ok(upload.options.body.equals(JPEG));

  assert.equal(sign.url, `https://project.supabase.co/storage/v1/object/sign/kdl-uploads/${result.body.path}`);
  assert.equal(sign.options.method, 'POST');
  assert.deepEqual(sign.options.headers, {
    apikey: 'service-role-test',
    Authorization: 'Bearer service-role-test',
    'Content-Type': 'application/json'
  });
  assert.deepEqual(JSON.parse(sign.options.body), { expiresIn: 2592000 });

  assert.deepEqual(Object.keys(result.body).sort(), ['expires_at', 'ok', 'path', 'url']);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.url, `https://project.supabase.co/storage/v1/object/sign/kdl-uploads/${result.body.path}?token=signed-token`);
  const expires = Date.parse(result.body.expires_at);
  assert.ok(expires >= before + 2592000 * 1000 - 1000 && expires <= Date.now() + 2592000 * 1000 + 1000);
  assert.equal(result.raw.includes(JPEG.toString('base64')), false);
});

test('usa KDL_UPLOAD_BUCKET y la extensión del tipo declarado', async () => {
  configure();
  process.env.KDL_UPLOAD_BUCKET = 'otro-bucket';
  const calls = [];
  global.fetch = storageStub(calls);
  const result = await invoke(photo({ fileName: 'foto.jpg', contentType: 'image/png', data: PNG.toString('base64') }));
  assert.equal(result.status, 200);
  assert.match(result.body.path, /\.png$/);
  assert.equal(calls[0].url, `https://project.supabase.co/storage/v1/object/otro-bucket/${result.body.path}`);
  assert.equal(calls[0].options.headers['Content-Type'], 'image/png');
});

test('502 cuando falla la subida, la firma o la red', async () => {
  configure();
  global.fetch = storageStub([], { uploadOk: false });
  const upload = await invoke(photo());
  assert.equal(upload.status, 502);
  assert.deepEqual(upload.body, { ok: false, error: 'upload_failed' });

  global.fetch = storageStub([], { signOk: false });
  assert.equal((await invoke(photo())).status, 502);

  global.fetch = storageStub([], { signedURL: null });
  assert.equal((await invoke(photo())).status, 502);

  global.fetch = async () => { throw new Error('network'); };
  assert.equal((await invoke(photo())).status, 502);
});
