(function(){
  if(window.kdlLead) return;

  var STORAGE_KEY='kdl_leads';
  var DEFAULT_EMAIL='ventas@kdl.com.mx';

  function clean(v){
    return String(v==null?'':v).trim();
  }

  function nowIso(){
    try{ return new Date().toISOString(); }catch(e){ return ''; }
  }

  function leadEmail(){
    return window.KDL_LEAD_EMAIL||DEFAULT_EMAIL;
  }

  function track(name,data){
    var payload=data||{};
    try{ if(typeof window.kdlTrack==='function') window.kdlTrack(name,payload); }catch(e){}
    try{ window.dataLayer=window.dataLayer||[]; window.dataLayer.push(Object.assign({event:name},payload)); }catch(e){}
    try{ window.__kdlAnalyticsEvents=window.__kdlAnalyticsEvents||[]; window.__kdlAnalyticsEvents.push(Object.assign({event:name},payload)); }catch(e){}
  }

  function loadStored(){
    try{
      var raw=localStorage.getItem(STORAGE_KEY);
      return raw?JSON.parse(raw):[];
    }catch(e){ return []; }
  }

  function saveStored(item){
    try{
      var rows=loadStored();
      rows.unshift(item);
      localStorage.setItem(STORAGE_KEY,JSON.stringify(rows.slice(0,100)));
    }catch(e){}
  }

  function mailto(payload){
    var subject='Solicitud de cotizacion KDL - '+(clean(payload.category)||'Refaccion industrial');
    var body=[
      'Hola KDL, solicito seguimiento a este lead:',
      '',
      'Nombre: '+(clean(payload.name)||'-'),
      'Empresa: '+(clean(payload.company)||'-'),
      'WhatsApp: '+(clean(payload.whatsapp)||'-'),
      'Ciudad / planta: '+(clean(payload.city)||'-'),
      'Categoria: '+(clean(payload.category)||'-'),
      'Urgencia: '+(clean(payload.urgency)||'-'),
      'Maquina detenida: '+(clean(payload.machineDown)||'-'),
      'Marca / No. de parte: '+(clean(payload.part)||'-'),
      'Cantidad: '+(clean(payload.quantity)||'-'),
      'Mensaje: '+(clean(payload.message)||'-'),
      payload.fileName?('Foto seleccionada: '+payload.fileName):'Foto seleccionada: -',
      '',
      'Origen: '+(payload.page||location.href)
    ].join('\n');
    return 'mailto:'+encodeURIComponent(payload.emailTo||leadEmail())+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
  }

  function leadText(payload){
    return [
      'Nuevo lead KDL',
      '',
      'Nombre: '+(clean(payload.name)||'-'),
      'Empresa: '+(clean(payload.company)||'-'),
      'WhatsApp: '+(clean(payload.whatsapp)||'-'),
      'Ciudad / planta: '+(clean(payload.city)||'-'),
      'Categoria: '+(clean(payload.category)||'-'),
      'Urgencia: '+(clean(payload.urgency)||'-'),
      'Maquina detenida: '+(clean(payload.machineDown)||'-'),
      'Marca / No. de parte: '+(clean(payload.part)||'-'),
      'Cantidad: '+(clean(payload.quantity)||'-'),
      'Mensaje: '+(clean(payload.message)||'-'),
      payload.fileName?('Foto seleccionada: '+payload.fileName):'Foto seleccionada: -',
      '',
      'Origen: '+(payload.page||location.href)
    ].join('\n');
  }

  function providerPayload(payload){
    var provider=(window.KDL_LEAD_PROVIDER||'generic').toLowerCase();
    if(provider==='kdl-backend'||provider==='generic'){
      return payload;
    }
    if(provider==='formspree'){
      return {
        _subject:'Lead KDL - '+(payload.category||'Refaccion industrial'),
        name:payload.name||'',
        whatsapp:payload.whatsapp||'',
        email:leadEmail(),
        message:leadText(payload),
        category:payload.category||'',
        urgency:payload.urgency||'',
        page:payload.page||''
      };
    }
    if(provider==='hubspot'){
      return {
        fields:[
          {name:'firstname',value:payload.name||''},
          {name:'company',value:payload.company||''},
          {name:'phone',value:payload.whatsapp||''},
          {name:'city',value:payload.city||''},
          {name:'message',value:leadText(payload)},
          {name:'lead_source',value:'Sitio KDL'}
        ].filter(function(field){ return !!field.value; }),
        context:{pageUri:payload.page||location.href,pageName:'KDL quote form'}
      };
    }
    return {
      source:'kdl.com.mx',
      provider:provider,
      lead:payload,
      text:leadText(payload)
    };
  }

  function postEndpoint(payload){
    var endpoint=window.KDL_LEAD_ENDPOINT||'';
    if(!endpoint) return;
    var body=JSON.stringify(providerPayload(payload));
    try{
      if(navigator.sendBeacon){
        var blob=new Blob([body],{type:'application/json'});
        if(navigator.sendBeacon(endpoint,blob)) return;
      }
    }catch(e){}
    try{
      fetch(endpoint,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:body,
        keepalive:true,
        mode:'cors'
      }).catch(function(){});
    }catch(e){}
  }

  window.kdlLead={
    submit:function(input){
      var payload=Object.assign({},input||{},{
        id:'kdl-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),
        createdAt:nowIso(),
        page:location.href
      });
      saveStored(payload);
      track('lead_capture',{
        form:payload.form||'quote',
        category:payload.category||'',
        urgency:payload.urgency||'',
        has_file:!!payload.fileName
      });
      postEndpoint(payload);
      return {ok:true,mailto:mailto(payload),stored:true,endpointConfigured:!!window.KDL_LEAD_ENDPOINT};
    },
    mailto:mailto,
    stored:loadStored
  };
})();
