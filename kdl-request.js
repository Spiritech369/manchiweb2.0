/* KDL — envío de solicitudes de cotización por WhatsApp o correo, con folio y foto opcional. */
(function(){
  if(window.KDLRequest) return;
  var WA_NUMBER='528112273382';
  var EMAIL='ventas@kdl.com.mx';
  var HISTORY_KEY='kdl_quote_history';
  var MAX_UPLOAD_BYTES=3*1024*1024;

  function clean(value){ return String(value==null?'':value).trim(); }
  function digits(value){ return clean(value).replace(/\D/g,''); }
  function money(value){
    try{ return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(value)+' MXN'; }
    catch(error){ return '$'+Number(value).toFixed(2)+' MXN'; }
  }

  function validate(contact,options){
    var errors={};
    var opts=options||{};
    var phone=digits(contact.phone);
    if(!clean(contact.name)) errors.name='Ingresa tu nombre.';
    if(!phone) errors.phone='Ingresa tu teléfono o WhatsApp.';
    else if(phone.length<10||phone.length>15) errors.phone='Ingresa un teléfono de 10 dígitos.';
    if(clean(contact.email)&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean(contact.email))) errors.email='Revisa el correo.';
    if(opts.requireEmail&&!clean(contact.email)) errors.email='Ingresa tu correo para enviarlo por este medio.';
    if(clean(contact.rfc)&&!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i.test(clean(contact.rfc))) errors.rfc='El RFC debe tener 12 o 13 caracteres.';
    if(opts.requireReference&&!clean(contact.part)&&!clean(contact.message)&&!clean(contact.photoUrl)) errors.reference='Agrega un número de parte, una descripción o una foto.';
    return errors;
  }

  function itemsTotal(items){
    var total=0, priced=0;
    (items||[]).forEach(function(item){
      var price=Number(item.price)||0;
      if(price>0){ total+=price*(Number(item.qty)||1); priced++; }
    });
    return {total:total,priced:priced,count:(items||[]).length};
  }

  function itemLines(items){
    return (items||[]).map(function(item,index){
      var parts=[(index+1)+') '+clean(item.n)+' — Cant: '+(Number(item.qty)||1)];
      if(item.sku) parts.push('Clave '+item.sku);
      if(Number(item.price)>0) parts.push(money(Number(item.price))+' + IVA c/u');
      else if(item.s&&item.s!=='Entrada manual') parts.push(clean(item.s));
      return parts.join(' · ');
    });
  }

  function messageText(request){
    var c=request.contact||{};
    var lines=['Hola KDL, les envío mi solicitud de cotización.',''];
    if(request.folio) lines.push('Folio: '+request.folio);
    lines.push('Nombre: '+(clean(c.name)||'-'));
    if(clean(c.company)) lines.push('Empresa: '+clean(c.company));
    if(clean(c.rfc)) lines.push('RFC: '+clean(c.rfc).toUpperCase());
    if(clean(c.email)) lines.push('Correo: '+clean(c.email));
    lines.push('Teléfono: '+(clean(c.phone)||'-'));
    if(clean(c.requiredDate)) lines.push('Fecha requerida: '+clean(c.requiredDate));
    var items=request.items||[];
    if(items.length){
      lines.push('','Piezas:');
      lines=lines.concat(itemLines(items));
      var totals=itemsTotal(items);
      if(totals.priced) lines.push('','Subtotal de referencia: '+money(totals.total)+' + IVA'+(totals.priced<totals.count?' (sin las piezas por cotizar)':''));
    }
    if(clean(c.part)) lines.push('','Marca / No. de parte: '+clean(c.part)+(clean(c.quantity)?' · Cantidad: '+clean(c.quantity):''));
    if(clean(c.message)) lines.push((clean(c.part)?'':'\n')+'Detalle: '+clean(c.message));
    if(clean(c.notes)) lines.push('','Notas: '+clean(c.notes));
    if(clean(request.photoUrl)) lines.push('','Foto: '+clean(request.photoUrl));
    else if(request.photoPending) lines.push('','Adjunto la foto en este mensaje.');
    lines.push('','Quedo al pendiente de disponibilidad y precio.');
    return lines.join('\n');
  }

  function saveHistory(request){
    if(!request.folio) return;
    try{
      var rows=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
      rows=rows.filter(function(row){ return row.folio!==request.folio; });
      rows.unshift({
        folio:request.folio,
        date:new Date().toISOString(),
        channel:request.channel,
        form:request.form,
        items:(request.items||[]).map(function(item){ return {n:item.n,s:item.s,sku:item.sku||'',cat:item.cat||'',slug:item.slug||'',price:Number(item.price)||0,img:item.img||'',qty:Number(item.qty)||1}; }),
        reference:clean((request.contact||{}).part)
      });
      localStorage.setItem(HISTORY_KEY,JSON.stringify(rows.slice(0,20)));
    }catch(error){}
  }
  function history(){ try{ return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]'); }catch(error){ return []; } }

  /* Registra la solicitud (folio + CRM si el backend está configurado) y devuelve la URL del canal elegido. */
  function send(request){
    var c=request.contact||{};
    var folio='';
    var lead=window.kdlLead;
    if(lead&&typeof lead.submit==='function'){
      try{
        var result=lead.submit({
          form:request.form||'quote',
          channel:request.channel,
          name:clean(c.name),company:clean(c.company),whatsapp:clean(c.phone),email:clean(c.email),rfc:clean(c.rfc).toUpperCase(),
          required_date:clean(c.requiredDate),
          part:clean(c.part)||(request.items&&request.items[0]?request.items[0].n:''),
          quantity:clean(c.quantity)||(request.items&&request.items[0]?String(request.items[0].qty||1):''),
          message:[clean(c.message),clean(c.notes)].filter(Boolean).join(' · '),
          photo_url:clean(request.photoUrl),fileName:clean(request.photoName),
          items:(request.items||[]).map(function(item){ return {sku:item.sku||'',model:item.n,title:item.s||'',brand:item.brand||'',quantity:Number(item.qty)||1,unit_price:Number(item.price)>0?Number(item.price):null,manual_reference:item.sku?'':item.n}; })
        });
        folio=result&&result.folio||'';
      }catch(error){}
    }
    request.folio=folio;
    saveHistory(request);
    var text=messageText(request);
    if(request.channel==='email'){
      var subject='Solicitud de cotización'+(folio?' '+folio:'')+(clean(c.company)?' · '+clean(c.company):'');
      return {folio:folio,url:'mailto:'+EMAIL+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(text),text:text};
    }
    return {folio:folio,url:'https://wa.me/'+WA_NUMBER+'?text='+encodeURIComponent(text),text:text};
  }

  function open(result,channel){
    if(channel==='email'){ window.location.href=result.url; return; }
    var opened=null;
    try{ opened=window.open(result.url,'_blank'); if(opened) opened.opener=null; }catch(error){}
    if(!opened) window.location.href=result.url;
  }

  /* Reduce la foto en el navegador (≤1600 px, JPEG) para que suba rápido. */
  function compressImage(file){
    return new Promise(function(resolve){
      if(!file||!/^image\//.test(file.type)){ resolve(null); return; }
      var reader=new FileReader();
      reader.onerror=function(){ resolve(null); };
      reader.onload=function(){
        var img=new Image();
        img.onerror=function(){ resolve(file.size<=MAX_UPLOAD_BYTES?{dataUrl:reader.result,type:file.type}:null); };
        img.onload=function(){
          var scale=Math.min(1,1600/Math.max(img.width,img.height));
          var canvas=document.createElement('canvas');
          canvas.width=Math.round(img.width*scale); canvas.height=Math.round(img.height*scale);
          canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
          resolve({dataUrl:canvas.toDataURL('image/jpeg',.82),type:'image/jpeg'});
        };
        img.src=reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function uploadPhoto(file){
    return compressImage(file).then(function(image){
      if(!image) return {ok:false,error:'unsupported_type'};
      var data=String(image.dataUrl).split(',')[1]||'';
      if(data.length*0.75>MAX_UPLOAD_BYTES) return {ok:false,error:'file_too_large'};
      return fetch('/api/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fileName:file.name,contentType:image.type,data:data})})
        .then(function(response){ return response.json().catch(function(){ return {ok:false}; }); })
        .catch(function(){ return {ok:false,error:'network_error'}; });
    });
  }

  function lookup(folio,last4){
    return fetch('/api/folio?folio='+encodeURIComponent(clean(folio).toUpperCase())+'&tel='+encodeURIComponent(digits(last4)))
      .then(function(response){ return response.json().catch(function(){ return {ok:false,error:'lookup_failed'}; }); })
      .catch(function(){ return {ok:false,error:'network_error'}; });
  }

  window.KDLRequest={validate:validate,send:send,open:open,uploadPhoto:uploadPhoto,lookup:lookup,history:history,itemsTotal:itemsTotal,money:money,messageText:messageText};
})();
