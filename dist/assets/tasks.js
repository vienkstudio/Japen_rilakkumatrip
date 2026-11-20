(() => {
'use strict';
const D=window.ATLAS_TASK_DATA,C=window.ATLAS_CATALOG,A=window.ATLAS;
const S=D.shopping,H=D.culture,F=D.dining;
const normalizePref=v=>A.prefs.find(p=>p.name===v||v.replace(/[都道府縣県]$/,'')===p.name)?.name||v;
const canonical=new Map();
for(const h of H.heritage){
 let p=h.existingPoiIds.map(id=>C.placesById.get(id)).find(Boolean);
 if(!p){p={id:h.id,title:h.title,japanese:h.japanese,pref:normalizePref(h.pref),kind:'heritage',coords:h.coords,address:h.address,query:h.japanese+' '+h.address,photo:null,note:'古蹟參訪與指定文化財',href:h.sources[0]?.url};C.places.push(p);}
 p.heritage=h;p.title=h.title;p.japanese=h.japanese;p.address=h.address||p.address;p.hours=h.visit.hours;p.note=h.history.origin;p.summary=h.history.originalVsRebuilt;p.aliases=[...(p.aliases||[]),...h.designation.map(x=>x.type+' '+x.name),'古蹟',h.goshuin.status==='verified'?'御朱印':''];p.sources=h.sources.map(s=>[s.title,s.url]);
 C.placesById.set(p.id,p);C.placesById.set(h.id,p);canonical.set(h.id,p.id);
}
const old1899=C.placesById.get('poi-tokyo-2'),main1899=C.placesById.get('1899');
if(old1899&&main1899&&JSON.stringify(old1899.coords)===JSON.stringify(main1899.coords)){
 main1899.aliases=[...(main1899.aliases||[]),old1899.title];C.places=C.places.filter(p=>p.id!==old1899.id);C.placesById.set(old1899.id,main1899);
}
for(const f of F.restaurants){
 const p={id:f.id,title:f.title,japanese:f.japanese,pref:normalizePref(f.pref),kind:'food',coords:f.coords,address:f.address,hours:f.hours,query:f.japanese+' '+f.address,note:f.description,summary:f.cuisine.join('・'),restaurant:f,photo:null,href:f.sources[0],sources:f.sources.map((url,i)=>['餐廳來源 '+(i+1),url]),aliases:f.tags};C.places.push(p);C.placesById.set(p.id,p);
}
for(const p of C.places.filter(p=>p.experience?.id.startsWith('culture-taiko-lab-'))){
 const e=p.experience;e.local_character=e.name.replace('・旅客和太鼓課','')+'的和太鼓節奏與合奏入門。';p.note=e.local_character;
 e.groupPricing=e.id.endsWith('umekita')?null:{1:45000,2:22500,3:15000};
}
let api,mode='products',purpose='personal',food={cuisine:'',meal:'',budget:'',stars:''},planMode='mine';
const storeKey='japan-atlas-tasks-v1';
let local={visits:{},purchase:[],watch:[],trip:[],rate:''};
try{local={...local,...JSON.parse(localStorage.getItem(storeKey)||'{}')};}catch{}
for(const id of Object.keys(local.visits)){const p=C.placesById.get(id);if(p&&p.id!==id){local.visits[p.id]=local.visits[id];delete local.visits[id];}}
const save=()=>{try{localStorage.setItem(storeKey,JSON.stringify(local));}catch{api?.notify('瀏覽器儲存空間不足，請先匯出清單');}};
const money=n=>n===null||n===undefined?'待確認':'¥'+Number(n).toLocaleString('ja-JP');
const txt=v=>api.esc(v??'');
const btn=(name,id,label,css='btn')=>api.button(name,id,label,css);
const link=(url,label,css='')=>url?api.external(url,label,css):'';
const list=v=>'<ul>'+v.map(s=>'<li>'+txt(s)+'</li>').join('')+'</ul>';
const section=(h,b)=>b?'<section class="task-section"><h3>'+txt(h)+'</h3>'+b+'</section>':'';
const para=v=>v?'<p>'+txt(v)+'</p>':'';
const notice=v=>'<p class="task-notice">'+txt(v)+'</p>';
const simpleCard=(title,meta,desc,action,body='')=>'<article class="task-card"><div class="task-card-meta">'+txt(meta)+'</div><h2>'+txt(title)+'</h2><p>'+txt(desc)+'</p>'+body+'<div class="detail-actions">'+action+'</div></article>';
const sources=ids=>'<div class="sources">'+ids.map(id=>S.sources.find(s=>s.id===id)).filter(Boolean).map(s=>link(s.url,s.title)).join('')+'</div>';
const scoped=(pref)=>!api.state.pref||normalizePref(pref)===api.state.pref;
const matched=(q,fields)=>api.matches(q,fields.flat().filter(Boolean).join(' '));
const productFields=p=>[p.series,p.name_zh,p.name_ja,p.manufacturer_sku,p.jan,p.variant];
const release=p=>p.release.display||p.release.manufacturer_window||(p.release.campaign_start?p.release.campaign_start+'–'+p.release.campaign_end:'日期待確認');
const productStores=p=>C.places.filter(x=>x.kind==='official'&&scoped(x.pref)).slice(0,6);
const productCard=p=>simpleCard(p.name_zh,p.series+' · '+(p.manufacturer_sku||'官方未提供品番'),release(p),btn('product',p.id,'查看商品與比價'),'<p class="price">建議售價 '+money(p.official_msrp.amount)+' 含稅</p><p class="muted">'+txt(p.variant)+' · 庫存未知 · 查核 '+txt(p.checked_at)+'</p>');
const animeCard=p=>simpleCard(p.title,normalizePref(p.pref)+' · '+(p.readiness?'場景已核・合作買物待補':'官方關聯已核'),p.relation,btn('anime',p.id,'作品、場景與買物'));
const priceLabels={gardenAdult:'庭園成人',gardenSchoolChild:'庭園小中學生',gardenPreschool:'庭園學齡前',buildingsAdditional:'諸堂加票',hattoSeparate:'法堂另票',perAreaAdult:'各區成人',perAreaElementary:'各區小學生',adultGeneral:'一般成人',adultHimejiResident:'姬路市民持證',under18:'未滿18歲依官方年齡規則',castleAndKokoen:'城郭與好古園',ordinaryPrecinct:'一般境內參拜'};
const heritagePrices=v=>typeof v==='string'?para(v):api.facts(Object.entries(v).filter(([k])=>k!=='currency').map(([k,n])=>[priceLabels[k]||({note:'票價說明',payment:'付款方式',effective:'適用日期'}[k]||k),typeof n==='number'?money(n):n]));
const imagesEntry=rows=>rows?.length?notice('以下連結可查看官方實際照片／商品圖；本站尚未取得這批圖片的重製授權。')+'<div class="sources">'+rows.map((r,i)=>link(r.page||r.url,'官方照片／商品圖 '+(i+1))).join('')+'</div>':'';
function filters(nav){
 if(nav==='shopping')return '<div class="task-tabs" role="group" aria-label="買物任務">'+[['products','商品與比價'],['purchase','採購清單'],['watch','追蹤來源']].map(([v,l])=>btn('shop-mode',v,l,mode===v?'btn primary':'btn')).join('')+'</div><label class="task-inline">購買用途<select id="purchase-purpose"><option value="personal"'+(purpose==='personal'?' selected':'')+'>個人收藏</option><option value="commercial"'+(purpose==='commercial'?' selected':'')+'>商業採購</option></select></label>';
 if(nav==='food')return '<div class="task-filter-grid">'+[['cuisine','菜系',[['','全部'],['壽司','壽司'],['天','天婦羅／天丼'],['日本料理','日本料理']]],['meal','用餐時段',[['','全部'],['午餐','午餐'],['晚餐','晚餐']]],['budget','每人基礎餐價',[['','不限'],['2000','¥2,000 以下'],['20000','¥20,000 以下'],['50000','¥50,000 以下']]],['stars','米其林',[['','全部'],['1','2026 一星'],['2','2026 二星'],['3','2026 三星']]]].map(([k,l,options])=>'<label>'+l+'<select data-food-filter="'+k+'">'+options.map(([v,n])=>'<option value="'+v+'"'+(food[k]===v?' selected':'')+'>'+n+'</option>').join('')+'</select></label>').join('')+'</div>';
 if(nav==='routes')return '<div class="task-tabs">'+btn('plan-mode','mine','我的每日行程',planMode==='mine'?'btn primary':'btn')+btn('plan-mode','templates','主題路線範本',planMode==='templates'?'btn primary':'btn')+'</div>';
 return '';
}
function product(id){
 const p=S.products.find(p=>p.id===id);if(!p)return;
 const offers=S.offers.filter(o=>o.product_id===id),comparison=S.comparisons.find(c=>c.product_id===id);
 const blocked=p.commercial_purchase.allowed===false;
 const rows=offers.map(o=>'<tr><th>'+txt(o.retailer)+'</th><td>'+money(o.price.amount)+(o.price.tax_included?' 含稅':' 稅待核')+'</td><td>'+money(o.shipping?.domestic_japan_advertised)+'</td><td>'+txt(o.stock_status)+'</td><td>'+link(o.product_url,'查零售原頁')+'</td></tr>').join('');
 const best=comparison?notice('已查通路最低單價：'+comparison.item_price_lower_retailer+'；日本境內單件含運最低：'+comparison.single_item_delivered_lower_retailer+'。'+comparison.conditions):notice('僅一個或不足可比報價，尚不能判斷已查通路最低。');
 const actions=btn('purchase-add',id,blocked&&purpose==='commercial'?'禁止商業採購':'加入'+(purpose==='commercial'?'商業':'個人')+'清單')+btn('watch',id,local.watch.includes(id)?'取消本機追蹤':'追蹤這個商品');
 api.openPanel('product',id,'商品・來源比價','<h2>'+txt(p.name_zh)+'</h2><p lang="ja">'+txt(p.name_ja)+'</p>'+notice(p.commercial_purchase.note)+(blocked?notice(p.limit_note):'')+api.facts([['系列',p.series],['款式',p.variant],['商品編號',p.manufacturer_sku||'未公開'],['JAN',p.jan||'未公開'],['規格單位',p.unit],['發售',release(p)],['限購',p.limit_note||'待核通路規則'],['核價日',p.checked_at]])+section('同款新品價格',best+'<div class="table-scroll"><table><caption>同 SKU、同款、新品報價；點數另列，不折抵現金</caption><thead><tr><th>通路</th><th>商品單價</th><th>日本境內運費</th><th>庫存</th><th>來源</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+offers.map(o=>para(o.retailer+'：'+(o.advertised_status||'可購狀態待確認')+'；'+(o.points?.note||'會員、付款手續費與優惠條件請查原頁')+'；限購：'+(o.purchase_limit||'未知')+'；'+(o.shipping?.notes||o.shipping?.note||'境外轉寄費用另計'))).join(''))+'<div class="detail-actions">'+actions+'</div>'+section('實際商品圖',imagesEntry(p.images))+section('購買地點',blocked?link('https://www.kushi-ya.com/manpukuparty/rilakkuma2026/','查活動參加店與門市規則','btn'):notice('線上報價不代表實體門市同價或有貨。以下為所選區域官方店查詢入口，非已確認該款販售店。')+productStores(p).map(s=>btn('place',s.id,s.title)).join(''))+section('核對來源',sources([...new Set([...p.source_ids,...S.offers.filter(o=>o.product_id===p.id).flatMap(o=>o.source_ids||[o.source_id])])])));
}
function anime(id){
 const a=H.anime.find(x=>x.id===id);if(!a)return;
 const s=a.relatedStore;
 const related=C.places.filter(p=>normalizePref(a.pref)===p.pref&&p.tags?.includes('bear')).slice(0,4);
 api.openPanel('anime',id,'作品關聯與路線','<h2>'+txt(a.title)+'</h2>'+para(a.relation)+api.facts([['作品',a.work.join('・')],['期間',a.window.start?a.window.start+'–'+a.window.end:a.window.label],['入場',a.entry.conditions],['費用',a.entry.fee??'未核實']])+section('踩點順序',list(a.route))+section('買物與休憩',para(s.name)+para(s.goods||s.note||s.nearbySuggestion)+para(s.address)+para(s.hours)+para(s.access)+link(s.source||s.officialLocationLink,'店家／場地官方資訊','btn'))+(a.products?section('聯名商品',a.products.map(p=>para(p.title+'・'+p.variants+'款・價格及庫存待確認')+link(p.photoEntry,'官方商品照片','btn')).join('')):'')+(a.relatedWindows?section('其他城市檔期',a.relatedWindows.map(w=>para(normalizePref(w.pref)+' '+w.store+' '+w.start+'–'+w.end+' '+w.condition)).join('')):'')+section('附近既有拉拉熊點',related.map(p=>btn('place',p.id,p.title)).join(''))+section('官方地圖與來源',a.sources.map(s=>link(s.url,s.title,'btn')).join('')+link(a.officialMap?.pdf,'西武官方舞台探訪圖 PDF','btn')+link(a.officialImageEntry,'官方實景照片入口','btn')));
}
function foodMatches(p){
 if(p.kind!=='food')return false;const r=p.restaurant;
 if(food.cuisine&&!matched(food.cuisine,r?.cuisine||[p.title,p.note]))return false;
 if(food.stars&&Number(food.stars)!==r?.michelin?.stars)return false;
 if(food.meal&&!r?.menu.some(m=>m.meal===food.meal||m.meal?.includes(food.meal)))return false;
 if(food.budget&&!r?.menu.some(m=>m.priceJPY!=null&&m.priceJPY<=Number(food.budget)))return false;
 return true;
}
function placeExtra(p){
 const status=local.visits[p.id]||'';
 let html='<div class="visit-tools"><label>參訪紀錄<select data-visit="'+txt(p.id)+'">'+[['','未標記'],['want','想去'],['visited','已參訪'],['done','已完成體驗']].map(([v,l])=>'<option value="'+v+'"'+(status===v?' selected':'')+'>'+l+'</option>').join('')+'</select></label>'+btn('trip-add',p.id,'加入每日行程')+'</div>';
 if(p.experience?.groupPricing){const n=api.state.party,cost=p.experience.groupPricing[Math.min(n,3)];html+=notice(n+' 人參與：每人 '+money(cost)+'，整組 '+money(cost*n)+'。含稅／附加服務依預約頁，這是目前所列人數級距，非空席保證。');}
 const h=p.heritage;
 if(h){html+=section('歷史與現有建築',para('創建：'+h.history.founded+'；'+h.history.origin)+para(h.history.originalVsRebuilt))+section('指定對象',h.designation.map(d=>para(d.name+'｜'+d.type+'｜'+d.object)).join(''))+section('參觀重點',list(h.highlights))+section('分區門票與參訪安排',api.facts([['開放',h.visit.hours],['票價','各票區如下'],['路線時間',h.visit.route?.duration]])+heritagePrices(h.visit.price)+(h.visit.areas?list(h.visit.areas.map(a=>a.name+'・'+(a.ticket||'')+' '+(a.condition||''))):'')+list(h.visit.access||[]))+section('御朱印與現場規則',para(h.goshuin.note||h.goshuin.conditions)+api.facts([['御朱印費',h.goshuin.priceJPY==null?'待確認':money(h.goshuin.priceJPY)],['受理處',h.goshuin.counter]])+(h.goshuin.counters?list(h.goshuin.counters.map(c=>c.name+'・'+c.hours)):'')+list(h.goshuin.notices||[])+para(h.visit.photography?.note))+link(h.officialImageEntry,'寺院／城郭官方實景','btn');}
 const r=p.restaurant;
 if(r){html+=section('料理與評鑑',api.facts([['菜系',r.cuisine.join('・')],['米其林',r.michelin.stars?r.michelin.year+' 年 '+r.michelin.stars+' 星':'本批不主張星級'],['星級查核',r.michelin.checkedAt]])+link(r.michelin.source,'Michelin 官方店頁','btn'))+section('菜單與總價條件',r.menu.map(m=>'<article class="menu-card"><h4>'+txt(m.name)+'</h4><p class="price">'+money(m.priceJPY)+' · '+txt(m.meal)+'</p>'+para([m.priceBasis,m.taxStatus,m.serviceStatus].filter(Boolean).join('；'))+(m.estimatedTableTotalJPY?para('一般桌含服務費估算 '+money(m.estimatedTableTotalJPY)):'')+link(m.source,'菜單原頁')+'</article>').join(''))+section('預約與取消',api.facts([['預約渠道',r.booking.channel],['開放預約',r.booking.releaseWindow],['取消規則',r.booking.cancellation],['入店條件',r.booking.conditions],['當日空席',r.booking.liveAvailability]])+link(r.booking.url,'查看官方／授權預約','btn primary'))+section('交通',para(r.access.detail))+section('餐點照片',imagesEntry(r.images))+section('仍需確認',list(r.remaining||[]));}
 return html;
}
function collections(){
 const groups=H.collections.map(g=>{const items=g.itemIds.map(id=>C.placesById.get(canonical.get(id)||id)||H.anime.find(a=>a.id===id)).filter(Boolean);const visited=items.filter(p=>['visited','done'].includes(local.visits[p.id])).length;return simpleCard(g.title,visited+' / '+items.length+' 已參訪',g.scope,'','<progress value="'+visited+'" max="'+Math.max(1,items.length)+'"></progress>'+items.map(p=>'<div class="collection-row">'+btn(p.work?'anime':'place',p.id,p.title)+'<label><select data-visit="'+txt(p.id)+'">'+[['','未標記'],['want','想去'],['visited','已參訪'],['done','已完成']].map(([v,l])=>'<option value="'+v+'"'+(local.visits[p.id]===v?' selected':'')+'>'+l+'</option>').join('')+'</select></label><span>'+txt({want:'想去',visited:'已參訪',done:'已完成'}[local.visits[p.id]]||'未標記')+'</span></div>').join('')+(items.length<g.total?notice('原清單 '+g.total+' 項；目前可對接 '+items.length+' 項，其餘待補。'):''));}).join('');
 const visited=C.places.filter(p=>local.visits[p.id]);
 return {count:H.collections.length,html:notice('進度只計已收錄且可核對的有限清單，不代表全日本完整覆蓋。')+groups+section('我的參訪紀錄',visited.map(p=>simpleCard(p.title,{want:'想去',visited:'已參訪',done:'已完成體驗'}[local.visits[p.id]],p.pref,btn('place',p.id,'查看與修改'))).join(''))};
}
function purchase(){
 const total=local.purchase.reduce((sum,r)=>sum+r.qty*r.price+r.shipping+r.fee,0),rate=Number(local.rate);
 const html=notice('所有金額為日圓。未知附加費初始填 0 供你編輯，不代表免收；各列運費按獨立訂單估算，合單請手動調整。')+simpleCard('採購成本',local.purchase.length+' 筆・預估 '+money(total),rate?'以自填匯率估算 NT$'+Math.round(total*rate).toLocaleString():'尚未設定日圓兌台幣匯率',btn('csv','purchase','匯出 CSV'),'<label class="task-inline">自填匯率：1 JPY = TWD<input id="purchase-rate" type="number" min="0" step="0.0001" value="'+txt(local.rate)+'" placeholder="請輸入"></label>')+local.purchase.map(r=>{const p=S.products.find(p=>p.id===r.product);return '<article class="task-card"><h2>'+txt(p.name_zh)+'</h2><p>'+txt(p.manufacturer_sku||'未公開品番')+' · '+txt(p.variant)+' · '+(r.purpose==='commercial'?'商業採購':'個人收藏')+'</p>'+notice(p.commercial_purchase.note)+'<div class="task-filter-grid"><label>報價通路<select data-purchase-field="offer" data-row="'+r.id+'"><option value="">自行填價</option>'+S.offers.filter(o=>o.product_id===p.id).map(o=>'<option value="'+o.id+'"'+(r.offer===o.id?' selected':'')+'>'+txt(o.retailer)+'</option>').join('')+'</select></label>'+[['qty','數量',r.qty],['price','每件價格（依通路稅況）',r.price],['shipping','此列運費',r.shipping],['fee','手續／稅費',r.fee]].map(([k,l,v])=>'<label>'+l+'<input data-purchase-field="'+k+'" data-row="'+r.id+'" type="number" min="'+(k==='qty'?1:0)+'" step="1" value="'+v+'"></label>').join('')+'<label>採購狀態<select data-purchase-field="status" data-row="'+r.id+'">'+['待核價','計畫中','已買到','已交付','取消'].map(v=>'<option'+(r.status===v?' selected':'')+'>'+v+'</option>').join('')+'</select></label></div><p class="price">小計 '+money(r.qty*r.price+r.shipping+r.fee)+'</p><div class="detail-actions">'+btn('product',p.id,'核對商品來源')+btn('purchase-remove',r.id,'刪除此列')+'</div></article>';}).join('');
 return {count:local.purchase.length,html};
}
function tracking(){
 const tracked=S.products.filter(p=>local.watch.includes(p.id));
 return {count:tracked.length,html:notice('本機關注清單；資料基準 2026-11-20。尚無自動抓價、補貨偵測或背景推播；請開官方頁手動核對。')+tracked.map(p=>productCard(p)+section('追蹤項目',list(S.tracking_watchlist.filter(w=>w.product_ids?.includes(p.id)).flatMap(w=>w.tracked_fields))+sources([...new Set([...p.source_ids,...S.offers.filter(o=>o.product_id===p.id).flatMap(o=>o.source_ids||[o.source_id])])]))).join('')+section('近期時間窗',S.tracking_watchlist.map(w=>simpleCard(w.id.replace('watch-',''),w.baseline_observed_at,'下次核對：'+w.next_check_triggers.join('；'),sources(w.sources.map(s=>s.source_id)))).join(''))};
}
function addTrip(id){
 const p=C.placesById.get(id);if(!p)return;
 local.trip.push({id:crypto.randomUUID(),place:p.id,date:api.state.day||'',time:'',minutes:p.experience?.minutes_from||60,status:'計畫中'});save();api.notify('已加入每日行程；在「行程」設定時間');
}
function trip(){
 const groups=new Map();for(const row of local.trip){if(!api.state.day||!row.date||row.date===api.state.day){if(!groups.has(row.date))groups.set(row.date,[]);groups.get(row.date).push(row);}}
 let html=notice('從地點詳情加入每日行程，可調整日期、時間與順序。時長為可修改的規劃值；交通班次與末班車請在 Google Maps／營運方確認。');
 for(const [day,rows] of [...groups].sort(([a],[b])=>a.localeCompare(b))){
  let end=-1,previous=null;html+=section(day||'尚未指定日期',rows.map((r,i)=>{const p=C.placesById.get(r.place);if(!p)return '';const n=r.time?r.time.split(':').reduce((a,v)=>a*60+Number(v),0):null;const overlap=n!==null&&n<end;if(n!==null)end=Math.max(end,n+r.minutes);const from=previous;previous=p;
   return '<article class="task-card trip-stop"><h2><span class="stop-number">'+(i+1)+'</span>'+txt(p.title)+'</h2>'+para(p.pref)+(overlap?notice('時段重疊：開始時間早於前一個已排時段結束。'):'' )+'<div class="task-filter-grid"><label>日期<input type="date" data-trip-field="date" data-row="'+r.id+'" value="'+r.date+'"></label><label>開始時間<input type="time" data-trip-field="time" data-row="'+r.id+'" value="'+r.time+'"></label><label>停留分鐘<input type="number" min="1" max="1440" data-trip-field="minutes" data-row="'+r.id+'" value="'+r.minutes+'"></label><label>狀態<select data-trip-field="status" data-row="'+r.id+'">'+['計畫中','已預約','已完成','取消'].map(v=>'<option'+(r.status===v?' selected':'')+'>'+v+'</option>').join('')+'</select></label></div><div class="detail-actions">'+btn('place',p.id,'詳情與預約')+btn('trip-up',r.id,'上移')+btn('trip-down',r.id,'下移')+btn('trip-remove',r.id,'移除')+(from?link(api.direction(p.query,from.query),'上一站到這裡','btn'):'')+'</div></article>';}).join(''));
 }
 if(!local.trip.length)html+=simpleCard('開始安排第一天','每日清單','先搜尋想去的店或體驗，從詳情加入行程。',btn('nav','explore','探索地點'));
 html+='<div class="detail-actions">'+btn('trip-map','all','在地圖看行程')+btn('csv','trip','匯出行程 CSV')+'</div>';
 return {count:[...groups.values()].reduce((n,rows)=>n+rows.length,0),html};
}
function render(nav){
 if(nav==='shopping'){
  if(mode==='purchase')return purchase();if(mode==='watch')return tracking();
  const products=S.products.filter(p=>purpose!=='commercial'||p.commercial_purchase.allowed!==false);
  return {count:products.length,html:notice('新建商品資料先收錄 4 款，2 款已有同 SKU 兩通路核價。範圍持續補充，非 San-X 全商品資料庫。')+(api.state.pref?notice('商品比價為線上通路，不受城市限縮；購買店入口會套用 '+api.state.pref+'。'):'')+(purpose==='commercial'?notice('串家物語官方禁止轉售及營利目的購買，已排除商業採購。其他通路仍須逐一核對代購與限購條件。'):'')+products.map(productCard).join('')+section('優惠與活動時間',S.promotions.map(p=>simpleCard(p.type,(p.start_date||p.period?.start||'起日未公布')+'–'+(p.end_date||p.period?.end||'期限未公布'),p.eligibility||p.period?.note||'',sources([p.source_id]),p.cash_difference?para('核價日與希望售價差額 '+money(p.cash_difference)+'；會員點數另列，不是限時折扣承諾。'):'')).join(''))};
 }
 if(nav==='anime'){const items=H.anime.filter(p=>scoped(p.pref));return {count:items.length,html:items.map(animeCard).join('')};}
 if(nav==='collections')return collections();
 if(nav==='routes'&&planMode==='mine')return trip();
 return null;
}
function global(q){
 const products=S.products.filter(p=>matched(q,productFields(p))),anime=H.anime.filter(p=>scoped(p.pref)&&matched(q,[p.title,p.japanese,p.work,p.relatedStore.name]));
 return {count:products.length+anime.length,html:(products.length?section('商品・系列與價格',products.map(productCard).join('')):'')+(anime.length?section('作品・踩點',anime.map(animeCard).join('')):'')};
}
function csv(kind){
 let rows=kind==='purchase'?[['商品','品番','JAN','款式','數量','單價JPY','運費JPY','其他費JPY','合計JPY','狀態','用途'],...local.purchase.map(r=>{const p=S.products.find(p=>p.id===r.product);return [p.name_zh,p.manufacturer_sku,p.jan,p.variant,r.qty,r.price,r.shipping,r.fee,r.qty*r.price+r.shipping+r.fee,r.status,r.purpose];})]:[['日期','時間','地點','停留分鐘','狀態'],...local.trip.map(r=>[r.date,r.time,C.placesById.get(r.place)?.title,r.minutes,r.status])];
 const text='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v??'').replace(/^[=+@\-]/,"'$&").replaceAll('"','""')+'"').join(',')).join('\r\n');
 const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));a.href=url;a.download='japan-'+kind+'-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function init(v){
 api=v;
 document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;const d=t.dataset;
  if(d.product){product(d.product);return;}
  if(d.anime){anime(d.anime);return;}
  if(d.task){api.switchNav(d.task);return;}
  if(d.shopMode){mode=d.shopMode;api.refresh();return;}
  if(d.planMode){planMode=d.planMode;api.refresh();return;}
  if(d.purchaseAdd){const p=S.products.find(p=>p.id===d.purchaseAdd);if(purpose==='commercial'&&p.commercial_purchase.allowed===false){api.notify('官方禁止轉售／營利購買，未加入商業採購');return;}const o=S.offers.filter(o=>o.product_id===p.id&&o.comparison_eligible).sort((a,b)=>(a.price.amount+(a.shipping?.domestic_japan_advertised||0))-(b.price.amount+(b.shipping?.domestic_japan_advertised||0)))[0];local.purchase.push({id:crypto.randomUUID(),product:p.id,qty:1,price:o?.price.amount??p.official_msrp.amount,shipping:o?.shipping.domestic_japan_advertised??0,fee:0,status:'待核價',purpose,offer:o?.id||''});save();api.notify('已加入採購清單，請核對費用與限購');return;}
  if(d.purchaseRemove){local.purchase=local.purchase.filter(r=>r.id!==d.purchaseRemove);save();api.refresh();return;}
  if(d.watch){local.watch=local.watch.includes(d.watch)?local.watch.filter(id=>id!==d.watch):[...local.watch,d.watch];save();product(d.watch);return;}
  if(d.tripAdd){addTrip(d.tripAdd);return;}
  if(d.tripRemove||d.tripUp||d.tripDown){let id=d.tripRemove||d.tripUp||d.tripDown,i=local.trip.findIndex(r=>r.id===id);if(d.tripRemove)local.trip.splice(i,1);else{let j=i+(d.tripUp?-1:1);if(j>=0&&j<local.trip.length)[local.trip[i],local.trip[j]]=[local.trip[j],local.trip[i]];}save();api.refresh();return;}
  if(d.tripMap){const items=local.trip.filter(r=>!api.state.day||!r.date||r.date===api.state.day).map(r=>C.placesById.get(r.place)).filter(Boolean);api.showTrip(items);return;}
  if(d.csv){csv(d.csv);return;}
 });
 document.addEventListener('change',e=>{const t=e.target,d=t.dataset;
  if(d.visit!==undefined){local.visits[d.visit]=t.value;save();api.refresh();return;}
  if(t.id==='purchase-purpose'){purpose=t.value;api.refresh();return;}
  if(d.foodFilter){food[d.foodFilter]=t.value;api.refresh();return;}
  if(t.id==='purchase-rate'){local.rate=t.value;save();api.refresh();return;}
  if(d.purchaseField){const r=local.purchase.find(r=>r.id===d.row);if(!r)return;if(d.purchaseField==='offer'){const o=S.offers.find(o=>o.id===t.value&&o.product_id===r.product);r.offer=o?.id||'';if(o){r.price=o.price.amount;r.shipping=o.shipping?.domestic_japan_advertised??0;r.status='待核價';}save();api.refresh();return;}const n=Number(t.value);r[d.purchaseField]=d.purchaseField==='status'?t.value:Math.max(d.purchaseField==='qty'?1:0,Number.isFinite(n)?Math.round(n):0);save();api.refresh();return;}
  if(d.tripField){const r=local.trip.find(r=>r.id===d.row);if(!r)return;r[d.tripField]=d.tripField==='minutes'?Math.max(1,Math.min(1440,Number(t.value)||60)):t.value;save();api.refresh();return;}
 });
}
function eventExtra(e){
 if(e.id==='date-5')return notice('第二彈 2026/11/20 10:00 日本時間起，至12/20。11/19庫存公告屬歷史，不能當作現貨。')+notice('官方禁止轉售、再販售與營利購買；每位自助餐用餐者每品項最多1件，須另付自助餐餐費；結帳時購買、不接受預約保留。')+btn('product','kushiya-wave2-a4file','文件夾價格與官方規則');
 if(e.id==='date-0'||e.id==='date-6')return notice('需依城市及日期核對抽選／一般入場。原宿11/20–22事前預約，11/23起仍可能管制人流。京都、札幌、廣島12/18場次另有申請期。')+btn('anime','anime-haikyu-rilakkuma','各城市日期、入場與21款聯名商品');
 if(e.id==='date-3')return notice('聯名供餐排除 2026/12/27–2027/1/7；一般餐廳營業與聯名供餐為不同條件。');
 return '';
}
const reset=()=>{food={cuisine:'',meal:'',budget:'',stars:''};};
window.ATLAS_TASKS={eventExtra,reset,init,filters,render,global,placeExtra,foodMatches,product,anime,normalizePref,tripItems:()=>local.trip.filter(r=>!api.state.day||!r.date||r.date===api.state.day).map(r=>C.placesById.get(r.place)).filter(Boolean)};
})();
