
(() => {
"use strict";
const coverage = new Set(window.ATLAS_RAIL_GRID || []);
const cache = new Map();
const readCell = key => {
 if(!coverage.has(key)) return Promise.resolve({l:[],s:[]});
 if(!cache.has(key)){
  const operation=fetch("./assets/rails/"+key+".json").then(r=>{if(!r.ok)throw Error(r.status);return r.json();});
  cache.set(key,operation);
  operation.catch(()=>cache.delete(key));
 }
 return cache.get(key);
};
const cell = p => [Math.floor(p[1]*2),Math.floor(p[0]*2)];
const km = (a,b) => {
 const dy = (a[0]-b[0])*111.2;
 const dx = (a[1]-b[1])*111.2*Math.cos((a[0]+b[0])*Math.PI/360);
 return Math.hypot(dx,dy);
};
async function localStations(p, maxDistance=4, limit=4){
 if(!p?.coords)return [];
 const [x,y]=cell(p.coords);
 const keys=[];
 for(let a=x-1;a<=x+1;a++) for(let b=y-1;b<=y+1;b++) keys.push(a+"-"+b);
 const location=(await Promise.all(keys.map(readCell))).flatMap(f=>f.s);
 const stationRows=location.map(([name,agency,coords,lines])=>({name,agency,coords,lines,km:km(p.coords,coords)}))
  .filter(s=>s.km<=maxDistance).sort((a,b)=>a.km-b.km);
 const groups=[];
 for(const row of stationRows){
  const same=groups.find(s=>s.name===row.name&&km(s.coords,row.coords)<.55);
  if(same){
   same.agencies.add(row.agency);
   same.lines=[...new Set([...same.lines,...row.lines])];
  }else groups.push({...row,agencies:new Set([row.agency])});
 }
 return groups.slice(0,limit).map(s=>({...s,agency:[...s.agencies].join("・"),googleName:s.name+"駅"}));
}
const GSI='<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">國土地理院</a>';
const MLIT='<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2025.html" target="_blank" rel="noopener">國土交通省 N02</a>';
const OSM='© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
const tiles = {
 pale:["https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png",GSI,18],
 std:["https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",GSI,18],
 photo:["https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg",GSI,18],
 osm:["https://tile.openstreetmap.org/{z}/{x}/{y}.png",OSM,19]
};
function color(line, operator){
 if(line.includes("銀座"))return "#d28722";
 if(line.includes("浅草"))return "#ba645c";
 if(line.includes("半蔵門"))return "#7856b1";
 if(line.includes("山手"))return "#58842f";
 if(line.includes("御堂筋"))return "#a83742";
 if(line.includes("新幹線"))return "#2e806e";
 if(operator.includes("旅客鉄道"))return "#526ba3";
 if(operator.includes("地下鉄")||operator.includes("東京都"))return "#9c5c82";
 return "#647e66";
}
function init({icon,esc,option,external,google,onPref,onPlace,onFailure,onAreaMove}){
 if(!window.L){onFailure("地圖元件載入失敗。地點詳情仍可打開 Google Maps。");return null;}
 const byId=id=>document.getElementById(id);
 const map=L.map("map",{zoomSnap:.5,scrollWheelZoom:true,minZoom:4,maxZoom:19,zoomControl:false,preferCanvas:false});
 L.control.zoom({position:"bottomright"}).addTo(map);
 L.control.scale({position:"bottomleft",imperial:false}).addTo(map);
 map.attributionControl.setPrefix(false); map.attributionControl.addAttribution(MLIT);
 const prefectures=L.geoJSON(null,{style:{color:"#748674",weight:1,fillColor:"#a6c298",fillOpacity:.12},
  onEachFeature(f,l){const p=window.ATLAS.prefs.find(p=>p.id===f.properties.id);if(p){l.bindTooltip(p.name);l.on("click",()=>onPref(p));}}});
 const rail=L.layerGroup(), station=L.layerGroup(), pins=L.layerGroup().addTo(map);
 let backdrop=null, cellKey="", loadIndex=0, local={l:[],s:[]}, visiblePlaces=[], selected=null, nearbyFocus=null, lineQuery="";
 const markerBy=new Map();
 const toggle=(layer,yes)=>{if(yes&&!map.hasLayer(layer))layer.addTo(map);else if(!yes&&map.hasLayer(layer))map.removeLayer(layer)};
 function syncLayers(){
  toggle(prefectures,byId("layer-boundary").checked&&map.getZoom()<10);
  toggle(rail,byId("layer-rail").checked);toggle(station,byId("layer-station").checked);
 }
 function base(key){
  const [url,attribution,maxNativeZoom]=tiles[key]||tiles.pale;
  if(backdrop)map.removeLayer(backdrop);
  backdrop=L.tileLayer(url,{attribution,maxNativeZoom,maxZoom:19,noWrap:true,updateWhenIdle:true});
  let errors=0;
  backdrop.on("tileerror",()=>{if(++errors===5)onFailure("部分底圖未載入，可在圖層切換其他來源。");});
  backdrop.addTo(map);
 }
 function visibleGrid(){
  const bounds=map.getBounds();
  const [x1,y1]=cell([bounds.getSouth(),bounds.getWest()]);
  const [x2,y2]=cell([bounds.getNorth(),bounds.getEast()]);
  const keys=[];
  for(let x=x1;x<=x2;x++)for(let y=y1;y<=y2;y++)if(coverage.has(x+"-"+y))keys.push(x+"-"+y);
  return keys;
 }
 function renderLines(){
  rail.clearLayers();station.clearLayers();
  const lineFilter=byId("line-filter");
  const candidates=[...new Set(local.l.map(row=>row[1]+"｜"+row[2]))].sort((a,b)=>a.localeCompare(b,"ja"));
  lineFilter.innerHTML=option("","全部線路")+candidates.map(n=>option(n,n)).join("");
  lineFilter.disabled=candidates.length===0;
  if(candidates.includes(lineQuery))lineFilter.value=lineQuery;
  else lineQuery="";
  if(map.getZoom()<10.5)return;
  const show=(operator,line)=>!lineQuery||operator+"｜"+line===lineQuery;
  const filterBounds=map.getBounds().pad(.18);
  for (const [,operator,line,coords] of local.l) {
   if(!show(operator,line))continue;
   L.polyline(coords,{weight:lineQuery?4:2.2,color:color(line,operator),opacity:.78,interactive:!!lineQuery})
    .bindTooltip(esc(operator+" · "+line)).addTo(rail);
  }
  for(const [name,operator,coords,lines] of local.s){
   if(!filterBounds.contains(coords)||!lines.some(l=>show(operator,l)))continue;
   const key=name+"駅 "+operator;
   const point=L.circleMarker(coords,{radius:map.getZoom()>=13?4.2:3,color:"#3f6279",fillColor:"#fff",fillOpacity:.98,weight:1.45})
     .bindTooltip(esc(name),{direction:"top"});
   point.bindPopup("<strong>"+esc(name+"駅")+"</strong><p>"+esc(operator+"｜"+lines.join("、"))+"</p>"+external(google(key),"Google Maps 車站 ↗"));
   point.addTo(station);
  }
 }
 async function updateRail(){
  syncLayers();
  const keys=map.getZoom()>=10.5?visibleGrid():[];
  const key=keys.join("|");
  if(key===cellKey){renderLines();return;}
  cellKey=key;
  const index=++loadIndex;
  try{
   const pieces=await Promise.all(keys.map(readCell));
   if(index!==loadIndex)return;
   const l=new Map(),s=new Map();
   for(const piece of pieces){
    for(const row of piece.l)l.set(row[0],row);
    for(const row of piece.s)s.set(row[0]+"|"+row[1]+"|"+row[2].join(","),row);
   }
   local={l:[...l.values()],s:[...s.values()]};renderLines();
  }catch{if(index===loadIndex){cellKey="";onFailure("鐵路線暫時讀不到。可縮放地圖再試一次。");}}
 }
 const marks={official:"shop",rilanowa:"shop",theme:"shop",retail:"shop",food:"food",craft:"craft",heritage:"landmark",fireworks:"spark",event:"calendar"};
 const colors={official:"#98583a",rilanowa:"#927036",theme:"#8c5537",retail:"#765f43",food:"#a1712a",craft:"#8f599e",heritage:"#4a6b79",fireworks:"#9d4548",event:"#407457"};
 function pinRender(){
  markerBy.clear();pins.clearLayers();
  const entries=[...visiblePlaces];
  for(const p of [selected,nearbyFocus])if(p&&!entries.some(x=>x.id===p.id))entries.push(p);
  const located=entries.filter(p=>p.coords),zoom=map.getZoom(),groups=new Map();
  for(const p of located){
   if(p.id===selected?.id||p.id===nearbyFocus?.id){draw(p);continue;}
   const point=map.project(p.coords,zoom);
   const key=zoom<6.5?(window.ATLAS.prefs.find(x=>x.name===p.pref)?.region||p.pref):zoom<9?p.pref:zoom<13?Math.floor(point.x/70)+"|"+Math.floor(point.y/70):p.coords.map(x=>x.toFixed(5)).join("|");
   if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);
  }
  function draw(p){
   const active=p.id===selected?.id||p.id===nearbyFocus?.id;
   const marker=L.marker(p.coords,{title:p.title+(p.approx?"（附近位置）":""),alt:p.title,zIndexOffset:active?1000:400,icon:L.divIcon({
    className:"pin-symbol"+(active?" active":"")+(p.approx?" approximate":""),iconSize:[44,44],iconAnchor:[22,22],
    html:'<span style="--pin:'+colors[p.kind]+'">'+icon(marks[p.kind]||"pin")+'</span>'
   })}).bindTooltip(esc(p.title+(p.approx?" · 附近位置":"")),{className:"marker-label",direction:"top",offset:[0,-20]});
   marker.on("click",()=>onPlace(p.id,"map"));marker.addTo(pins);markerBy.set(p.id,marker);
  }
  const occupied=[];
  for(const group of groups.values()){
   if(group.length===1&&zoom>=9){draw(group[0]);continue;}
   const center=group.reduce((a,p)=>[a[0]+p.coords[0]/group.length,a[1]+p.coords[1]/group.length],[0,0]);
   const name=zoom<6.5?(window.ATLAS.regions.find(r=>r.key===(window.ATLAS.prefs.find(x=>x.name===group[0].pref)?.region))?.name||group[0].pref):zoom<9?group[0].pref:group.length+" 個地點";
   let dx=0,dy=0;
   if(zoom<6.5){
    const point=map.project(center,zoom),viewport=map.getPixelBounds();
    const clamped={x:Math.max(viewport.min.x+56,Math.min(viewport.max.x-56,point.x)),y:Math.max(viewport.min.y+170,Math.min(viewport.max.y-85,point.y))};
    const candidates=[clamped];
    for(let y=viewport.min.y+170;y<=viewport.max.y-85;y+=52)for(let x=viewport.min.x+56;x<=viewport.max.x-56;x+=106)candidates.push({x,y});
    candidates.sort((a,b)=>Math.hypot(a.x-point.x,a.y-point.y)-Math.hypot(b.x-point.x,b.y-point.y));
    const chosen=candidates.find(rect=>!occupied.some(r=>Math.abs(r.x-rect.x)<104&&Math.abs(r.y-rect.y)<50))||clamped;
    dx=chosen.x-point.x;dy=chosen.y-point.y;occupied.push(chosen);
    if(dx||dy)L.polyline([center,map.unproject([point.x+dx,point.y+dy],zoom)],{color:"#48745e",weight:1,opacity:.6,interactive:false}).addTo(pins);
   }

   const marker=L.marker(center,{title:name+"・放大檢視",icon:L.divIcon({className:"cluster-marker",iconSize:[100,46],iconAnchor:[50-dx,23-dy],html:'<span>'+esc(name)+(zoom<9?'<b>'+group.length+'</b>':'')+'</span>'})});
   if(zoom>=13){marker.bindPopup('<strong>同一位置 '+group.length+' 筆</strong>'+group.map(p=>'<p><button class="btn" type="button" data-place="'+esc(p.id)+'">'+esc(p.title)+'</button></p>').join(""));}
   else marker.on("click",()=>{map.fitBounds(L.latLngBounds(group.map(p=>p.coords)),{maxZoom:zoom<9?11:15,padding:[70,110],animate:false});if(map.getZoom()<=zoom)map.setZoom(zoom+2);});
   marker.addTo(pins);
  }
 }
 const tripLayer=L.layerGroup().addTo(map);
 function showTrip(items){
  tripLayer.clearLayers();visible(items,null);
  items.forEach((p,i)=>{if(!p.coords)return;L.marker(p.coords,{title:(i+1)+". "+p.title,icon:L.divIcon({className:"trip-marker",iconSize:[38,38],iconAnchor:[19,19],html:'<span>'+(i+1)+'</span>'})}).on("click",()=>onPlace(p.id,"map")).addTo(tripLayer);if(i&&items[i-1].coords)L.polyline([items[i-1].coords,p.coords],{dashArray:"5 7",color:"#245343"}).bindTooltip("行程序列直線示意；實際交通請開導航").addTo(tripLayer);});
  const positioned=items.filter(p=>p.coords);if(positioned.length)map.fitBounds(L.latLngBounds(positioned.map(p=>p.coords)),{maxZoom:15,padding:[60,100],animate:false});
 }

 function visible(items,active){visiblePlaces=items;selected=active;pinRender();}
 function focus(p){
  if(!p?.coords)return false;
  nearbyFocus=p;map.setView(p.coords,Math.max(map.getZoom(),14),{animate:false});pinRender();
  return true;
 }
 function visit(v){
  nearbyFocus=null;
  if(v){
   const distance=v.width/185000;
   map.fitBounds([[v.center[0]-distance*.67,v.center[1]-distance],[v.center[0]+distance*.67,v.center[1]+distance]],{maxZoom:15,padding:[16,25],animate:false});
  }else map.setView([36.82,137.83],5,{animate:false});
 }
 function showStation(record){
  if(!record)return;
  const name=record.query?record.name:record.name+"駅";
  const line=record.line||record.agency+"｜"+record.lines.join("、");
  const query=record.query||name+" "+record.agency;
  map.setView(record.coords,Math.max(14,map.getZoom()),{animate:false});
  L.popup().setLatLng(record.coords).setContent("<strong>"+esc(name)+"</strong><p>"+esc(line)+"</p>"+external(google(query),"開啟 Google Maps ↗")).openOn(map);
 }
 map.on("moveend",()=>{updateRail();pinRender();onAreaMove?.();});
 byId("base").addEventListener("change",e=>base(e.target.value));
 byId("line-filter").addEventListener("change",e=>{lineQuery=e.target.value;renderLines();});
 ["layer-rail","layer-station","layer-boundary"].forEach(k=>byId(k).addEventListener("change",syncLayers));
 fetch("./assets/prefectures.json").then(r=>{if(!r.ok)throw Error(r.status);return r.json();})
 .then(d=>{prefectures.addData(d);syncLayers();})
 .catch(()=>onFailure("縣界暫時讀不到，仍可搜尋地點與切換地圖。"));
 base("pale");
 return {map,visible,focus,visit,showStation,localStations,km,showTrip,clearFocus:()=>{selected=null;nearbyFocus=null;tripLayer.clearLayers();pinRender();},
  resize:()=>{map.invalidateSize({pan:false,debounceMoveend:true});},
  center:p=>map.setView(p,9,{animate:false}),bounds:()=>map.getBounds(),
  get zoom(){return map.getZoom();}
 };
}
window.ATLAS_MAP={init,localStations,km};
})();


