import { createHash } from 'node:crypto';
export const SOURCE_DEFINITIONS=[
 {id:'sanx-news',kind:'news',url:'https://www.san-x.co.jp/ja/topics/?ip=2',label:'San-X 拉拉熊官方新聞'},
 {id:'sanx-goods',kind:'goods',url:'https://www.san-x.co.jp/ja/goods-info/?ip=2',label:'San-X 拉拉熊新品'},
 {id:'sanx-store',kind:'store',url:'https://www.san-x.co.jp/ja/store-blogs/',label:'San-X 官方門市公告'},
 {id:'sanx-release',kind:'release',url:'https://www.san-x.co.jp/release/',label:'San-X 官方新聞稿'},
 ...['aoyama','akihabara','kyoto','umekita','kobe'].map(branch=>({id:'taiko-'+branch,kind:'session',activityId:'culture-taiko-lab-'+branch,branchId:'taiko-lab-'+branch,url:'https://www.taiko-reserve.com/en/venue/taiko-lab-'+branch+'-en/',label:'TAIKO-LAB '+branch+' 官方場次'}))
];
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const clean=(s:any)=>String(s??'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const iso=(v:any)=>{if(!v)return null;const d=new Date(typeof v==='string'?v.replace(/^\$D/,''):v);return isNaN(d.getTime())?null:d.toISOString();};
const allowed=(u:string,source?:any)=>{try{const base=source?.url||'https://www.san-x.co.jp',x=new URL(u,base);return x.protocol==='https:'&&x.hostname===new URL(base).hostname?x.href:null;}catch{return null;}};
export function parseOfficial(source:any,html:string){
 const found=new Map<string,any>();
 const add=(r:any)=>{const url=allowed(r.url,source);const title=clean(r.title);if(!url||!title||title.length<4)return;const id=source.kind==='session'?'taiko-reserve:'+new URL(url).pathname.split('/').filter(Boolean).at(-1):source.id+'-'+hash(url).slice(0,24);found.set(id,{...r,id,url,title,sourceId:source.id,kind:source.kind,stockStatus:'未核庫存',purchaseReady:false});};
 if(source.kind==='session'){
  for(const match of html.matchAll(/<a\b[^>]*href=["']([^"']*\/en\/events\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
   const label=clean(match[2]),time=label.match(/(\d{4}-\d{2}-\d{2})\s*\/\s*(\d{1,2}:\d{2})[~～〜](\d{1,2}:\d{2})/);if(!time)continue;
   const [date,start,end]=time.slice(1);const startTime=start.padStart(5,'0'),endTime=end.padStart(5,'0');if(endTime<=startTime)continue;
   add({url:match[1],title:source.label+' '+date+' '+startTime+'–'+endTime,date,start:startTime,end:endTime,startAt:date+'T'+startTime+':00+09:00',endAt:date+'T'+endTime+':00+09:00',timezone:'Asia/Tokyo',activityId:source.activityId,branchId:source.branchId,sourceUrl:new URL(match[1],source.url).href,publicationStatus:'listed',availability:'unknown',remainingCapacity:null,totalCapacity:null,publishedAt:null,updatedAt:null});
  }
  return [...found.values()];
 }
 const chunks:string[]=[];
 for(const m of html.matchAll(/self\.__next_f\.push\((\[[\s\S]*?\])\)\s*;?\s*<\/script>/g)){try{const v=JSON.parse(m[1]);if(v[0]===1&&typeof v[1]==='string')chunks.push(v[1]);}catch{}}
 const walk=(node:any,depth=0)=>{if(!node||typeof node!=='object'||depth>35)return;
  if(!Array.isArray(node)){
   if(source.id==='sanx-news'&&node.pageTitle&&node.slug&&(!Array.isArray(node.ipIds)||node.ipIds.includes(2)))add({url:'/ja/blog/'+node.slug+'/',title:node.pageTitle,publishedAt:iso(node.publishedAt),updatedAt:iso(node.updatedAt),imageUrl:node.thumbnailImageUrl||null,sourceItemId:node.id,shopIds:node.shopIds||[],ipIds:node.ipIds||[]});
   if(node.href&&node.title&&/goods-info|special|store-blogs/.test(node.href))add({url:node.href,title:node.title,publishedAt:iso(node.date),releaseDate:iso(node.releaseDate),releasePrecision:'來源日期欄，精確發售日須開商品原頁',imageUrl:node.imageSrc||null});
  }
  for(const v of Object.values(node))if(v&&typeof v==='object')walk(v,depth+1);
 };
 for(const line of chunks.join('').split('\n')){const i=line.indexOf(':');if(i<0)continue;try{walk(JSON.parse(line.slice(i+1)));}catch{}}
 if(source.id==='sanx-store'){
  const pattern=/<div\b[^>]*class=["'][^"']*CommonArticleLinkCard_wrapper[^"']*["'][^>]*>([\s\S]*?)<a\b[^>]*href=["']([^"']*store-blogs[^"']+)["'][^>]*>[\s\S]*?<\/a>/gi;
  for(const match of html.matchAll(pattern)){const body=match[1],title=body.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i),date=body.match(/<time[^>]*datetime=["']([^"']+)/i);if(title)add({url:match[2],title:title[1],publishedAt:date?iso(date[1]):null,updatedAt:null,imageUrl:null});}
 }
 // Only same-site, identifiable article URLs; no executable HTML or arbitrary URL ingestion.
 for(const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
  const u=allowed(m[1],source);if(!u)continue;const path=new URL(u).pathname;
  const isStore=/^\/ja\/store-blogs\/[^/]+\/?$/.test(path),isRelease=source.id==='sanx-release'&&/\.pdf$/i.test(path);
  if(!isStore&&!isRelease)continue;
  const body=m[2],img=body.match(/<img[^>]*alt=["']([^"']+)/i),date=clean(body).match(/20\d{2}[.\/-]\d{1,2}[.\/-]\d{1,2}/);
  add({url:u,title:clean(body)||img?.[1],publishedAt:date?iso(date[0].replaceAll('.','-').replaceAll('/','-')):null,updatedAt:null,imageUrl:null});
 }
 return [...found.values()].filter(r=>source.id!=='sanx-store'||/リラックマ|コリラックマ|キイロイトリ|チャイロイコグマ|拉拉熊/.test(r.title)).slice(0,60);
}
export async function sourceState(db:any){
 const [snapshots,items,changes,runs]=await Promise.all([
  db.prepare('SELECT id,kind,fetched_at,expires_at,last_error,payload FROM source_snapshots ORDER BY id').all(),
  db.prepare('SELECT * FROM feed_items ORDER BY COALESCE(published_at,first_seen) DESC LIMIT 650').all(),
  db.prepare('SELECT id,source_id,item_id,title,url,change_type,observed_at FROM source_changes ORDER BY observed_at DESC LIMIT 80').all(),
  db.prepare('SELECT * FROM refresh_runs ORDER BY started_at DESC LIMIT 3').all()
 ]);
 return {timezone:'Asia/Tokyo',offers:snapshots.results.filter((s:any)=>s.kind==='offer').map((s:any)=>({...JSON.parse(s.payload),lastError:s.last_error,expiresAt:s.expires_at})),sources:SOURCE_DEFINITIONS.map(s=>{const row=snapshots.results.find((x:any)=>x.id===s.id);let data:any={};try{data=JSON.parse(row?.payload||'{}');}catch{}return {...s,lastSuccessAt:data.status==='ok'?row.fetched_at:null,lastAttemptAt:data.attemptedAt||row?.fetched_at||null,expiresAt:row?.expires_at||null,error:row?.last_error||null,stale:!row||new Date(row.expires_at).getTime()<Date.now(),count:data.items?.length||0};}),items:items.results.map((r:any)=>({...JSON.parse(r.payload),firstSeen:r.first_seen,lastSeen:r.last_seen})),changes:changes.results,runs:runs.results,checkedAt:new Date().toISOString(),notice:'官方來源更新不等於即時庫存、可下單或門市現貨。'};
}
let refreshing:Promise<any>|null=null;
export async function refreshOfficial(db:any,force=false){
 if(refreshing)return refreshing;
 refreshing=(async()=>{
  const latest=await db.prepare('SELECT started_at FROM refresh_runs ORDER BY started_at DESC LIMIT 1').first();
  if(latest&&Date.now()-new Date(latest.started_at).getTime()<(force?60000:15*60000))return {skipped:true,reason:'保留至少一分鐘更新間隔；一般快取十五分鐘'};
  const run=crypto.randomUUID(),at=new Date().toISOString();
  await db.prepare("INSERT OR IGNORE INTO refresh_runs (id,started_at,status,summary) VALUES ('refresh-lease','1970-01-01T00:00:00.000Z','idle','來源更新鎖')").run();
  const lease=await db.prepare("UPDATE refresh_runs SET started_at=?,status='running' WHERE id='refresh-lease' AND started_at<?").bind(at,new Date(Date.now()-(force?60000:15*60000)).toISOString()).run();
  if(!lease.meta?.changes)return {skipped:true,reason:'其他請求正在更新，保留目前快照'};
  await db.prepare('INSERT INTO refresh_runs (id,started_at,status,summary) VALUES (?,?,?,?)').bind(run,at,'running','官方公開來源更新中').run();
  const results=await Promise.all(SOURCE_DEFINITIONS.map(async source=>{
   try{
    const response=await fetch(source.url,{headers:{Accept:'text/html'},signal:AbortSignal.timeout(18000)});if(!response.ok)throw Error('官方來源 HTTP '+response.status);
    const html=await response.text();if(html.length>3000000)throw Error('來源回應超過處理範圍');
    const rows=parseOfficial(source,html);if(!rows.length)throw Error('未解析到可驗證條目；保留上次成功快照');
    const oldSnapshot=await db.prepare('SELECT id FROM source_snapshots WHERE id=?').bind(source.id).first();
    const previous=await db.prepare('SELECT id,payload FROM feed_items WHERE source_id=?').bind(source.id).all();const prior=new Map(previous.results.map((r:any)=>[r.id,r.payload]));const statements=[];
    for(const row of rows){
     const payload=JSON.stringify(row),old=prior.get(row.id) as string|undefined;
     if(!old||old!==payload)statements.push(db.prepare('INSERT INTO source_changes (id,source_id,item_id,title,url,change_type,observed_at,before_payload,after_payload) VALUES (?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),source.id,row.id,row.title,row.url,!old?(oldSnapshot?'new':'initial'):'changed',at,old||null,payload));
     statements.push(db.prepare('INSERT INTO feed_items (id,source_id,kind,title,url,published_at,updated_at,payload,first_seen,last_seen) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,published_at=excluded.published_at,updated_at=excluded.updated_at,payload=excluded.payload,last_seen=excluded.last_seen').bind(row.id,source.id,row.kind,row.title,row.url,row.publishedAt||null,row.updatedAt||null,payload,at,at));
    }
    for(let i=0;i<statements.length;i+=40)await db.batch(statements.slice(i,i+40));
    const expires=new Date(Date.now()+6*3600000).toISOString();
    await db.prepare('INSERT INTO source_snapshots (id,kind,payload,fetched_at,expires_at,last_error,etag) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,fetched_at=excluded.fetched_at,expires_at=excluded.expires_at,last_error=NULL,etag=excluded.etag').bind(source.id,source.kind,JSON.stringify({status:'ok',attemptedAt:at,items:rows}),at,expires,null,response.headers.get('etag')).run();
    return {sourceId:source.id,status:'ok',count:rows.length};
   }catch(e:any){
    const message=String(e.message||e).slice(0,350);
    const exists=await db.prepare('SELECT id,payload FROM source_snapshots WHERE id=?').bind(source.id).first();
    if(exists){let old:any={};try{old=JSON.parse(exists.payload);}catch{}old.attemptedAt=at;await db.prepare('UPDATE source_snapshots SET last_error=?,payload=? WHERE id=?').bind(message,JSON.stringify(old),source.id).run();}
    else await db.prepare('INSERT INTO source_snapshots (id,kind,payload,fetched_at,expires_at,last_error) VALUES (?,?,?,?,?,?)').bind(source.id,source.kind,JSON.stringify({status:'error',attemptedAt:at,items:[]}),at,at,message).run();
    return {sourceId:source.id,status:'error',error:message};
   }
  }));
  await db.prepare('UPDATE refresh_runs SET status=?,finished_at=?,summary=? WHERE id=?').bind(results.every(r=>r.status==='ok')?'succeeded':'partial',new Date().toISOString(),JSON.stringify(results),run).run();
  await db.prepare("UPDATE refresh_runs SET status='idle' WHERE id='refresh-lease'").run();
  return {runId:run,at,results};
 })();
 try{return await refreshing;}finally{refreshing=null;}
}
