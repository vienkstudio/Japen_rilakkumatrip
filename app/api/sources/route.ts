import {env} from 'cloudflare:workers';
import {sourceState,refreshOfficial} from '../../../lib/live-sources';
export const dynamic='force-dynamic';
export async function GET(){try{const db=(env as any).DB;const state=await sourceState(db);if(!state.items.length||state.sources.some((s:any)=>s.stale||s.error)){await refreshOfficial(db);return Response.json(await sourceState(db),{headers:{'cache-control':'no-store'}});}return Response.json(state,{headers:{'cache-control':'no-store'}});}catch(e:any){return Response.json({error:'來源服務暫不可用，靜態研究資料仍可閱讀',detail:String(e.message).slice(0,180)},{status:503});}}
