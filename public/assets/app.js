
(() => {
"use strict";
const A=window.ATLAS, C=window.ATLAS_CATALOG, P=window.ATLAS_PHOTOS || {}, T=window.ATLAS_TASKS;
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
const external=(url,label,style="")=>'<a class="'+esc(style)+'" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(String(label).replace(/\s*↗$/u,""))+'</a>';
const google=q=>"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q);
const direction=(dest,origin,mode="transit")=>"https://www.google.com/maps/dir/?api=1&travelmode="+mode+"&destination="+encodeURIComponent(dest)+(origin?"&origin="+encodeURIComponent(origin):"");
const button=(name,id,label,style="btn",symbol="")=>'<button type="button" class="'+style+'" data-'+name+'="'+esc(id)+'">'+(symbol?icon(symbol):"")+esc(label)+'</button>';
const symbol={official:"shop",rilanowa:"shop",theme:"shop",retail:"shop",heritage:"landmark",craft:"craft",food:"food",fireworks:"spark",event:"calendar"};
const prefs=new Map(A.prefs.map(x=>[x.name,x])), regions=new Map(A.regions.map(x=>[x.key,x]));
const byView=new Map(A.views.map(x=>[x.id,x])), routes=new Map(A.routes.map(x=>[x.id,x]));
const stories=new Map(A.stories.map(x=>[x.key,x])), events=new Map(A.events.map(x=>[x.id,x]));
const sectionNames={shopping:"買物・商品與比價",food:"美食與米其林",anime:"動漫作品與踩點",collections:"主題收集與進度",experiences:"在地體驗",explore:"探索地點",routes:"行程規劃",calendar:"活動與限定商品",photos:"照片與圖繪",saved:"我的收藏"};
const savedKey="japan-atlas-favorites-v1";
let saved=new Set();
try { const x=JSON.parse(localStorage.getItem(savedKey)||"[]");if(Array.isArray(x))saved=new Set(x.map(id=>C.placesById.get(id)?.id).filter(Boolean));} catch {}
const experienceDefaults={theme:"all",mode:"",booking:"",language:"",duration:"",budget:""};
const experienceFilter={...experienceDefaults};
let experienceDay="";
const state={nav:"explore",region:"",pref:"",category:"all",q:"",view:"",party:1,areaBounds:null,areaDirty:false,mode:"list",inArea:false,limit:26,day:"",tripStart:"",tripEnd:"",detail:null,token:0};
try{const scope=JSON.parse(localStorage.getItem("japan-atlas-scope-v1")||"{}");state.pref=prefs.has(scope.pref)?scope.pref:"";state.day=CULTURE.checkedDay(scope.day);state.tripStart=CULTURE.checkedDay(scope.tripStart);state.tripEnd=CULTURE.checkedDay(scope.tripEnd);state.party=Math.max(1,Math.min(20,Number(scope.party)||1));}catch{}
const viewMemory=new Map();
const persistScope=()=>{try{localStorage.setItem("japan-atlas-scope-v1",JSON.stringify({pref:state.pref,day:state.day,party:state.party,tripStart:state.tripStart,tripEnd:state.tripEnd}));}catch{}};
let geo=null,currentResults=[],displayStations=[],flashTimer,fromButton=null,mapContext=null;
const standardize=value=>String(value??"").normalize("NFKC").toLowerCase().replace(/臺/g,"台").replace(/東京都|東京都/g,"東京").replace(/浅/g,"淺").replace(/静/g,"靜").replace(/広/g,"廣").replace(/国/g,"國").replace(/県/g,"縣").replace(/鎌倉/g,"鐮倉").replace(/新泻/g,"新潟").replace(/[\/／・｜_–-]+/g," ");
const tokens=q=>standardize(q).trim().split(/\s+/).filter(Boolean);
const matches=(q,v)=>{
 const text=standardize(v);
 return tokens(q).every(token=>text.includes(token));
};
const compact=value=>standardize(value).replace(/[^\p{L}\p{N}]+/gu,"");
function searchableFields(p){
 return [p.title,p.japanese,p.aliases,p.query,p.address,p.floor,p.hours,p.pref,p.note,p.summary,C.labels[p.kind],
  ...(p.stations||[]).map(s=>s.name+" "+s.query+" "+s.line),
  ...(p.experience?CULTURE.searchFields(p.experience):[])].filter(Boolean);
}
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
 if(!state.q&&state.nav==="experiences"&&(!p.experience||!CULTURE.matches(p.experience,experienceFilter)))return false;
 if(!state.q&&state.nav==="food"&&!T.foodMatches(p))return false;
 if(!state.q&&state.nav==="saved"&&!saved.has(p.id))return false;
 if(state.pref&&p.pref!==state.pref)return false;
 if(state.region&&prefs.get(p.pref)?.region!==state.region)return false;
 if(state.inArea&&(!state.areaBounds||!p.coords||!state.areaBounds.contains(p.coords)))return false;
 if(!state.q&&state.category==="bear"&&!p.tags?.includes("bear")&&!["official","rilanowa","theme","retail"].includes(p.kind))return false;
 if(!state.q&&!["all","bear"].includes(state.category)&&p.kind!==state.category)return false;
 if($("only-photo").checked&&!p.photo)return false;
 const fields=searchableFields(p),key=compact(state.q);
 return matches(state.q,fields.join(" "))||(key&&fields.some(field=>compact(field).includes(key)));
}
function comparePlace(a,b){
 const q=compact(state.q);
 if(q){
  const score=p=>Number(compact(p.title)===q||compact(p.japanese)===q)*12+
   Number(compact(p.title).includes(q)||compact(p.japanese).includes(q))*6+
   Number(compact(p.query).includes(q))*3+Number(p.kind==="official")*2+Number(!!p.coords);
  return score(b)-score(a);
 }
 const focused=p=>Number(p.area===state.view)*8+(C.featured.includes(p.id)?3:0)+Number(p.kind==="official")*1.2+Number(!!p.photo)+Number(!!p.coords)*.4;
 return focused(b)-focused(a);
}
function summary(p){
 return p.summary||[p.floor,p.hours,p.address].filter(Boolean).join(" · ")||p.note;
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
function photoType(name,nearby){
 const ph=P[name];
 return ph?.type||(nearby?"區域照":"實景照");
}
function resultCard({id,title,subtitle,note,photo,kind,attr,active=false,favorite=false,nearbyPhoto=false,experience=null}){
 const hasPhoto=!!P[photo], p=saved.has(id);
 const key=esc(attr)+"=\""+esc(id)+"\"";
 const photoAlt=P[photo]?.label;
 return '<article class="result '+(experience?'experience-result ':'')+(hasPhoto?"":"no-photo ")+(active?"active":"")+'"><button type="button" class="result-visual" data-'+key+' aria-label="查看 '+esc(title)+'">'+
 (hasPhoto?thumb(photo,photoAlt)+'<span class="thumb-label">'+esc(photoType(photo,nearbyPhoto))+'</span>':icon(symbol[kind]||"route"))+'</button><button type="button" class="result-content" data-'+key+'><p class="result-meta">'+
 esc(subtitle)+'</p><h2>'+esc(title)+'</h2><p class="result-note">'+esc(note)+'</p>'+
 (experience?'<p class="experience-participation">'+esc(experience.participation)+'</p>'+
 '<p class="experience-card-facts">'+esc(experience.time_short)+' · '+esc(experience.booking_short)+'</p>'+
 '<p class="experience-card-price">'+esc(CULTURE.price(experience,state.party)===null?"費用／單位待確認":CULTURE.price(experience,state.party)===0?"入場免費（依現行交通頁）":"每人 ¥"+CULTURE.price(experience,state.party).toLocaleString("ja-JP")+" 起 · "+state.party+" 人")+'</p>'+
 (experienceDay?'<p class="experience-card-date">'+esc(CULTURE.dateStatus(experience,experienceDay).text)+'</p>':""):"")+'</button>'+
 (favorite?'<div class="result-tools"><button type="button" class="icon-button" data-fav="'+esc(id)+'" aria-pressed="'+p+'" aria-label="'+(p?"移除收藏":"收藏")+" "+esc(title)+'">'+icon("heart")+"</button></div>":"<i></i>")+"</article>";
}
const eventPrefs={"date-0":["東京","大阪"],"date-1":["東京"],"date-2":["北海道"],"date-3":["東京"],"date-4":["大阪"],"date-6":["北海道","京都","廣島"],"date-7":["岡山"],"kitakami-book":["岩手"],"katakai-event":["新潟"],"konosu-event":["埼玉"]};
const eventExclusions={"date-3":[["2026-12-27","2027-01-07"]]};
function eventVisible(e){
 if(state.pref&&eventPrefs[e.id]&&!eventPrefs[e.id].includes(state.pref))return false;
 const ds=state.day?[state.day]:window.ATLAS_PLANNER.days(state.tripStart,state.tripEnd);
 if(!ds.length)return true;
 return ds.some(d=>(e.start||e.end)&&(!e.start||e.start<=d)&&(!e.end||d<=e.end)&&!(eventExclusions[e.id]||[]).some(([a,b])=>a<=d&&d<=b));
}
function storyVisible(x){return !state.pref||[x.title,x.region,x.subtitle,...x.blocks.flat()].join(" ").includes(state.pref)||x.region==="全國";}
function renderList(){
 let content="",count=0,items=[],label="";
 const custom=!state.q?T.render(state.nav):null;
 if(custom){count=custom.count;label=count+" 筆";content=custom.html;currentResults=[];}
 else if(state.q||["explore","experiences","saved","food"].includes(state.nav)){
  items=C.places.filter(placeMatches).sort(comparePlace);
  currentResults=items;
  count=items.length; label=count+" 個地點 · "+items.filter(p=>p.coords).length+" 個可定位";
  content=items.slice(0,state.limit).map(p=>resultCard({id:p.id,title:p.title,subtitle:p.pref+" · "+(p.experience?p.experience.category:C.labels[p.kind]),
    note:p.restaurant?T.foodCaption(p):p.experience?p.experience.local_character:summary(p),experience:p.experience,photo:p.photo,kind:p.kind,attr:"place",active:state.detail?.type==="place"&&state.detail.id===p.id,favorite:true,nearbyPhoto:p.nearbyPhoto})).join("");
  if (state.nav==="explore" && !state.q && !state.pref && !state.inArea && state.category==="all") {
    content='<div class="experience-entry"><strong>把地方文化排進旅程</strong><p>染布、織布、紡紗、賽馬與傳統藝能</p>'+button("nav","experiences","找在地體驗","btn primary","craft")+'</div><div class="callout"><strong>新潟片貝 2027/9/10–11</strong><br>四尺玉、古蹟與東京拉拉熊。 '+button("route","katakai-6","看 6 天安排")+"</div>"+content;
  }
 }else if(state.nav==="routes"){
  items=A.routes.filter(r=>(!state.pref||r.pref===state.pref)&&(!state.region||prefs.get(r.pref)?.region===state.region)&&matches(state.q,[r.title,r.region,r.subtitle,r.period,...r.steps.map(s=>s.title+" "+s.note)].join(" ")));
  count=items.length; label=count+" 條行程";
  content=items.slice(0,state.limit).map(r=>resultCard({id:r.id,title:r.title,subtitle:r.region+" · "+r.steps.length+" 站",
  note:r.period,photo:C.routesPhotos[r.id],kind:"event",attr:"route",active:state.detail?.type==="route"&&state.detail.id===r.id})).join("");
 }else if(state.nav==="calendar"){
  const day=state.day;
  const valid=e=>eventVisible(e);
  items=A.events.filter(e=>valid(e)&&matches(state.q,[e.title,e.when].join(" ")));
  const guides=day?[]:A.stories.filter(x=>storyVisible(x)&&matches(state.q,[x.title,x.region,x.subtitle,x.period,...x.blocks.flat()].join(" ")));
  count=items.length+guides.length;label=items.length+" 個活動"+(guides.length?" · "+guides.length+" 篇專題":"");
  content=items.map(e=>resultCard({id:e.id,title:e.title,subtitle:e.when,note:window.ATLAS_PLANNER.eventSummary(e),
    kind:e.kind,photo:C.photoAreas[e.map],attr:"event",active:state.detail?.id===e.id})).join("");
  content+=guides.slice(0,Math.max(0,state.limit-items.length)).map(x=>resultCard({id:x.key,title:x.title,subtitle:x.region,note:x.period,attr:"story",kind:"event"})).join("");
 }else{
  items=C.gallery.filter(k=>matches(state.q,P[k].label+" "+P[k].author));
  count=items.length;label=count+" 張影像";
  content='<div class="photo-grid">'+items.map(k=>'<button class="photo-tile" data-photo="'+esc(k)+'" type="button">'+thumb(k)+'<span>'+esc(P[k].label)+'</span></button>').join("")+"</div>";
 }
 if(state.q){
  const extra=T.global(state.q);count+=extra.count;content+=extra.html;
  const es=A.events.filter(e=>eventVisible(e)&&matches(state.q,[e.title,e.when].join(" ")));
  const ss=A.stories.filter(x=>storyVisible(x)&&matches(state.q,[x.title,x.subtitle,x.period,...x.blocks.flat()].join(" ")));
  count+=es.length+ss.length;content+=es.map(e=>resultCard({id:e.id,title:e.title,subtitle:e.when,note:"核對當期入場與官方來源",kind:e.kind,photo:C.photoAreas[e.map],attr:"event"})).join("")+ss.map(x=>resultCard({id:x.key,title:x.title,subtitle:x.region,note:x.period,attr:"story",kind:"event"})).join("");
  label=count+" 個跨類型結果（商品線上通路另列）";
 }
 if(!state.q&&state.nav==="experiences")label=count+" 個體驗場館 · "+new Set(items.map(p=>p.experience.theme)).size+" 種主題";
 $("count").textContent=label;
 $("experience-selected-day").hidden=!experienceDay||state.nav!=="experiences";
 $("experience-selected-day").textContent=experienceDay+" · 日期狀態見卡片，餘額請查官方";
 if(!count&&!custom){
  content='<div class="empty"><strong>'+(state.nav==="saved"&&!state.q?"還沒有符合的收藏":"找不到符合的資料")+'</strong>'+
  (state.nav==="saved"?"到探索清單按愛心即可收藏，也可清除目前的搜尋。":"試試地名、日文店名，或移除一個篩選條件。")+'</div>';
 }
 $("results").innerHTML='<div class="results-list">'+content+'</div>'+(count>state.limit&&state.nav!=="photos"?'<div class="more">'+button("more","yes","載入更多結果")+"</div>":"");
 $("reset").hidden=!state.q&&!state.region&&!state.pref&&state.category==="all"&&!state.inArea&&!state.day&&!experienceDay&&Object.keys(experienceDefaults).every(k=>experienceFilter[k]===experienceDefaults[k]);
 $("clear-search").hidden=!state.q;
 $("scope-label").textContent=state.pref||mapArea(state.region)||(state.inArea?"地圖範圍":"日本全區");
 if(state.q||["explore","experiences","saved","food"].includes(state.nav))geo?.visible(items,state.detail?.type==="place"?C.placesById.get(state.detail.id):null);
 else geo?.visible(state.nav==="routes"?T.tripItems():[],state.detail?.type==="place"?C.placesById.get(state.detail.id):null);
 const located=items.filter(p=>p.coords).length;$("map-summary").textContent=(state.q||["explore","experiences","saved","food"].includes(state.nav))?located+" 個已定位・"+(items.length-located)+" 個未定位（仍留在清單）":"放大看街道與車站；可從詳情加入行程";
 persistScope();
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
 viewMemory.set(state.nav,{q:state.q,category:state.category,scroll:$("results").scrollTop});
 closeDetail(false);geo?.clearFocus();mapContext=null;state.view="";clearFocusedOption();$("view").value="";$("map-card").innerHTML="";
 state.nav=nav;Object.assign(state,{q:"",category:"all",limit:26},viewMemory.get(nav)||{});
 $("workspace").dataset.section=nav;
 $("workspace").dataset.map=["shopping","calendar","routes","anime","collections"].includes(nav)?"off":"on";
 $("toggle-map").setAttribute("aria-pressed",$("workspace").dataset.map==="on");
 $("search").value=state.q;$("workspace-title").textContent=sectionNames[nav];
 $("search").placeholder="找商品、作品、地點或活動…";
 $("explore-filters").hidden=!["explore","saved"].includes(nav);
 $("chips").hidden=false;$("experience-filters").hidden=nav!=="experiences";
 $("task-filters").innerHTML=T.filters(nav);
 document.querySelectorAll("[data-nav]").forEach(b=>b.setAttribute("aria-current",b.dataset.nav===nav||nav==="experiences"&&b.dataset.nav==="explore"?"page":"false"));
 experienceDay=state.day;refreshPref();renderChips();renderList();setMode("list");
 $("results").scrollTop=viewMemory.get(nav)?.scroll||0;
}

function setMode(mode){
 state.mode=mode;$("workspace").dataset.mobile=mode;if(mode==="map"){$("workspace").dataset.map="on";$("toggle-map").setAttribute("aria-pressed","true");}
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
 mapContext=null;
 state.view=byView.has(id)?id:"";$("view").value=state.view;
 if(showMap)setMode("map");
 requestAnimationFrame(()=>{geo?.resize();geo?.visit(byView.get(state.view));});
 if(!state.q&&!state.inArea)renderList();
}
function refreshMapArea(){
 if(state.inArea){state.areaDirty=true;$("this-area").textContent="更新為這個範圍";}
}
function labelP(p){return (p.pref||"日本")+" · "+(p.experience?p.experience.category:C.labels[p.kind]||"地點");}
function mapCard(){
 const active=state.detail?.type==="place"&&C.placesById.get(state.detail.id);
 const id=({asakusa:"official-6",tokyo:"official-4",katakai:"poi-katakai-0",ojiya:"poi-ojiya-0",settaya:"poi-settaya-0",konosu:"poi-konosu-0",kawagoe:"poi-kawagoe-0",arashiyama:"arashi-tea",kyoto:"official-13",osaka:"poi-osaka-3"})[state.view];
 const photoPlace=active?.coords?active:mapContext||(!active&&id?C.placesById.get(id):null);
 $("map-card").innerHTML=photoPlace?'<button class="map-preview" data-place="'+esc(photoPlace.id)+'" type="button">'+thumb(photoPlace.photo)+
 '<div><span class="card-kind">'+esc(labelP(photoPlace))+'</span><h3>'+esc(photoPlace.title)+'</h3><p>'+esc(photoPlace.floor||"查看照片、車站與路線")+"</p></div></button>":"";
}
function cover(name,nearby=false){
 return P[name]?'<button class="cover-photo '+(nearby?"nearby":"")+'" type="button" data-photo="'+esc(name)+'">'+thumb(name,"","eager")+
 "<span>"+esc(photoType(name,nearby))+" · "+esc(P[name].label)+" · 放大</span></button>"+photoCredit(name):"";
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
function factValue(value){
 if(Array.isArray(value))return value.map(factValue).filter(Boolean).join("；");
 if(value&&typeof value==="object"){
  const labels={perBookingMaximum:"單次預約上限",totalVenue:"全場容量",individualSession:"一般場上限",group:"團體場上限",minimum:"至少",maximum:"最多",amountJPY:"日圓",rate:"比率"};
  const rows=Object.entries(value).filter(([k,v])=>labels[k]&&v!==null&&v!==undefined).map(([k,v])=>labels[k]+"："+factValue(v));return rows.length?rows.join("；")+"（非剩餘名額）":"資料待核對，請查看官方來源";
 }
 return value==null?"":String(value);
}
function facts(entries){
 const present=entries.filter(([,value])=>value);
 return present.length?'<dl class="fact-list">'+present.map(([key,value])=>"<dt>"+esc(key)+"</dt><dd>"+esc(factValue(value))+"</dd>").join("")+"</dl>":"";
}
function floorGuide(p){
 if(!p.floors)return "";
 return '<div class="visit-floors">'+p.floors.map(f=>
  '<section class="visit-floor"><h3>'+esc(f.title)+'</h3>'+
  facts([["3/6–12/5",f.standard],["12/6–3/5",f.winter]])+
  '<p>'+esc(f.note)+'</p><div class="detail-actions">'+
  (f.tabelog&&p.tabelog?external(p.tabelog,"食べログ 餐廳頁 ↗","btn primary"):"")+
  (f.links||[]).map(([label,url])=>external(url,label+" ↗","btn")).join("")+
  '</div></section>').join("")+'</div>';
}
function eventTravelGuide(p){
 if(!p.guide)return "";
 const choice=(key,label,selected)=>'<button type="button" data-travel-phase="'+key+'" aria-pressed="'+selected+'" aria-controls="travel-'+key+'">'+label+'</button>';
 const leg=(key,label)=>'<div id="travel-'+key+'" aria-label="'+label+'"'+(key==="departure"?" hidden":"")+'>'+
  p.guide[key].map(r=>'<article class="visit-leg"><h4>'+esc(r.title)+'</h4><ol>'+
   r.stops.map(step=>'<li>'+esc(step)+'</li>').join("")+'</ol><p>'+esc(r.note)+'</p><div class="detail-actions">'+
   r.links.map(([label,url])=>external(url,label+" ↗","btn")).join("")+'</div></article>').join("")+'</div>';
 return '<section class="visit-transport" aria-labelledby="visit-transport-title"><h3 id="visit-transport-title">活動進出場</h3>'+
  '<p class="history-notice">'+esc(p.guide.notice)+'</p><div class="travel-choices" role="group" aria-label="選擇進出場">'+
  choice("arrival","進場",true)+choice("departure","散場",false)+'</div>'+leg("arrival","進場動線")+leg("departure","散場動線")+'</section>';
}
function stationPlan(p){
 if(!p.stations)return "";
 return '<h3>選擇車站</h3><p>'+esc(p.access)+'</p>'+
  p.stations.map((s,i)=>'<div class="station-row"><strong>'+esc(s.name)+'</strong><div>'+esc(s.line)+
   '</div><div class="detail-actions">'+button("planned-station",i,"地圖上看站","btn","pin")+" "+
   external(direction(p.query,s.query,"walking"),"步行路線 ↗","btn")+"</div></div>").join("");
}
function placeBody(p){
 if(p.experience)return CULTURE.body(p,{esc,external,button,facts,stationPlan,saved,planner:window.ATLAS_PLANNER,placeTools:T.placeExtra},experienceDay);
 const heading="<h2>"+esc(p.title)+"</h2>"+(p.japanese?'<p lang="ja" class="japanese-name">'+esc(p.japanese)+'</p>':"");
 const photo=cover(p.photo,p.nearbyPhoto);
 const mainFacts=facts([["館別／樓層",p.floor],["營業時間",p.hours],["地址",p.address],["電話",p.tel]]);
 const actions='<div class="detail-actions">'+(p.coords?button("show-map",p.id,p.guide?"地圖上看會場":"地圖上看地點","btn primary","map"):"")+
  (!p.guide?external(direction(p.query),"Google Maps 路線 ↗",p.coords?"btn":"btn primary"):"")+
  external(google(p.query),p.guide?"在 Google Maps 看會場 ↗":"查地點 ↗","btn")+
  (p.tabelog&&!p.floors?external(p.tabelog,"食べログ ↗","btn"):"")+
  button("fav",p.id,saved.has(p.id)?"移除收藏":"加入收藏","btn","heart")+button("share",p.id,"複製連結","btn","share")+"</div>";
 const related=(p.related||[]).map(id=>C.placesById.get(id)).filter(Boolean);
 const links=p.sources||(p.href?[["店家／官方資料",p.href]]:[]);
 return heading+T.placeExtra(p)+(p.summary&&!(p.floor&&p.hours)?'<p class="place-summary">'+esc(p.summary)+'</p>':"")+
  "<p>"+esc(p.heritage?"參訪前請核對各票區與開放公告。":p.note)+"</p>"+mainFacts+(p.guide?actions+eventTravelGuide(p)+photo:photo+floorGuide(p)+actions)+stationPlan(p)+
  (p.coords&&!p.stations&&!p.guide?'<h3>附近鐵路車站</h3><div id="near-stations"><p>讀取附近車站…</p></div>':"")+
  (p.coords&&p.approx?'<p class="muted">地圖圖釘為地點附近。</p>':"")+
  (related.length?'<h3>同區可安排</h3>'+related.map(x=>'<div class="related-row">'+button("place",x.id,x.title)+"</div>").join(""):"")+
  '<div id="near-links"></div>'+(links.length?'<h3>官方資訊</h3>'+sourceLinks(links):"")+
  (p.story&&stories.has(p.story)?'<div class="detail-actions">'+button("story",p.story,"看相關商品與活動")+"</div>":"");
}
async function openPlace(id,makeFocus=true){
 const p=C.placesById.get(id);if(!p)return;
 const seq=++state.token;
 if(p.coords&&makeFocus){markFocusedPlace(p);mapContext=p;}
 openPanel("place",p.id,labelP(p),placeBody(p));
 renderList();mapCard();
 if(p.coords&&makeFocus)requestAnimationFrame(()=>{geo?.resize();geo?.focus(p);});
 if(!p.coords)return;
 if($("near-stations")) try {
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
 const around=C.places.filter(x=>x.id!==p.id&&!p.related?.includes(x.id)&&x.coords&&x.kind!== "event").map(x=>[x,window.ATLAS_MAP.km(p.coords,x.coords)])
   .filter(([x,d])=>d>0.07&&d<3).sort((a,b)=>a[1]-b[1]).slice(0,4);
 if(around.length)$("near-links").innerHTML="<h3>附近也可安排</h3>"+around.map(([x,d])=>'<div class="related-row">'+button("place",x.id,x.title)+" <span>"+fmtDistance(d)+"</span></div>").join("");
}
function openRoute(id){
 const r=routes.get(id);if(!r)return;
 const html=r.steps.map((s,i)=>'<article class="step"><small>'+esc(s.when)+'</small><h3>'+esc(s.title)+'</h3><p>'+esc(s.note)+'</p><div class="detail-actions">'+
 (s.place?button("place",s.place,"查看體驗與預約","btn","info"):"")+
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
 const fireworks=e.kind==="fireworks"&&({"katakai":"poi-katakai-0","konosu":"poi-konosu-0"})[e.map];
 if(fireworks){openPlace(fireworks);return;}
 openPanel("event",id,"日期・場次與報名","<h2>"+esc(e.title)+"</h2><p>"+esc(e.when)+"</p>"+T.eventExtra(e)+window.ATLAS_PLANNER.eventPicker(e)+sourceLinks(e.href?[["官方公告",e.href]]:[])+(e.story?button("story",e.story,"完整餐點與商品專題"):""));return;
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
 resetExperienceFilters();T.reset();$("task-filters").innerHTML=T.filters(state.nav);state.q="";state.category="all";state.inArea=false;state.areaBounds=null;state.areaDirty=false;
 $("only-photo").checked=false;$("search").value="";$("this-area").setAttribute("aria-pressed","false");$("this-area").textContent="套用這個範圍";
 experienceDay=state.day;renderChips();filterNow();
}

function renderExperienceThemes(){
 $("experience-themes").innerHTML='<label>體驗主題<select id="experience-theme">'+CULTURE.themes.map(([key,label])=>option(key,label)).join("")+'</select></label>';
 $("experience-theme").value=experienceFilter.theme;
}

function renderExperienceDate(){
 const info=$("experience-date-info"),p=C.placesById.get(state.detail?.id);
 if(info&&p?.experience){
  const status=CULTURE.dateStatus(p.experience,experienceDay);
  info.className="experience-date-status "+status.tone;
  info.textContent=status.text;
  const input=$("detail-content").querySelector("[data-culture-day]");
  if(input)input.value=experienceDay;
 }
}
function resetExperienceFilters(){
 Object.assign(experienceFilter,experienceDefaults);experienceDay="";
 for(const key of ["mode","booking","language","duration","budget","day"])$("experience-"+key).value="";
 $("experience-options").open=false;
 renderExperienceThemes();
}
renderExperienceThemes();
for(const key of ["mode","booking","language","duration","budget"]){
 $("experience-"+key).addEventListener("change",e=>{experienceFilter[key]=e.target.value;filterNow();});
}
$("experience-day").addEventListener("change",e=>{
 experienceDay=CULTURE.checkedDay(e.target.value);
 renderExperienceDate();filterNow();
});

$("region").innerHTML=option("","所有地區")+A.regions.map(r=>option(r.key,r.name)).join("");
$("view").innerHTML=option("","全日本")+Object.entries(C.viewShort).map(([id,label])=>option(id,label)).join("");
refreshPref();renderChips();checkSaved();
geo=window.ATLAS_MAP.init({icon,esc,option,external,google,onPref:p=>{
 if(!["explore","experiences","saved"].includes(state.nav))switchNav("explore");
 state.region=p.region;state.pref=p.name;$("region").value=state.region;refreshPref();filterNow();geo?.center(p.center);
},onPlace:openPlace,onFailure:mapStatus,onAreaMove:refreshMapArea});
$("search").addEventListener("input",e=>{state.q=e.target.value;filterNow();});
$("clear-search").addEventListener("click",()=>{$("search").value="";state.q="";filterNow();$("search").focus();});
$("region").addEventListener("change",e=>{state.region=e.target.value;state.pref="";refreshPref();filterNow();});
$("pref").addEventListener("change",e=>{state.pref=e.target.value;filterNow();const p=prefs.get(state.pref);if(p)geo?.center(p.center);});
function renderTripScope(){
 const ds=window.ATLAS_PLANNER.days(state.tripStart,state.tripEnd),range=ds.length?state.tripStart+" 至 "+state.tripEnd+"・"+ds.length+" 天":"尚未設定完整旅行起訖";
 $("trip-summary").textContent=range+"・"+state.party+" 人";$("trip-length").textContent=range+"・"+(state.day?"目前看 "+state.day:"全程總覽");
 $("day").min=state.tripStart;$("day").max=state.tripEnd;$("trip-end").min=state.tripStart;persistScope();
}
function setActiveDay(value){
 const d=CULTURE.checkedDay(value);if(d&&state.tripStart&&state.tripEnd&&(d<state.tripStart||d>state.tripEnd)){notify("檢視日不在旅行範圍，請先調整起訖");$("day").value=state.day;return false;}
 state.day=d;experienceDay=d;$("day").value=d;renderTripScope();renderExperienceDate();filterNow();return true;
}
function setTripRange(start,end,party=state.party){
 if(!CULTURE.checkedDay(start)||!CULTURE.checkedDay(end)||end<start){notify("請設定有效的旅行起訖，結束不得早於開始");return false;}
 state.tripStart=start;state.tripEnd=end;state.party=Math.max(1,Math.min(20,Number(party)||1));state.day="";experienceDay="";$("trip-start").value=start;$("trip-end").value=end;$("party").value=state.party;$("day").value="";renderTripScope();filterNow();return true;
}
for(const id of ["trip-start","trip-end"]){$(id).addEventListener("change",()=>{const start=$("trip-start").value,end=$("trip-end").value;if(start&&end){setTripRange(start,end);}else{state.tripStart=start;state.tripEnd=end;renderTripScope();filterNow();}});}
$("trip-scope-details").open=false;$("sheet-backdrop").addEventListener("click",()=>closeDetail());
new ResizeObserver(()=>document.documentElement.style.setProperty("--scope-height",Math.ceil($("trip-scope").getBoundingClientRect().height)+"px")).observe($("trip-scope"));
$("day").value=state.day;$("party").value=state.party;$("trip-start").value=state.tripStart;$("trip-end").value=state.tripEnd;experienceDay=state.day;
$("day").addEventListener("change",e=>{setActiveDay(e.target.value);});
$("party").addEventListener("change",e=>{state.party=Math.max(1,Math.min(20,Math.floor(Number(e.target.value)||1)));e.target.value=state.party;renderTripScope();filterNow();if(state.detail?.type==="place")openPlace(state.detail.id,false);});
$("clear-scope").addEventListener("click",()=>{state.pref="";state.region="";state.day="";state.tripStart="";state.tripEnd="";state.party=1;experienceDay="";$("trip-start").value="";$("trip-end").value="";renderTripScope();$("day").value="";$("party").value=1;$("region").value="";refreshPref();wipe();});
$("only-photo").addEventListener("change",()=>filterNow());
$("toggle-map").addEventListener("click",()=>{const w=$("workspace");const on=w.dataset.map!=="on";w.dataset.map=on?"on":"off";$("toggle-map").setAttribute("aria-pressed",on);if(on&&matchMedia("(max-width:820px)").matches)setMode("map");geo?.resize();});
$("close-layers").addEventListener("click",()=>{$("layer-box").hidden=true;$("layers-button").setAttribute("aria-expanded","false");});
$("view").addEventListener("change",e=>{goView(e.target.value);mapCard();});
$("reset").addEventListener("click",wipe);
$("this-area").addEventListener("click",()=>{
 if(!geo)return;
 if(!["explore","experiences","saved","food"].includes(state.nav))switchNav("explore");
 if(state.inArea&&!state.areaDirty){state.inArea=false;state.areaBounds=null;$("this-area").textContent="套用這個範圍";}
 else{state.inArea=true;state.areaBounds=geo.bounds();state.areaDirty=false;$("this-area").textContent="清除此範圍";notify("已套用目前地圖範圍；移動地圖後請按更新");}
 $("this-area").setAttribute("aria-pressed",state.inArea);filterNow();
});

$("layers-button").addEventListener("click",()=>{
 $("layer-box").hidden=!$("layer-box").hidden;if(!$("layer-box").hidden&&matchMedia("(max-width:820px)").matches)geo?.map.panBy([0,120],{animate:false});$("layers-button").setAttribute("aria-expanded",!$("layer-box").hidden);
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
 if(d.travelPhase){
  $("detail-content").querySelectorAll("[data-travel-phase]").forEach(choice=>{
   const on=choice===t;
   choice.setAttribute("aria-pressed",on);
   $(choice.getAttribute("aria-controls")).hidden=!on;
  });
  return;
 }
 if(d.plannedStation!==undefined){
  const p=state.detail?.type==="place"&&C.placesById.get(state.detail.id);
  const s=p?.stations?.[Number(d.plannedStation)];if(!s)return;
  mapContext=p;
  if(matchMedia("(max-width:820px)").matches)closeDetail(false);
  setMode("map");requestAnimationFrame(()=>{geo?.resize();geo?.showStation(s);});return;
 }
 if(d.experienceTheme){experienceFilter.theme=d.experienceTheme;renderExperienceThemes();filterNow();return;}
 if(d.reviewFilter){
  $("detail-content").querySelectorAll("[data-review-group]").forEach(section=>{section.hidden=d.reviewFilter!=="all"&&section.dataset.reviewGroup!==d.reviewFilter;});
  $("detail-content").querySelectorAll("[data-review-filter]").forEach(b=>b.setAttribute("aria-pressed",b===t));return;
 }
 if(d.nav){switchNav(d.nav);return;}
 if(d.mode){setMode(d.mode);return;}
 if(d.exploreTheme){state.category=d.exploreTheme;renderChips();filterNow();return;}
 if(d.category){state.category=d.category;renderChips();filterNow();return;}
 if(d.more){const scroll=$("results").scrollTop;state.limit+=24;renderList();$("results").scrollTop=scroll;return;}
 if(d.place){fromButton=t;openPlace(d.place);return;}
 if(d.route){fromButton=t;openRoute(d.route);return;}
 if(d.story){fromButton=t;openStory(d.story);return;}
 if(d.event){fromButton=t;openEvent(d.event);return;}
 if(d.photo){openPhoto(d.photo);return;}
 if(d.view){if(matchMedia("(max-width:820px)").matches)closeDetail(false);goView(d.view,true);mapCard();return;}
 if(d.showMap){const p=C.placesById.get(d.showMap);if(p){markFocusedPlace(p);mapContext=p;}if(matchMedia("(max-width:820px)").matches)closeDetail(false);setMode("map");requestAnimationFrame(()=>{geo?.resize();geo?.focus(p);});return;}
 if(d.station!==undefined){const s=displayStations[Number(d.station)];mapContext=C.placesById.get(state.detail?.id)||null;if(matchMedia("(max-width:820px)").matches)closeDetail(false);setMode("map");requestAnimationFrame(()=>{geo?.resize();geo?.showStation(s);});return;}
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
document.addEventListener("change",e=>{
 if(e.target.id==="experience-theme"){experienceFilter.theme=e.target.value;filterNow();return;}
 if(!e.target.matches("[data-culture-day]"))return;
 experienceDay=CULTURE.checkedDay(e.target.value);
 setActiveDay(experienceDay);experienceDay=state.day;$("experience-day").value=experienceDay;
 renderExperienceDate();renderList();
});
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"&&!$("photo-dialog").open)closeDetail();
 if(e.key==="/"&&!["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)){e.preventDefault();setMode("list");$("search").focus();}
});
new ResizeObserver(()=>geo?.resize()).observe($("map-pane"));
T.init({state,clearSearch:()=>{state.q="";$("search").value="";},esc,button,external,matches,openPanel,openPlace,openEvent,facts,notify,direction,switchNav,setDay:setActiveDay,setTripRange,refresh:()=>{$("task-filters").innerHTML=T.filters(state.nav);renderList();},showTrip:items=>{geo?.clearFocus();mapContext=null;$("map-card").innerHTML="";setMode("map");$("workspace").dataset.map="on";requestAnimationFrame(()=>{geo?.resize();geo?.showTrip(items);});}});
const requested=new URLSearchParams(location.search);
goView(requested.get("view")||"");
if(sectionNames[requested.get("tab")])switchNav(requested.get("tab"));
if(requested.get("product"))T.product(requested.get("product"));
renderTripScope();renderList();mapCard();
if(requested.has("place")) openPlace(requested.get("place"));
})();



