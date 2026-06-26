(function(){
  if(window.__kdlSchemaBound) return;
  window.__kdlSchemaBound=true;

  var tries=0;
  var SITE='KDL';
  var PHONE='+52 81 1227 3382';
  var EMAIL='ventas@kdl.com.mx';

  function abs(path){
    try{ return new URL(path, location.href).href; }catch(e){ return path; }
  }

  function pageName(){
    var p=location.pathname.split('/').pop()||'';
    return decodeURIComponent(p);
  }

  function currentNoHash(){
    return location.href.split('#')[0];
  }

  function homeUrl(){
    try{ return location.origin + '/'; }catch(e){ return abs('/'); }
  }

  function catalogUrl(){
    return abs('productos/');
  }

  function categoryUrl(catKey){
    return abs('productos/'+encodeURIComponent(catKey)+'/');
  }

  function productUrl(catKey, product){
    return abs('productos/'+encodeURIComponent(catKey)+'/'+encodeURIComponent(product.slug)+'/');
  }

  function productAppUrl(catKey, product){
    return abs('Producto.dc.html?cat='+encodeURIComponent(catKey)+'&p='+encodeURIComponent(product.slug));
  }

  function allProducts(cats){
    var out=[];
    cats.forEach(function(c){
      (c.products||[]).forEach(function(p){
        out.push({cat:c, product:p, url:productUrl(c.key,p)});
      });
    });
    return out;
  }

  function productDescription(cat, product){
    return product.n+' - '+product.s+'. Producto de '+cat.name+'. KDL ayuda a validar compatibilidad, disponibilidad y alternativas para mantenimiento industrial.';
  }

  function pageDescription(){
    var m=document.querySelector('meta[name="description"]');
    return (m&&m.getAttribute('content'))||'KDL: refacciones industriales, automatizacion, sensores, neumatica, hidraulica, movimiento lineal, herramientas de corte y suministros.';
  }

  function firstImage(cats){
    for(var i=0;i<cats.length;i++){
      if(cats[i].img) return abs(cats[i].img);
    }
    return abs('assets/hero-tools.png');
  }

  function findMeta(attr,key){
    var nodes=document.getElementsByTagName('meta');
    for(var i=0;i<nodes.length;i++){
      if(nodes[i].getAttribute(attr)===key) return nodes[i];
    }
    return null;
  }

  function upsertMeta(attr,key,value){
    if(!value) return;
    var node=findMeta(attr,key);
    if(!node){
      node=document.createElement('meta');
      node.setAttribute(attr,key);
      document.head.appendChild(node);
    }
    node.setAttribute('content',value);
  }

  function setCanonical(url){
    if(!url) return;
    var link=document.querySelector('link[rel="canonical"]');
    if(!link){
      link=document.createElement('link');
      link.setAttribute('rel','canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href',url);
  }

  function injectSocial(meta){
    if(!meta) return;
    if(meta.title){
      document.title=meta.title;
      var titles=document.getElementsByTagName('title');
      for(var i=0;i<titles.length;i++) titles[i].textContent=meta.title;
    }
    upsertMeta('name','description',meta.description);
    setCanonical(meta.url);
    upsertMeta('property','og:site_name',SITE);
    upsertMeta('property','og:title',meta.title);
    upsertMeta('property','og:description',meta.description);
    upsertMeta('property','og:type',meta.type||'website');
    upsertMeta('property','og:url',meta.url);
    upsertMeta('property','og:image',meta.image);
    upsertMeta('property','og:locale','es_MX');
    upsertMeta('name','twitter:card','summary_large_image');
    upsertMeta('name','twitter:title',meta.title);
    upsertMeta('name','twitter:description',meta.description);
    upsertMeta('name','twitter:image',meta.image);
    document.documentElement.setAttribute('data-kdl-canonical',meta.url||'');
  }

  function buildCatalog(cats, limitPerCat){
    return {
      '@type':'OfferCatalog',
      '@id':catalogUrl()+'#offer-catalog',
      name:'Catalogo KDL de refacciones industriales',
      itemListElement:cats.map(function(c){
        return {
          '@type':'OfferCatalog',
          name:c.name,
          url:categoryUrl(c.key),
          description:c.intro||'',
          itemListElement:(c.products||[]).slice(0,limitPerCat||999).map(function(p){
            return {
              '@type':'Offer',
              url:productUrl(c.key,p),
              itemOffered:{
                '@type':'Product',
                name:p.n,
                description:productDescription(c,p),
                category:c.name,
                brand:{'@type':'Brand',name:c.brand||'KDL'},
                image:(p.img||c.img)?abs(p.img||c.img):undefined,
                url:productUrl(c.key,p)
              }
            };
          })
        };
      })
    };
  }

  function businessSchema(cats){
    return {
      '@type':'LocalBusiness',
      '@id':homeUrl()+'#local-business',
      name:'KDL',
      description:'Refacciones industriales, automatizacion, neumatica, hidraulica, sensores, movimiento lineal, herramientas de corte y suministros para plantas industriales.',
      url:homeUrl(),
      image:abs('assets/hero-tools.png'),
      telephone:PHONE,
      email:EMAIL,
      priceRange:'$$',
      address:{
        '@type':'PostalAddress',
        addressLocality:'Monterrey',
        addressRegion:'Nuevo Leon',
        addressCountry:'MX'
      },
      areaServed:[
        {'@type':'City',name:'Monterrey'},
        {'@type':'AdministrativeArea',name:'Nuevo Leon'},
        {'@type':'Country',name:'Mexico'}
      ],
      contactPoint:{
        '@type':'ContactPoint',
        contactType:'sales',
        telephone:PHONE,
        email:EMAIL,
        availableLanguage:['es-MX','es']
      },
      knowsAbout:cats.map(function(c){ return c.name; }).concat(['refacciones industriales','automatizacion industrial','herramientas de corte','mantenimiento industrial']),
      hasOfferCatalog:buildCatalog(cats,6)
    };
  }

  function websiteSchema(){
    return {
      '@type':'WebSite',
      '@id':homeUrl()+'#website',
      name:'KDL',
      url:homeUrl(),
      publisher:{'@id':homeUrl()+'#local-business'}
    };
  }

  function breadcrumb(items){
    return {
      '@type':'BreadcrumbList',
      itemListElement:items.map(function(item,i){
        return {
          '@type':'ListItem',
          position:i+1,
          name:item.name,
          item:item.url
        };
      })
    };
  }

  function productSchema(hit){
    var c=hit.cat, p=hit.product;
    var url=productUrl(c.key,p);
    var schema={
      '@type':'Product',
      '@id':url+'#product',
      name:p.n,
      description:productDescription(c,p),
      category:c.name,
      brand:{'@type':'Brand',name:c.brand||'KDL'},
      image:(p.img||c.img)?abs(p.img||c.img):abs('assets/hero-tools.png'),
      url:url,
      seller:{'@id':homeUrl()+'#local-business'}
    };
    if(c.datos&&c.datos.length){
      schema.additionalProperty=c.datos.map(function(d){
        return {'@type':'PropertyValue',name:d,value:'Dato requerido para cotizacion tecnica'};
      });
    }
    return schema;
  }

  function inject(graph){
    var old=document.getElementById('kdl-jsonld');
    if(old&&old.parentNode) old.parentNode.removeChild(old);
    var script=document.createElement('script');
    script.type='application/ld+json';
    script.id='kdl-jsonld';
    script.text=JSON.stringify({'@context':'https://schema.org','@graph':graph});
    document.head.appendChild(script);
    document.documentElement.setAttribute('data-kdl-schema-ready','true');
    document.documentElement.setAttribute('data-kdl-schema-count',String(graph.length));
  }

  function build(){
    if(!window.KDL||!Array.isArray(window.KDL.cats)){
      if(tries++<30) return window.setTimeout(build,100);
      return;
    }
    var cats=window.KDL.cats;
    var products=allProducts(cats);
    var current=pageName();
    var graph=[businessSchema(cats),websiteSchema()];
    var meta={
      title:'KDL | Refacciones industriales y automatizacion',
      description:pageDescription(),
      url:homeUrl(),
      image:abs('assets/hero-tools.png'),
      type:'website'
    };

    if(current==='Producto.dc.html'){
      var params=new URLSearchParams(location.search);
      var hit=window.KDL.find(params.get('cat')||'',params.get('p')||'');
      if(hit){
        var productCanonical=productUrl(hit.cat.key,hit.product);
        var productDesc=productDescription(hit.cat,hit.product);
        meta={
          title:hit.product.n+' | '+hit.cat.name+' | KDL',
          description:productDesc,
          url:productCanonical,
          image:(hit.product.img||hit.cat.img)?abs(hit.product.img||hit.cat.img):abs('assets/hero-tools.png'),
          type:'product'
        };
        graph.push({
          '@type':'WebPage',
          '@id':productCanonical+'#webpage',
          url:productCanonical,
          name:hit.product.n+' | KDL',
          isPartOf:{'@id':homeUrl()+'#website'},
          about:{'@id':productCanonical+'#product'},
          potentialAction:{
            '@type':'ViewAction',
            target:productAppUrl(hit.cat.key,hit.product)
          }
        });
        graph.push(productSchema(hit));
        graph.push(breadcrumb([
          {name:'Inicio',url:homeUrl()},
          {name:'Productos',url:catalogUrl()},
          {name:hit.cat.name,url:categoryUrl(hit.cat.key)},
          {name:hit.product.n,url:productCanonical}
        ]));
      }
    }else if(current==='Productos.dc.html'){
      var cp=new URLSearchParams(location.search);
      var catKey=cp.get('cat')||'';
      var cat=window.KDL.cat(catKey);
      var canonical=cat?categoryUrl(cat.key):catalogUrl();
      meta={
        title:cat?(cat.name+' | Catalogo KDL'):'Productos | Catalogo KDL',
        description:cat?(cat.intro+' Explora productos, datos para cotizar y alternativas compatibles con asesoria KDL.'):pageDescription(),
        url:canonical,
        image:cat&&cat.img?abs(cat.img):firstImage(cats),
        type:'website'
      };
      graph.push({
        '@type':'CollectionPage',
        '@id':canonical+'#webpage',
        url:canonical,
        name:meta.title,
        description:meta.description,
        isPartOf:{'@id':homeUrl()+'#website'},
        mainEntity:{
          '@type':'ItemList',
          name:cat?cat.name:'Productos KDL',
          itemListElement:(cat?cat.products.map(function(p){return {cat:cat,product:p,url:productUrl(cat.key,p)};}):products).map(function(item,i){
            return {'@type':'ListItem',position:i+1,name:item.product.n,url:item.url};
          })
        }
      });
      graph.push(buildCatalog(cat?[cat]:cats,999));
      graph.push(breadcrumb(cat?[
        {name:'Inicio',url:homeUrl()},
        {name:'Productos',url:catalogUrl()},
        {name:cat.name,url:categoryUrl(cat.key)}
      ]:[
        {name:'Inicio',url:homeUrl()},
        {name:'Productos',url:catalogUrl()}
      ]));
    }else{
      graph.push({
        '@type':'HomePage',
        '@id':homeUrl()+'#webpage',
        url:homeUrl(),
        name:'KDL refacciones industriales',
        isPartOf:{'@id':homeUrl()+'#website'},
        about:{'@id':homeUrl()+'#local-business'},
        mainEntity:{
          '@type':'ItemList',
          name:'Categorias principales KDL',
          itemListElement:cats.map(function(c,i){
            return {'@type':'ListItem',position:i+1,name:c.name,url:categoryUrl(c.key)};
          })
        }
      });
      graph.push(buildCatalog(cats,3));
    }

    inject(graph);
    injectSocial(meta);
    [250,750,1500].forEach(function(delay){
      window.setTimeout(function(){ injectSocial(meta); },delay);
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build);
  else build();
})();
