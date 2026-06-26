(function(){
  if(window.__kdlAnalyticsBound) return;
  window.__kdlAnalyticsBound=true;
  var eventCount=0;
  document.documentElement.setAttribute('data-kdl-analytics-bound','true');

  function pushEvent(name,data){
    var payload=Object.assign({event:name},data||{});
    window.dataLayer=window.dataLayer||[];
    window.dataLayer.push(payload);
    window.__kdlAnalyticsEvents=window.__kdlAnalyticsEvents||[];
    window.__kdlAnalyticsEvents.push(payload);
    eventCount+=1;
    document.documentElement.setAttribute('data-kdl-last-event',name);
    document.documentElement.setAttribute('data-kdl-event-count',String(eventCount));
    if(typeof window.gtag==='function') window.gtag('event',name,data||{});
    try{ document.dispatchEvent(new CustomEvent('kdl:analytics',{detail:payload})); }catch(err){}
  }

  window.kdlTrack=pushEvent;

  document.addEventListener('click',function(e){
    var el=e.target&&e.target.closest?e.target.closest('[data-analytics]'):null;
    if(!el) return;
    var eventName=el.getAttribute('data-analytics');
    var href=el.getAttribute('href')||'';
    pushEvent(eventName,{
      cta:el.getAttribute('data-analytics-cta')||'',
      href:href.indexOf('https://wa.me/')===0?'wa.me':href
    });
  },true);

})();
