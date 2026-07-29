(function(){
  if(window.kdlLead) return;

  var STORAGE_KEY='kdl_lead_receipts';
  var IDEMPOTENCY_KEY='kdl_lead_idempotency';
  var CONTACT_ID_KEY='kdl_contact_id';
  var DEFAULT_EMAIL='ventas@kdl.com.mx';
  try{ localStorage.removeItem('kdl_leads'); }catch(e){}

  function clean(v){
    return String(v==null?'':v).trim();
  }

  function nowIso(){
    try{ return new Date().toISOString(); }catch(e){ return ''; }
  }

  function createFolio(){
    var d=new Date();
    var y=d.getFullYear();
    var m=String(d.getMonth()+1).padStart(2,'0');
    var day=String(d.getDate()).padStart(2,'0');
    var code=Math.random().toString(36).slice(2,6).toUpperCase();
    return 'KDL-'+y+m+day+'-'+code;
  }

  function createId(prefix){
    var value='';
    try{ if(window.crypto&&typeof window.crypto.randomUUID==='function') value=window.crypto.randomUUID(); }catch(e){}
    if(!value) value=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);
    return prefix+'_'+value;
  }

  function fingerprint(input){
    var raw=['form','name','company','whatsapp','city','part','quantity','category','urgency','machineDown','message','fileName']
      .map(function(key){ return clean(input&&input[key]).toLowerCase(); }).join('|');
    var hash=2166136261;
    for(var i=0;i<raw.length;i++){ hash^=raw.charCodeAt(i); hash=Math.imul(hash,16777619); }
    return (hash>>>0).toString(36);
  }

  function contactId(){
    try{
      var stored=localStorage.getItem(CONTACT_ID_KEY);
      if(stored) return stored;
      var created=createId('contact');
      localStorage.setItem(CONTACT_ID_KEY,created);
      return created;
    }catch(e){
      return createId('contact');
    }
  }

  function idempotencyFor(input){
    var signature=fingerprint(input);
    var rows=[];
    try{ rows=JSON.parse(sessionStorage.getItem(IDEMPOTENCY_KEY)||'[]'); }catch(e){}
    var cutoff=Date.now()-(30*60*1000);
    rows=Array.isArray(rows)?rows.filter(function(row){ return row&&row.createdMs>=cutoff; }):[];
    var hit=rows.find(function(row){ return row.signature===signature; });
    if(hit) return Object.assign({},hit,{duplicate:true});
    var row={signature:signature,key:createId('idem'),folio:createFolio(),quoteId:createId('quote'),contactId:contactId(),createdMs:Date.now()};
    rows.unshift(row);
    try{ sessionStorage.setItem(IDEMPOTENCY_KEY,JSON.stringify(rows.slice(0,12))); }catch(e){}
    return row;
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
      if(rows.some(function(row){ return row.quoteId===(item.quote_id||item.id); })) return;
      rows.unshift({
        folio:item.public_folio||item.folio,
        quoteId:item.quote_id||item.id,
        createdAt:item.created_at||item.createdAt,
        status:'pending_backend',
        source:item.source||'kdl_web',
        form:item.form||'quote'
      });
      localStorage.setItem(STORAGE_KEY,JSON.stringify(rows.slice(0,20)));
    }catch(e){}
  }

  function updateStored(quoteId,patch){
    try{
      var rows=loadStored();
      var changed=false;
      rows=rows.map(function(row){
        if(row.quoteId!==quoteId) return row;
        changed=true;
        return Object.assign({},row,patch||{});
      });
      if(changed) localStorage.setItem(STORAGE_KEY,JSON.stringify(rows.slice(0,20)));
    }catch(e){}
  }

  function mailto(payload){
    var subject='Solicitud '+(clean(payload.folio)||'KDL')+' - '+(clean(payload.category)||'Refaccion industrial');
    var body=[
      'Hola KDL, solicito seguimiento a este lead:',
      '',
      'Folio: '+(clean(payload.folio)||'-'),
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
      'Folio: '+(clean(payload.folio)||'-'),
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
    if(!endpoint) return Promise.resolve({ok:false,skipped:true,error:'endpoint_not_configured'});
    var body=JSON.stringify(providerPayload(payload));
    try{
      return fetch(endpoint,{
        method:'POST',
        headers:{'Content-Type':'application/json','Idempotency-Key':payload.idempotency_key||''},
        body:body,
        keepalive:true,
        mode:'cors'
      }).then(function(response){
        return response.text().then(function(text){
          var data=null;
          try{ data=text?JSON.parse(text):null; }catch(e){}
          return {ok:response.ok,status:response.status,data:data};
        });
      }).catch(function(){ return {ok:false,error:'network_error'}; });
    }catch(e){
      return Promise.resolve({ok:false,error:'network_error'});
    }
  }

  window.kdlLead={
    submit:function(input){
      var idem=idempotencyFor(input||{});
      var createdAt=nowIso();
      var payload=Object.assign({},input||{},{
        folio:idem.folio,
        public_folio:idem.folio,
        id:idem.quoteId,
        quote_id:idem.quoteId,
        contact_id:idem.contactId,
        idempotency_key:idem.key,
        createdAt:createdAt,
        created_at:createdAt,
        updated_at:createdAt,
        first_contact_at:createdAt,
        last_interaction_at:createdAt,
        source:'kdl_web',
        original_source:'kdl_web',
        contact_status:'new',
        consent_status:'privacy_notice_presented_tacit',
        created_by:'website',
        actor_type:'system',
        quote_status:'requested',
        catalog_version:window.KDL_CATALOG_VERSION||'',
        page:location.href
      });
      var deliveryPromise;
      if(!idem.duplicate){
        saveStored(payload);
        track('lead_capture',{
          form:payload.form||'quote',
          category:payload.category||'',
          urgency:payload.urgency||'',
          has_file:!!payload.fileName
        });
        deliveryPromise=postEndpoint(payload).then(function(result){
          var status=result&&result.ok
            ? ((result.data&&result.data.durable)?'persisted':'delivered_not_durable')
            : 'fallback_required';
          updateStored(payload.quote_id,{
            status:status,
            updatedAt:nowIso(),
            apiStatus:(result&&result.status)||null
          });
          track(result&&result.ok?'lead_backend_confirmed':'lead_backend_fallback',{
            form:payload.form||'quote',
            quote_id:payload.quote_id,
            durable:!!(result&&result.data&&result.data.durable),
            api_status:(result&&result.status)||0
          });
          return result;
        });
      }else{
        track('lead_duplicate_prevented',{form:payload.form||'quote',quote_id:payload.quote_id});
        deliveryPromise=Promise.resolve({ok:true,duplicate:true,data:{durable:false}});
      }
      return {ok:true,duplicate:!!idem.duplicate,folio:payload.folio,quoteId:payload.quote_id,idempotencyKey:payload.idempotency_key,mailto:mailto(payload),stored:true,endpointConfigured:!!window.KDL_LEAD_ENDPOINT,deliveryPromise:deliveryPromise};
    },
    mailto:mailto,
    stored:loadStored
  };
})();
