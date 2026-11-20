(() => {
"use strict";
const data=window.ATLAS_CULTURE;
const C=window.ATLAS_CATALOG;
const A=window.ATLAS;
const themes=[["all","全部體驗"],["dye","染布"],["weave","織布"],["spin","紡紗"],["horse","賽馬"],["sumo","相撲"],["music","和樂／太鼓"],["kabuki","歌舞伎"],["geiko","藝伎／舞妓"]];
const modes={hands:"親手做",watch:"觀看",interactive:"可互動",optional:"另選體驗席"};
const removed=new Set(Object.keys(data.aliases));
const retained=C.places.filter(p=>!removed.has(p.id));
const added=data.records.map(e=>({
 id:e.id,title:e.name,japanese:e.jp,pref:e.pref,kind:e.modes.includes("hands")?"craft":"heritage",
 note:e.local_character,query:e.jp+" "+(e.address||e.pref),coords:e.coords,approx:e.approx,
 address:e.address,aliases:e.aliases,experience:e,
 summary:e.time_short+" · "+e.booking_short,area:e.area||null,
 photo:null,related:e.related,stations:e.stations,access:e.transport,
 href:e.sources[0].url,sources:e.sources.map(s=>[s.title,s.url])
}));
C.places=[...retained,...added];
for(const p of added)C.placesById.set(p.id,p);
for(const [oldId,id] of Object.entries(data.aliases))C.placesById.set(oldId,C.placesById.get(id));

const routeRows=[
 ["culture-tokyo-east","東京","押上拉拉熊・淺草相撲",["official-6","poi-asakusa-0","culture-asakusa-sumo"],"相撲場次先預約，按確認信選本店或 ANNEX。購物和淺草散步留交通時間。"],
 ["culture-kyoto-day","京都","京都絞染・河原町・祇園藝能",["culture-kyoto-shibori","official-13","culture-gion-corner"],"白天預約絞染，逛河原町後再到祇園。冬季先核對公演日。"],
 ["culture-ojiya-day","新潟","小千谷織布・錦鯉・へぎそば",["culture-ojiya-orinoza","poi-ojiya-1","ojiya-soba"],"先預約織之座，再逛錦鯉之里和吃蕎麥麵。片貝花火另按當期接駁安排。"],
 ["culture-tokachi","北海道","十勝紡紗・帶廣輓馬",["culture-biman-spinning","culture-obihiro-banei"],"牧場往返先安排車輛，確認紡紗和帯広開催日。可分成兩個半日。"]
];
for(const [id,pref,title,stops,note] of routeRows){
 const places=stops.map(id=>C.placesById.get(id)).filter(Boolean);
 const r={id,pref,region:pref,title,subtitle:note,period:"文化串接提案・依預約場次安排",stops,
  steps:places.map((p,i)=>({when:i===0?"先安排":"接著安排",title:p.title,place:p.id,query:p.query,note:p.experience?.booking_short||p.note})),
  notes:[["安排方式",note]],links:places.filter(p=>p.experience).map(p=>[p.title+"官方資訊",p.experience.schedule_url])};
 A.routes.push(r);
 for(const p of places)if(p.experience)p.experience.route_id=id;
}
const checkedDay=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||"")&&!Number.isNaN(Date.parse(value))?value:"";
function dateStatus(e,selected){
 const day=checkedDay(selected);
 if(!day)return {tone:"",text:"選日期可查看已收錄的場次與休館條件"};
 const [year,month,date]=day.split("-").map(Number);
 const weekday=new Date(Date.UTC(year,month-1,date)).getUTCDay();
 const tail=day.slice(5);
 if(e.calendar_rule==="banei"){
  const text=data.banei_dates[day];
  return {tone:text?.includes("本場比賽")?"listed":"pending",text:text||"此日尚無已收錄場次，請開主辦日曆"};
 }
 if(e.calendar_rule==="tokyo-race"){
  const text=data.tokyo_dates?.[day];
  return {tone:text?.includes("本場比賽")?"listed":"pending",text:text||"此日請核對 JRA 本場日曆與公園開放表"};
 }
 if(e.calendar_rule==="taiko"){
  return {tone:e.session_dates.includes(day)?"listed":"pending",text:e.session_dates.includes(day)?"官網已列此日課程，餘額與價格請開預約頁":"此日未收錄公開課程，可向官方詢問私人課"};
 }
 if(e.calendar_rule==="gion"){
  const winter=tail>="12-01"||tail<="03-11";
  const closed=tail>="12-26"||tail<="01-04"||["02-11","02-23","07-16","08-16"].includes(tail);
  if(closed||(winter&&![2,3,4,5].includes(weekday)))return {tone:"closed",text:"依目前通常日程為休演日，行前查當期公告"};
  return {tone:"pending",text:winter?"冬期通常 18:00／19:00，仍需核對假日休演與餘席":"通常 18:00／19:00，請至官方核對當日餘席"};
 }
 if(e.calendar_rule==="sado"){
  if(month===1||month===2)return {tone:"closed",text:"館方列 1–2 月冬休，特殊活動請查公告"};
  if(weekday===1)return {tone:"closed",text:"通常週一休館，假日順延次日，請核對公告"};
  return {tone:"pending",text:"通常 11:00／13:30，至少 3 日前預約；假日休館另核"};
 }
 const rest={tuesday:2,wednesday:3,sunday:0}[e.calendar_rule];
 if(rest===weekday)return {tone:"closed",text:"依通常週期休館，行前請確認臨時異動"};
 if(e.calendar_rule==="warasse")return {tone:"pending",text:"一般每日四場體驗，囃子團體演奏日採不同時刻，請查當期表"};
 if(e.calendar_rule==="kabuki")return {tone:"pending",text:"依所選公演核對幕次、時長、票價與字幕"};
 return {tone:"pending",text:e.booking_options.includes("required")?"請向官方確認此日可預約場次":"一般可現場受理，臨時休館與名額請查官方"};
}
function matches(e,f){
 if(f.theme!=="all"&&e.theme!==f.theme)return false;
 if(f.mode&&!e.modes.includes(f.mode))return false;
 if(f.booking&&!e.booking_options.includes(f.booking))return false;
 if(f.language==="unknown"&&e.languages.length)return false;
 if(f.language&&f.language!=="unknown"&&!e.languages.includes(f.language))return false;
 if(f.duration==="short"&&!(e.minutes_from!==null&&e.minutes_from<=60))return false;
 if(f.duration==="medium"&&!(e.minutes_from>60&&e.minutes_from<=120))return false;
 if(f.duration==="long"&&!(e.minutes_from>120))return false;
 if(f.duration==="variable"&&e.minutes_from!==null)return false;
 if(f.budget==="unknown"&&e.cost_from!==null)return false;
 if(f.budget&&f.budget!=="unknown"&&!(e.cost_from!==null&&e.cost_from<=Number(f.budget)))return false;
 return true;
}
function searchFields(e){
 return [e.category,e.participation,e.aliases,e.jp,e.local_character,e.booking_short,e.time_short,e.language,
  ...e.modes.map(k=>modes[k])];
}
function body(p,h,day){
 const e=p.experience;
 const {esc,external,button,facts,stationPlan,saved}=h;
 const links=(items,style="btn")=>items.map(([title,url])=>external(url,title,style)).join("");
 const official=e.sources.map(s=>[s.title+(s.date?"（"+s.date+"）":""),s.url]);
 const phone=/^\d[\d-]+$/.test(e.contact||"")?"tel:+81"+e.contact.replace(/\D/g,"").slice(1):null;
 const status=dateStatus(e,day);
 const reviewGroups=[["tw","台灣作者、機構與繁中來源"],["jp","日本在地、媒體與日文來源"]];
 const reviews=reviewGroups.map(([key,label])=>{
  const rows=e.reviews.filter(r=>r.group===key);
  return '<section class="experience-review-group" data-review-group="'+key+'"><h4>'+label+'</h4>'+
   (rows.length?rows.map(r=>'<article class="experience-review">'+
    (r.related_event?'<p class="review-scope">相關年度公演心得</p>':"")+
    '<h5>'+esc(r.title)+'</h5><p class="review-origin">'+esc(r.origin)+'</p>'+
    '<p>'+esc(r.observation)+'</p><p class="review-date">'+esc(r.date_kind)+" "+esc(r.date||"未核實")+" · 造訪日期 "+esc(r.visit_date||"未核實")+'</p>'+
    '<p class="review-identity">'+esc(r.confidence)+'</p>'+
    (r.access_note?'<p class="review-identity">'+esc(r.access_note)+'</p>':"")+
    external(r.url,"閱讀原始心得與照片","btn")+'</article>').join(""):'<p class="muted">此類來源尚無可核實的同項體驗實訪。</p>')+'</section>';
 }).join("");
 const related=(p.related||[]).map(id=>C.placesById.get(id)).filter(Boolean);
 return '<h2>'+esc(p.title)+'</h2><p class="japanese-name" lang="ja">'+esc(p.japanese)+'</p>'+
  '<p class="experience-local">'+esc(e.local_character)+'</p>'+
  '<div class="experience-tags">'+e.modes.map(k=>'<span>'+esc(modes[k])+'</span>').join("")+'</div>'+
  facts([["參與方式",e.participation],["所需時間",e.duration],["費用",e.price],["預約",e.booking],["語言",e.language]])+
  '<div class="detail-actions experience-booking">'+external(e.booking_url,e.booking_url.startsWith("tel:")?"電話預約":"官方預約／入場","btn primary")+
  button("fav",p.id,saved.has(p.id)?"移除收藏":"加入收藏","btn","heart")+
  button("share",p.id,"複製連結","btn","share")+'</div>'+
  '<section class="experience-section"><h3>適合日期與場次</h3>'+
  '<label class="experience-date-label">旅行日期<input type="date" data-culture-day value="'+esc(day)+'"></label>'+
  '<p id="experience-date-info" class="experience-date-status '+status.tone+'" aria-live="polite">'+esc(status.text)+'</p>'+
  external(e.schedule_url,"核對官方場次與休館日","btn")+
  (e.race_modes?'<div class="race-modes">'+e.race_modes.map(([title,note])=>'<h4>'+esc(title)+'</h4><p>'+esc(note)+'</p>').join("")+'</div>':"")+
  '</section><section class="experience-section"><h3>參加前確認</h3><ul class="experience-conditions">'+e.constraints.map(v=>'<li>'+esc(v)+'</li>').join("")+'</ul></section>'+
  '<section class="experience-section"><h3>交通與回程</h3><p>'+esc(e.transport)+'</p>'+
  facts([["地址",e.address],["聯絡",e.contact]])+
  '<div class="detail-actions">'+external(e.transport_url,"官方交通／回程資訊","btn primary")+
  external("https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(p.query),"Google Maps 定位","btn")+
  (p.coords?button("show-map",p.id,"地圖上看體驗","btn","map"):"")+
  (phone?external(phone,"電話詢問","btn"):"")+'</div>'+
  (p.coords&&p.approx?'<p class="muted">圖釘為官方交通圖附近，請按地址與確認信找入口。</p>':"")+
  stationPlan(p)+'</section>'+
  '<section class="experience-section"><h3>可一起安排</h3><p>'+esc(e.route_suggestion)+'</p><p class="muted">路線提案需依預約場次、車班及營業日調整。</p>'+
  '<div class="detail-actions">'+related.map(x=>button("place",x.id,x.title)).join("")+
  (e.route_id?button("route",e.route_id,"看串接行程","btn primary","route"):"")+'</div></section>'+
  '<section class="experience-section"><h3>實訪心得</h3><div class="review-controls" role="group" aria-label="心得來源">'+
  [["all","全部來源"],["tw","台灣／繁中"],["jp","日本／日文"]].map(([key,label])=>'<button type="button" data-review-filter="'+key+'" aria-pressed="'+(key==="all")+'">'+label+'</button>').join("")+'</div>'+reviews+'</section>'+
  '<section class="experience-section"><h3>官方照片與查核資料</h3><p class="muted">營運資料查核日 '+esc(e.checked_at)+'</p><div class="detail-actions">'+
  links(e.photo_links.map(s=>[s.title,s.url]))+'</div><div class="sources">'+links(official,"")+'</div></section>'+
  (e.unconfirmed.length?'<section class="experience-section"><h3>仍待確認</h3><ul class="experience-conditions">'+e.unconfirmed.map(v=>'<li>'+esc(v)+'</li>').join("")+'</ul></section>':"");
}
window.CULTURE={themes,modes,matches,searchFields,dateStatus,body,checkedDay};
})();

