# KDL lead capture setup

The site submits quote leads through `kdl-leads.js`.

Default flow:

1. Browser sends the lead to `/api/lead`.
2. `api/lead.js` forwards it to any configured service.
3. The browser also keeps a local backup in `localStorage` and exposes a `mailto:` fallback.

## Vercel backend

Deploy the project to Vercel and keep this default in `kdl-config.js`:

```js
window.KDL_LEAD_ENDPOINT = '/api/lead';
window.KDL_LEAD_PROVIDER = 'kdl-backend';
```

Then configure one or more environment variables in Vercel:

```txt
LEAD_TO_EMAIL=ventas@kdl.com.mx
KDL_CRM_WEBHOOK_URL=https://hook.make.com/...
MAKE_WEBHOOK_URL=https://hook.make.com/...
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/...
FORMSPREE_ENDPOINT=https://formspree.io/f/xxxxxxx
HUBSPOT_PORTAL_ID=123456
HUBSPOT_FORM_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
RESEND_API_KEY=re_...
LEAD_FROM_EMAIL=KDL Web <leads@kdl.com.mx>
```

Only the variables you set are used.

## Static-only hosting

If the host cannot run `/api/lead`, point the browser directly to a webhook in `kdl-config.js`.

Formspree:

```js
window.KDL_LEAD_ENDPOINT = 'https://formspree.io/f/xxxxxxx';
window.KDL_LEAD_PROVIDER = 'formspree';
```

Make:

```js
window.KDL_LEAD_ENDPOINT = 'https://hook.make.com/xxxxxxx';
window.KDL_LEAD_PROVIDER = 'make';
```

Zapier:

```js
window.KDL_LEAD_ENDPOINT = 'https://hooks.zapier.com/hooks/catch/xxxxxxx/yyyyyyy/';
window.KDL_LEAD_PROVIDER = 'zapier';
```

HubSpot forms:

```js
window.KDL_LEAD_ENDPOINT = 'https://api.hsforms.com/submissions/v3/integration/submit/PORTAL_ID/FORM_ID';
window.KDL_LEAD_PROVIDER = 'hubspot';
```

## SEO generation

Run these after editing `kdl-data.js`:

```bash
node tools/generate-seo-pages.js
node tools/generate-sitemap.js
```
