/* KDL — taxonomía única para el cliente: 9 familias arriba, categorías del inventario como subcategorías. */
(function(){
  var FAMILIES=[
    {key:'neumatica',name:'Neumática',intro:'Cilindros, válvulas, pinzas, preparación de aire y amortiguadores para automatización.',image:'assets/catalog/cat-neumatica.png',subs:[{key:'neumatica',name:'Cilindros, válvulas y aire'},{key:'amortiguacion',name:'Amortiguadores'}]},
    {key:'hidraulica',name:'Hidráulica',intro:'Válvulas, cilindros de sujeción y componentes para circuitos hidráulicos.',image:'assets/catalog/cat-hidraulica.png',subs:[{key:'hidraulica',name:'Hidráulica'}]},
    {key:'sensores',name:'Sensores',intro:'Sensores inductivos, fotoeléctricos, magnéticos, de presión y distancia.',image:'assets/catalog/cat-sensores.png',subs:[{key:'sensores',name:'Sensores'}]},
    {key:'automatizacion',name:'Automatización y control',intro:'Servomotores, drivers, HMI y controladores para máquina y proceso.',image:'assets/catalog/cat-automatizacion.png',subs:[{key:'motores',name:'Motores y accionamientos'},{key:'hmi',name:'Pantallas HMI'},{key:'termico',name:'Control de temperatura'},{key:'control-maquina',name:'Control de máquina'}]},
    {key:'movimiento',name:'Movimiento lineal',intro:'Guías, patines, rodamientos lineales y componentes de precisión.',image:'assets/catalog/cat-movimiento.png',subs:[{key:'movimiento',name:'Movimiento lineal'}]},
    {key:'electrico',name:'Control eléctrico',intro:'Relevadores, interruptores y elementos de mando para tableros.',image:'assets/catalog/cat-electrico.png',subs:[{key:'electrico',name:'Control eléctrico'}]},
    {key:'corte',name:'Herramientas de corte',intro:'Insertos de torneado, fresado y ranurado, carburo sólido y portaherramientas.',image:'assets/catalog/cat-corte.png',subs:[],onRequest:['Insertos de torneado','Insertos de fresado','Ranurado y tronzado','Roscado','Carburo sólido','Grados CVD y PVD']},
    {key:'iqf',name:'Refrigeración industrial (IQF)',intro:'Equipos de congelación rápida, túneles y componentes para cadena de frío.',image:'assets/catalog/cat-iqf.png',subs:[],onRequest:['Equipos de congelación IQF','Túneles y congeladores de banda','Sistemas mecánicos y eléctricos','Soluciones para acuacultura']},
    {key:'suministros',name:'Suministros industriales',intro:'Componentes de mantenimiento, transmisión de potencia, sujeción y consumibles.',image:'assets/catalog/cat-suministros.png',subs:[],onRequest:['Componentes de mantenimiento','Transmisión de potencia','Sujeción y fijación','Consumibles industriales']}
  ];
  var HIDDEN_CATEGORIES={'por-identificar':true};
  var UNKNOWN_BRAND='Por confirmar';

  var subToFamily={};
  FAMILIES.forEach(function(family){ family.subs.forEach(function(sub){ subToFamily[sub.key]=family.key; }); });

  function norm(value){
    return String(value==null?'':value).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  }
  function compact(value){ return norm(value).replace(/ /g,''); }

  function inventory(){ return (typeof window!=='undefined'&&window.KDLInventory)||null; }
  function products(){
    var inv=inventory();
    if(!inv) return [];
    return inv.products.filter(function(product){ return !HIDDEN_CATEGORIES[product.categoryKey]; });
  }
  function familyOf(product){ return subToFamily[product.categoryKey]||null; }
  function family(key){
    var found=null;
    FAMILIES.forEach(function(item){ if(item.key===key) found=item; });
    return found;
  }
  /* Acepta claves viejas (?cat=amortiguacion, ?cat=motores) y devuelve {family, sub}. */
  function resolve(key){
    if(!key) return null;
    if(family(key)) return {family:key,sub:''};
    if(subToFamily[key]) return {family:subToFamily[key],sub:key};
    return null;
  }
  function byFamily(key,subKey){
    return products().filter(function(product){
      return familyOf(product)===key&&(!subKey||product.categoryKey===subKey);
    });
  }
  function list(){
    return FAMILIES.map(function(item){
      var count=byFamily(item.key).length;
      return {key:item.key,name:item.name,intro:item.intro,image:item.image,subs:item.subs.map(function(sub){ return {key:sub.key,name:sub.name,count:byFamily(item.key,sub.key).length}; }).filter(function(sub){ return sub.count>0; }),onRequest:item.onRequest||[],count:count,available:count>0};
    });
  }
  function brandLabel(brand){ return !brand||brand===UNKNOWN_BRAND?'':brand; }

  /* Búsqueda tolerante: "4v210" encuentra "4V210-08", "air tac" encuentra "AirTAC". */
  function search(query,limit){
    var q=norm(query);
    if(!q) return [];
    var qc=q.replace(/ /g,'');
    var terms=q.split(' ').filter(Boolean);
    var scored=products().map(function(product){
      var model=compact(product.model);
      var sku=compact(product.sku);
      var hay=norm([product.model,product.sku,product.title,product.summary,brandLabel(product.brand),product.categoryName,(family(familyOf(product))||{}).name].join(' '));
      var hayc=hay.replace(/ /g,'');
      var score=0;
      if(model===qc||sku===qc) score+=100;
      else if(model.indexOf(qc)===0||sku.indexOf(qc)===0) score+=60;
      else if(model.indexOf(qc)!==-1) score+=40;
      if(hayc.indexOf(qc)!==-1) score+=12;
      var all=true;
      terms.forEach(function(term){ if(hay.indexOf(term)!==-1) score+=6; else all=false; });
      if(!all&&score<40) score=0;
      if(score>0&&product.stock>0) score+=2;
      return {product:product,score:score};
    }).filter(function(item){ return item.score>0; });
    scored.sort(function(a,b){ return b.score-a.score||a.product.model.localeCompare(b.product.model,'es'); });
    return scored.slice(0,limit||scored.length).map(function(item){ return item.product; });
  }
  function searchFamilies(query){
    var q=norm(query);
    if(!q) return [];
    return list().filter(function(item){
      var hay=norm(item.name+' '+item.intro+' '+item.subs.map(function(sub){ return sub.name; }).join(' ')+' '+item.onRequest.join(' '));
      return q.split(' ').every(function(term){ return hay.indexOf(term)!==-1; });
    });
  }

  function money(price){
    if(!(price>0)) return 'Precio a cotizar';
    try{ return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2,maximumFractionDigits:2}).format(price)+' MXN + IVA'; }
    catch(error){ return '$'+Number(price).toFixed(2)+' MXN + IVA'; }
  }
  function date(value){
    var match=/^(\d{4})-(\d{2})-(\d{2})/.exec(value||'');
    if(!match) return value||'';
    var months=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return Number(match[3])+' '+months[Number(match[2])-1]+' '+match[1];
  }
  function plural(count,singular,pluralForm){ return count+' '+(count===1?singular:(pluralForm||singular+'s')); }
  function stockLabel(product){
    return product.stock>0?(product.stock+' '+(product.unit||'PZA')+' '+(product.stock===1?'disponible':'disponibles')):'Consultar disponibilidad';
  }
  function photoLabel(product){ return product.imageKind==='exact'?'Foto del modelo':'Foto ilustrativa'; }

  /* Mi cotización: mismo formato de kdl_cart que usa la Cesta. */
  function cartItem(product){
    return {n:product.model,s:product.title,cat:product.categoryKey,catName:product.categoryName,brand:brandLabel(product.brand),slug:product.slug,sku:product.sku,price:product.price>0?product.price:0,img:product.image};
  }
  function readCart(){ try{ return JSON.parse(localStorage.getItem('kdl_cart')||'[]'); }catch(error){ return []; } }
  function addToCart(product,qty){
    var amount=Math.max(1,Number(qty)||1);
    var cart=readCart();
    var item=cartItem(product);
    var index=-1;
    cart.forEach(function(entry,i){ if((entry.sku&&entry.sku===item.sku)||(entry.slug===item.slug&&entry.cat===item.cat)) index=i; });
    if(index>=0) cart[index].qty=(Number(cart[index].qty)||1)+amount;
    else { item.qty=amount; cart.push(item); }
    try{ localStorage.setItem('kdl_cart',JSON.stringify(cart)); }catch(error){}
    if(typeof window.KDLCartChanged==='function') window.KDLCartChanged(product.model+' añadido a Mi cotización');
    return cart;
  }

  window.KDLFamilies={
    cartItem:cartItem,readCart:readCart,addToCart:addToCart,
    all:FAMILIES,list:list,family:family,resolve:resolve,familyOf:familyOf,byFamily:byFamily,products:products,
    search:search,searchFamilies:searchFamilies,brandLabel:brandLabel,norm:norm,
    money:money,date:date,plural:plural,stockLabel:stockLabel,photoLabel:photoLabel,
    productHref:function(product){ return 'producto?sku='+encodeURIComponent(product.sku); },
    familyHref:function(key,subKey){ return 'catalogo?cat='+encodeURIComponent(key)+(subKey?'&sub='+encodeURIComponent(subKey):''); }
  };
})();
