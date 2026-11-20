import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
const dir=process.cwd();
const base=process.argv[2]||'http://127.0.0.1:18767/';
const tag=base.includes('127.0.0.1')?'local':'public';
const debug='http://127.0.0.1:18768';
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',[
 '--headless=new','--disable-gpu','--disable-background-networking','--no-first-run','--no-default-browser-check',
 '--remote-debugging-port=18768','--user-data-dir='+join(dir,'atlas-browser-v7'),'about:blank'
],{windowsHide:true,stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function eventually(fn,label,ms=14000){
 const end=Date.now()+ms;
 do {
  try{const v=await fn();if(v)return v;}catch(error){if(Date.now()+100>end)throw error;}
  await sleep(100);
 }while(Date.now()<end);
 throw Error('Timed out: '+label);
}
let ws;
let expectedLinks=new Set();
try{
 const page=await eventually(async()=>{const pages=await (await fetch(debug+'/json/list')).json();return pages.find(t=>t.type==='page');},'Chromium');
 ws=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 let serial=0;
 const pending=new Map(),errors=[];
 ws.addEventListener('message',({data})=>{
  const msg=JSON.parse(data);
  if(msg.id&&pending.has(msg.id)){
   const {resolve,reject}=pending.get(msg.id);pending.delete(msg.id);
   if(msg.error)reject(Error(msg.error.message));else resolve(msg.result);
  }
  if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.exception?.description||msg.params.exceptionDetails.text);
 });
 const c=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));
 });
 await c('Runtime.enable'); await c('Page.enable');
 const downloads=join(dir,'downloads-v7');mkdirSync(downloads,{recursive:true});
 await c('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
 const value=async expression=>{
  const r=await c('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw Error(r.exceptionDetails.exception.description);
  return r.result.value;
 };
 const wait=(expr,label)=>eventually(()=>value(expr),label);
 const expr=(s)=>'document.querySelector('+JSON.stringify(s)+')';
 const elText=(s)=>value(expr(s)+'?.innerText');
 const matching=(sel,substring)=>'[...document.querySelectorAll('+JSON.stringify(sel)+')].find(e=>e.innerText.includes('+JSON.stringify(substring)+'))';
 async function clickExpr(expression){
  const pt=await value('(()=>{const e='+expression+';if(!e||!e.getClientRects().length)return null;e.scrollIntoView({block:"center",inline:"nearest"});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()');
  assert(pt,'Visible element: '+expression);
  await c('Input.dispatchMouseEvent',{type:'mousePressed',...pt,button:'left',clickCount:1});
  await c('Input.dispatchMouseEvent',{type:'mouseReleased',...pt,button:'left',clickCount:1});
 }
 const click=s=>clickExpr(expr(s));
 async function search(q){
  await click('#search');
  await c('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});
  await c('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});
  await c('Input.insertText',{text:q});
  assert.equal(await value('document.querySelector("#search").value'),q);
 }
 const results=()=>value('[...document.querySelectorAll("button.result-content[data-place]")].map(e=>[e.dataset.place,e.querySelector("h2").textContent])');
 const close=()=>click('#close-detail');
 async function img(){
  await click('.detail .cover-photo');
  const loaded=await wait('document.querySelector("#photo-dialog").open && document.querySelector("#photo-content img")?.naturalWidth','enlarged image');
  assert(loaded>=500,'Photo too small');
  assert(await elText('#photo-content .credit'));
  await click('#close-photo');
  assert.equal(await value('document.querySelector("#photo-dialog").open'),false);
 }
 async function snap(width,slot){
  if(tag==='public')return;
  const {data}=await c('Page.captureScreenshot',{format:'png'});
  writeFileSync(join(dir,'atlas-v7-'+width+'-'+slot+'.png'),Buffer.from(data,'base64'));
 }


 const evidence=[];
 const pass=(id,note)=>{evidence.push({id,status:'pass',note});console.log('PASS',id,note);};
 const set=async(sel,v)=>value(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});e.value=${JSON.stringify(v)};e.dispatchEvent(new Event('change',{bubbles:true}));return e.value})()`);
 const details=()=>elText('#detail-content');
 const nav=async n=>{if(await value('!document.querySelector("#detail").hidden'))await close();await click('#nav [data-nav="'+n+'"]');};
 const content=()=>elText('#results');
 await c('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await c('Page.navigate',{url:base});await wait('window.ATLAS_TASKS && document.querySelector("#results h2")','ready');
 await value('localStorage.removeItem("japan-atlas-tasks-v1");localStorage.removeItem("japan-atlas-scope-v1")');
 await c('Page.reload');await wait('document.querySelector("#results h2")','clean ready');
 await sleep(900);await snap(1440,'explore');
 assert((await value('document.querySelectorAll(".cluster-marker").length'))<=10);assert((await elText('#map-summary')).includes('未定位'));pass('C2','national groups and explicit unlocated coverage');
 await search('コリラックマクローゼット');assert((await content()).includes('可可兔'));assert(await value('!!document.querySelector("#results [data-product]")'));pass('F1','series query crosses products and stories');
 await nav('shopping');await click('[data-product="sanx-mz13501"]');let t=await details();for(const x of ['¥3,340','¥3,770','¥630','未知庫存','已查通路最低','日本境內單件含運最低'])assert(t.includes(x),x);pass('F2','two exact SKU taxed offers, shipping, point conditions, stock unknown');
 await click('[data-purchase-add="sanx-mz13501"]');await close();await click('[data-shop-mode="purchase"]');await set('[data-purchase-field="qty"]','2');await set('[data-purchase-field="fee"]','200');assert((await content()).includes('¥7,740'));
 await value('window.qaCsv="";window.qaCreate=URL.createObjectURL;URL.createObjectURL=b=>{if(b.type.includes("csv"))b.text().then(t=>window.qaCsv=t);return window.qaCreate(b)}');
 await click('[data-csv="purchase"]');await wait('window.qaCsv.includes("MZ13501")','CSV');assert((await value('window.qaCsv')).includes('7740'));await set('[data-purchase-field="status"]','取消');assert((await content()).includes('預估 ¥0'));await click('[data-csv="purchase"]');await wait('window.qaCsv.includes("取消")','cancelled CSV');assert.equal((await value('window.qaCsv')).trim().split('\n')[1].split(',')[8],'"0"');await set('[data-purchase-field="status"]','計畫中');assert((await content()).includes('¥7,740'));pass('D1','quantity fee CSV and cancellation effective totals');
 await click('[data-shop-mode="products"]');await set('#purchase-purpose','commercial');assert.equal(await elText('#count'),'3 筆');assert(!(await content()).includes('串家物語聯名A4'));
 await search('串家');await click('#results [data-product="kushiya-wave2-a4file"]');t=await details();assert(t.includes('禁止轉售'));assert(t.includes('自助餐'));let before=await value('JSON.parse(localStorage.getItem("japan-atlas-tasks-v1")).purchase.length');await click('[data-purchase-add="kushiya-wave2-a4file"]');assert.equal(before,await value('JSON.parse(localStorage.getItem("japan-atlas-tasks-v1")).purchase.length'));pass('D2','commercial forbidden product excluded and add prevented');
 await nav('explore');await search('秋葉原');let rows=await results();let taiko=rows.filter(([id])=>id.startsWith('culture-taiko-lab-'));assert.equal(taiko.length,1);assert.equal(taiko[0][0],'culture-taiko-lab-akihabara');pass('A1','Akihabara does not return Kyoto Osaka Kobe branches');
 await search('排球');await click('#results [data-anime="anime-haikyu-rilakkuma"]');t=await details();for(const x of ['11/23','21款','12/18','11/30'])assert(t.includes(x),x);pass('A2','work links current popup, admission, variants and city phases');
 await close();await search('國寶');assert((await content()).includes('東大寺'));await click('#results [data-place="regional-nara"]');t=await details();assert(t.includes('1709'));assert(t.includes('四月堂'));assert(t.includes('¥300'));pass('H1','object designation, reconstructed building and goshuin suspension');
 await close();await search('天龍寺');await click('#results [data-place="poi-arashiyama-1"]');t=await details();for(const x of ['1899','庭園成人','¥500','法堂'])assert(t.includes(x),x);assert(!t.includes('gardenAdult'));await set('[data-visit="poi-arashiyama-1"]','visited');pass('H2','history, separate ticket areas and readable price labels');
 await close();await search('');await click('[data-task="collections"]');assert((await content()).includes('1 / 4'));assert((await content()).includes('0 / 2'));await snap(1440,'collections');
 await c('Page.reload');await wait('document.querySelector("#results h2")','reloaded');await click('[data-task="collections"]');assert((await content()).includes('1 / 4'));pass('C1','finite collection progress survives reload');
 await nav('explore');await click('[data-nav="experiences"]');await set('#experience-theme','music');await set('#experience-booking','required');assert((await content()).includes('TAIKO'));await search('青山');await click('#results [data-place="culture-taiko-lab-aoyama"]');t=await details();assert(t.includes('日本在地、媒體與日文來源'));assert(t.includes('台灣作者、機構與繁中來源'));await click('[data-review-filter="tw"]');assert(await value('document.querySelector("[data-review-group=jp]").hidden'));await click('[data-review-filter="all"]');pass('E1','culture filters and separate visitor source groups preserved');
 await set('#party','1');assert((await details()).includes('每人 ¥45,000'));await set('#party','2');assert((await details()).includes('每人 ¥22,500'));await set('#party','3');assert((await details()).includes('每人 ¥15,000'));pass('E2','1 2 3 participants change actual price');
 await nav('calendar');await set('#day','2026-12-30');await search('');assert(!(await content()).includes('1899'));await set('#day','2026-12-20');assert((await content()).includes('1899'));pass('R1','collaboration pause excludes Dec30 and allows Dec20');
 await set('#day','2026-11-20');await click('[data-event="date-5"]');t=await details();assert(t.includes('10:00'));assert(t.includes('11/19庫存公告屬歷史'));await close();await nav('shopping');await search('');await set('#purchase-purpose','personal');await click('[data-product="sanx-mz13501"]');await click('[data-watch="sanx-mz13501"]');await close();await click('[data-shop-mode="watch"]');assert((await content()).includes('尚無自動抓價'));assert((await content()).includes('拉拉熊和服吊飾'));pass('R2-partial','source watchlist persists; live monitoring explicitly unavailable');
 assert.equal(await value('ATLAS_CATALOG.places.filter(p=>/1899/.test(p.title)).length'),1);assert.equal(await value('ATLAS_CATALOG.placesById.get("poi-tokyo-2").id'),'1899');pass('M1','same restaurant merged, legacy alias retained');
 await nav('food');await set('#day','');await set('#pref','東京');await set('[data-food-filter="cuisine"]','壽司');await set('[data-food-filter="budget"]','2000');assert(!(await content()).includes('壽司郎'));await set('[data-food-filter="cuisine"]','天');assert((await content()).includes('天丼てんや'));assert(!(await content()).includes('龍吟'));pass('M2','budget uses a meal/main dish; per-plate sushi is excluded as unknown meal cost');await set('[data-food-filter="cuisine"]','');await set('[data-food-filter="meal"]','晚餐');await set('[data-food-filter="budget"]','20000');assert(!(await content()).includes('天婦羅近藤'));assert(!(await content()).includes('鮨龍次郎'));await set('[data-food-filter="budget"]','');assert((await value('document.querySelector("#results .result-content[data-place=tokyo-tempura-kondo-ginza]").innerText')).includes('22,000'));assert((await value('document.querySelector("#results .result-content[data-place=tokyo-sushi-ryujiro-aoyama]").innerText')).includes('32,450'));await set('[data-food-filter="meal"]','');pass('food-same-menu','dinner budget and card starting price use same eligible menu');
 await set('[data-food-filter="cuisine"]','');await set('[data-food-filter="budget"]','');await set('[data-food-filter="stars"]','3');assert((await content()).includes('龍吟'));assert(!(await content()).includes('近藤'));await click('[data-place="tokyo-ryugin-hibiya"]');t=await details();assert(t.includes('2026 年 3 星'));assert(t.includes('michelin')||await value('!!document.querySelector("#detail-content a[href*=michelin]")'));pass('G1','current guide year and three stars distinct');
 for(const x of ['¥77,000','¥84,700','390','12:00','取消','未確認空席'])assert(t.includes(x),x);pass('G2','tax service, booking channel fee release cancellation availability');
 await click('[data-trip-add="tokyo-ryugin-hibiya"]');await close();await nav('explore');assert.equal(await value('document.querySelector("#pref").value'),'東京');await search('押上');await click('#results [data-place="official-6"]');await img();await click('[data-trip-add="official-6"]');await close();await nav('routes');let tripInputs=await value('[...document.querySelectorAll("[data-trip-field=time]")].map(x=>x.dataset.row)');for(const id of tripInputs){await set('[data-trip-field="date"][data-row="'+id+'"]','2026-11-21');}await set('[data-trip-field="time"][data-row="'+tripInputs[0]+'"]','10:00');await set('[data-trip-field="minutes"][data-row="'+tripInputs[0]+'"]','90');await set('[data-trip-field="time"][data-row="'+tripInputs[1]+'"]','10:30');assert((await content()).includes('時段重疊'));await set('[data-trip-field="status"][data-row="'+tripInputs[1]+'"]','取消');assert(!(await content()).includes('時段重疊'));assert.equal(await value('ATLAS_TASKS.tripItems().length'),1);pass('UX-route','shared city preserved, photo expands, itinerary overlap and cancelled exclusion');
 await snap(1440,'routes');
 await c('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await nav('explore');await search('押上');await snap(390,'search');
 assert.equal(await value('document.documentElement.scrollWidth'),390);assert.equal(await value('document.querySelector("#nav").scrollWidth'),await value('document.querySelector("#nav").clientWidth'));
 await click('#results [data-place="official-6"]');await snap(390,'place');await click('[data-show-map="official-6"]');await click('#layers-button');await snap(390,'map-layers');await click('#close-layers');assert(await value('document.querySelector("#layer-box").hidden'));
 await click('#this-area');let countA=await elText('#count');await value('window.dispatchEvent(new Event("resize"))');assert.equal(await elText('#count'),countA);pass('UX-mobile','390px no overflow, full detail, map layers close, selected place retained');

 await click('#layers-button');await click('#layer-rail');await click('#layer-station');await click('#close-layers');await wait('document.querySelector("#line-filter option:nth-child(2)")','rail lines');assert(await value('document.querySelectorAll(".leaflet-overlay-pane path").length>0'));pass('regression-rail','real N02 line geometry and station layer available');
 await click('#switcher [data-mode="list"]');await set('#pref','');await click('#reset');await search('四尺玉');await click('#results [data-place="poi-katakai-0"]');t=await details();assert(t.includes('2027'));await click('[data-travel-phase="departure"]');assert(await value('!document.querySelector("#travel-departure").hidden'));await close();await search('鴻巢');await click('#results [data-place="poi-konosu-0"]');t=await details();assert(t.includes('2027'));assert(t.includes('待'));pass('regression-fireworks','both four-shaku event access plans and uncertain next-date labeling preserved');
 await close();await click('#switcher [data-mode="list"]');
 const added=await value('ATLAS_CATALOG.places.filter(p=>p.heritage||p.restaurant).map(p=>({id:p.id,q:p.japanese}))');
 for(const p of added){await search(p.q);await click('#results [data-place="'+p.id+'"]');assert((await details()).length>500);await close();}
 pass('new-records','all four heritage and five restaurant details render fully');
 // Render requested small vector variants to PNG; generated illustration stays on D.
 for(const size of (tag==='local'?[32,48,192]:[])){await c('Emulation.setDeviceMetricsOverride',{width:size,height:size,deviceScaleFactor:1,mobile:false});await c('Page.navigate',{url:base+'assets/logo-rilakkuma-heritage.svg'});await sleep(250);await c('Emulation.setDefaultBackgroundColorOverride',{color:{r:0,g:0,b:0,a:0}});const {data}=await c('Page.captureScreenshot',{format:'png'});writeFileSync('D:/Coding/日本旅遊/網站/dist/assets/logo-'+size+'.png',Buffer.from(data,'base64'));}
 assert.equal(errors.length,0,JSON.stringify(errors));
 writeFileSync(join(dir,'atlas-v7-acceptance-'+tag+'.json'),JSON.stringify({testedAt:new Date().toISOString(),base,evidence,errors},null,2));
 console.log('ACCEPTANCE',evidence.length,'cases; zero runtime exceptions');
}finally{if(ws?.readyState===1){ws.send(JSON.stringify({id:99999,method:'Browser.close'}));ws.close();}browser.kill();}
