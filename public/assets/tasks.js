(() => {
'use strict';
const D=window.ATLAS_TASK_DATA,C=window.ATLAS_CATALOG,A=window.ATLAS;
const S=D.shopping,H=D.culture,F=D.dining;
const normalizePref=v=>A.prefs.find(p=>p.name===v||v.replace(/[都道府縣県]$/,'')===p.name)?.name||v;
const canonical=new Map();
for(const h of H.heritage){
 let p=h.existingPoiIds.map(id=>C.placesById.get(id)).find(Boolean);
 if(!p){p={id:h.id,title:h.title,japanese:h.japanese,pref:normalizePref(h.pref),kind:'heritage',coords:h.coords,address:h.address,query:h.japanese+' '+h.address,photo:null,note:'古蹟參訪與指定文化財',href:h.sources[0]?.url};C.places.push(p);}
 p.heritage=h;p.title=h.title;p.japanese=h.japanese;p.address=h.address||p.address;p.hours=h.visit.hours;p.note=h.history.origin||h.history.founded||h.title;p.summary=h.history.originalVsRebuilt||h.history.reconstruction||'';p.aliases=[...(p.aliases||[]),...h.designation.map(x=>x.type+' '+x.name),'古蹟',h.goshuin.status==='verified'?'御朱印':''];p.sources=h.sources.map(s=>[s.title,s.url]);
 C.placesById.set(p.id,p);C.placesById.set(h.id,p);canonical.set(h.id,p.id);
}
const old1899=C.placesById.get('poi-tokyo-2'),main1899=C.placesById.get('1899');
if(old1899&&main1899&&JSON.stringify(old1899.coords)===JSON.stringify(main1899.coords)){
 main1899.aliases=[...(main1899.aliases||[]),old1899.title];C.places=C.places.filter(p=>p.id!==old1899.id);C.placesById.set(old1899.id,main1899);
}
for(const f of F.restaurants){
 const p={id:f.id,title:f.title,japanese:f.japanese,pref:normalizePref(f.pref),kind:'food',coords:f.coords,address:f.address,hours:f.hours,query:f.japanese+' '+f.address,note:f.description,summary:f.cuisine.join('・'),restaurant:f,photo:null,href:f.sources[0],sources:f.sources.map((url,i)=>['餐廳來源 '+(i+1),url]),aliases:f.tags};C.places.push(p);C.placesById.set(p.id,p);
}
for(const x of H.animePlaces||[]){
 if(C.placesById.has(x.id))continue;
 const kind=/store|shop|post/.test(x.kind||'')?'retail':/cafe|restaurant/.test(x.kind||'')?'food':'heritage';
 const p={id:x.id,title:x.title,japanese:x.japanese||x.title,pref:normalizePref(x.pref),coords:x.coords||null,approx:!!x.coords,address:x.address||'',query:x.title+' '+(x.address||x.pref),kind,hours:typeof x.hours==='string'?x.hours:'營業條件見官方來源',note:x.warning||'作品關聯依官方來源；指定日期開放與商品庫存另核',summary:x.warning||'查看作品關聯與官方來源',coordinateSource:x.coordinateSource,href:x.officialSource||x.sourceUrl||x.sources?.[0],sources:[["官方點位來源",x.officialSource||x.sourceUrl||x.coordinateSource?.url]].filter(([,url])=>url),photo:null};
 C.places.push(p);C.placesById.set(p.id,p);
}
for(const p of C.places.filter(p=>p.experience?.id.startsWith('culture-taiko-lab-'))){
 const e=p.experience;e.local_character=e.name.replace('・旅客和太鼓課','')+'的和太鼓節奏與合奏入門。';p.note=e.local_character;
 e.groupPricing=e.id.endsWith('umekita')?null:{1:45000,2:22500,3:15000};
}
const photoAssignments={'heritage-todaiji':'todaiji-daibutsuden','heritage-himeji':'himeji-castle','jorinji-chichibu':'chichibu-jorinji','tenranzan':'hanno-tenranzan','ujibashi':'uji-bridge'};
for(const [id,photo] of Object.entries(photoAssignments)){const p=C.placesById.get(id);if(p)p.photo=photo;}
let api,mode='products',purpose='personal',shoppingDates='trip',food={cuisine:'',meal:'',budget:'',stars:''},planMode='mine';
const storeKey='japan-atlas-tasks-v1';
let local={visits:{},purchase:[],watch:[],trip:[],rate:''};
try{local={...local,...JSON.parse(localStorage.getItem(storeKey)||'{}')};}catch{}
if(!local.identityReviewVersion){if(local.visits['poi-asakusa-0'])local.identityReview='舊版淺草寺／淺草神社曾共用識別，請分別重新核對參訪紀錄。';local.identityReviewVersion=2;}
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
const productFields=p=>[p.series,p.name_zh,p.name_ja,p.manufacturer_sku,p.jan,p.variant,'新品 新商品 商品 價格 比價'];
const release=p=>p.release.display||p.release.manufacturer_window||(p.release.campaign_start?p.release.campaign_start+'–'+p.release.campaign_end:'日期待確認');
function productLocations(p){
 if(p.commercial_purchase.allowed===false)return link('https://www.kushi-ya.com/manpukuparty/rilakkuma2026/','查活動參加店與用餐條件');
 if(p.physical_handling?.venue_ids){const venues=(S.currentVenues||[]).filter(v=>p.physical_handling.venue_ids.includes(v.id)&&scoped(v.region));return venues.length?venues.map(v=>'<article class="menu-card"><h4>'+txt(v.name)+'</h4>'+para('官方已核此具名款的活動分店販售檔期：'+v.sale_from+'–'+v.sale_to)+notice('庫存未知；'+v.free_entry_from+'起一般入場仍可能限流。前三日需預約，不能保證到場即可買。')+btn('pickup-product',p.id+'|'+v.id,'排入此店取貨／採買')+sources(v.source_ids)).join(''):notice('目前城市沒有已核這款販售檔期的分店；請改城市或看完整取扱資料。');}
 const evidence=(S.handling_evidence||[]).find(x=>x.id===p.physical_handling?.evidence_ref);
 if(evidence)return notice('下列是官方公布的系列取扱店，並非這個SKU在每店皆有販售；指定款仍須詢店。')+(evidence.branches||[]).filter(v=>scoped(v.region)).map(v=>'<article class="menu-card"><h4>'+txt(v.name)+'</h4>'+para(v.address)+para(v.phone?('電話 '+v.phone):'')+para(v.warning)+link('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(v.name+' '+(v.address||v.region)),'查這間分店')+'</article>').join('')+sources([evidence.source_id]);
 return notice('尚無指定款實體分店取扱證據；不會任取一般官方店當販售店。可核對上方線上通路，或追蹤官方後續公告。');
}

const productCard=p=>simpleCard(p.name_zh,p.series+' · '+(p.manufacturer_sku||'官方未提供品番'),release(p),btn('product',p.id,'查看商品與比價'),imagesEntry(p.images?.slice(0,1))+'<p class="price">'+(p.official_msrp.type==='official_announced_event_retail_price'?'官方活動價 ':'建議售價 ')+money(p.official_msrp.amount)+' 含稅</p><p class="muted">'+txt(p.variant)+' · 庫存未知 · 查核 '+txt(p.checked_at)+'</p>');
const animeCard=p=>simpleCard(p.title,normalizePref(p.pref)+' · '+(p.readiness?'場景已核・合作買物待補':'官方關聯已核'),p.relation,btn('anime',p.id,'作品、場景與買物'));
const priceLabels={gardenAdult:'庭園成人',gardenSchoolChild:'庭園小中學生',gardenPreschool:'庭園學齡前',buildingsAdditional:'諸堂加票',hattoSeparate:'法堂另票',perAreaAdult:'各區成人',perAreaElementary:'各區小學生',adultGeneral:'一般成人',adultHimejiResident:'姬路市民持證',under18:'未滿18歲依官方年齡規則',castleAndKokoen:'城郭與好古園',ordinaryPrecinct:'一般境內參拜'};
const heritagePrices=v=>typeof v==='string'?para(v):api.facts(Object.entries(v).filter(([k])=>k!=='currency').map(([k,n])=>[priceLabels[k]||({note:'票價說明',payment:'付款方式',effective:'適用日期'}[k]||k),typeof n==='number'?money(n):n]));
const imagesEntry=rows=>rows?.length?'<div class="official-images">'+rows.map((r,i)=>{const page=r.page||r.url,blocked=r.inlinePolicy==='forbidden'||/akindo-sushiro\.co\.jp|osaka-info\.jp\/photo/.test(r.url||'');const image=!blocked&&typeof r.url==='string'&&/^https:\/\//.test(r.url)?'<figure><a href="'+txt(page)+'" target="_blank" rel="noopener noreferrer"><img class="remote-official-image" src="'+txt(r.url)+'" alt="'+txt(r.type||r.note||r.subject||'官方來源圖片')+'" loading="lazy"></a><figcaption>'+txt(r.type||r.note||r.subject||'官方來源圖，非本站實拍')+'</figcaption></figure>':'';return image+link(page,'圖片來源與官方原頁 '+(i+1))+(blocked?notice('此圖片需來源方許可，請至官方原頁觀看。'):'');}).join('')+'</div>':'';
const officialVideos={"tokyo-ryugin-hibiya":[],"tokyo-tempura-kondo-ginza":[],"tokyo-sushi-ryujiro-aoyama":[],"tokyo-sushiro-asakusa-rokku":[],"tokyo-tenya-asakusa":[],"kyoto-kikunoi-honten":[],"kyoto-yudofu-sagano":[],"osaka-ganko-dotonbori":[],"osaka-takohachi-dotonbori":[{"id":"osaka-takohachi-video-f4ebv213uM0","restaurantId":"osaka-takohachi-dotonbori","type":"youtube_embed","title":"【現役道頓堀のたこ焼き店スタッフ直伝】家庭用たこ焼き器で本場の味を再現する方法_タコパで活用したいたこ焼きの焼き方","subject":"餐點製作教學影片；非道頓堀本店到訪/店內影片","officialPublisher":"道頓堀たこ八【たこ焼き・お好み焼き】","sourcePage":"https://www.takohachi.jp/online/takopa/","publisherEvidence":"餐廳官方線上商品頁直接連此影片，oEmbed作者對應官方たこ八頻道","watchURL":"https://www.youtube.com/watch?v=f4ebv213uM0","embedURL":"https://www.youtube-nocookie.com/embed/f4ebv213uM0","oembedURL":"https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Df4ebv213uM0&format=json","oembedHTTPStatus":200,"connectivity":{"checkedAt":"2026-11-21","oembedHTTPStatus":200,"iframeReturned":true,"fullPlaybackTested":false,"downloaded":false},"inlinePolicy":"allowed","termsUrl":"https://support.google.com/youtube/answer/171780?hl=zh-Hant","licenseStatus":"僅限YouTube官方嵌入式播放器，在平台條款/開發人員政策內顯示；不是影片、畫面、縮圖的獨立重製授權","platformTermsUrl":"https://www.youtube.com/static?template=terms","embeddingConditions":["用官方iframe或oEmbed播放器，不自行下載/剪輯/換播放器","保留HTTP Referer；referrerpolicy建議strict-origin-when-cross-origin，no-referrer會導致153錯誤","不自動播放，不遮蔽播放器品牌/控制項","擁有者可關閉嵌入、地區/年齡限制或刪片，正式站仍需測試並提供原片外連","影片是家庭料理教學與品牌介紹，不能冒充本店現場拍攝"],"thumbnail":{"url":"https://i.ytimg.com/vi/f4ebv213uM0/hqdefault.jpg","inlinePolicy":"unknown","termsUrl":"https://www.youtube.com/static?template=terms","note":"由oEmbed回傳，僅作中繼資料；本研究不主張可脫離官方播放器另行熱鏈或重製"},"downloaded":false},{"id":"osaka-takohachi-video-zcQ-3jV2I18","restaurantId":"osaka-takohachi-dotonbori","type":"youtube_embed","title":"【現役道頓堀のスタッフ直伝】家庭用たこ焼き器でプロの明石焼きを再現する方法","subject":"餐點製作教學影片；非道頓堀本店到訪/店內影片","officialPublisher":"道頓堀たこ八【たこ焼き・お好み焼き】","sourcePage":"https://www.takohachi.jp/online/takopa/","publisherEvidence":"餐廳官方線上商品頁直接連此影片，oEmbed作者對應官方たこ八頻道","watchURL":"https://www.youtube.com/watch?v=zcQ-3jV2I18","embedURL":"https://www.youtube-nocookie.com/embed/zcQ-3jV2I18","oembedURL":"https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DzcQ-3jV2I18&format=json","oembedHTTPStatus":200,"connectivity":{"checkedAt":"2026-11-21","oembedHTTPStatus":200,"iframeReturned":true,"fullPlaybackTested":false,"downloaded":false},"inlinePolicy":"allowed","termsUrl":"https://support.google.com/youtube/answer/171780?hl=zh-Hant","licenseStatus":"僅限YouTube官方嵌入式播放器，在平台條款/開發人員政策內顯示；不是影片、畫面、縮圖的獨立重製授權","platformTermsUrl":"https://www.youtube.com/static?template=terms","embeddingConditions":["用官方iframe或oEmbed播放器，不自行下載/剪輯/換播放器","保留HTTP Referer；referrerpolicy建議strict-origin-when-cross-origin，no-referrer會導致153錯誤","不自動播放，不遮蔽播放器品牌/控制項","擁有者可關閉嵌入、地區/年齡限制或刪片，正式站仍需測試並提供原片外連","影片是家庭料理教學與品牌介紹，不能冒充本店現場拍攝"],"thumbnail":{"url":"https://i.ytimg.com/vi/zcQ-3jV2I18/hqdefault.jpg","inlinePolicy":"unknown","termsUrl":"https://www.youtube.com/static?template=terms","note":"由oEmbed回傳，僅作中繼資料；本研究不主張可脫離官方播放器另行熱鏈或重製"},"downloaded":false},{"id":"osaka-takohachi-video-V_4PvhI5jFs","restaurantId":"osaka-takohachi-dotonbori","type":"youtube_embed","title":"【現役道頓堀のスタッフ直伝】家庭用ホットプレートでプロの焼きそばを再現する方法","subject":"餐點製作教學影片；非道頓堀本店到訪/店內影片","officialPublisher":"道頓堀たこ八【たこ焼き・お好み焼き】","sourcePage":"https://www.takohachi.jp/online/takopa/","publisherEvidence":"餐廳官方線上商品頁直接連此影片，oEmbed作者對應官方たこ八頻道","watchURL":"https://www.youtube.com/watch?v=V_4PvhI5jFs","embedURL":"https://www.youtube-nocookie.com/embed/V_4PvhI5jFs","oembedURL":"https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DV_4PvhI5jFs&format=json","oembedHTTPStatus":200,"connectivity":{"checkedAt":"2026-11-21","oembedHTTPStatus":200,"iframeReturned":true,"fullPlaybackTested":false,"downloaded":false},"inlinePolicy":"allowed","termsUrl":"https://support.google.com/youtube/answer/171780?hl=zh-Hant","licenseStatus":"僅限YouTube官方嵌入式播放器，在平台條款/開發人員政策內顯示；不是影片、畫面、縮圖的獨立重製授權","platformTermsUrl":"https://www.youtube.com/static?template=terms","embeddingConditions":["用官方iframe或oEmbed播放器，不自行下載/剪輯/換播放器","保留HTTP Referer；referrerpolicy建議strict-origin-when-cross-origin，no-referrer會導致153錯誤","不自動播放，不遮蔽播放器品牌/控制項","擁有者可關閉嵌入、地區/年齡限制或刪片，正式站仍需測試並提供原片外連","影片是家庭料理教學與品牌介紹，不能冒充本店現場拍攝"],"thumbnail":{"url":"https://i.ytimg.com/vi/V_4PvhI5jFs/hqdefault.jpg","inlinePolicy":"unknown","termsUrl":"https://www.youtube.com/static?template=terms","note":"由oEmbed回傳，僅作中繼資料；本研究不主張可脫離官方播放器另行熱鏈或重製"},"downloaded":false},{"id":"osaka-takohachi-video-wkXAiE5IwrM","restaurantId":"osaka-takohachi-dotonbori","type":"youtube_embed","title":"【炎たこⅡ】超人気店「たこ八」副社長が教える！プロのたこ焼き🐙","subject":"餐點製作教學影片；非道頓堀本店到訪/店內影片","officialPublisher":"イワタニまるっとch【公式】","sourcePage":"https://www.takohachi.jp/blog/1421/","publisherEvidence":"餐廳官方公告介紹岩谷官方頻道合作影片；影片發布者為岩谷，非餐廳頻道","watchURL":"https://www.youtube.com/watch?v=wkXAiE5IwrM","embedURL":"https://www.youtube-nocookie.com/embed/wkXAiE5IwrM","oembedURL":"https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DwkXAiE5IwrM&format=json","oembedHTTPStatus":200,"connectivity":{"checkedAt":"2026-11-21","oembedHTTPStatus":200,"iframeReturned":true,"fullPlaybackTested":false,"downloaded":false},"inlinePolicy":"allowed","termsUrl":"https://support.google.com/youtube/answer/171780?hl=zh-Hant","licenseStatus":"僅限YouTube官方嵌入式播放器，在平台條款/開發人員政策內顯示；不是影片、畫面、縮圖的獨立重製授權","platformTermsUrl":"https://www.youtube.com/static?template=terms","embeddingConditions":["用官方iframe或oEmbed播放器，不自行下載/剪輯/換播放器","保留HTTP Referer；referrerpolicy建議strict-origin-when-cross-origin，no-referrer會導致153錯誤","不自動播放，不遮蔽播放器品牌/控制項","擁有者可關閉嵌入、地區/年齡限制或刪片，正式站仍需測試並提供原片外連","影片是家庭料理教學與品牌介紹，不能冒充本店現場拍攝"],"thumbnail":{"url":"https://i.ytimg.com/vi/wkXAiE5IwrM/hqdefault.jpg","inlinePolicy":"unknown","termsUrl":"https://www.youtube.com/static?template=terms","note":"由oEmbed回傳，僅作中繼資料；本研究不主張可脫離官方播放器另行熱鏈或重製"},"downloaded":false}],"niigata-suzakaya-ekimae":[],"niigata-nagaokakojimaya-tonomachi":[],"niigata-benkei-pierbandai":[],"saitama-kawagoe-ichinoya":[],"saitama-kura-lumine-omiya":[],"hokkaido-ohiso-honten":[],"hokkaido-jingisukanclub-nijo":[],"hokkaido-otaru-masazushi-honten":[]};
function diningVideos(id){return (officialVideos[id]||[]).map(v=>'<figure class="official-video"><iframe title="'+txt(v.title)+'" src="'+txt(v.embedURL)+'" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe><figcaption>'+txt(v.subject)+'・'+txt(v.officialPublisher)+'</figcaption>'+link(v.watchURL,'在YouTube觀看原片')+link(v.sourcePage,'餐廳官方介紹')+'</figure>').join('');}


function productDateFit(p){
 const from=api.state.day||api.state.tripStart,to=api.state.day||api.state.tripEnd;if(!from||!to)return true;
 const w=p.tripWindow||(p.release.campaign_start?{start:p.release.campaign_start,end:p.release.campaign_end}:null);
 if(w){if(w.start>to||w.end&&w.end<from)return false;if(p.physical_handling?.venue_ids&&api.state.pref)return (S.currentVenues||[]).some(v=>p.physical_handling.venue_ids.includes(v.id)&&v.region===api.state.pref);return true;}
 const date=p.release.authoritative_date||p.release.date;if(date)return date<=to;
 return false;
}
function deliveryText(o){
 const receipt=window.ATLAS_PLANNER.profile().receipt;
 if(o.physical_venue_id)return '指定活動門市現場購買；入場資格／庫存另核';
 if(o.retailer==='あみあみ'&&['hotel','taiwan'].includes(receipt))return '不符合所選收貨：日本站不寄海外，通常不收旅館地址';
 if(o.retailer==='あみあみ')return '需核日本地址、下單及付款資格；台灣短期旅客不可直接假定可買';
 return '店取／旅館／海外收件及付款資格尚未逐SKU確認';
}
function promotionCards(){
 const from=api.state.day||api.state.tripStart,to=api.state.day||api.state.tripEnd,today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo'}).format(new Date());
 return S.promotions.map(p=>{const begin=p.start_date||'',end=p.end_date||'',overlap=(!from||!end||from<=end)&&(!to||!begin||begin<=to),japanOnly=/日本國內居住者/.test(p.eligibility||''),status=p.cash_difference!=null?'價格觀察，非折扣活動':end&&end<today?'已截止':!overlap?'不在本趟日期':japanOnly?'日本居民限定，不適用一般台灣短期旅客':p.status?.includes('partial')?'資格與券面尚待核對':'條件式適用／剩餘名額或贈品另核';return simpleCard(p.type,status+'・'+(begin||'起日未公布')+'–'+(end||'期限／送完條件見原頁'),p.eligibility||p.period?.note||'',sources([p.source_id]),p.cash_difference?para('標價與希望售價差額 '+money(p.cash_difference)+'，不是有期限保證的促銷折扣。'):'');}).join('');
}
function filters(nav){
 if(nav==='shopping')return '<div class="task-tabs" role="group" aria-label="買物任務">'+[['products','商品與比價'],['latest','官方更新'],['purchase','採購清單'],['watch','追蹤來源']].map(([v,l])=>btn('shop-mode',v,l,mode===v?'btn primary':'btn')).join('')+'</div><label class="task-inline">購買用途<select id="purchase-purpose"><option value="personal"'+(purpose==='personal'?' selected':'')+'>個人收藏</option><option value="commercial"'+(purpose==='commercial'?' selected':'')+'>商業採購</option></select></label>';
 if(nav==='food')return notice('預算按同一份適用餐期菜單與已列必要費用計算；未明費用另標，不能視為最終結帳價。每盤價不當作整餐費。')+'<div class="task-filter-grid">'+[['cuisine','菜系',[['','全部'],['壽司','壽司'],['天','天婦羅／天丼'],['日本料理','日本料理']]],['meal','用餐時段',[['','全部'],['午餐','午餐'],['晚餐','晚餐']]],['budget','每人套餐／主餐上限',[['','不限'],['2000','¥2,000 以下'],['20000','¥20,000 以下'],['50000','¥50,000 以下']]],['stars','米其林',[['','全部'],['1','2026 一星'],['2','2026 二星'],['3','2026 三星']]]].map(([k,l,options])=>'<label>'+l+'<select data-food-filter="'+k+'">'+options.map(([v,n])=>'<option value="'+v+'"'+(food[k]===v?' selected':'')+'>'+n+'</option>').join('')+'</select></label>').join('')+'</div>';
 if(nav==='routes')return '<div class="task-tabs">'+btn('plan-mode','mine','我的每日行程',planMode==='mine'?'btn primary':'btn')+btn('plan-mode','templates','主題路線範本',planMode==='templates'?'btn primary':'btn')+btn('plan-mode','styles','旅行玩法',planMode==='styles'?'btn primary':'btn')+'</div>';
 return '';
}
function product(id){
 const p=S.products.find(p=>p.id===id);if(!p)return;
 const offers=S.offers.filter(o=>o.product_id===id),comparison=S.comparisons.find(c=>c.product_id===id);
 const blocked=p.commercial_purchase.allowed===false;
 const rows=offers.map(o=>'<tr><th>'+txt(o.retailer)+'</th><td>'+money(o.price.amount)+(o.price.tax_included?' 含稅':' 稅待核')+'</td><td>'+money(o.shipping?.domestic_japan_advertised)+'</td><td>'+txt(o.stock_status)+'</td><td>'+link(o.product_url,'查零售原頁')+'</td></tr>').join('');
 const comparable=offers.filter(o=>o.comparison_eligible&&o.price.tax_included===true),low=comparable.slice().sort((a,b)=>a.price.amount-b.price.amount)[0],delivered=comparable.filter(o=>typeof o.shipping?.domestic_japan_advertised==='number').sort((a,b)=>a.price.amount+a.shipping.domestic_japan_advertised-b.price.amount-b.shipping.domestic_japan_advertised)[0];
 const best=comparable.length>1?notice('同款已查單價最低：'+low.retailer+' '+money(low.price.amount)+'；'+(delivered?'日本境內單件已列含運最低：'+delivered.retailer+' '+money(delivered.price.amount+delivered.shipping.domestic_japan_advertised):'此組為現場公開價，沒有可比較的日本宅配總額')+'。'+(comparison?.conditions||'條件、入場、附加費、庫存及可下單狀態均須在來源核對。')+' 所選旅客收貨方式不會自動變成可行，限制如下。'):notice('不足獨立、同款可比報價；官方售價或單一標價不能當全網最低。');

 const actions=btn('purchase-add',id,blocked&&purpose==='commercial'?'禁止商業採購':'加入'+(purpose==='commercial'?'商業':'個人')+'清單')+btn('watch',id,local.watch.includes(id)?'取消本機追蹤':'追蹤這個商品');
 api.openPanel('product',id,'商品・來源比價','<h2>'+txt(p.name_zh)+'</h2><p lang="ja">'+txt(p.name_ja)+'</p>'+notice(p.commercial_purchase.note)+(blocked?notice(p.limit_note):'')+api.facts([['系列',p.series],['款式',p.variant],['商品編號',p.manufacturer_sku||'未公開'],['JAN',p.jan||'未公開'],['規格單位',p.unit],['發售',release(p)],['限購',p.limit_note||'待核通路規則'],['核價日',p.checked_at]])+section('同款價格與成本條件',best+'<div class="table-scroll"><table><caption>'+txt(p.manufacturer_sku?'同 SKU、同款、新品報價；點數另列':'同名稱、角色與制服款式；官方未公開品番，不與相似款混比')+'</caption><thead><tr><th>通路</th><th>商品單價</th><th>日本境內運費</th><th>庫存</th><th>來源</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+offers.map(o=>para(o.retailer+'：'+(o.advertised_status||'可購狀態待確認')+'；'+(o.points?.note||'會員、付款手續費與優惠條件請查原頁')+'；限購：'+(o.purchase_limit||'未知')+'；'+((o.shipping?.notes||o.shipping?.note||'境外轉寄費用另計')+'；'+deliveryText(o)+'；核價 '+o.checked_at))).join(''))+'<div class="detail-actions">'+actions+'</div>'+section('官方商品圖片',imagesEntry(p.images))+section('已核取扱與購買地點',productLocations(p))+section('核對來源',sources([...new Set([...p.source_ids,...S.offers.filter(o=>o.product_id===p.id).flatMap(o=>o.source_ids||[o.source_id])])])));
}
function anime(id){
 const a=H.anime.find(x=>x.id===id);if(!a)return;
 const s=a.relatedStore;
 const related=C.places.filter(p=>normalizePref(a.pref)===p.pref&&p.tags?.includes('bear')).slice(0,4);
 api.openPanel('anime',id,'作品關聯與路線','<h2>'+txt(a.title)+'</h2>'+para(a.relation)+api.facts([['作品',a.work.join('・')],['期間',a.window.start?a.window.start+'–'+a.window.end:a.window.label],['入場',a.entry.conditions],['費用',a.entry.fee??'未核實']])+section('踩點順序',list(a.route)+(a.placeIds?'<div class="detail-actions">'+a.placeIds.map(id=>C.placesById.get(id)).filter(Boolean).map(p=>btn('place',p.id,p.title)).join('')+btn('anime-plan',a.id,'把實際點位加入選定日'):''))+section('買物與休憩',para(s.name)+para(s.goods||s.note||s.nearbySuggestion)+para(s.address)+para(s.hours)+para(s.access)+link(s.source||s.officialLocationLink,'店家／場地官方資訊','btn'))+(a.products?section('聯名商品',a.products.map(p=>para(p.title+'・'+p.variants+'款・價格及庫存待確認')+link(p.photoEntry,'官方商品照片','btn')).join('')):'')+(a.relatedWindows?section('其他城市檔期',a.relatedWindows.map(w=>para(normalizePref(w.pref)+' '+w.store+' '+w.start+'–'+w.end+' '+w.condition)).join('')):'')+section('附近既有拉拉熊點',related.map(p=>btn('place',p.id,p.title)).join(''))+section('官方地圖與來源',a.sources.map(s=>link(s.url,s.title,'btn')).join('')+link(a.officialMap?.pdf,'西武官方舞台探訪圖 PDF','btn')+link(a.officialImageEntry,'官方實景照片入口','btn')));
}
function menuCost(m){
 let total=m.estimatedTableTotalJPY??m.estimatedFoodTotalJPY??m.priceJPY;if(total==null)return null;
 if(m.platformFee?.amountJPY!=null)total+=m.platformFee.amountJPY;
 else if(String(m.source||'').includes('omakase.in')&&/390/.test(m.serviceStatus||''))total+=390;
 return Math.round(total);
}
function menuMatches(m,withBudget=true,restaurant=null){
 if(food.meal&&!m.meal?.includes(food.meal))return false;
 if(withBudget&&food.budget){if(menuCost(m)==null||menuCost(m)>Number(food.budget)||/盤/.test(m.priceBasis||''))return false;}
 if(restaurant){const days=api.state.day?[api.state.day]:window.ATLAS_PLANNER.days(api.state.tripStart,api.state.tripEnd);if(days.length&&!days.some(day=>window.ATLAS_PLANNER.restaurantStatus(restaurant,m,day,food.meal).allowed))return false;}
 return true;
}
function foodMatches(p){
 if(p.kind!=='food')return false;const r=p.restaurant;
 if(food.cuisine&&!matched(food.cuisine,r?.cuisine||[p.title,p.note]))return false;
 if(food.stars&&Number(food.stars)!==r?.michelin?.stars)return false;
 if((food.meal||food.budget)&&!r?.menu.some(m=>menuMatches(m,true,r)))return false;
 return true;
}
function foodCaption(p){
 const r=p.restaurant;if(!r)return p.summary||p.note;
 const menus=r.menu.filter(m=>(api.state.q||menuMatches(m,true,r))&&m.priceJPY!=null&&!/限量/.test(m.priceBasis||''));
 const n=menus.length?Math.min(...menus.map(menuCost)):null;
 const unit=menus.length&&menus.every(m=>/盤/.test(m.priceBasis||''))?'常態每盤（整餐待估）':menus.length&&menus.every(m=>/每碗/.test(m.priceBasis||''))?'一份主餐':'每人套餐（已列費用）';
 return r.cuisine.join('・')+' · '+(r.michelin.stars?'2026 米其林 '+r.michelin.stars+' 星 · ':'')+(!api.state.q&&food.meal?food.meal+' · ':'')+unit+' '+money(n)+' 起';
}

function placeExtra(p){
 const status=local.visits[p.id]||'';
 let html='<div class="visit-tools"><label>參訪紀錄<select data-visit="'+txt(p.id)+'">'+[['','未標記'],['want','想去'],['visited','已參訪'],['done','已完成體驗']].map(([v,l])=>'<option value="'+v+'"'+(status===v?' selected':'')+'>'+l+'</option>').join('')+'</select></label>'+btn('trip-add',p.id,'加入每日行程')+'</div>';
 if(p.experience?.groupPricing){const n=api.state.party,cost=p.experience.groupPricing[Math.min(n,3)];html+=notice(n+' 人參與：每人 '+money(cost)+'，整組 '+money(cost*n)+'。含稅／附加服務依預約頁，這是目前所列人數級距，非空席保證。');}
 const h=p.heritage;
 if(h){html+=section('歷史與現有建築',para([h.history.founded,h.history.origin].filter(Boolean).join('；'))+para(h.history.originalVsRebuilt))+section('指定對象',h.designation.map(d=>para(d.name+'｜'+d.type+'｜'+d.object)).join(''))+section('參觀重點',list(h.highlights))+section('分區門票與參訪安排',api.facts([['開放',h.visit.hours],['票價','各票區如下'],['路線時間',h.visit.route?.duration]])+heritagePrices(h.visit.price)+(h.visit.areas?list(h.visit.areas.map(a=>a.name+'・'+(a.ticket||'')+' '+(a.condition||''))):'')+list(h.visit.access||[]))+section('御朱印與現場規則',para(h.goshuin.note||h.goshuin.conditions)+api.facts([['御朱印費',h.goshuin.priceJPY==null?'待確認':money(h.goshuin.priceJPY)],['受理處',h.goshuin.counter]])+(h.goshuin.counters?list(h.goshuin.counters.map(c=>c.name+'・'+c.hours)):'')+list(h.goshuin.notices||[])+para(h.visit.photography?.note))+link(h.officialImageEntry,'寺院／城郭官方實景','btn');}
 const r=p.restaurant;
 if(r){html+=window.ATLAS_PLANNER.diningPicker(p)+section('料理與評鑑',api.facts([['菜系',r.cuisine.join('・')],['米其林',r.michelin.stars?r.michelin.year+' 年 '+r.michelin.stars+' 星':'本批不主張星級'],['星級查核',r.michelin.checkedAt]])+link(r.michelin.source,'Michelin 官方店頁','btn'))+section('菜單與總價條件',r.menu.map(m=>'<article class="menu-card"><h4>'+txt(m.name)+'</h4><p class="price">'+money(m.priceJPY)+' · '+txt(m.meal)+'</p>'+para([m.priceBasis,m.taxStatus,m.serviceStatus].filter(Boolean).join('；'))+(m.estimatedTableTotalJPY?para('一般桌含服務費估算 '+money(m.estimatedTableTotalJPY)):'')+link(m.source,'菜單原頁')+'</article>').join(''))+section('預約與取消',api.facts([['預約渠道',r.booking.channel],['開放預約',r.booking.releaseWindow],['取消規則',r.booking.cancellation],['入店條件',r.booking.conditions],['當日空席',r.booking.liveAvailability]])+link(r.booking.url,'查看官方／授權預約','btn primary'))+section('交通',para(r.access.detail))+section('餐點照片與官方影片',imagesEntry(r.images)+diningVideos(r.id))+section('仍需確認',list(r.remaining||[]));}
 return html+(p.experience?'':window.ATLAS_PLANNER.sessionPicker(p));
}
function collections(){
 const groups=H.collections.map(g=>{const items=g.itemIds.map(id=>C.placesById.get(canonical.get(id)||id)||H.anime.find(a=>a.id===id)).filter(Boolean);const visited=items.filter(p=>['visited','done'].includes(local.visits[p.id])).length;return simpleCard(g.title,visited+' / '+items.length+' 已參訪',g.scope,'','<progress value="'+visited+'" max="'+Math.max(1,items.length)+'"></progress>'+items.map(p=>'<div class="collection-row">'+btn(p.work?'anime':'place',p.id,p.title)+'<label><select data-visit="'+txt(p.id)+'">'+[['','未標記'],['want','想去'],['visited','已參訪'],['done','已完成']].map(([v,l])=>'<option value="'+v+'"'+(local.visits[p.id]===v?' selected':'')+'>'+l+'</option>').join('')+'</select></label><span>'+txt({want:'想去',visited:'已參訪',done:'已完成'}[local.visits[p.id]]||'未標記')+'</span></div>').join('')+(items.length<g.total?notice('原清單 '+g.total+' 項；目前可對接 '+items.length+' 項，其餘待補。'):''));}).join('');
 const visited=C.places.filter(p=>local.visits[p.id]);
 return {count:H.collections.length,html:notice('全國主題收集：此頁不套用目前城市，進度只計已收錄的有限清單，不代表全日本完整覆蓋。')+(local.identityReview?notice(local.identityReview):'')+groups+section('我的參訪紀錄',visited.map(p=>simpleCard(p.title,{want:'想去',visited:'已參訪',done:'已完成體驗'}[local.visits[p.id]],p.pref,btn('place',p.id,'查看與修改'))).join(''))};
}
const purchaseTotal=r=>r.status==='取消'?0:r.qty*r.price+r.shipping+r.fee;
const purchaseInTrip=r=>!api.state.tripStart||!api.state.tripEnd||r.purchaseDate&&r.purchaseDate>=api.state.tripStart&&r.purchaseDate<=api.state.tripEnd;
const quoteRef=r=>r.quoteSnapshot||{retailer:S.offers.find(o=>o.id===r.offer)?.retailer||'自行填價',sourceURL:S.offers.find(o=>o.id===r.offer)?.product_url||'',checkedAt:'舊紀錄未保存當時核價時間',unitPrice:null,taxIncluded:null};
const snapshot=o=>o?{offerId:o.id,retailer:o.retailer,sourceURL:o.product_url,checkedAt:o.checked_at,unitPrice:o.price.amount,taxIncluded:o.price.tax_included,shipping:o.shipping?.domestic_japan_advertised}:null;
function purchaseIssues(r,p){
 const issues=[];
 if(!r.feesConfirmed)issues.push('稅費／配送附加費仍未核實，0元欄位不等於免費');
 if(p.limit_per_person&&Math.ceil(r.qty/(r.buyers||1))>p.limit_per_person)issues.push('每位數量超過已核限制；不得繞限購。多人仍須逐人逐會計符合規則，分單不自動合併湊贈品。');
 if(p.id==='kushiya-wave2-a4file'&&!r.fee)issues.push('自助餐是必要額外費用，目前未列入此筆；不能把440視為完整參加成本');
 const deadline=window.ATLAS_PLANNER.profile().departureAt?.slice(0,10),release=p.release.authoritative_date||p.release.date;
 if(deadline&&release&&release>deadline)issues.push('公告發售晚於最後取貨／離境日，不能當作本趟可取得');
 if(r.offer){const o=S.offers.find(o=>o.id===r.offer);if(o)issues.push(deliveryText(o));}
 return issues;
}
function purchase(){
 const relevant=local.purchase.filter(r=>r.status!=='取消'&&purchaseInTrip(r)),total=relevant.reduce((sum,r)=>sum+purchaseTotal(r),0),rate=Number(local.rate),outside=local.purchase.filter(r=>r.status!=='取消'&&!purchaseInTrip(r));
 const summary=simpleCard('本趟採購成本',relevant.length+' 筆範圍內・預估 '+money(total),rate?'以自填匯率估算 NT$'+Math.round(total*rate).toLocaleString():'尚未設定日圓兌台幣匯率',btn('csv','purchase','匯出全部採購 CSV'),'<p>'+outside.length+' 筆範圍外／未定採購日保留在下方，未加進本趟合計。</p><label class="task-inline">自填匯率：1 JPY = TWD<input id="purchase-rate" type="number" min="0" step="0.0001" value="'+txt(local.rate)+'" placeholder="請輸入"></label>');
 const html=notice('金額為日圓。未知附加費初始0供編輯，不代表免收；運費按每列獨立訂單估算，合單需核實。日期範圍只影響本趟合計，全部紀錄與來源快照均保留。')+summary+local.purchase.map(r=>{
  const p=S.products.find(p=>p.id===r.product);if(!p)return simpleCard('商品資料待恢復','原紀錄保留',r.product,btn('purchase-remove',r.id,'移除此筆'));
  const ref=quoteRef(r),issues=purchaseIssues(r,p),field=(k,label,type='number')=>'<label>'+label+'<input data-purchase-field="'+k+'" data-row="'+r.id+'" type="'+type+'" value="'+txt(r[k]??'')+'"'+(type==='number'?' min="'+(['qty','buyers'].includes(k)?1:0)+'" step="1"':'')+'></label>';
  return '<article class="task-card"><div class="task-card-meta">'+(r.status==='取消'?'已取消，不計有效合計':purchaseInTrip(r)?'本趟日期範圍內':'範圍外／日期未定')+'</div><h2>'+txt(p.name_zh)+'</h2><p>'+txt(p.manufacturer_sku||'官方未公開品番；非本地ID代替')+'・'+txt(p.variant)+'・'+(r.purpose==='commercial'?'商業採購':'個人收藏')+'</p>'+notice(p.commercial_purchase.note)+'<div class="task-filter-grid"><label>報價通路<select data-purchase-field="offer" data-row="'+r.id+'"><option value="">自行填價</option>'+S.offers.filter(o=>o.product_id===p.id).map(o=>'<option value="'+o.id+'"'+(r.offer===o.id?' selected':'')+'>'+txt(o.retailer)+'</option>').join('')+'</select></label>'+field('purchaseDate','採購／下單日','date')+field('qty','總數量')+field('buyers','實際採買人數（逐人守限購）')+field('price','每件價格（依通路稅況）')+field('shipping','此列運費')+field('fee','其他必付餐費／稅費／手續費')+'<label>狀態<select data-purchase-field="status" data-row="'+r.id+'">'+['待核價','計畫中','已買到','已交付','取消'].map(v=>'<option'+(r.status===v?' selected':'')+'>'+v+'</option>').join('')+'</select></label><label class="check-label"><input type="checkbox" data-purchase-field="feesConfirmed" data-row="'+r.id+'"'+(r.feesConfirmed?' checked':'')+'>已核對稅費與配送附加費</label></div><p class="price">紀錄有效小計 '+money(purchaseTotal(r))+'</p>'+api.facts([['建立時報價通路',ref.retailer],['報價原單價',ref.unitPrice==null?'未保存':money(ref.unitPrice)],['報價查核時間',ref.checkedAt],['自行改價',r.manualPrice?'是；稅況需重新確認':'否']])+issues.map(notice).join('')+'<div class="detail-actions">'+link(ref.sourceURL,'當時核價來源')+btn('product',p.id,'核對目前商品資料')+btn('purchase-remove',r.id,'刪除此列')+'</div></article>';
 }).join('');
 return {count:local.purchase.length,html};
}

function tracking(){
 const tracked=S.products.filter(p=>local.watch.includes(p.id));
 return {count:tracked.length,html:notice('此設備關注清單。官方新聞、門市及場次更新保存於「官方更新」；核價會保留來源與時間。公告或原頁觀察不代表全商品即時庫存；離線更新排程與通知需看該頁實際狀態。')+tracked.map(p=>productCard(p)+section('追蹤項目',list(S.tracking_watchlist.filter(w=>w.product_ids?.includes(p.id)).flatMap(w=>w.tracked_fields))+sources([...new Set([...p.source_ids,...S.offers.filter(o=>o.product_id===p.id).flatMap(o=>o.source_ids||[o.source_id])])]))).join('')+section('近期時間窗',S.tracking_watchlist.map(w=>simpleCard(w.id.replace('watch-',''),w.baseline_observed_at,'下次核對：'+w.next_check_triggers.join('；'),sources(w.sources.map(s=>s.source_id)))).join(''))};
}
function addTrip(id){const p=C.placesById.get(id);if(p)window.ATLAS_PLANNER.addPlace(p);}
function trip(){return window.ATLAS_PLANNER.render();}

function render(nav){
 if(nav==='shopping'){
  if(mode==='latest')return window.ATLAS_LIVE.render();if(mode==='purchase')return purchase();if(mode==='watch')return tracking();
  const products=S.products.filter(p=>(purpose!=='commercial'||p.commercial_purchase.allowed!==false)&&(shoppingDates==='all'||shoppingDates==='trip'&&productDateFit(p)||shoppingDates==='other'&&!productDateFit(p)));
  return {count:products.length,html:notice('收錄44個可辨識商品／款式（含21個具名聯名款）；只有已核同SKU報價才作對應比價，不代表全商品、現貨或可下單。')+(api.state.pref?notice('商品比價為線上通路，不受城市限縮；購買店入口會套用 '+api.state.pref+'。'):'')+(purpose==='commercial'?notice('串家物語官方禁止轉售及營利目的購買，已排除商業採購。其他通路仍須逐一核對代購與限購條件。'):'')+products.map(productCard).join('')+section('優惠、資格與活動時間',promotionCards())};
 }
 if(nav==='anime'){const items=H.anime.filter(p=>scoped(p.pref));return {count:items.length,html:items.map(animeCard).join('')};}
 if(nav==='collections')return collections();
 if(nav==='routes'&&planMode==='mine')return trip();if(nav==='routes'&&planMode==='styles')return window.ATLAS_PLANNER.inspirationView();
 return null;
}
function global(q){
 const products=S.products.filter(p=>matched(q,productFields(p))),anime=H.anime.filter(p=>scoped(p.pref)&&matched(q,[p.title,p.japanese,p.work,p.relatedStore.name,p.relation,'動漫 聖地巡禮 聖地巡礼 舞台探訪']));
 const live=window.ATLAS_LIVE.search(q,api.matches);
 const promotions=S.promotions.filter(p=>matched(q,[p.type,p.eligibility,'優惠 折扣 キャンペーン',p.product_id?productFields(S.products.find(x=>x.id===p.product_id)):[]]));
 return {count:products.length+anime.length+promotions.length+live.count,html:live.html+(products.length?section('商品・系列與價格',products.map(productCard).join('')):'')+(anime.length?section('作品・踩點',anime.map(animeCard).join('')):'')+(promotions.length?section('優惠・抽獎與活動條件',promotions.map(p=>simpleCard(p.type,(p.start_date||'起日未確認')+'–'+(p.end_date||'期限未確認'),p.eligibility||p.period?.note||'',sources([p.source_id])+(p.product_id?btn('product',p.product_id,'核對同款商品'):''))).join('')):'')};
}
function csv(kind){
 let rows=kind==='purchase'?[['商品','品番','JAN','款式','數量','單價JPY','運費JPY','其他費JPY','有效合計JPY','狀態','用途','報價通路','報價來源','核價日期','稅價狀態','附加費核對','採購日','所屬範圍','採買人數','原報價單價'],...local.purchase.map(r=>{const p=S.products.find(p=>p.id===r.product),o=S.offers.find(o=>o.id===r.offer),ref=quoteRef(r);return [p.name_zh,p.manufacturer_sku,p.jan,p.variant,r.qty,r.price,r.shipping,r.fee,purchaseTotal(r),r.status,r.purpose,ref.retailer,ref.sourceURL,ref.checkedAt,r.manualPrice?'自行改價・稅況待核':ref.taxIncluded===true?'含稅':'稅況待確認',r.feesConfirmed?'已手動核對':'未核對，零元欄位不代表免費',r.purchaseDate||'',purchaseInTrip(r)?'本趟範圍內':'範圍外／未定日期',r.buyers||1,ref.unitPrice??''];})]:[['日期','時間','地點','停留分鐘','狀態'],...local.trip.map(r=>[r.date,r.time,C.placesById.get(r.place)?.title,r.minutes,r.status])];
 if(kind==='trip')rows=window.ATLAS_PLANNER.exportCSV();
 const text='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v??'').replace(/^[=+@\-]/,"'$&").replaceAll('"','""')+'"').join(',')).join('\r\n');
 const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));a.href=url;a.download='japan-'+kind+'-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function init(v){
 api=v;document.addEventListener('error',e=>{if(e.target instanceof HTMLImageElement&&e.target.classList.contains('remote-official-image')){e.target.hidden=true;const caption=e.target.closest('figure')?.querySelector('figcaption');if(caption)caption.textContent+='（目前無法載入，請開官方原頁）';}},true);window.ATLAS_PLANNER.init({api,local,save});window.ATLAS_LIVE.init(api);
 document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;const d=t.dataset;
  if(d.product){product(d.product);return;}
  if(d.anime){anime(d.anime);return;}
  if(d.animePlan){const a=H.anime.find(a=>a.id===d.animePlan);if(a){for(const id of a.placeIds||[]){const p=C.placesById.get(id);if(p)window.ATLAS_PLANNER.addRoutePoint(p,a);}}api.notify('已加入實際點位，時間與交通仍待逐站編排');return;}
  if(d.task){api.switchNav(d.task);return;}
  if(d.shopMode){mode=d.shopMode;api.clearSearch();api.refresh();return;}
  if(d.planMode){planMode=d.planMode;api.clearSearch();api.refresh();return;}
  if(d.purchaseAdd){const p=S.products.find(p=>p.id===d.purchaseAdd);if(purpose==='commercial'&&p.commercial_purchase.allowed===false){api.notify('官方禁止轉售／營利購買，未加入商業採購');return;}const o=S.offers.filter(o=>o.product_id===p.id&&o.comparison_eligible).sort((a,b)=>(a.price.amount+(a.shipping?.domestic_japan_advertised||0))-(b.price.amount+(b.shipping?.domestic_japan_advertised||0)))[0];local.purchase.push({id:crypto.randomUUID(),product:p.id,qty:1,price:o?.price.amount??p.official_msrp.amount,shipping:o?.shipping.domestic_japan_advertised??0,fee:0,status:'待核價',purpose,offer:o?.id||'',buyers:1,purchaseDate:api.state.day||api.state.tripStart||'',quoteSnapshot:snapshot(o)});save();api.notify('已加入採購清單，請核對費用與限購');return;}
  if(d.purchaseRemove){local.purchase=local.purchase.filter(r=>r.id!==d.purchaseRemove);save();api.refresh();return;}
  if(d.watch){local.watch=local.watch.includes(d.watch)?local.watch.filter(id=>id!==d.watch):[...local.watch,d.watch];save();product(d.watch);return;}
  if(d.tripAdd){addTrip(d.tripAdd);return;}
  if(d.tripRemove||d.tripUp||d.tripDown){let id=d.tripRemove||d.tripUp||d.tripDown,i=local.trip.findIndex(r=>r.id===id);if(d.tripRemove)local.trip.splice(i,1);else{let j=i+(d.tripUp?-1:1);if(j>=0&&j<local.trip.length)[local.trip[i],local.trip[j]]=[local.trip[j],local.trip[i]];}save();api.refresh();return;}
  if(d.tripMap){api.showTrip(window.ATLAS_PLANNER.mapItems());return;}
  if(d.csv){csv(d.csv);return;}
 });
 document.addEventListener('change',e=>{const t=e.target,d=t.dataset;
  if(d.visit!==undefined){local.visits[d.visit]=t.value;save();api.refresh();return;}
  if(t.id==='shopping-date-scope'){shoppingDates=t.value;api.refresh();return;}
  if(t.id==='purchase-purpose'){purpose=t.value;api.refresh();return;}
  if(d.foodFilter){food[d.foodFilter]=t.value;api.refresh();return;}
  if(t.id==='purchase-rate'){local.rate=t.value;save();api.refresh();return;}
  if(d.purchaseField){const r=local.purchase.find(r=>r.id===d.row);if(!r)return;if(d.purchaseField==='purchaseDate'){r.purchaseDate=t.value;save();api.refresh();return;}if(d.purchaseField==='feesConfirmed'){r.feesConfirmed=t.checked;save();api.refresh();return;}if(d.purchaseField==='offer'){const o=S.offers.find(o=>o.id===t.value&&o.product_id===r.product);r.offer=o?.id||'';r.quoteSnapshot=snapshot(o);r.manualPrice=false;r.feesConfirmed=false;if(o){r.price=o.price.amount;r.shipping=o.shipping?.domestic_japan_advertised??0;r.status='待核價';}save();api.refresh();return;}if(d.purchaseField==='buyers'){r.buyers=Math.min(api.state.party,Math.max(1,Math.round(Number(t.value)||1)));save();api.refresh();return;}if(d.purchaseField==='price'){r.manualPrice=true;r.feesConfirmed=false;}const n=Number(t.value);r[d.purchaseField]=d.purchaseField==='status'?t.value:Math.max(d.purchaseField==='qty'?1:0,Number.isFinite(n)?Math.round(n):0);save();api.refresh();return;}
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
window.ATLAS_TASKS={eventExtra,reset,init,filters,render,global,placeExtra,foodMatches,foodCaption,menuCost,product,anime,normalizePref,tripItems:()=>window.ATLAS_PLANNER.mapItems()};
})();
