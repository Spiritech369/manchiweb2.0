(function(){
  window.KDL_SITE_URL = window.KDL_SITE_URL || 'https://kdl.com.mx';

  // Default backend endpoint. On Vercel this maps to api/lead.js.
  // For static-only hosting, replace this with a Formspree/Make/Zapier webhook URL.
  window.KDL_LEAD_ENDPOINT = window.KDL_LEAD_ENDPOINT || '/api/lead';

  // Supported values: kdl-backend, formspree, make, zapier, hubspot, generic.
  window.KDL_LEAD_PROVIDER = window.KDL_LEAD_PROVIDER || 'kdl-backend';

  window.KDL_LEAD_EMAIL = window.KDL_LEAD_EMAIL || 'ventas@kdl.com.mx';
})();
