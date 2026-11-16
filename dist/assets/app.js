
(() => {
"use strict";
const A=window.ATLAS, $=id=>document.getElementById(id);
if (!A) { $("map-message").textContent="找不到旅遊資料。請重新整理頁面。"; return; }
const kinds={official:"拉拉熊官方店",rilanowa:"RilaNowa 認證店",retail:"其他商品通路",theme:"主題店／設施",food:"餐廳",fireworks:"四尺玉花火",heritage:"古蹟與地方文化",craft:"手作",event:"活動"};
const colors={official:"#8c4d32",rilanowa:"#b27337",retail:"#696351",theme:"#a94d37",food:"#b9752e",fireworks:"#9b3446",heritage:"#435d72",craft:"#6351a4",event:"#347966"};
const arr=items=>new Map(items.map(x=>[x.id,x]));
const placeBy=arr(A.places),routeBy=arr(A.routes),storyBy=new Map(A.stories.map(x=>[x.key,x])),views=arr(A.views),events=arr(A.events);
const prefBy=new Map(A.prefs.map(x=>[x.name,x])),groupBy=new Map(A.regions.map(x=>[x.key,x]));
const html=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const option=(v,n)=>"<option value=\""+html(v)+"\">"+html(n)+"</option>";
const external=(url,label,cls="")=>"<a class=\""+html(cls)+"\" href=\""+html(url)+"\" target=\"_blank\" rel=\"noopener noreferrer\">"+html(label)+"</a>";
const btn=(key,val,label,cls="text-button")=>"<button type=\"button\" class=\""+cls+"\" data-"+key+"=\""+html(val)+"\">"+html(label)+"</button>";
const badge=(kind,label=kinds[kind])=>"<span class=\"badge "+html(kind)+"\">"+html(label)+"</span>";
const google=q=>"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q||"Japan");
const directions=(dest,origin)=>"https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(dest)+"&travelmode=transit"+(origin?"&origin="+encodeURIComponent(origin):"");
const clean=x=>String(x??"").normalize("NFKC").toLocaleLowerCase();
const matches=(q,text)=>clean(q).trim().split(/\s+/).every(part=>clean(text).includes(part));
const keyStorage="japan-atlas-favorites-v1";
let saved=new Set(), limit=12, activeView="", runId=0, layer=null, railsData=null;
try { const ids=JSON.parse(localStorage.getItem(keyStorage)||"[]"); if(Array.isArray(ids)) saved=new Set(ids.filter(id=>placeBy.has(id))); } catch {}
const updateSaved=()=>{ $("saved-count").textContent=saved.size; try{localStorage.setItem(keyStorage,JSON.stringify([...saved]));}catch{} };
updateSaved();
$("route-stat").textContent=A.routes.length;
$("view").insertAdjacentHTML("beforeend",A.views.map(v=>option(v.id,v.pref+"｜"+v.title)).join(""));
$("region").insertAdjacentHTML("beforeend",A.regions.map(r=>option(r.key,r.name)).join(""));
$("route-pref").insertAdjacentHTML("beforeend",A.prefs.filter(p=>A.routes.some(r=>r.pref===p.name)).map(p=>option(p.name,p.name)).join(""));
$("kind").insertAdjacentHTML("beforeend",Object.entries(kinds).map(([k,l])=>option(k,l)).join(""));

function prefOptions(){
 const old=$("pref").value,region=$("region").value;
 $("pref").innerHTML=option("","所有都道府縣")+A.prefs.filter(p=>!region||p.region===region).map(p=>option(p.name,p.name)).join("");
 if([...$("pref").options].some(o=>o.value===old)) $("pref").value=old;
}
prefOptions();
function selected(){
 const reg=$("region").value,pref=$("pref").value,kind=$("kind").value,q=$("q").value,only=$("saved-only").checked;
 return A.places.filter(p=>(!only||saved.has(p.id))&&(!pref||p.pref===pref)&&(!reg||prefBy.get(p.pref)?.region===reg)&&(!kind||p.kind===kind)&&matches(q,[p.pref,p.title,p.note,p.address,p.query,p.floor,kinds[p.kind]].join(" ")));
}
function shortcut(p,full=false){
 const list=[external(google(p.query),"Google Maps ↗")];
 if(full) list.push(external(directions(p.query),"大眾運輸路線 ↗"));
 if(p.tabelog) list.push(external(p.tabelog,"食べログ ↗"));
 if(p.href) list.push(external(p.href,"官方來源 ↗"));
 return list.join("");
}
function placeCard(p){
 const isSaved=saved.has(p.id);
 const description=[p.floor,p.hours,p.address].filter(Boolean).join(" · ")||p.note;
 return "<article class=\"place\">"+badge(p.kind,([p.pref,kinds[p.kind]].filter(Boolean).join(" · ")))+
  "<h4>"+html(p.title)+"</h4><p>"+html(description)+"</p>"+
  "<button class=\"favorite\" data-fav=\""+html(p.id)+"\" type=\"button\" aria-label=\""+(isSaved?"移除收藏":"加入收藏")+" "+html(p.title)+"\" aria-pressed=\""+isSaved+"\">"+(isSaved?"★":"☆")+"</button>"+
  "<div class=\"links\">"+btn("place",p.id,"詳情")+shortcut(p)+"</div></article>";
}
function renderPlaces(){
 const items=selected(),p=prefBy.get($("pref").value),local=items.filter(p=>p.coords).length;
 $("result-count").textContent=items.length+" 筆地點 · "+local+" 個可在站內地圖顯示";
 $("pref-context").innerHTML=p?"<p class=\"pref-summary\"><b>"+html(p.name)+"｜"+html(groupBy.get(p.region)?.name)+"</b>　"+html(p.summary||(p.motif?"地方商品題材："+p.motif+"，請先查發售店與年份。":"可先從區域地圖與 Google Maps 查交通，再查看官方活動。"))+"</p>":"";
 $("places").classList.toggle("compact",$("density").value==="compact");
 $("places").innerHTML=items.length?items.slice(0,limit).map(placeCard).join(""):"<p class=\"empty\">這組條件目前沒有地點。可清除搜尋、改選鄰縣或取消只顯示收藏。</p>";
 $("more").hidden=items.length<=limit;
 renderPins(items);
}
function renderRoutes(){
 const p=$("route-pref").value;
 $("route-cards").innerHTML=A.routes.filter(r=>!p||r.pref===p).map(r=>
  "<article class=\"route-card "+(r.id==="katakai-6"?"lead":"")+"\">"+badge(r.id==="katakai-6"?"fireworks":"theme",r.region)+
  "<h3>"+html(r.title)+"</h3><p>"+html(r.subtitle)+"</p><p class=\"period\">"+html(r.period)+"</p>"+
  btn("route",r.id,"看 "+r.steps.length+" 站安排 ↗","button ghost")+"</article>").join("");
}
function renderEvents(){
 const day=$("event-day").value;
 // Separate the announced service break from the surrounding 1899 campaign dates.
 const quiet=e=>e.id==="date-3"&&day>="2026-12-27"&&day<="2027-01-07";
 const items=A.events.filter(e=>!day||(!quiet(e)&&(e.start||e.end)&&(!e.start||day>=e.start)&&(!e.end||day<=e.end)));
 $("event-list").innerHTML=items.length?items.map(e=>"<article class=\"event\"><time>"+html(e.when)+"</time><h4>"+html(e.title)+"</h4>"+
 (e.story&&storyBy.has(e.story)?btn("story",e.story,"活動細節","button ghost"):e.map?btn("event",e.id,"會場與公告","button ghost"):
 external(e.href||A.sources["おふろcafé 聯名預告"],"看官方公告 ↗","button ghost"))+"</article>").join(""):"<p class=\"empty\">這天沒有列出日期已公布的活動。</p>";
}
function renderStories(){
 const q=$("story-q").value;
 $("story-cards").innerHTML=A.stories.filter(x=>matches(q,[x.title,x.region,x.subtitle,x.period,...x.blocks.flat()].join(" "))).map(x=>
  "<article class=\"story-card\">"+badge("theme",x.region)+"<h4>"+html(x.title)+"</h4><p>"+html(x.subtitle)+"</p>"+
  btn("story",x.key,"開啟專題","button ghost")+"</article>").join("")||"<p class=\"empty\">沒有符合的活動或商品。</p>";
}
const sources=list=>list?.length?"<div class=\"sources\">"+list.map(([title,url])=>external(url,title+" ↗")).join("")+"</div>":"";
const blocks=list=>list.map(([t,p])=>"<div class=\"detail-block\"><h3>"+html(t)+"</h3><p>"+html(p)+"</p></div>").join("");
const heading=(t,p)=>"<h2 id=\"detail-title\">"+html(t)+"</h2>"+(p?"<p>"+html(p)+"</p>":"");
function dialog(content){
 $("detail-body").innerHTML=content;
 if(!$("details").open) $("details").showModal();
 $("details").scrollTop=0;
}
function story(id){
 const d=storyBy.get(id); if(!d)return;
 dialog(badge("theme",d.region)+heading(d.title,d.subtitle)+"<p><strong>"+html(d.period)+"</strong></p>"+blocks(d.blocks)+
  (d.photoRefs.length?"<details><summary>官方照片、商品圖與餐點索引</summary><ul class=\"photo-list\">"+d.photoRefs.map(p=>"<li>"+html(p.caption+" · "+p.credit)+"</li>").join("")+"</ul><p class=\"detail-note\">可從下方官方來源查看原圖、菜單與商品資訊。</p></details>":"")+sources(d.links));
}
function openPlace(id){
 const p=placeBy.get(id); if(!p)return;
 const detail=[p.district,p.floor,p.address,p.hours,p.tel].filter(Boolean).join(" · ");
 dialog(badge(p.kind,p.pref+" · "+kinds[p.kind])+heading(p.title,detail)+"<p>"+html(p.note)+"</p>"+
  ((p.kind==="rilanowa"||p.kind==="official")?"<p class=\"detail-note\">營業日與商品庫存依門市公告。</p>":"")+
  (p.approx?"<p class=\"detail-note\">圖釘為區域位置，精確入口請看 Google Maps 搜尋與官方交通。</p>":"")+
  "<div class=\"detail-actions\">"+shortcut(p,true)+(p.coords?btn("pin",p.id,"站內地圖","button ghost"):"")+
  (p.story&&storyBy.has(p.story)?btn("story",p.story,"相關活動與商品","button ghost"):"")+"</div>");
}
function openRoute(id){
 const r=routeBy.get(id); if(!r)return;
 const steps=r.steps.map((s,i)=>{
   const prev=r.steps[i-1];
   return "<li><span>"+html(s.when)+"</span><b>"+html(s.title)+"</b><p>"+html(s.note)+"</p>"+
    "<div class=\"detail-actions\">"+(s.map?btn("view",s.map,"看街道與車站","button ghost"):"")+
    (s.query?external(google(s.query),"這一站的 Google Maps ↗","button ghost"):"")+
    (s.query&&prev?.query?external(directions(s.query,prev.query),"上一站到這裡 ↗","button ghost"):"")+"</div></li>";
 }).join("");
 dialog(badge(id==="katakai-6"?"fireworks":"theme",r.region)+heading(r.title,r.subtitle)+"<p><b>"+html(r.period)+"</b></p>"+
    "<ol class=\"detail-timeline\">"+steps+"</ol>"+blocks(r.notes)+
    (r.story&&storyBy.has(r.story)?btn("story",r.story,"看商品、餐點與活動","button sub"):"")+sources(r.links));
}
function openEvent(id){
 const e=events.get(id); if(!e)return;
 dialog(badge(e.kind)+heading(e.title,e.when)+
    "<p>"+html(id==="katakai-event"?"主辦方公布 9/10 與 9/11。四尺玉往例 22:00，2027 詳細場次與交通待公告。":"鴻巢曾施放四尺玉。2027 日期、節目、座位與動線待公告。")+"</p>"+
    "<div class=\"detail-actions\">"+btn("view",e.map,"看街道與車站","button sub")+external(e.href,"主辦方公告 ↗","button ghost")+"</div>");
}

const homeView=[36.82,137.83];
const GSI="<a href=\"https://maps.gsi.go.jp/\" target=\"_blank\" rel=\"noopener\">國土地理院</a>";
const MLIT="<a href=\"https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2025.html\" target=\"_blank\" rel=\"noopener\">國土交通省 N02</a>";
const OSM="&copy; <a href=\"https://www.openstreetmap.org/copyright\" target=\"_blank\" rel=\"noopener\">OpenStreetMap contributors</a>";
const baseTiles={
 pale:["https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png",GSI,18],
 std:["https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",GSI,18],
 photo:["https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg",GSI,18],
 osm:["https://tile.openstreetmap.org/{z}/{x}/{y}.png",OSM,19]
};
let map=null,prefLayer=null,pins=null,rail=null,stations=null;
const railCache=new Map();
function switchBase(){
 if(!map)return;
 if(layer) map.removeLayer(layer);
 const [url,attribution,maxNativeZoom]=baseTiles[$("basemap").value]||baseTiles.pale;
 $("map-message").textContent="";
 layer=L.tileLayer(url,{attribution,maxNativeZoom,maxZoom:19,noWrap:true});
 let errors=0;
 layer.on("tileerror",()=>{if(++errors>=3)$("map-message").textContent="部分底圖載入失敗，可改選其他圖源。";});
 layer.on("tileload",()=>{if(errors===0)$("map-message").textContent="";});
 layer.addTo(map);
}
function popupPlace(p){
 return "<strong>"+html(p.title)+"</strong><p>"+html(p.note)+"</p>"+btn("place",p.id,"開啟詳情")+external(google(p.query),"Google Maps ↗");
}
function renderPins(items){
 if(!map||!pins)return;
 pins.clearLayers();
 items.filter(p=>p.coords).forEach(p=>{
  const found=(!activeView||p.area===activeView), c=colors[p.kind]||"#9b5034";
  L.circleMarker(p.coords,{radius:found?6:4,fillColor:c,color:"#fffdf8",weight:1.4,fillOpacity:.91})
   .bindTooltip(p.title).bindPopup(popupPlace(p)).addTo(pins);
 });
}
function visibleLayers(){
 if(!map)return;
 [[prefLayer,"layer-prefs"],[pins,"layer-places"],[rail,"layer-rail"],[stations,"layer-station"]].forEach(([g,k])=>{
   if(!g) return;
   if($(k).checked) { if(!map.hasLayer(g)) g.addTo(map); }
   else if(map.hasLayer(g)) map.removeLayer(g);
 });
}
function lineColor(line,agency,v){
 const matching=v?.filters?.find(([k])=>line.includes(k));
 if(matching) return matching[1];
 return agency.includes("旅客鉄道")?"#786595":agency.includes("地下鉄")||agency.includes("東京都")?"#a45c50":"#637d6e";
}
function updateRail(){
 if(!map)return;
 rail.clearLayers(); stations.clearLayers();
 if(!railsData)return;
 const v=views.get(activeView), id=$("rail-line").value;
 const visible=(a,l)=>!id||id===a+"｜"+l;
 railsData.lines.filter(x=>visible(x.agency,x.line)).forEach(x=>{
  const c=lineColor(x.line,x.agency,v);
  L.polyline(x.path.map(([lon,lat])=>[lat,lon]),{weight:id?4:2.6,color:c,opacity:.9})
   .bindTooltip(x.agency+" · "+x.line).addTo(rail);
 });
 railsData.stations.filter(x=>x.lines.some(l=>visible(x.agency,l))).forEach(x=>{
  const query=x.name+"駅 "+x.agency+" "+v.pref;
  L.circleMarker(x.coord,{radius:4,color:"#284f75",fillColor:"#fff",weight:2,fillOpacity:1})
   .bindTooltip(x.name).bindPopup(html(x.name+"駅｜"+x.agency)+"<p>"+html(x.lines.join("・"))+"</p>"+external(google(query),"查 Google Maps 車站出口 ↗")).addTo(stations);
 });
}
function fillMapDetails(v){
 const panel=$("map-details");
 if(v){panel.innerHTML="<h4>"+html(v.title)+"</h4><p>"+html(v.period)+"</p><p>"+html(v.blocks[0]?.[1])+"</p>"+btn("area",v.id,"進出站與街道詳情");return;}
 panel.innerHTML="<h4>從全日本縮小範圍</h4><p>點縣界可篩選縣市。選上方 10 個詳圖之一，即可查看當地鐵路、車站與散場動線。</p>";
}
async function renderView(id,center=true){
 const v=views.get(id), run=++runId;
 activeView=v?.id||""; $("view").value=activeView;
 $("rail-line").innerHTML=option("","全部鐵路線"); $("rail-line").disabled=!v;
 $("line-key").textContent=""; fillMapDetails(v);
 rail?.clearLayers();stations?.clearLayers();railsData=null;
 $("google-view").href=v?google(v.pref+" "+v.title.split("｜")[0]):google($("pref").value||"Japan");
 if(map&&center){
  if(v){
   const delta=v.width/185000;
   map.fitBounds([[v.center[0]-delta*.66,v.center[1]-delta],[v.center[0]+delta*.66,v.center[1]+delta]],{maxZoom:16,padding:[15,15]});
  } else map.setView(homeView,5);
 }
 if(!map||!v)return;
 try{
  let d=railCache.get(id);
  if(!d){
    const res=await fetch("./assets/rail-"+v.id+".json");
    if(!res.ok)throw Error(res.status);
    d=await res.json(); railCache.set(id,d);
  }
  if(run!==runId)return;
  $("map-message").textContent="";
  railsData=d;
  const names=[...new Set(d.lines.map(l=>l.agency+"｜"+l.line))].sort((a,b)=>a.localeCompare(b,"ja"));
  $("rail-line").innerHTML=option("","全部鐵路線")+names.map(n=>option(n,n)).join("");
  $("line-key").innerHTML=v.filters.filter(([key])=>d.lines.some(l=>l.line.includes(key))).map(([name,c])=>"<span><i style=\"background:"+html(c)+"\"></i>"+html(name)+"</span>").join("");
  updateRail();
 }catch{if(run===runId) $("map-message").textContent="當地鐵路資料載入失敗。站外導航可從 Google Maps 開啟。";}
}
function initMap(){
 if(!window.L){$("map-message").textContent="互動地圖元件載入失敗。目錄仍可用 Google Maps 查看。";return;}
 map=L.map("map",{zoomSnap:.5,scrollWheelZoom:false,minZoom:4,maxZoom:19}).setView(homeView,5);
 map.attributionControl.setPrefix(false); map.attributionControl.addAttribution(MLIT);
 L.control.scale({imperial:false,position:"bottomleft"}).addTo(map);
 map.on("focus",()=>map.scrollWheelZoom.enable()).on("blur",()=>map.scrollWheelZoom.disable());
 pins=L.layerGroup(); rail=L.featureGroup(); stations=L.featureGroup();
 switchBase();visibleLayers();
 fetch("./assets/prefectures.json").then(res=>{if(!res.ok)throw Error(res.status);return res.json();}).then(data=>{
  prefLayer=L.geoJSON(data,{
   style:{color:"#476b5c",weight:.8,fillColor:"#c9d8ae",fillOpacity:.17},
   onEachFeature(f,l){
    const pref=A.prefs.find(p=>p.id===f.properties.id);
    if(pref){
     l.bindTooltip(pref.name);
     l.on("click",()=>{ $("region").value=pref.region;prefOptions();$("pref").value=pref.name;limit=12;renderPlaces();$("google-view").href=google(pref.name+" 日本"); });
    }
   }
  });
  prefLayer.setZIndex?.(1);
  visibleLayers();
  if(map.hasLayer(prefLayer)) prefLayer.eachLayer(l=>l.bringToBack?.());
 }).catch(() => {$("map-message").textContent="縣界圖載入失敗。仍可使用其他底圖、車站與地點。";});
}
function goMap(id){
 $("details").close();
 renderView(id);
 document.getElementById("explore").scrollIntoView();
}
document.addEventListener("click",e=>{
 const t=e.target.closest("button[data-route],button[data-story],button[data-place],button[data-view],button[data-area],button[data-event],button[data-pin],button[data-fav]");
 if(!t)return;
 const d=t.dataset;
 if(d.route)openRoute(d.route);
 else if(d.story)story(d.story);
 else if(d.place)openPlace(d.place);
 else if(d.view)goMap(d.view);
 else if(d.event)openEvent(d.event);
 else if(d.area){
   const v=views.get(d.area);
   dialog(heading(v.title,v.subtitle)+"<p><strong>"+html(v.period)+"</strong></p>"+blocks(v.blocks)+sources(v.links));
 }else if(d.pin){
   const p=placeBy.get(d.pin);
   $("details").close();document.getElementById("explore").scrollIntoView();
   if(map&&p?.coords) {
     if(p.area)renderView(p.area);
     map.setView(p.coords,15);
     L.popup().setLatLng(p.coords).setContent(popupPlace(p)).openOn(map);
   }
 }else if(d.fav){
   if(saved.has(d.fav))saved.delete(d.fav);else saved.add(d.fav);
   updateSaved();renderPlaces();document.querySelector('[data-fav="'+d.fav+'"]')?.focus();
 }
});
$("close-detail").addEventListener("click",()=>$("details").close());
$("details").addEventListener("click",e=>{if(e.target===$("details"))$("details").close();});
$("view").addEventListener("change",e=>renderView(e.target.value));
$("basemap").addEventListener("change",switchBase);
["layer-prefs","layer-places","layer-rail","layer-station"].forEach(id=>$(id).addEventListener("change",visibleLayers));
$("rail-line").addEventListener("change",updateRail);
$("bigmap").addEventListener("click",()=>{
 const state=document.querySelector(".map-workbench").classList.toggle("large");
 $("bigmap").setAttribute("aria-pressed",state); $("bigmap").textContent=state?"縮回地圖":"放大地圖";
 map?.invalidateSize();
});
$("q").addEventListener("input",()=>{limit=12;renderPlaces();});
$("region").addEventListener("change",()=>{
 prefOptions();limit=12;renderPlaces();
 const g=groupBy.get($("region").value);
 if(map&&g){
   const [w,e,s,n]=g.bounds;
   map.fitBounds([[s,w],[n,e]],{padding:[12,12]});
 }
});
["pref","kind","density","saved-only"].forEach(id=>$(id).addEventListener("change",()=>{limit=12;renderPlaces();}));
$("pref").addEventListener("change",()=>{
 const p=prefBy.get($("pref").value);
 if (p&&!activeView) map?.setView(p.center,9);
 $("google-view").href=google(p?.name||"Japan");
});
$("reset").addEventListener("click",()=>{
 ["q","region","kind"].forEach(id=>$(id).value="");prefOptions();$("pref").value="";
 $("saved-only").checked=false;limit=12;renderPlaces();
});
$("saved-nav").addEventListener("click",()=>{
 $("reset").click();$("saved-only").checked=true;renderPlaces();
 document.querySelector(".directory").scrollIntoView();
});
$("more").addEventListener("click",()=>{limit+=18;renderPlaces();});
$("route-pref").addEventListener("change",renderRoutes);
$("event-day").addEventListener("change",renderEvents);
$("clear-day").addEventListener("click",()=>{$("event-day").value="";renderEvents();});
$("story-q").addEventListener("input",renderStories);
initMap(); renderView(""); renderPlaces(); renderRoutes(); renderEvents(); renderStories();
})();


