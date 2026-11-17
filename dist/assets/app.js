
(() => {
"use strict";
const A=window.ATLAS, C=window.ATLAS_CATALOG, P=window.ATLAS_PHOTOS || {};
const $=id=>document.getElementById(id);
if(!A||!C){$("results").textContent="旅遊目錄載入失敗。請重新整理頁面。";return;}
const paths={
 compass:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM15.8 8.2l-2.4 5.2-5.2 2.4 2.4-5.2z",
 search:"M21 21l-4.2-4.2M18.5 10.5a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
 map:"m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15",
 route:"M5 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm14 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7 6h9a3 3 0 0 1 0 6H8a3 3 0 0 0 0 6h9",
 calendar:"M4 6h16a2 2 0 0 1 2 2v12H2V8a2 2 0 0 1 2-2Zm3-3v6m10-6v6M2 11h20",
 image:"M4 4h16v16H4zM7 16l4-4 3 3 2-2 4 4M10 8a1.2 1.2 0 1 0 0 .01",
 heart:"M20 12.5 12 20l-8-7.5C-2 6 7 1 12 8c5-7 14-2 8 4.5Z",
 info:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-12v7m0-10h.01",
 pin:"M20 10c0 5.5-8 11-8 11S4 15.5 4 10a8 8 0 0 1 16 0Zm-8 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
 layers:"m2 7 10-5 10 5-10 5-10-5Zm0 5 10 5 10-5M2 17l10 5 10-5",
 close:"m6 6 12 12M18 6 6 18",
 list:"M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01",
 shop:"M3 9h18l-2-5H5L3 9Zm2 0v11h14V9m-10 11v-6h6v6",
 landmark:"m3 8 9-5 9 5H3Zm1.5 11h15M3 22h18M7 9v8m5-8v8m5-8v8",
 craft:"m4 13 8-9 8 8-9 8H4zm0 7 5-5m6-7 2 2",
 spark:"M12 2v4m0 12v4m10-10h-4M2 12h4m-.6-6.6 2.8 2.8m7.6 7.6 2.8 2.8m0-13.2-2.8 2.8m-7.6 7.6-2.8 2.8",
 food:"M4 3v6a3 3 0 0 0 6 0V3M7 3v18m13-18c-3 2-5 6-5 10h5m0-10v18",
 arrow:"M4 12h15m-6-6 6 6-6 6", link:"M14 4h6v6m0-6-9 9m5-1v8H4V8h8",
 share:"M12 16V3m-5 5 5-5 5 5M5 13v8h14v-8"
};
const icon=name=>'<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path d="'+(paths[name]||paths.pin)+'"/></svg>';
document.querySelectorAll("[data-icon]").forEach(node=>{node.innerHTML=icon(node.dataset.icon);});
const esc=v=>String(v??"").replace(/[&<>"']/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[s]));
const option=(v,n)=>'<option value="'+esc(v)+'">'+esc(n)+'</option>';
const external=(url,label,style="")=>'<a class="'+esc(style)+'" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>';
const google=q=>"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q);
const direction=(dest,origin,mode="transit")=>"https://www.google.com/maps/dir/?api=1&travelmode="+mode+"&destination="+encodeURIComponent(dest)+(origin?"&origin="+encodeURIComponent(origin):"");
const button=(name,id,label,style="btn",symbol="")=>'<button type="button" class="'+style+'" data-'+name+'="'+esc(id)+'">'+(symbol?icon(symbol):"")+esc(label)+'</button>';
const symbol={official:"shop",rilanowa:"shop",theme:"shop",retail:"shop",heritage:"landmark",craft:"craft",food:"food",fireworks:"spark",event:"calendar"};
const prefs=new Map(A.prefs.map(x=>[x.name,x])), regions=new Map(A.regions.map(x=>[x.key,x]));
const byView=new Map(A.views.map(x=>[x.id,x])), routes=new Map(A.routes.map(x=>[x.id,x]));
const stories=new Map(A.stories.map(x=>[x.key,x])), events=new Map(A.events.map(x=>[x.id,x]));
const sectionNames={explore:"探索地點",routes:"行程規劃",calendar:"活動與限定商品",photos:"實景照片",saved:"我的收藏"};
const savedKey="japan-atlas-favorites-v1";
let saved=new Set();
try { const x=JSON.parse(localStorage.getItem(savedKey)||"[]");if(Array.isArray(x))saved=new Set(x.map(id=>C.placesById.get(id)?.id).filter(Boolean));} catch {}
const state={nav:"explore",region:"",pref:"",category:"all",q:"",view:"asakusa",mode:"list",inArea:false,limit:26,day:"",detail:null,token:0};
let geo=null,currentResults=[],displayStations=[],flashTimer,fromButton=null;
const standardize=value=>String(value??"").normalize("NFKC").toLowerCase().replace(/臺/g,"台").replace(/東京都|東京都/g,"東京").replace(/浅/g,"淺").replace(/静/g,"靜").replace(/広/g,"廣").replace(/国/g,"國").replace(/県/g,"縣").replace(/鎌倉/g,"鐮倉").replace(/新泻/g,"新潟").replace(/[\/／・｜_–-]+/g," ");
const tokens=q=>standardize(q).trim().split(/\s+/).filter(Boolean);
const matches=(q,v)=>tokens(q).every(token=>standardize(v).includes(token));
const sourceLinks=list=>list?.length?'<div class="sources">'+list.map(([t,url])=>external(url,t+" ↗")).join("")+"</div>":"";
function checkSaved(){
 $("saved-count").textContent=saved.size||"";
 try{localStorage.setItem(savedKey,JSON.stringify([...saved]));}catch{}
}
function notify(text){
 clearTimeout(flashTimer);$("toast").hidden=false;$("toast").textContent=text;
 flashTimer=setTimeout(()=>$("toast").hidden=true,2400);
}
function mapStatus(text){
 $("map-status").textContent=text;$("map-status").hidden=!text;
}
function mapArea(q){
 const g=regions.get(q);
 return g?g.name:q;
}
function placeMatches(p){
 if(state.nav==="saved"&&!saved.has(p.id))return false;
 if(state.pref&&p.pref!==state.pref)return false;
 if(state.region&&prefs.get(p.pref)?.region!==state.region)return false;
 if(state.inArea&&(!geo||!p.coords||!geo.bounds().contains(p.coords)))return false;
 if(state.category==="bear"&&!["official","rilanowa","theme","retail"].includes(p.kind))return false;
 if(!["all","bear"].includes(state.category)&&p.kind!==state.category)return false;
 return matches(state.q,[p.title,p.aliases,p.query,p.address,p.floor,p.hours,p.pref,p.note,C.labels[p.kind]].join(" "));
}
function comparePlace(a,b){
 const q=standardize(state.q);
 if(q){
  const score=p=>Number(standardize(p.title).includes(q))*6+Number(standardize(p.query).includes(q))*3+Number(p.kind==="official")*2+Number(!!p.coords);
  return score(b)-score(a);
 }
 const focused=p=>Number(p.area===state.view)*8+(C.featured.includes(p.id)?3:0)+Number(p.kind==="official")*1.2+Number(!!p.photo)+Number(!!p.coords)*.4;
 return focused(b)-focused(a);
}
function summary(p){
 return [p.floor,p.hours,p.address].filter(Boolean).join(" · ")||p.note;
}
const fmtDistance=km=>km<1?Math.round(km*1000)+" m":km.toFixed(1)+" 公里";
function photoCredit(name){
 const ph=P[name];if(!ph)return "";
 return '<div class="credit">'+external(ph.source,ph.author)+" · "+(ph.licenseUrl?external(ph.licenseUrl,ph.license):esc(ph.license))+" · 調整尺寸，頁面可能裁切顯示</div>";
}
function thumb(name,alt,loading="lazy"){
 const ph=P[name];
 return ph?'<img src="./assets/'+esc(ph.src)+'" alt="'+esc(alt||ph.label)+'" loading="'+loading+'" decoding="async">':"";
}
function resultCard({id,title,subtitle,note,photo,kind,attr,active=false,favorite=false,nearbyPhoto=false}){
 const hasPhoto=!!P[photo], p=saved.has(id);
 const key=esc(attr)+"=\""+esc(id)+"\"";
 const photoAlt=P[photo]?.label;
 return '<article class="result '+(hasPhoto?"":"no-photo ")+(active?"active":"")+'"><button type="button" class="result-visual" data-'+key+' aria-label="查看 '+esc(title)+'">'+
 (hasPhoto?thumb(photo,photoAlt)+(nearbyPhoto?'<span class="thumb-label">區域實景</span>':""):icon(symbol[kind]||"route"))+'</button><button type="button" class="result-content" data-'+key+'><p class="result-meta">'+
 esc(subtitle)+'</p><h2>'+esc(title)+'</h2><p class="result-note">'+esc(note)+'</p></button>'+
 (favorite?'<div class="result-tools"><button type="button" class="icon-button" data-fav="'+esc(id)+'" aria-pressed="'+p+'" aria-label="'+(p?"移除收藏":"收藏")+" "+esc(title)+'">'+icon("heart")+"</button></div>":"<i></i>")+"</article>";
}
function renderList(){
 let content="",count=0,items=[],label="";
 if(state.nav==="explore"||state.nav==="saved"){
  items=C.places.filter(placeMatches).sort(comparePlace);
  currentResults=items;
  count=items.length; label=count+" 個地點 · "+items.filter(p=>p.coords).length+" 個可定位";
  content=items.slice(0,state.limit).map(p=>resultCard({id:p.id,title:p.title,subtitle:p.pref+" · "+C.labels[p.kind],
    note:summary(p),photo:p.photo,kind:p.kind,attr:"place",active:state.detail?.type==="place"&&state.detail.id===p.id,favorite:true,nearbyPhoto:p.nearbyPhoto})).join("");
  if (state.nav==="explore" && !state.q && !state.pref && !state.inArea && state.category==="all") {
    content='<div class="callout"><strong>新潟片貝 2027/9/10–11</strong><br>四尺玉、古蹟與東京拉拉熊。 '+button("route","katakai-6","看 6 天安排")+"</div>"+content;
  }
 }else if(state.nav==="routes"){
  items=A.routes.filter(r=>(!state.pref||r.pref===state.pref)&&(!state.region||prefs.get(r.pref)?.region===state.region)&&matches(state.q,[r.title,r.region,r.subtitle,r.period,...r.steps.map(s=>s.title+" "+s.note)].join(" ")));
  count=items.length; label=count+" 條行程";
  content=items.slice(0,state.limit).map(r=>resultCard({id:r.id,title:r.title,subtitle:r.region+" · "+r.steps.length+" 站",
  note:r.period,photo:C.routesPhotos[r.id],kind:"event",attr:"route",active:state.detail?.type==="route"&&state.detail.id===r.id})).join("");
 }else if(state.nav==="calendar"){
  const day=state.day;
  const valid=e=>!day||((e.start||e.end)&&(e.start?e.start<=day:true)&&(e.end?day<=e.end:true)&&!(e.id==="date-3"&&day>="2026-12-27"&&day<="2027-01-07"));
  items=A.events.filter(e=>valid(e)&&matches(state.q,[e.title,e.when].join(" ")));
  const guides=day?[]:A.stories.filter(x=>matches(state.q,[x.title,x.region,x.subtitle,x.period,...x.blocks.flat()].join(" ")));
  count=items.length+guides.length;label=items.length+" 個活動"+(guides.length?" · "+guides.length+" 篇專題":"");
  content=items.map(e=>resultCard({id:e.id,title:e.title,subtitle:e.when,note:e.id==="konosu-event"?"2027 詳細日期待主辦公布":"查看官方公告與活動區域",
    kind:e.kind,photo:C.photoAreas[e.map],attr:"event",active:state.detail?.id===e.id})).join("");
  content+=guides.slice(0,Math.max(0,state.limit-items.length)).map(x=>resultCard({id:x.key,title:x.title,subtitle:x.region,note:x.period,attr:"story",kind:"event"})).join("");
 }else{
  items=C.gallery.filter(k=>matches(state.q,P[k].label+" "+P[k].author));
  count=items.length;label=count+" 張實景照";
  content='<div class="photo-grid">'+items.map(k=>'<button class="photo-tile" data-photo="'+esc(k)+'" type="button">'+thumb(k)+'<span>'+esc(P[k].label)+'</span></button>').join("")+"</div>";
 }
 $("count").textContent=label;
 if(!count){
  content='<div class="empty"><strong>'+(state.nav==="saved"&&!state.q?"還沒有符合的收藏":"找不到符合的資料")+'</strong>'+
  (state.nav==="saved"?"到探索清單按愛心即可收藏，也可清除目前的搜尋。":"試試地名、日文店名，或移除一個篩選條件。")+'</div>';
 }
 $("results").innerHTML='<div class="results-list">'+content+'</div>'+(count>state.limit&&state.nav!=="photos"?'<div class="more">'+button("more","yes","載入更多結果")+"</div>":"");
 $("reset").hidden=!state.q&&!state.region&&!state.pref&&state.category==="all"&&!state.inArea&&!state.day;
 $("clear-search").hidden=!state.q;
 $("scope-label").textContent=state.pref||mapArea(state.region)||(state.inArea?"地圖範圍":"日本全區");
 if(state.nav==="explore"||state.nav==="saved")geo?.visible(items,state.detail?.type==="place"?C.placesById.get(state.detail.id):null);
}
function refreshPref(){
 $("pref").innerHTML=option("","所有都道府縣")+A.prefs.filter(p=>!state.region||p.region===state.region).map(p=>option(p.name,p.name)).join("");
 $("pref").value=state.pref;
}
function renderChips(){
 $("chips").innerHTML=C.categories.map(([k,l])=>'<button type="button" class="chip" data-category="'+k+'" aria-pressed="'+(k===state.category)+'">'+l+'</button>').join("");
}
function switchNav(nav){
 if(!sectionNames[nav])return;
 state.nav=nav;state.q="";state.pref="";state.region="";state.category="all";state.inArea=false;state.day="";state.limit=26;
 $("search").value="";$("region").value="";$("day").value="";$("this-area").setAttribute("aria-pressed","false");
 $("workspace-title").textContent=sectionNames[nav];
 $("search").placeholder=({explore:"搜尋店名、站名、特色…",routes:"搜尋城市、景點、行程…",calendar:"搜尋活動或限定商品…",photos:"搜尋照片地點…",saved:"搜尋我的收藏…"})[nav];
 $("date-filter").hidden=nav!=="calendar";
 $("explore-filters").hidden=!["explore","routes","saved"].includes(nav);
 $("chips").hidden=nav==="routes";
 document.querySelectorAll("[data-nav]").forEach(b=>b.setAttribute("aria-current",b.dataset.nav===nav?"page":"false"));
 refreshPref();renderChips();renderList();$("results").scrollTop=0;
 setMode("list");closeDetail(false);
}
function setMode(mode){
 state.mode=mode;$("workspace").dataset.mobile=mode;
 document.querySelectorAll("[data-mode]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.mode===mode));
 requestAnimationFrame(()=>geo?.resize());
}
function clearFocusedOption(){
 $("view").querySelector('option[value="__focus"]')?.remove();
}
function markFocusedPlace(p){
 clearFocusedOption();
 if(byView.has(p.area)){
  state.view=p.area;
  $("view").value=p.area;
 }else{
  state.view="";
  $("view").insertAdjacentHTML("afterbegin",option("__focus",p.pref+"・"+p.title));
  $("view").value="__focus";
 }
}
function goView(id,showMap=false){
 if(id==="__focus")return;
 clearFocusedOption();
 state.view=byView.has(id)?id:"";$("view").value=state.view;
 if(showMap)setMode("map");
 requestAnimationFrame(()=>{geo?.resize();geo?.visit(byView.get(state.view));});
 if(!state.q&&!state.inArea)renderList();
}
function refreshMapArea(){
 if(state.inArea)renderList();
}
function labelP(p){return (p.pref||"日本")+" · "+(C.labels[p.kind]||"地點");}
function mapCard(){
 const active=state.detail?.type==="place"&&C.placesById.get(state.detail.id);
 const id=({asakusa:"official-6",tokyo:"official-4",katakai:"poi-katakai-0",ojiya:"poi-ojiya-0",settaya:"poi-settaya-0",konosu:"poi-konosu-0",kawagoe:"poi-kawagoe-0",arashiyama:"arashi-tea",kyoto:"official-13",osaka:"poi-osaka-3"})[state.view];
 const photoPlace=active?.coords?active:(!active&&id?C.placesById.get(id):null);
 $("map-card").innerHTML=photoPlace?'<button class="map-preview" data-place="'+esc(photoPlace.id)+'" type="button">'+thumb(photoPlace.photo)+
 '<div><span class="card-kind">'+esc(labelP(photoPlace))+'</span><h3>'+esc(photoPlace.title)+'</h3><p>'+esc(photoPlace.floor||"查看照片、車站與路線")+"</p></div></button>":"";
}
function cover(name,nearby=false){
 return P[name]?'<button class="cover-photo '+(nearby?"nearby":"")+'" type="button" data-photo="'+esc(name)+'">'+thumb(name,"","eager")+
 "<span>"+(nearby?"附近或區域實景 · ":"")+esc(P[name].label)+" · 放大</span></button>"+photoCredit(name):"";
}
function openPanel(type,id,label,body){
 state.detail={type,id};
 $("detail-label").textContent=label;$("detail-content").innerHTML=body;
 $("detail").hidden=false;$("workspace").classList.add("has-detail");$("detail-content").scrollTop=0;
 requestAnimationFrame(()=>geo?.resize());
 mapCard();
 if(type!=="place")renderList();
 requestAnimationFrame(()=>$("close-detail").focus({preventScroll:true}));
}
function closeDetail(restore=true){
 if($("detail").hidden)return;
 state.detail=null;state.token++;
 $("detail").hidden=true;$("workspace").classList.remove("has-detail");
 requestAnimationFrame(()=>geo?.resize());renderList();mapCard();
 if(restore)(fromButton?.isConnected?fromButton:$("search")).focus({preventScroll:true});
}
function facts(entries){
 const present=entries.filter(([,value])=>value);
 return present.length?'<dl class="fact-list">'+present.map(([key,value])=>"<dt>"+esc(key)+"</dt><dd>"+esc(value)+"</dd>").join("")+"</dl>":"";
}
function placeBody(p){
 return cover(p.photo,p.nearbyPhoto)+"<h2>"+esc(p.title)+"</h2><p>"+esc(p.note)+"</p>"+
  facts([["館別／樓層",p.floor],["營業時間",p.hours],["地址",p.address],["電話",p.tel]])+
  '<div class="detail-actions">'+external(direction(p.query),"Google Maps 路線 ↗","btn primary")+
  external(google(p.query),"查地點 ↗","btn")+(p.tabelog?external(p.tabelog,"食べログ ↗","btn"):"")+
  (p.coords?button("show-map",p.id,"看地圖","btn","map"):"")+button("fav",p.id,saved.has(p.id)?"移除收藏":"加入收藏","btn","heart")+button("share",p.id,"複製連結","btn","share")+"</div>"+
  (p.coords?'<h3>附近鐵路車站</h3><div id="near-stations"><p>讀取附近車站…</p></div>':'<p class="muted">這筆門市依地址查詢。上方 Google Maps 可查看位置和附近交通。</p>')+
  '<div id="near-links"></div>'+
  sourceLinks(p.href?[["店家／官方資料",p.href]]:[]) +
  (p.story&&stories.has(p.story)?'<div class="detail-actions">'+button("story",p.story,"看相關商品與活動")+"</div>":"");
}
async function openPlace(id,makeFocus=true){
 const p=C.placesById.get(id);if(!p)return;
 const seq=++state.token;
 if(p.coords&&makeFocus)markFocusedPlace(p);
 openPanel("place",p.id,labelP(p),placeBody(p));
 renderList();mapCard();
 if(p.coords&&makeFocus)requestAnimationFrame(()=>{geo?.resize();geo?.focus(p);});
 if(!p.coords)return;
 try {
  const stations=await window.ATLAS_MAP.localStations(p,5,4);
  if(seq!==state.token||state.detail?.id!==p.id)return;
  displayStations=stations;
  const small=p.approx?"距離根據區域圖釘估計。":"以下為直線距離，步行路線與出口可用 Google Maps 確認。";
  $("near-stations").innerHTML=stations.length?'<p class="muted">'+small+'</p>'+stations.map((s,i)=>
   '<div class="station-row"><strong>'+esc(s.name+"駅")+' · '+fmtDistance(s.km)+'</strong><div>'+esc(s.agency+"｜"+s.lines.join("、"))+
   '</div><div class="detail-actions">'+button("station",i,"地圖上看站")+" "+external(direction(p.query,s.googleName,"walking"),"從站走到這裡 ↗","btn")+"</div></div>").join(""):
   '<p class="muted">5 公里內沒有鐵路站資料。請查看接駁與巴士。</p>';
 }catch{
   if(seq===state.token&&$("near-stations"))$("near-stations").textContent="車站資料暫未載入，請使用 Google Maps 查看交通。";
 }
 if(seq!==state.token||!$("near-links"))return;
 const around=C.places.filter(x=>x.id!==p.id&&x.coords&&x.kind!== "event").map(x=>[x,window.ATLAS_MAP.km(p.coords,x.coords)])
   .filter(([x,d])=>d>0.07&&d<3).sort((a,b)=>a[1]-b[1]).slice(0,4);
 if(around.length)$("near-links").innerHTML="<h3>附近也可安排</h3>"+around.map(([x,d])=>'<div class="related-row">'+button("place",x.id,x.title)+" <span>"+fmtDistance(d)+"</span></div>").join("");
}
function openRoute(id){
 const r=routes.get(id);if(!r)return;
 const html=r.steps.map((s,i)=>'<article class="step"><small>'+esc(s.when)+'</small><h3>'+esc(s.title)+'</h3><p>'+esc(s.note)+'</p><div class="detail-actions">'+
 (s.map?button("view",s.map,"定位到地圖","btn","map"):"")+
 (s.query?external(google(s.query),"查看站點 ↗","btn"):"")+
 (s.query&&r.steps[i-1]?.query?external(direction(s.query,r.steps[i-1].query),"上一站到這裡 ↗","btn"):"")+"</div></article>").join("");
 openPanel("route",r.id,"旅行路線",cover(C.routesPhotos[r.id],true)+"<h2>"+esc(r.title)+"</h2><p>"+esc(r.subtitle)+
  "</p><p><strong>"+esc(r.period)+"</strong></p>"+html+r.notes.map(([h,b])=>"<h3>"+esc(h)+"</h3><p>"+esc(b)+"</p>").join("")+sourceLinks(r.links)+
  (r.story&&stories.has(r.story)?button("story",r.story,"餐點、商品與活動詳情"):""));
}
function openStory(id){
 const s=stories.get(id);if(!s)return;
 const photo=({odaiba:"odaiba",tokyo:"tokyo",kyoto:"bear-kyoto",hiroshima:"miyajima",hokkaido:"sapporo",osaka:"osaka",fuji:"fuji",
 "fuji-food":"fuji","tokyo-shop":"bear-tokyo","chiyoda-walk":"tokyo","localplush":"bear-kyoto"})[id];
 openPanel("story",id,"旅遊專題",cover(photo,true)+"<h2>"+esc(s.title)+"</h2><p>"+esc(s.period)+"</p>"+
 s.blocks.map(([h,b])=>"<h3>"+esc(h)+"</h3><p>"+esc(b)+"</p>").join("")+
 (s.photoRefs?.length?'<h3>官方圖片與商品原頁</h3><p>'+esc(s.photoRefs.slice(0,6).map(x=>x.caption).join("、"))+"</p>":"")+sourceLinks(s.links));
}
function openEvent(id){
 const e=events.get(id);if(!e)return;
 if(e.story&&stories.has(e.story)){openStory(e.story);return;}
 const v=byView.get(e.map);
 openPanel("event",id,"活動詳情",cover(C.photoAreas[e.map],false)+"<h2>"+esc(e.title)+"</h2><p>"+esc(e.when)+"</p>"+
   (v?'<p>'+esc(v.period)+'</p><div class="detail-actions">'+button("view",v.id,"看會場與車站","btn primary","map")+"</div>":"")+
   sourceLinks(e.href?[["活動官方公告",e.href]]:[]));
}
function openPhoto(id){
 const ph=P[id];if(!ph)return;
 $("photo-title").textContent=ph.label;$("photo-content").innerHTML=thumb(id,"","eager")+photoCredit(id);
 if(!$("photo-dialog").open)$("photo-dialog").showModal();
}
function filterNow({resetScroll=true}={}){
 state.limit=26;renderList();if(resetScroll)$("results").scrollTop=0;
}
function wipe(){
 state.region="";state.pref="";state.q="";state.day="";state.category="all";state.inArea=false;
 $("region").value="";$("search").value="";$("day").value="";$("this-area").setAttribute("aria-pressed","false");
 refreshPref();renderChips();filterNow();
}
$("region").innerHTML=option("","所有地區")+A.regions.map(r=>option(r.key,r.name)).join("");
$("view").innerHTML=option("","全日本")+Object.entries(C.viewShort).map(([id,label])=>option(id,label)).join("");
refreshPref();renderChips();checkSaved();
geo=window.ATLAS_MAP.init({icon,esc,option,external,google,onPref:p=>{
 if(!["explore","saved"].includes(state.nav))switchNav("explore");
 state.region=p.region;state.pref=p.name;$("region").value=state.region;refreshPref();filterNow();geo?.center(p.center);
},onPlace:openPlace,onFailure:mapStatus,onAreaMove:refreshMapArea});
$("search").addEventListener("input",e=>{state.q=e.target.value;filterNow();});
$("clear-search").addEventListener("click",()=>{$("search").value="";state.q="";filterNow();$("search").focus();});
$("region").addEventListener("change",e=>{state.region=e.target.value;state.pref="";refreshPref();filterNow();});
$("pref").addEventListener("change",e=>{state.pref=e.target.value;filterNow();const p=prefs.get(state.pref);if(p)geo?.center(p.center);});
$("day").addEventListener("change",e=>{state.day=e.target.value;filterNow();});
$("view").addEventListener("change",e=>{goView(e.target.value);mapCard();});
$("reset").addEventListener("click",wipe);
$("this-area").addEventListener("click",()=>{
 if(!geo)return;
 const upcoming=!state.inArea;
 if(state.nav!=="explore"&&state.nav!=="saved")switchNav("explore");
 state.inArea=upcoming;$("this-area").setAttribute("aria-pressed",upcoming);
 filterNow();setMode("list");if(upcoming)notify("已按可見地圖範圍篩選");
});
$("layers-button").addEventListener("click",()=>{
 $("layer-box").hidden=!$("layer-box").hidden;$("layers-button").setAttribute("aria-expanded",!$("layer-box").hidden);
});
$("close-detail").addEventListener("click",()=>closeDetail());
$("close-photo").addEventListener("click",()=>$("photo-dialog").close());
$("photo-dialog").addEventListener("click",e=>{if(e.target===$("photo-dialog"))$("photo-dialog").close();});
$("about").addEventListener("click",()=>openPanel("about","about","資料來源",'<h2>資料與照片出處</h2><p>門市、活動與營業資料以官方公告為準。實景照片附作者與授權。區域實景用來辨認周邊，不代表店內或商品照片。</p><p>鐵路及站點來自國土交通省 N02。底圖可在圖層內切換地理院與 OpenStreetMap。地點詳情有 Google Maps 導航，餐廳附可查核的食べログ店頁。</p>'+sourceLinks([
 ["San-X 拉拉熊官方店",A.sources["官方店完整資料"]],["RilaNowa 認證門市",A.sources["認證店官方名錄"]],
 ["實景照片", "https://commons.wikimedia.org/"],["日本國土地理院圖磚", "https://maps.gsi.go.jp/development/ichiran.html"],
 ["國土交通省 N02", "https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2025.html"],["縣界資料","https://github.com/dataofjapan/land"],
 ["OpenStreetMap", "https://www.openstreetmap.org/copyright"]
])));
document.addEventListener("click",e=>{
 const t=e.target.closest("button");if(!t)return;
 const d=t.dataset;
 if(d.nav){switchNav(d.nav);return;}
 if(d.mode){setMode(d.mode);return;}
 if(d.category){state.category=d.category;renderChips();filterNow();return;}
 if(d.more){const scroll=$("results").scrollTop;state.limit+=24;renderList();$("results").scrollTop=scroll;return;}
 if(d.place){fromButton=t;openPlace(d.place);return;}
 if(d.route){fromButton=t;openRoute(d.route);return;}
 if(d.story){fromButton=t;openStory(d.story);return;}
 if(d.event){fromButton=t;openEvent(d.event);return;}
 if(d.photo){openPhoto(d.photo);return;}
 if(d.view){if(matchMedia("(max-width:820px)").matches)closeDetail(false);goView(d.view,true);mapCard();return;}
 if(d.showMap){const p=C.placesById.get(d.showMap);if(p)markFocusedPlace(p);if(matchMedia("(max-width:820px)").matches)closeDetail(false);setMode("map");requestAnimationFrame(()=>{geo?.resize();geo?.focus(p);});return;}
 if(d.station!==undefined){const s=displayStations[Number(d.station)];if(matchMedia("(max-width:820px)").matches)closeDetail(false);setMode("map");requestAnimationFrame(()=>{geo?.resize();geo?.showStation(s);});return;}
 if(d.fav){
  const id=d.fav,added=!saved.has(id);if(added)saved.add(id);else saved.delete(id);
  checkSaved();renderList();if(t.closest(".detail-content"))t.innerHTML=icon("heart")+(added?"移除收藏":"加入收藏");
  notify(added?"已加入收藏":"已移除收藏");return;
 }
 if(d.share){
  const url=new URL(location.pathname,location.origin);url.searchParams.set("place",d.share);
  navigator.clipboard.writeText(url.href).then(()=>notify("已複製地點連結")).catch(()=>notify("瀏覽器未允許複製連結"));return;
 }
});
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"&&!$("photo-dialog").open)closeDetail();
 if(e.key==="/"&&!["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)){e.preventDefault();setMode("list");$("search").focus();}
});
new ResizeObserver(()=>geo?.resize()).observe($("map-pane"));
const requested=new URLSearchParams(location.search);
goView(requested.get("view")||"asakusa");renderList();mapCard();
if(requested.has("place")) openPlace(requested.get("place"));
})();



