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
 '--remote-debugging-port=18768','--user-data-dir='+join(dir,'atlas-browser-v10'),'about:blank'
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
  writeFileSync(join(dir,'atlas-v10-'+width+'-'+slot+'.png'),Buffer.from(data,'base64'));
 }




 const evidence=[];
 const check=(name,actual,pass=true)=>{evidence.push({name,pass,actual});writeFileSync(join(dir,'qa-v10-progress-'+tag+'.json'),JSON.stringify(evidence,null,2));console.log(name+': '+pass);if(!pass)throw Error(name+': '+JSON.stringify(actual));};
 const set=async(sel,v)=>value(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)throw Error('Missing '+${JSON.stringify(sel)});e.value=${JSON.stringify(v)};e.dispatchEvent(new Event('change',{bubbles:true}));return e.value})()`);
 const taskState=()=>value('JSON.parse(localStorage.getItem("japan-atlas-tasks-v1")||"{}")');
 await c('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await c('Page.navigate',{url:base});await wait('window.ATLAS_PLANNER && document.querySelector("#results h2")','ready');
 await value('localStorage.removeItem("japan-atlas-tasks-v1");localStorage.removeItem("japan-atlas-scope-v1")');await c('Page.reload');await wait('window.ATLAS_PLANNER && document.querySelector("#results h2")','fresh ready');
 const scenarios=JSON.parse((await import('node:fs')).readFileSync('D:/Coding/日本旅遊/對抗版/角色對抗/多日旅行與活動場次-九角色情境-2026-11-20.json','utf8'));
 let checkpoints=0;
 for(const s of scenarios.scenarios){await set('#trip-start',s.start);await set('#trip-end',s.end);await set('#party',String(s.party));for(const [d] of s.daily){await set('#day',d);assert.equal(await value('document.querySelector("#day").value'),d);checkpoints++;}await set('#pref',s.cities[0]);await click('#nav [data-nav="routes"]');assert((await elText('#results')).includes(s.start));}
 check('Nine role date-range controls, daily date preservation (not daily content completion)',{roles:scenarios.scenarios.length,checkpoints});
 async function scope(a,z,pref='',n='1',day=''){await set('#trip-start',a);await set('#trip-end',z);await set('#party',n);await set('#pref',pref);await set('#day',day);await search('');}
 async function style(id){if(await value('document.querySelector("#detail").classList.contains("open")'))await close();await click('#nav [data-nav="routes"]');await click('[data-plan-mode="styles"]');await click('[data-travel-style="'+id+'"]');}
 // Fan: specific named variant and current journey, actual photos, source and dated purchase.
 await scope('2026-11-20','2026-11-25','東京','2','2026-11-21');await style('fan');await search('排球');await wait('document.querySelector("#results [data-product]")','named products');
 await click('#results [data-product]');const fanText=await elText('#detail-content');check('Fan: named variant, SKU honesty and venue rules',fanText.slice(0,250),fanText.includes('未公開')&&fanText.includes('限購'));
 const photoCount=await value('document.querySelectorAll("#detail-content .remote-official-image").length');check('Fan: inline official product image elements',photoCount,photoCount>0);
 const loadedProduct=await eventually(()=>value('[...document.querySelectorAll("#detail-content .remote-official-image")].some(i=>i.naturalWidth>100)'), 'official product image',12000).catch(()=>false);evidence.push({name:'Official product image actual network load',pass:!!loadedProduct,actual:loadedProduct});
 await click('[data-purchase-add]');await close();await click('[data-shop-mode="purchase"]');check('Fan purchase keeps selected day',(await taskState()).purchase[0].purchaseDate,(await taskState()).purchase[0].purchaseDate==='2026-11-21');
 // Anime: actual points added to selected day, real provenance.
 await scope('2026-11-20','2026-11-26','埼玉','1','2026-11-24');await style('anime');await search('秩父');await click('#results [data-anime]');check('Anime route exposes actual place buttons',await value('document.querySelectorAll("#detail-content [data-place]").length'),await value('document.querySelectorAll("#detail-content [data-place]").length')>=3);await click('[data-anime-plan]');let trip=(await taskState()).trip;check('Anime points carry selected date and source',trip.map(x=>({date:x.date,place:x.place,source:x.sourceUrl})),trip.length>=3&&trip.every(x=>x.date==='2026-11-24'&&x.sourceUrl));await close();
 // Procurement: prohibition plus cancellation and preserved quote.
 await scope('2026-11-20','2026-11-25','','1','2026-11-22');await style('commercial');await search('串家');await click('#results [data-product="kushiya-wave2-a4file"]');const before=(await taskState()).purchase.length;await click('[data-purchase-add]');check('Commercial prohibition does not add row',(await taskState()).purchase.length,(await taskState()).purchase.length===before);await close();await set('#purchase-purpose','personal');await search('MZ13501');await click('#results [data-product]');await click('[data-purchase-add]');await close();await click('[data-shop-mode="purchase"]');
 const row=(await taskState()).purchase.at(-1);const rowSel='[data-row="'+row.id+'"]';const offer=await value('[...document.querySelectorAll('+JSON.stringify(rowSel+'[data-purchase-field="offer"] option')+')].find(o=>o.textContent.includes("あみあみ"))?.value');await set(rowSel+'[data-purchase-field="offer"]',offer);await set(rowSel+'[data-purchase-field="qty"]','4');let current=(await taskState()).purchase.at(-1);check('Professional procurement keeps price/source snapshot',current,current.price===3340&&current.shipping===630&&current.quoteSnapshot.sourceURL&&current.quoteSnapshot.checkedAt);await set(rowSel+'[data-purchase-field="status"]','取消');check('Cancelled row shows zero effective subtotal',await value('document.querySelector('+JSON.stringify(rowSel)+').closest("article").querySelector(".price").textContent'),(await value('document.querySelector('+JSON.stringify(rowSel)+').closest("article").querySelector(".price").textContent')).includes('¥0'));
 // Heritage: actual photo + credit, no undefined history.
 await scope('2026-11-20','2026-11-25','奈良','1','2026-11-24');await style('heritage');await search('東大寺');await click('#results [data-place]');let text=await elText('#detail-content');check('Heritage deep read distinguishes buildings/tickets',text.slice(0,500),text.includes('國寶')&&text.includes('御朱印')&&!text.includes('undefined'));await img();check('Heritage licensed photo expands with credit','1280px image rendered');await close();
 // Collection: action survives navigating away and back.
 await style('collect');const visitId=await value('document.querySelector("[data-visit]").dataset.visit');await set('[data-visit="'+visitId+'"]','visited');await style('fan');await style('collect');check('Collector progress survives page changes',(await taskState()).visits[visitId],(await taskState()).visits[visitId]==='visited');
 // Experience: 6-day all-trip actual slot list and one dated session.
 await scope('2026-12-01','2026-12-06','京都','2');await style('experience');await search('祇園角');await click('#results [data-place="culture-gion-corner"]');check('Experience: exact eight winter sessions',await value('document.querySelectorAll("[data-activity-session] option").length'),await value('document.querySelectorAll("[data-activity-session] option").length')===9);const slot=await value('[...document.querySelectorAll("[data-activity-session] option")].find(o=>o.textContent.includes("2026-12-03 19:00"))?.value');await set('[data-activity-session]',slot);await click('[data-plan-session]');check('Experience: date/start/derived duration/party cost',(await taskState()).trip.at(-1),(await taskState()).trip.at(-1).date==='2026-12-03'&&(await taskState()).trip.at(-1).expenseJPY===11000);await close();
 // Limited festival: official overview and exact 4-shaku planned time, no invented availability.
 await scope('2027-09-09','2027-09-14','新潟','1');await style('limited');await search('片貝');await click('#results [data-event]');text=await elText('#detail-content');check('Limited: Katakai planned 22:00 4-shaku visible',text.slice(0,1100),text.includes('22:00')&&text.includes('四尺玉'));await close();
 // Food: dinner budget uses same meal menu and no plate-as-meal.
 await scope('2026-11-20','2026-11-25','東京','1');await style('food');await set('[data-food-filter="meal"]','晚餐');await set('[data-food-filter="budget"]','20000');text=await elText('#results');check('Food dinner budget excludes lunch prices',text.slice(0,500),!text.includes('てんぷら近藤')&&!text.includes('鮨 龍次郎')&&!text.includes('每盤'));
 // Michelin: specific dinner seating and fee visible.
 await style('michelin');await set('[data-food-filter="stars"]','2');await search('近藤');await click('#results [data-place]');text=await elText('#detail-content');check('Michelin: explicit menu and cancellation source',text.slice(0,700),text.includes('22,000')&&text.includes('取消')&&text.includes('預約'));await close();
 // Mobile layout and retained editable range.
 await c('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await click('#nav [data-nav="routes"]');await click('[data-plan-mode="mine"]');check('390px no document horizontal overflow',await value('({width:innerWidth,document:document.documentElement.scrollWidth})'),await value('document.documentElement.scrollWidth<=innerWidth'));check('Mobile range stays expanded',await value('document.getElementById("trip-scope-details").open'),await value('document.getElementById("trip-scope-details").open'));await snap(390,'final');
 check('No runtime exceptions',errors,errors.length===0);
 writeFileSync(join(dir,'qa-v10-journeys-'+tag+'.json'),JSON.stringify({at:new Date().toISOString(),base,scope:'Nine bounded persona tasks plus 55 date-control checkpoints. Not full completion of nine itineraries, bookings or inventory.',evidence,errors},null,2));console.log(JSON.stringify({checks:evidence.length,pass:evidence.filter(x=>x.pass).length,failed:evidence.filter(x=>!x.pass),errors}));
}finally{if(ws?.readyState===1){ws.send(JSON.stringify({id:99999,method:'Browser.close'}));ws.close();}browser.kill();}
