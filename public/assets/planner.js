(() => {
'use strict';
const DATA=window.ATLAS_PLANNING_DATA,AD=DATA.activities,C=window.ATLAS_CATALOG,A=window.ATLAS;
const z='Asia/Tokyo',DAY=86400000;
const validDay=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&!isNaN(Date.parse(v));
const addDay=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*DAY).toISOString().slice(0,10);
const days=(a,b)=>{if(!validDay(a)||!validDay(b)||a>b)return [];const out=[];for(let d=a;d<=b&&out.length<732;d=addDay(d,1))out.push(d);return out;};
const instant=(d,t)=>validDay(d)&&/^\d{2}:\d{2}$/.test(t||'')?Date.parse(d+'T'+t+':00+09:00'):null;
const jst=ms=>new Date(ms+9*3600000).toISOString();
const timeEnd=(d,t,n)=>instant(d,t)!==null&&Number.isFinite(n)?jst(instant(d,t)+n*60000).slice(0,16).replace('T',' '):'結束時間待確認';
const hhmm=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
const holidays=d=>DATA.holidays[d.slice(0,4)]?.includes(d);
const weekday=d=>new Date(d+'T00:00:00Z').getUTCDay();
const activityAliases={'poi-katakai-0':'event-katakai-2027','poi-konosu-0':'event-konosu-2027','katakai-event':'event-katakai-2027','konosu-event':'event-konosu-2027','baseyard-harajuku-naname':'event-haikyu-rilakkuma-harajuku'};
let api,local,save,helpers;
const meta=()=>local.tripMeta||(local.tripMeta={dayCities:{},receipt:'unknown',departureAt:'',dayPage:0});
const e=v=>api.esc(v??'');
const b=(key,id,label,cls='btn')=>api.button(key,id,label,cls);
const link=(url,label,cls='btn')=>url?api.external(url,label,cls):'';
const note=t=>'<p class="task-notice">'+e(t)+'</p>';
const box=(title,body)=>'<section class="task-section"><h3>'+e(title)+'</h3>'+body+'</section>';
const activities=()=>[...AD.activities,...AD.extraEvents];
const activityFor=id=>activities().find(a=>a.activityId===(activityAliases[id]||id));
function closure(id,day){
 if(!validDay(day))return '';
 const d=day.slice(5),wd=weekday(day);
 if(id==='event-1899-2026'&&day>='2026-12-27'&&day<='2027-01-07')return '1899聯名暫停，非一般餐廳必休';
 if(id==='culture-gion-corner'){
  if(d>='12-26'||d<='01-04'||['02-11','02-23','07-16','08-16'].includes(d))return '官方休演日';
  const winter=d>='12-01'||d<='03-11';
  if(winter&&(![2,3,4,5].includes(wd)||holidays(day)))return '冬季只週二至五，國定假日休演';
  if(winter&&!DATA.holidays[day.slice(0,4)])return '此年度國定假日尚未核實';
 }
 if(id==='culture-sado-taiko'){
  if(day.slice(5,7)==='01'||day.slice(5,7)==='02')return '一至二月冬休';
  if(wd===1&&!holidays(day)||wd===2&&holidays(addDay(day,-1)))return '通常週一休，週一假日改週二';
 }
 if(id==='culture-ojiya-orinoza'&&wd===3)return '週三休館';
 if(id==='culture-ai-no-yakata'&&wd===2)return '週二休館';
 if(id==='culture-kabukiza'&&['2026-11-09','2026-11-17'].includes(day))return '當期公告休演';
 return '';
}
function occurrences(id,day){
 const a=activityFor(id);if(!a||!validDay(day)||closure(a.activityId,day))return [];
 const dated=[...AD.sessions.filter(s=>s.activityId===a.activityId),...(a.sessions||[]).map(s=>({...s,activityId:a.activityId,sourceUrl:a.sourceUrl,checkedAt:a.checkedAt}))].filter(s=>s.date===day);
 if(dated.length)return dated.map((s,i)=>({...a,...s,id:s.id||a.activityId+':'+day+':'+s.start+':'+i}));
 if(a.activityId.startsWith('culture-taiko-lab-')||a.activityId==='culture-kabukiza'||a.sessions)return [];
 let templates=a.sessionTemplates||[],status='依現行規則，指定日期與餘額需再核';
 if(a.activityId==='culture-warasse'){
  if(!day.startsWith('2026-11-'))return [];
  templates=DATA.warasseGroupDates.includes(day)?a.alternateTemplates:a.sessionTemplates;
  status=DATA.warasseGroupDates.includes(day)?'當期官方團體演出日':'當期通常館員場；臨時異動另查';
 }
 return templates.map((s,i)=>({...a,...s,date:day,id:a.activityId+':'+day+':'+s.start+':'+i,startAt:day+'T'+s.start+':00+09:00',endAt:s.end?day+'T'+s.end+':00+09:00':null,publicationStatus:status,availability:'unknown'}));
}
function eventSummary(event){
 const source=activities().find(a=>a.activityId===activityAliases[event.id]);
 const period=api.state.day?[api.state.day]:days(api.state.tripStart,api.state.tripEnd);
 const eligible=period.filter(d=>(!event.start||event.start<=d)&&(!event.end||d<=event.end)&&!(event.id==='date-3'&&d>='2026-12-27'&&d<='2027-01-07'));
 const time=source?.sessions?.[0];return (eligible.length?'旅程內 '+eligible.length+' 個日期・':'')+(time?time.start+'–'+time.end+' 日本時間（主辦概況）':'個別入場／場次時間請核對，未默認全天');
}
function eventPicker(event){
 const id={'date-0':'baseyard-harajuku-naname','date-3':'1899'}[event.id];const p=id?C.placesById.get(id):null;
 if(p&&activityFor(p.id))return sessionPicker(p)+b('place',p.id,'場地與商品詳情');
 return box('排入某一天',note('活動總檔期不是單日場次。以下只建立待確認事項；未確認時間不會當作全天或可訂。')+'<div class="task-filter-grid"><label>預定日期<input type="date" data-event-day="'+e(event.id)+'" value="'+e(selectedDate())+'"></label><label>希望到場（日本時間）<input type="time" data-event-time="'+e(event.id)+'"></label></div>'+b('plan-event',event.id,'加入待確認事項')+link(event.href,'核對當日入場與票券'));
}
function selectedDate(){return api.state.day||api.state.tripStart||'';}
function sessionPicker(p){
 const a=activityFor(p.id);if(!a)return '';
 const day=api.state.day||'',range=day?[day]:days(api.state.tripStart,api.state.tripEnd),closed=day?closure(a.activityId,day):'',sessions=range.flatMap(d=>occurrences(p.id,d));
 const options='<option value="">請選擇已公布場次</option>'+sessions.map(s=>'<option value="'+e(s.id)+'">'+e(s.date+' '+s.start+'–'+(s.end||'結束待核')+(s.endPrecision?'（結束推算）':'')+'・'+(s.venue||s.branchId||a.title))+'</option>').join('');
 return box('選日期與活動場次',note('全部為日本時間。已公布時段不等於尚有名額；選定後會把日期、起訖、場地與來源一起帶入行程。')+'<label class="planner-label">參與日期<input type="date" data-activity-date="'+e(p.id)+'" value="'+e(day)+'"'+(api.state.tripStart?' min="'+e(api.state.tripStart)+'"':'')+(api.state.tripEnd?' max="'+e(api.state.tripEnd)+'"':'')+'></label>'+(closed?note(closed):'')+'<label class="planner-label">已核場次<select data-activity-session="'+e(p.id)+'"'+(!sessions.length?' disabled':'')+'>'+options+'</select></label>'+(sessions.length?'':note(day?'這一天沒有已收錄的可選場次；接待時間或活動總檔期不能當作確定場次。':'先設定旅行起訖或參與日期。'))+(p.id==='culture-asakusa-sumo'?'<label class="planner-label">實際場館<select data-activity-venue="'+e(p.id)+'"><option value="">本店／ANNEX尚未確認</option><option value="本店">本店（以確認信為準）</option><option value="ANNEX">ANNEX（需確認地址）</option></select></label>':'')+'<div data-session-details="'+e(p.id)+'"></div>'+(a.warning?note(a.warning):'')+'<div class="detail-actions">'+b('plan-session',p.id,'加入所選場次','btn primary')+b('plan-unconfirmed',p.id,'加入待確認事項')+'</div>'+api.facts([['接待範圍',a.receptionWindow?[a.receptionWindow.start,a.receptionWindow.end,a.receptionWindow.endMeaning].filter(Boolean).join('–'):null],['入場',a.doorsOpen||'待確認'],['最後入場',a.lastEntry||'待確認'],['售票／報名截止',a.bookingDeadline||a.saleEnd|| (a.leadDays?'至少 '+a.leadDays+' 日前；受理時刻待核':'待確認')],['名額',a.capacity||'未確認餘額'],['查核',a.checkedAt]])+link(a.sourceUrl,'官方時刻／預約來源'));
}
function minutes(s){if(s.startAt&&s.endAt)return Math.round((Date.parse(s.endAt)-Date.parse(s.startAt))/60000);if(s.start&&s.end){let [a,b]=[s.start,s.end].map(t=>t.split(':').reduce((n,v)=>n*60+Number(v),0));return b<a?b+1440-a:b-a;}return null;}
function addRow(p,extra={}){
 const row={id:crypto.randomUUID(),place:p.id,entityType:'place',title:p.title,pref:p.pref,query:p.query,coords:p.coords||null,date:selectedDate(),time:'',minutes:null,queueMinutes:null,mealMinutes:null,pickupMinutes:null,transferMinutes:null,transferBasis:'未確認',status:'時間待確認',sourceUrl:p.href||'',checkedAt:null,confirmedTime:false,expenseJPY:null,...extra};
 local.trip.push(row);save();api.refresh();api.notify('已加入每日行程；未確認時間與交通會留在檢查清單');return row;
}
function addRoutePoint(p,route){const estimate=route.visitEstimateMinutes?.[0]||45;addRow(p,{minutes:estimate,durationBasis:'路線規劃預留 '+estimate+' 分，非官方場次',queueMinutes:null,sourceUrl:route.sourceURLs?.[0]||p.href,checkedAt:'2026-11-20',status:'計畫中'});}
function addPlace(p){
 if(activityFor(p.id)){api.openPlace(p.id);setTimeout(()=>document.querySelector('[data-activity-session]')?.focus(),50);return;}
 if(p.restaurant){api.openPlace(p.id);setTimeout(()=>document.querySelector('[data-dining-menu]')?.focus(),50);return;}
 addRow(p,{minutes:60,durationBasis:'規劃預留60分，可修改；非官方活動時長',queueMinutes:15,queueBasis:'預留估算',pickupMinutes:['official','retail','rilanowa','theme'].includes(p.kind)?15:null,pickupBasis:'若需取貨，預留15分估算',status:'計畫中'});
}
function addSession(id){
 const p=C.placesById.get(id),pickedDay=document.querySelector('[data-activity-date="'+CSS.escape(id)+'"]')?.value||'',range=pickedDay?[pickedDay]:days(api.state.tripStart,api.state.tripEnd),selection=document.querySelector('[data-activity-session="'+CSS.escape(id)+'"]')?.value;
 const s=range.flatMap(d=>occurrences(id,d)).find(s=>s.id===selection);const day=s?.date;if(!p||!s){api.notify('請先選日期及官方場次；未知時間可加入待確認事項');return;}
 if(api.state.tripStart&&(day<api.state.tripStart||day>api.state.tripEnd)){api.notify('場次不在旅行日期內，請先調整旅行起訖');return;}
 let duration=minutes(s),durationBasis=s.endPrecision||s.timePrecision||'官方已列起訖';
 if(duration===null&&typeof s.durationMinutes==='object'&&s.durationMinutes.approximate){duration=s.durationMinutes.approximate;durationBasis='官方概述約 '+duration+' 分，結束為推算';}
 const venueChoice=p.id==='culture-asakusa-sumo'?document.querySelector('[data-activity-venue]')?.value:null;
 const expense=p.experience?window.CULTURE.price(p.experience,api.state.party):null;
 addRow(p,{date:day,time:s.start,minutes:duration,durationBasis,sessionId:s.id,activityId:s.activityId,sourceUrl:s.sourceUrl,checkedAt:s.checkedAt,venue:p.id==='culture-asakusa-sumo'?(venueChoice||'本店／ANNEX待預約確認'):(s.venue||p.title),venueVerified:p.id!=='culture-asakusa-sumo',coords:p.id==='culture-asakusa-sumo'?null:p.coords,availability:s.availability||'unknown',publicationStatus:s.publicationStatus||'官網已列場次，餘額未知',status:'場次已選・待預約',confirmedTime:true,bookingDeadline:s.bookingDeadline||s.saleEnd||null,leadDays:s.leadDays||null,queueMinutes:15,queueBasis:'報到／排隊預留估算15分，依確認信修正',expenseJPY:expense===null?null:expense*api.state.party,expenseBasis:expense===null?'費用待核':'目前人數成人價；附加費另核'});
}
function mealOptions(p,index,dayOverride){
 const m=p.restaurant.menu[index];if(!m)return '';
 const day=dayOverride===undefined?selectedDate():dayOverride,status=restaurantStatus(p.restaurant,m,day),rules=(p.restaurant.availabilityRules||[]).filter(r=>validDay(day)&&(String(m.meal).includes('午餐')&&ruleApplies(r,day,'lunch',m)||String(m.meal).includes('晚餐')&&ruleApplies(r,day,'dinner',m))),times=[...new Set(rules.filter(r=>r.effect==='reservation_start_times').flatMap(r=>r.startTimes||[]))];
 return '<label class="planner-label">用餐日期<input type="date" data-meal-day="'+e(p.id)+'" value="'+e(day)+'"></label>'+(status.allowed?'':note('此日餐期不適用：'+status.reason))+(times.length?'<label class="planner-label">官方列出開席時刻（餘額未核）<select data-meal-time="'+e(p.id)+'"><option value="">請選開席時間</option>'+times.map(t=>'<option>'+t+'</option>').join('')+'</select></label>':'<label class="planner-label">希望入店時間（日本，需預約核對）<input type="time" data-meal-time="'+e(p.id)+'"></label>')+note(m.timeWindow||'營業、入店與最後點餐條件見下方來源；沒有把營業時段當成每分鐘均可訂。');
}
function diningPicker(p){const r=p.restaurant;if(!r)return '';return box('把餐點排入某一天','<label class="planner-label">菜單與時段<select data-dining-menu="'+e(p.id)+'"><option value="">請選餐點</option>'+r.menu.map((m,i)=>'<option value="'+i+'">'+e(m.name+'・'+m.meal+'・已列費用¥'+window.ATLAS_TASKS.menuCost(m)+'／'+(m.priceBasis||'每人套餐'))+'</option>').join('')+'</select></label><div data-meal-options="'+e(p.id)+'"></div>'+b('plan-meal',p.id,'加入所選餐點')+note('預約窗口、休業及菜單日期仍須核對；不會送出訂位。'));}

const rowPlace=r=>{const p=C.placesById.get(r.place)||{};return {...p,id:r.place||r.id,title:r.title||p.title||'待定地點',pref:r.pref||p.pref||'',query:r.query||p.query||r.title,coords:Object.hasOwn(r,'coords')?r.coords:p.coords||null};};
const numeric=v=>v===''||v===null||v===undefined?null:Number(v);
const active=r=>r.status!=='取消';
function inTrip(r){return !api.state.tripStart||!api.state.tripEnd||validDay(r.date)&&r.date>=api.state.tripStart&&r.date<=api.state.tripEnd;}
function mapItems(){return local.trip.filter(r=>active(r)&&validDay(r.date)&&inTrip(r)&&(!api.state.day||r.date===api.state.day)).sort((a,b)=>instant(a.date,a.time||'00:00')-instant(b.date,b.time||'00:00')).map(r=>({...rowPlace(r),title:r.date+' '+(r.time||'時間待核')+'・'+rowPlace(r).title}));}
function ruleApplies(rule,day,meal,menu){
 if(!validDay(day))return false;
 if(rule.meal&&!rule.meal.includes(meal))return false;
 if(rule.menuNames&&!rule.menuNames.includes(menu.name))return false;
 const wd=weekday(day),holiday=holidays(day),dr=rule.dateRange;
 if(dr){
  if(dr.start&&day<dr.start||dr.end&&day>dr.end)return false;
  if(dr.startMonthDay&&dr.endMonthDay){const md=day.slice(5);if(dr.startMonthDay<=dr.endMonthDay?md<dr.startMonthDay||md>dr.endMonthDay:md<dr.startMonthDay&&md>dr.endMonthDay)return false;}
  if(dr.startMonth&&!dr.start)return false;
 }
 if(rule.holidayOverride){if(rule.holidayOverride.openOnHoliday&&wd===rule.holidayOverride.ifWeekday&&holiday)return false;if(wd===rule.holidayOverride.closeFollowingWeekday&&holidays(addDay(day,-1)))return true;}
 if(rule.publicHoliday&&!holiday)return false;if(rule.excludePublicHolidays&&holiday)return false;
 if(rule.weekday&&!rule.weekday.includes(wd)&&!(rule.orPublicHoliday&&holiday))return false;
 if(rule.weekOfMonth&&!rule.weekOfMonth.includes(Math.ceil(Number(day.slice(-2))/7)))return false;
 if(rule.effect==='closed'&&holiday&&/國定假日(?:除外|營業)/.test(rule.exclusions||''))return false;
 return true;
}
function restaurantStatus(restaurant,menu,day,requestedMeal=''){
 if(!validDay(day))return {allowed:true,warnings:['尚未選日期，休業與餐期需核對'],windows:[]};
 const codes=requestedMeal?[requestedMeal==='晚餐'?'dinner':requestedMeal==='午餐'?'lunch':requestedMeal]:menu.mealCodes||String(menu.meal||'').split('/').map(x=>x==='晚餐'?'dinner':x==='午餐'?'lunch':x);
 const options=codes.map(code=>{
  const rules=(restaurant.availabilityRules||[]).filter(r=>ruleApplies(r,day,code,menu));
  const denied=rules.find(r=>['closed','not_offered'].includes(r.effect));
  const hasWindows=(restaurant.availabilityRules||[]).some(r=>['service_window','entry_window'].includes(r.effect)&&(!r.meal||r.meal.includes(code)));
  const windows=rules.filter(r=>['service_window','entry_window'].includes(r.effect));
  const period=menu.applicableDates||{};const expired=period.validFrom&&day<period.validFrom||period.validTo&&day>period.validTo;
  return {allowed:!denied&&!expired&&(!hasWindows||windows.length>0),reason:denied?.note||denied?.id||(expired?'不在這份菜單適用日期':hasWindows&&!windows.length?'當日此餐期未列營業':'') ,windows:windows.map(r=>({...r.timeWindow,kind:r.effect,source:r.source})),warnings:rules.filter(r=>['requires_confirmation','advance_booking_required','advance_booking_disabled','menu_may_be_suspended'].includes(r.effect)).map(r=>r.note||r.namedPeriod||r.id)};
 });
 return options.find(o=>o.allowed)||options[0]||{allowed:true,warnings:['未核餐期'],windows:[]};
}
function inspect(rows=local.trip){
 const out=new Map(),ordered=rows.filter(r=>inTrip(r)&&active(r)).filter(r=>validDay(r.date)&&r.time).sort((a,b)=>instant(a.date,a.time)-instant(b.date,b.time));
 for(const r of rows){const errors=[],warnings=[];const p=rowPlace(r);if(!active(r)){out.set(r.id,{errors,warnings});continue;}if(!validDay(r.date))errors.push('未指定日期');if(!r.time)errors.push('開始時間待確認');if(numeric(r.minutes)===null)errors.push('結束／停留時間待確認');if(r.activityId&&closure(r.activityId,r.date))errors.push(closure(r.activityId,r.date));
  if(r.date&&api.state.tripStart&&(r.date<api.state.tripStart||r.date>api.state.tripEnd))warnings.push('已排事項在旅行起訖以外，保留原資料');
  if(r.venueVerified===false)errors.push('實際場館與地址未由預約確認；本店與ANNEX不可混用');if(r.activityId&&!r.confirmedTime)errors.push('活動時刻未核實，不能當作已選場次');if(r.confirmedTime&&r.availability!=='confirmed')warnings.push('場次已列，餘額／訂位未確認');
  if(r.durationBasis?.includes('估算')||r.durationBasis?.includes('預留')||r.durationBasis?.includes('推算'))warnings.push(r.durationBasis);
  if(r.leadDays&&validDay(r.date))warnings.push('至少 '+r.leadDays+' 日前預約：'+addDay(r.date,-r.leadDays)+'（截止時刻待核）');
  if(r.bookingDeadline)warnings.push('售票／預約截止 '+r.bookingDeadline);
  if(meta().departureAt&&instant(r.date,r.time)!==null&&instant(r.date,r.time)>Date.parse(meta().departureAt+':00+09:00'))errors.push('安排晚於最後可取貨／離境時間');
  if(p.restaurant&&r.menuSnapshot){
   const menu=r.menuSnapshot,preferred=menu.meal.includes('/')?(r.time>='16:00'?'晚餐':'午餐'):menu.meal,status=restaurantStatus(p.restaurant,menu,r.date,preferred);
   if(!status.allowed)errors.push('餐廳當日餐期不適用：'+status.reason);
   warnings.push(...(status.warnings||[]).map(x=>'餐廳條件：'+x));
   if(r.time&&status.windows?.length){
    const minute=r.time.split(':').reduce((n,v)=>n*60+Number(v),0);
    const inWindow=status.windows.some(w=>{const start=(w.start||'00:00').split(':').reduce((n,v)=>n*60+Number(v),0);let end=(w.end||'24:00').split(':').reduce((n,v)=>n*60+Number(v),0);if(end<start||w.endDayOffset)end+=1440;const limit=(w.lastOrder||w.lastEntry||'24:00').split(':').reduce((n,v)=>n*60+Number(v),0);return minute>=start&&minute<=end&&minute<=limit&&(w.kind==='entry_window'||r.minutes==null||minute+Number(r.minutes)<=end);});
    if(!inWindow)errors.push('入店或預留用餐時間超出已核營業／最後點餐範圍');
   }
  }

  out.set(r.id,{errors,warnings});
 }
 let previous=null,previousEnd=null;
 for(const r of ordered){const check=out.get(r.id),start=instant(r.date,r.time),sameTripGap=previousEnd!==null&&start-previousEnd<12*3600000;const transfer=numeric(r.transferMinutes),queue=numeric(r.queueMinutes)||0;
  if(previous&&(sameTripGap||rowPlace(previous).pref!==rowPlace(r).pref)){if(transfer===null)check.errors.push('前一站交通時間尚未核對，不能判為行程可行');if(previousEnd+(transfer||0)*60000+queue*60000>start)check.errors.push('時段重疊：前站結束＋交通＋報到／排隊晚於本項開始');}
  if(r.queueMinutes===null||r.queueMinutes===undefined)check.errors.push('排隊／報到時間未填；不會視為已確認0分');
  if(r.minutes!==null&&r.minutes!==undefined){const finish=start+Number(r.minutes)*60000+(numeric(r.mealMinutes)||0)*60000+(numeric(r.pickupMinutes)||0)*60000;previousEnd=previousEnd===null?finish:Math.max(previousEnd,finish);}else previousEnd=null;
  previous=r;
 }
 return out;
}
function estimateTransfer(r){
 const rows=local.trip.filter(x=>active(x)&&x.date===r.date),i=rows.findIndex(x=>x.id===r.id),p=rowPlace(r),from=i>0?rowPlace(rows[i-1]):null;
 if(!from?.coords||!p.coords){api.notify('缺可核對座標；請開導航後手動填交通預留');return;}
 const km=window.ATLAS_MAP.km(from.coords,p.coords);if(km>3||from.pref!==p.pref){api.notify('跨城或較遠路段請使用導航核對鐵路／接駁，再填所需分鐘');return;}
 r.transferMinutes=Math.ceil(km*1.35/4*60);r.transferBasis='估算：直線距離×1.35、步速4km/h；未驗證道路、河川與出口';save();api.refresh();
}
function renderRow(r,i,check,previous){
 const p=rowPlace(r),field=(key,label,type='number')=>'<label>'+e(label)+'<input type="'+type+'" data-plan-field="'+key+'" data-row="'+e(r.id)+'" value="'+e(r[key]??'')+'"'+(type==='number'?' min="0" step="1"':'')+'></label>';
 const flags=check.errors.map(t=>'<p class="plan-error">'+e(t)+'</p>').join('')+check.warnings.map(t=>'<p class="plan-warning">'+e(t)+'</p>').join('');
 return '<article class="task-card trip-stop'+(!active(r)?' cancelled':'')+'"><div class="task-card-meta">'+e(p.pref||'地區待確認')+'・日本時間・'+e(r.status)+'</div><h2><span class="stop-number">'+(i+1)+'</span>'+e(p.title)+'</h2>'+(r.menuSnapshot?'<p>'+e(r.menuSnapshot.name+'・'+r.menuSnapshot.meal+'・'+r.menuSnapshot.priceBasis)+'</p>':'')+'<div class="task-filter-grid">'+field('date','日期','date')+field('time',r.confirmedTime?'已選場次開始':'希望開始時間','time')+field('minutes','活動／停留分鐘（不含下列預留）')+'<label>狀態<select data-plan-field="status" data-row="'+r.id+'">'+['計畫中','時間待確認','場次已選・待預約','已預約','已完成','取消'].map(s=>'<option'+(r.status===s?' selected':'')+'>'+s+'</option>').join('')+'</select></label>'+field('transferMinutes','從前站交通預留（分鐘）')+field('queueMinutes','報到／排隊預留（分鐘）')+field('mealMinutes','另加用餐（分鐘，無則填0）')+field('pickupMinutes','另加取貨（分鐘，無則填0）')+field('expenseJPY','本項整組費用（日圓；未知留空）')+'</div><p class="plan-end">預計結束：'+e(timeEnd(r.date,r.time,numeric(r.minutes)===null?NaN:Number(r.minutes)+(numeric(r.mealMinutes)||0)+(numeric(r.pickupMinutes)||0)))+'</p>'+ (r.venue?'<p>場地：'+e(r.venue)+'</p>':'')+note(r.transferBasis||'交通待核')+(r.expenseBasis?'<p>'+e(r.expenseBasis)+'</p>':'')+flags+'<div class="detail-actions">'+(C.placesById.has(r.place)?b('place',r.place,'詳情與來源'):'')+b('trip-up',r.id,'上移')+b('trip-down',r.id,'下移')+b('trip-remove',r.id,'移除')+b('plan-estimate',r.id,'估算鄰近步行')+(previous?link(api.direction(p.query,rowPlace(previous).query),'核對前站交通'):'')+link(r.sourceUrl,'活動／菜單來源')+'</div></article>';
}
function render(){
 const range=days(api.state.tripStart,api.state.tripEnd),allDays=[...new Set(local.trip.map(r=>r.date).filter(validDay))].sort(),view=meta().editUndated?'__undated':(meta().editDate||api.state.day);
 const dateDays=range.length?range:allDays;const groups=new Map();for(const d of dateDays)if(!view||d===view)groups.set(d,[]);
 for(const r of local.trip){if(view&&r.date&&r.date!==view)continue;const k=r.date||'';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}
 const outside=local.trip.filter(r=>validDay(r.date)&&range.length&&(r.date<api.state.tripStart||r.date>api.state.tripEnd));const checks=inspect(),activeRows=local.trip.filter(r=>active(r)&&(!range.length||validDay(r.date)&&r.date>=api.state.tripStart&&r.date<=api.state.tripEnd));const errors=activeRows.reduce((n,r)=>n+(checks.get(r.id)?.errors.length||0),0);const warnings=activeRows.reduce((n,r)=>n+(checks.get(r.id)?.warnings.length||0),0);const unknownCost=activeRows.filter(r=>r.expenseJPY==null&&!r.productId).length;const costs=activeRows.reduce((n,r)=>n+(numeric(r.expenseJPY)||0),0);const purchaseRows=local.purchase.filter(r=>r.status!=='取消'&&(!range.length||r.purchaseDate>=api.state.tripStart&&r.purchaseDate<=api.state.tripEnd));const purchaseCost=purchaseRows.reduce((n,r)=>n+r.qty*r.price+r.shipping+r.fee,0);
 let html='<div class="plan-toolbar">'+b('plan-day','',view?'看全程總覽':'全程總覽','btn '+(!view?'primary':''))+dateDays.map((d,i)=>b('plan-day',d,'第'+(i+1)+'天 '+d.slice(5),view===d?'btn primary':'btn')).join('')+'</div>'+note((range.length?api.state.tripStart+' 至 '+api.state.tripEnd+'・'+range.length+' 天':'尚未設定完整旅行起訖，可在上方選擇')+'。每日行程不受搜尋城市篩選而消失；「目前檢視日」只切換顯示。')+'<article class="task-card"><h2>整趟旅行檢查</h2><p>'+activeRows.length+' 個範圍內有效安排・'+errors+' 項缺資料／衝突・'+warnings+' 項仍待核對</p><p>已填行程費 ¥'+costs.toLocaleString('ja-JP')+'＋本趟已填採購 ¥'+purchaseCost.toLocaleString('ja-JP')+'＝¥'+(costs+purchaseCost).toLocaleString('ja-JP')+'；另有 '+unknownCost+' 項費用未知。採購附加費未核、住宿與未填交通不算已確認0元。</p><p>'+outside.filter(active).length+' 個範圍外安排、'+local.trip.filter(r=>active(r)&&!validDay(r.date)).length+' 個未定日期事項保留在下方，未加入此範圍的合計。</p>'+(!errors?note('目前已填時間未發現衝突；估算交通、場次餘額與票券仍須核實。'):'')+'<div class="task-filter-grid"><label>收貨方式<select id="trip-receipt">'+[['unknown','尚未決定'],['store','實體店取'],['hotel','住宿收件（須旅館同意）'],['jp-address','日本固定地址'],['taiwan','寄台灣']].map(([v,l])=>'<option value="'+v+'"'+(meta().receipt===v?' selected':'')+'>'+l+'</option>').join('')+'</select></label><label>最後可取貨／離境時間（日本）<input id="trip-departure" type="datetime-local" value="'+e(meta().departureAt)+'"></label></div></article>';
 const deadlines=local.trip.filter(r=>active(r)&&(r.bookingDeadline||r.leadDays));if(deadlines.length)html+=box('出發前的報名與預約待辦',deadlines.map(r=>'<article class="task-card"><strong>'+e(rowPlace(r).title)+'</strong><p>'+e(r.bookingDeadline||addDay(r.date,-r.leadDays)+' 前，受理時刻待核')+'</p>'+link(r.sourceUrl,'核對預約／售票窗口')+'</article>').join(''));
 if(!view)html+='<div class="plan-overview">';
 for(const [day,rows] of [...groups].sort(([a],[b])=>a.localeCompare(b))){
  const dayIndex=range.indexOf(day),cities=[...new Set([...(meta().dayCities?.[day]||[]),...rows.map(r=>rowPlace(r).pref).filter(Boolean)])],title=day?(dayIndex>=0?'第 '+(dayIndex+1)+' 天・':'')+day:'尚未指定日期';
  if(!view){
   const errors=rows.filter(active).reduce((n,r)=>n+(checks.get(r.id)?.errors.length||0),0);
   html+='<article class="task-card day-overview"><h2>'+e(title)+'</h2><p class="task-card-meta">'+e(cities.join('・')||'城市待安排')+'・'+rows.filter(active).length+' 個有效安排</p>'+(errors?'<p class="plan-error">'+errors+' 項待補／衝突</p>':'')+(rows.length?'<ol class="day-agenda">'+rows.map(r=>'<li'+(!active(r)?' class="cancelled"':'')+'><strong>'+e(r.time||'時間待確認')+'</strong><span>'+e(rowPlace(r).title)+'</span>'+(r.minutes!=null&&r.time?'<small>'+e(timeEnd(r.date,r.time,Number(r.minutes)))+' 結束（含時長精確度見詳情）</small>':'')+'</li>').join('')+'</ol>':'<p>尚未排入活動或地點</p>')+b('plan-day',day||'__undated','編排這一天','btn primary')+'</article>';
  }else{
   html+=box(title,'<div class="plan-day-cities"><strong>此日城市：</strong>'+cities.map(c=>b('plan-remove-city',day+'|'+c,c+' ×')).join('')+(day?'<label>加入城市<select data-day-city="'+day+'"><option value="">選城市</option>'+A.prefs.map(p=>'<option>'+e(p.name)+'</option>').join('')+'</select></label>':'')+'</div>'+(rows.length?rows.map((r,i)=>renderRow(r,i,checks.get(r.id)||{errors:[],warnings:[]},i?rows[i-1]:null)).join(''):note('這一天尚未加入地點或活動。選此日後到探索、買物或活動加入安排。')));
  }
 }
 if(!view)html+='</div>';

 if(outside.length)html+=note('有 '+outside.length+' 個安排在目前旅行範圍外，資料已保留；可看全程或調整起訖。');
 html+='<div class="detail-actions">'+b('trip-map','all','在地圖看目前行程')+b('plan-ics','trip','匯出本趟已定時行程 ICS')+b('csv','trip','匯出完整行程 CSV')+'</div>';
 return {count:local.trip.length,html};
}
function inspirationView(){
 const styles=[
  ['fan','拉拉熊新品巡店','先看旅程內販售檔期，再核對款式、分店、限購與取貨；把未到貨和未確認庫存留在採買清單。','看新品與門市'],
  ['anime','動漫作品與買物散步','由官方確認的作品點位出發，連到合作店與商品；把每一站排到合適日期。','找作品路線'],
  ['commercial','採購與代購安排','按款式編號、通路、數量與附加費規劃；商業購買禁令和收貨條件先確認。','建立採購清單'],
  ['heritage','古蹟深讀與寺社參拜','看指定物件、原構與重建年代、分票區及御朱印；避開已知休業與特殊公開日。','探索古蹟'],
  ['collect','按主題收集日本','從有限主題清單出發，分天安排、記錄已參訪；清楚看出仍待補齊的地方。','看主題清單'],
  ['experience','動手做與傳統藝能','選定旅程中的官方場次，保留日期起訖、報到和預約來源，留下交通時間。','找可參與體驗'],
  ['limited','花火與期間限定活動','先核對當期日期、開始結束、售票與抽選截止，再安排進場及散場。','看活動日期'],
  ['food','地方美食與平價日常','按城市、用餐時段與一份主餐預算挑店；壽司每盤價與整餐費用分開。','按餐期找店'],
  ['michelin','日式料理摘星旅程','按當期星級與午晚餐菜單挑選，另算服務和平台費，提前確認放位及取消條件。','找米其林料理']
 ];
 return {count:styles.length,html:note('先在上方設定旅行起訖與人數。這些入口會開啟實際商品、地點、活動或餐廳，不會把未確認時刻自動排成已訂行程。')+styles.map(([id,title,desc,label])=>'<article class="task-card"><h2>'+e(title)+'</h2><p>'+e(desc)+'</p>'+b('travel-style',id,label)+'</article>').join('')};
}

function exportCSV(){const headers=['日期','開始_日本時間','結束_日本時間','地點','城市','場次ID','場地','活動分鐘','交通預留','排隊預留','用餐預留','取貨預留','整組費用JPY','狀態','所屬旅行範圍','官方時刻已核','來源URL','查核日','交通依據'];const rows=local.trip.map(r=>[r.date,r.time,timeEnd(r.date,r.time,numeric(r.minutes)===null?NaN:Number(r.minutes)+(numeric(r.mealMinutes)||0)+(numeric(r.pickupMinutes)||0)),rowPlace(r).title,rowPlace(r).pref,r.sessionId,r.venue,r.minutes,r.transferMinutes,r.queueMinutes,r.mealMinutes,r.pickupMinutes,r.expenseJPY,r.status,!validDay(r.date)?'未定日期':inTrip(r)?'本趟範圍內':'本趟範圍外',r.confirmedTime?'已選已列場次，空位另核':'希望／待確認',r.sourceUrl,r.checkedAt,r.transferBasis]);return [headers,...rows];}
function download(name,text,type){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function ics(){const escape=s=>String(s||'').replaceAll('\\','\\\\').replaceAll('\n','\\n').replaceAll(',','\\,').replaceAll(';','\\;');const format=n=>new Date(n).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');const rows=local.trip.filter(r=>active(r)&&inTrip(r)&&instant(r.date,r.time)!==null&&numeric(r.minutes)!==null);let out=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Japan Travel Atlas//Travel//ZH-TW'];for(const r of rows){const start=instant(r.date,r.time);out.push('BEGIN:VEVENT','UID:'+r.id+'@japan-travel-atlas','DTSTAMP:'+format(Date.now()),'DTSTART:'+format(start),'DTEND:'+format(start+Number(r.minutes)*60000),'SUMMARY:'+escape(rowPlace(r).title),'DESCRIPTION:'+escape('日本時間；'+(r.confirmedTime?'已選官方列出時段，仍需確認預約':'使用者希望時段，未代表已預約')+'\n'+r.sourceUrl),'LOCATION:'+escape(r.venue||rowPlace(r).query),'STATUS:TENTATIVE','END:VEVENT');}out.push('END:VCALENDAR');download('japan-trip.ics',out.join('\r\n'),'text/calendar;charset=utf-8');api.notify('已匯出 '+rows.length+' 項定時安排；未知起訖與取消項目未匯出');}
function init(v){api=v.api;local=v.local;save=v.save;helpers=v;meta();for(const r of local.trip){r.title=r.title||rowPlace(r).title;r.status=r.status||'計畫中';if(r.transferMinutes===undefined)r.transferMinutes=null;if(r.queueMinutes===undefined)r.queueMinutes=null;}
 document.addEventListener('click',ev=>{const t=ev.target.closest('button');if(!t)return;const d=t.dataset;
  if(d.planDay!==undefined){meta().editUndated=d.planDay==='__undated';const outside=validDay(d.planDay)&&api.state.tripStart&&api.state.tripEnd&&(d.planDay<api.state.tripStart||d.planDay>api.state.tripEnd);meta().editDate=outside?d.planDay:'';api.setDay(meta().editUndated||outside?'':d.planDay);return;}
  if(d.planSession){addSession(d.planSession);return;}
  if(d.pickupProduct){const [productId,venueId]=d.pickupProduct.split('|'),data=window.ATLAS_TASK_DATA.shopping,p=data.products.find(p=>p.id===productId),v=data.currentVenues?.find(v=>v.id===venueId);if(!p||!v)return;const known=venueId==='baseyard-harajuku'?C.placesById.get('baseyard-harajuku-naname'):null;const day=selectedDate();if(day&&(day<v.sale_from||day>v.sale_to)){api.notify('這家店的已核販售檔期不在所選日');return;}addRow({id:known?.id||'venue:'+venueId,title:v.name+'・'+p.variant,pref:v.region,query:v.name,coords:known?.coords||null,href:known?.href},{productId,venueId,minutes:45,durationBasis:'採買預留45分，可修改',pickupMinutes:15,pickupBasis:'取貨預留估算，依現場調整',queueMinutes:30,queueBasis:'活動排隊預留估算，不能保證足夠',expenseJPY:null,expenseBasis:'商品成本在採購清單另列，避免重複計算',status:'計畫中'});return;}
  if(d.planEvent){const event=A.events.find(x=>x.id===d.planEvent);if(!event)return;const day=document.querySelector('[data-event-day="'+CSS.escape(event.id)+'"]')?.value,time=document.querySelector('[data-event-time="'+CSS.escape(event.id)+'"]')?.value;if(!validDay(day)){api.notify('請先選參與日期');return;}if(event.start&&day<event.start||event.end&&day>event.end||event.id==='date-3'&&day>='2026-12-27'&&day<='2027-01-07'){api.notify('此日不在已核活動日期，或為暫停日');return;}addRow({id:'event:'+event.id,title:event.title,pref:api.state.pref,query:event.title,href:event.href},{date:day,time:time||'',entityType:'event',activityId:'event-generic:'+event.id,sourceUrl:event.href||'',confirmedTime:false});return;}
  if(d.planUnconfirmed){const p=C.placesById.get(d.planUnconfirmed);if(p)addRow(p,{activityId:activityFor(p.id)?.activityId,confirmedTime:false});return;}
  if(d.planEstimate){const r=local.trip.find(x=>x.id===d.planEstimate);if(r)estimateTransfer(r);return;}
  if(d.planMeal){
   const p=C.placesById.get(d.planMeal),select=document.querySelector('[data-dining-menu="'+CSS.escape(d.planMeal)+'"]'),m=p?.restaurant.menu[Number(select?.value)];if(!select?.value||!m){api.notify('請先選擇菜單');return;}
   const day=document.querySelector('[data-meal-day="'+CSS.escape(p.id)+'"]')?.value||selectedDate(),time=document.querySelector('[data-meal-time="'+CSS.escape(p.id)+'"]')?.value||'';
   const status=restaurantStatus(p.restaurant,m,day,time>='16:00'&&m.meal.includes('晚餐')?'晚餐':m.meal.includes('午餐')?'午餐':'晚餐');if(validDay(day)&&!status.allowed){api.notify('此日餐期不適用：'+status.reason);return;}
   const isPlate=/盤/.test(m.priceBasis||''),price=window.ATLAS_TASKS.menuCost(m);
   addRow(p,{date:day,time,minutes:m.durationMinutes||90,durationBasis:m.durationBasis||'官方未核固定用餐長度，規劃預留90分可修改',menuSnapshot:m,expenseJPY:isPlate?null:price*api.state.party,expenseBasis:isPlate?'每盤價格不作人均整餐費，請按實際點餐填總額':(m.taxStatus||'稅況待核')+'；'+(m.serviceStatus||'附加費待核'),sourceUrl:m.source,checkedAt:p.restaurant.checkedAt||'2026-11-20',status:'計畫中'});return;
  }

  if(d.planIcs){ics();return;}
  if(d.travelStyle){
   const id=d.travelStyle;
   if(id==='anime'){api.switchNav('anime');return;}
   if(id==='collect'){api.switchNav('collections');return;}
   if(id==='experience'){api.switchNav('experiences');return;}
   if(id==='limited'){api.switchNav('calendar');return;}
   if(id==='heritage'){api.switchNav('explore');const q=document.getElementById('search');q.value='古蹟';q.dispatchEvent(new Event('input',{bubbles:true}));return;}
   if(id==='food'||id==='michelin'){window.ATLAS_TASKS.reset();api.switchNav('food');if(id==='michelin'){const stars=document.querySelector('[data-food-filter=stars]');stars.value='3';stars.dispatchEvent(new Event('change',{bubbles:true}));}return;}
   api.switchNav('shopping');if(id==='commercial'){const purpose=document.getElementById('purchase-purpose');purpose.value='commercial';purpose.dispatchEvent(new Event('change',{bubbles:true}));}return;
  }

  if(d.planRemoveCity){const [day,city]=d.planRemoveCity.split('|');meta().dayCities[day]=(meta().dayCities[day]||[]).filter(c=>c!==city);save();api.refresh();}
 });
 document.addEventListener('change',ev=>{const t=ev.target,d=t.dataset;
  if(d.mealDay){const p=C.placesById.get(d.mealDay),menu=document.querySelector('[data-dining-menu="'+CSS.escape(d.mealDay)+'"]'),target=document.querySelector('[data-meal-options="'+CSS.escape(d.mealDay)+'"]');if(p&&menu&&target)target.innerHTML=mealOptions(p,Number(menu.value),t.value);return;}
  if(d.diningMenu){const p=C.placesById.get(d.diningMenu),target=document.querySelector('[data-meal-options="'+CSS.escape(d.diningMenu)+'"]');if(p&&target)target.innerHTML=t.value!==''?mealOptions(p,Number(t.value)):'';return;}
  if(d.activityDate){if(!t.value||validDay(t.value)){api.setDay(t.value);api.openPlace(d.activityDate,false);}return;}
  if(d.activitySession){const day=document.querySelector('[data-activity-date="'+CSS.escape(d.activitySession)+'"]')?.value;const range=day?[day]:days(api.state.tripStart,api.state.tripEnd);const row=range.flatMap(d=>occurrences(d.activitySession,d)).find(s=>s.id===t.value);const node=document.querySelector('[data-session-details="'+CSS.escape(d.activitySession)+'"]');if(node)node.innerHTML=row?api.facts([['場次日期',row.date],['開始／結束',row.start+'–'+(row.end||'結束待核')],['容量上限（非餘額）',row.totalCapacity??'未公開'],['剩餘名額','未查核'],['報到／入場',row.doorsOpen||'待確認'],['售票截止',row.bookingDeadline||row.saleEnd||'待確認'],['取消',row.cancellation||'依所選預約頁核對'],['來源查核',row.checkedAt]])+link(row.sourceUrl,'核對此場原頁'):'';return;}
  if(d.planField){const r=local.trip.find(r=>r.id===d.row);if(!r)return;r[d.planField]=['minutes','transferMinutes','queueMinutes','mealMinutes','pickupMinutes','expenseJPY'].includes(d.planField)?numeric(t.value):t.value;if(d.planField==='transferMinutes')r.transferBasis='使用者填入預留時間，需以導航與班次核對';if(['time','date'].includes(d.planField)&&r.sessionId){r.confirmedTime=false;r.publicationStatus='已手動改時刻，需重新核對原場次';}save();api.refresh();return;}
  if(d.dayCity&&t.value){meta().dayCities[d.dayCity]=[...new Set([...(meta().dayCities[d.dayCity]||[]),t.value])];save();api.refresh();return;}
  if(['trip-receipt','shopping-receipt'].includes(t.id)){meta().receipt=t.value;save();api.refresh();return;}
  if(t.id==='trip-departure'){meta().departureAt=t.value;save();api.refresh();return;}
 });
}
window.ATLAS_PLANNER={eventSummary,eventPicker,init,render,inspirationView,addRoutePoint,addPlace,sessionPicker,diningPicker,occurrences,closure,inspect,restaurantStatus,ruleApplies,inTrip,mapItems,exportCSV,days,addDay,validDay,instant,activities,activityFor,rowPlace,profile:()=>({...meta()})};
})();
