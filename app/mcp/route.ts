import {OFFER_SOURCES} from '../../lib/verified-offers';
import {env} from 'cloudflare:workers';
import {sourceState,refreshOfficial} from '../../lib/live-sources';
const tools=[{name:'official_source_status',description:'讀取日本旅遊官方來源更新時間、條目、變動與錯誤；不能推定即時庫存。',inputSchema:{type:'object',properties:{},additionalProperties:false}},{name:'refresh_official_sources',description:'從固定 San-X 官方來源重新核對新品與門市公告，保存變動與來源時間。不下單、不推定庫存、不改旅客行程。',inputSchema:{type:'object',properties:{},additionalProperties:false}}];
tools.push({name:'record_verified_offer',description:'由網站擁有者保存已實讀之固定商品通路報價及來源；未核稅費/配送/庫存需填unknown，不推定可下單。不可將希望售價或其他SKU寫成此商品報價。',inputSchema:{type:'object',properties:{offerId:{type:'string'},sourceURL:{type:'string'},amountJPY:{type:['number','null']},taxIncluded:{type:['boolean','null']},shippingJPY:{type:['number','null']},condition:{type:'string',enum:['new','used','unknown']},availability:{type:'string',enum:['unknown','source-says-in-stock','preorder','sold-out','not-orderable','fetch-failed']},observedAt:{type:'string'},sourceNote:{type:'string'}},required:['offerId','sourceURL','amountJPY','taxIncluded','shippingJPY','condition','availability','observedAt','sourceNote'],additionalProperties:false}} as any);
const boundedState=(s:any)=>({...s,totalItems:s.items.length,verifiedOfferSources:Object.values(OFFER_SOURCES).slice(0,6),items:s.items.slice(0,20),changes:s.changes.slice(0,30),notice:s.notice+' 工具只回傳最新20項；網站保留完整來源清單。'});
const editor=(request:Request)=>Boolean(request.headers.get('oai-authenticated-user-id')&&(env as any).ATLAS_EDITOR_EMAIL&&request.headers.get('oai-authenticated-user-email')?.toLowerCase()===(env as any).ATLAS_EDITOR_EMAIL.toLowerCase());
export async function POST(request:Request){const message=await request.json() as any;const reply=(result:any)=>Response.json({jsonrpc:'2.0',id:message.id??null,result});
 if(message.method==='server/discover')return reply({supportedVersions:['2026-07-28'],capabilities:{tools:{}}});
 if(message.method==='tools/list')return reply({tools});
 if(message.method==='tools/call'){
  try{const name=message.params?.name;const db=(env as any).DB;
   if(name==='refresh_official_sources'){if(!editor(request))return reply({isError:true,content:[{type:'text',text:'此更新工具需要登入的 Site 呼叫者身分。'}]});const result=await refreshOfficial(db,true);const readback=boundedState(await sourceState(db));return reply({content:[{type:'text',text:JSON.stringify({result,readback})}]});}
   if(name==='record_verified_offer'){
    if(!editor(request))return reply({isError:true,content:[{type:'text',text:'此工具僅允許已驗證的網站擁有者。'}]});
    const a=message.params?.arguments||{},definition=(OFFER_SOURCES as any)[a.offerId];
    if(!definition||a.sourceURL!==definition.sourceURL)throw Error('商品通路或來源不在固定白名單');
    if(!['unknown','source-says-in-stock','preorder','sold-out','not-orderable','fetch-failed'].includes(a.availability)||!['new','used','unknown'].includes(a.condition))throw Error('觀察狀態無效');
    if(a.amountJPY!==null&&(!Number.isFinite(a.amountJPY)||a.amountJPY<0||a.amountJPY>1000000))throw Error('金額無效');
    if(a.shippingJPY!==null&&(!Number.isFinite(a.shippingJPY)||a.shippingJPY<0||a.shippingJPY>100000))throw Error('送料無效');
    if(a.taxIncluded!==null&&typeof a.taxIncluded!=='boolean')throw Error('稅況必須明示或unknown');
    const observation=Date.parse(a.observedAt);if(!Number.isFinite(observation)||Math.abs(Date.now()-observation)>48*3600000)throw Error('觀察時間必須是本次48小時內實讀');
    if(typeof a.sourceNote!=='string'||a.sourceNote.length<10||a.sourceNote.length>500)throw Error('必須提供有界的來源判讀註記');
    const id='verified-offer:'+a.offerId,previous=await db.prepare('SELECT payload FROM source_snapshots WHERE id=?').bind(id).first();
    let before:any=null;try{before=previous?JSON.parse(previous.payload):null;}catch{}
    const now=new Date().toISOString();
    if(a.availability==='fetch-failed'&&before){before.lastAttemptAt=now;before.lastError=a.sourceNote;await db.prepare('UPDATE source_snapshots SET payload=?,last_error=? WHERE id=?').bind(JSON.stringify(before),a.sourceNote,id).run();return reply({content:[{type:'text',text:JSON.stringify({preserved:true,offerId:a.offerId,lastSuccessAt:before.observedAt,error:a.sourceNote})}]});}
    const payload={kind:'offer',offerId:a.offerId,productId:definition.productId,retailer:definition.retailer,sourceURL:definition.sourceURL,amountJPY:a.amountJPY,taxIncluded:a.taxIncluded,shippingJPY:a.shippingJPY,condition:a.condition,availability:a.availability,observedAt:new Date(observation).toISOString(),sourceNote:a.sourceNote,comparisonEligible:a.amountJPY!==null&&a.taxIncluded===true&&a.condition==='new',purchaseReady:false};
    const same=before&&JSON.stringify([before.amountJPY,before.taxIncluded,before.shippingJPY,before.condition,before.availability])===JSON.stringify([payload.amountJPY,payload.taxIncluded,payload.shippingJPY,payload.condition,payload.availability]);
    if(!same)await db.prepare('INSERT INTO source_changes (id,source_id,item_id,title,url,change_type,observed_at,before_payload,after_payload) VALUES (?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),id,a.offerId,definition.retailer+' 報價觀察',definition.sourceURL,before?'offer-changed':'initial',now,before?JSON.stringify(before):null,JSON.stringify(payload)).run();
    await db.prepare('INSERT INTO source_snapshots (id,kind,payload,fetched_at,expires_at,last_error) VALUES (?,?,?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,fetched_at=excluded.fetched_at,expires_at=excluded.expires_at,last_error=NULL').bind(id,'offer',JSON.stringify(payload),now,new Date(Date.now()+24*3600000).toISOString()).run();
    return reply({content:[{type:'text',text:JSON.stringify({saved:true,changed:!same,offer:payload})}]});
   }
   if(name==='official_source_status')return reply({content:[{type:'text',text:JSON.stringify(boundedState(await sourceState(db)))}]});
   return reply({isError:true,content:[{type:'text',text:'未知工具'}]});
  }catch(e:any){return reply({isError:true,content:[{type:'text',text:String(e.message).slice(0,300)}]});}
 }
 return Response.json({jsonrpc:'2.0',id:message.id??null,error:{code:-32601,message:'Method not found'}},{status:400});
}
