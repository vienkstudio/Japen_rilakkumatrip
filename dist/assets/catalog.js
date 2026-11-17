
(() => {
"use strict";
const A = window.ATLAS;
const sourcePhotos = window.ATLAS_PHOTOS || {};
const copiedPins = {
  0:"atlas-north-0",1:"atlas-tohoku-2",2:"atlas-kanto-4",4:"poi-tokyo-0",
  5:"atlas-tokyo-7",6:"poi-asakusa-1",7:"atlas-tokyo-3",8:"atlas-tokyo-6",
  9:"atlas-tokyo-5",10:"atlas-kanto-2",11:"atlas-chubu-2",13:"poi-kyoto-0",
  14:"poi-osaka-0",15:"atlas-kansai-4",16:"poi-osaka-2",17:"poi-osaka-1",
  18:"atlas-kansai-5",19:"atlas-kyushu-0"
};
const exactPhotos = {
  "official-4":"bear-tokyo","official-6":"bear-skytree","poi-asakusa-1":"bear-skytree",
  "poi-tokyo-0":"bear-tokyo","poi-arashiyama-0":"bear-kyoto","arashi-tea":"bear-kyoto",
  "poi-katakai-0":"katakai","poi-tokyo-3":"tokyo","poi-arashiyama-1":"tenryuji",
  "poi-osaka-3":"osaka"
};
const photoAreas = {
  katakai:"katakai",ojiya:"nagaoka",settaya:"nagaoka",kawagoe:"kawagoe",
  asakusa:"sensoji",tokyo:"tokyo",arashiyama:"arashiyama",kyoto:"kyoto",osaka:"osaka"
};
const prefImages = {
  北海道:"sapporo",宮城:"sendai",岩手:"kitakami",東京:"tokyo",神奈川:"yokohama",
  群馬:"kusatsu",山梨:"fuji",愛知:"nagoya",京都:"kyoto",大阪:"osaka",兵庫:"kobe",
  廣島:"miyajima",愛媛:"dogo",福岡:"fukuoka",熊本:"kurokawa",石川:"kanazawa",新潟:"nagaoka"
};
const viewShort = {
  asakusa:"東京・淺草／押上",tokyo:"東京・東京站／御茶之水",katakai:"新潟・片貝花火",
  ojiya:"新潟・小千谷",settaya:"新潟・長岡摂田屋",kawagoe:"埼玉・川越",
  konosu:"埼玉・鴻巢花火",arashiyama:"京都・嵐山",kyoto:"京都・河原町／祇園",
  osaka:"大阪・梅田／心齋橋"
};
const labels = {
  official:"官方店",rilanowa:"認證店",theme:"拉拉熊景點",retail:"其他商品通路",
  food:"餐廳",fireworks:"四尺玉",heritage:"古蹟／文化",craft:"手作",event:"期間活動"
};
const categories = [
  ["all","全部地點"],["bear","拉拉熊"],["fireworks","四尺玉"],["heritage","古蹟"],
  ["craft","手作"],["food","餐廳"],["event","活動"]
];
const routesPhotos = {
  "katakai-6":"katakai","konosu-culture":"kawagoe",sapporo:"sapporo",sendai:"sendai",
  "tokyo-core":"tokyo","tokyo-east":"skytree","tokyo-west":"japan",kusatsu:"kusatsu",fuji:"fuji",
  miura:"yokohama",nagoya:"nagoya",kyoto:"bear-kyoto",osaka:"osaka",kobe:"kobe",hiroshima:"miyajima",
  shikoku:"dogo",fukuoka:"fukuoka",kurokawa:"kurokawa"
};
const old = new Map(A.places.map(p=>[p.id,p]));
const used = new Map(Object.entries(copiedPins).map(([n,id])=>[id,"official-"+n]));
const omitted = new Set([...used.keys(),"atlas-tokyo-0","atlas-tokyo-4","atlas-kanto-0","atlas-tokyo-1","atlas-kansai-0"]);
const places = A.places.filter(p=>!omitted.has(p.id)).map(p=>{
  const original = old.get(copiedPins[p.id.split("-")[1]]);
  const related = p.kind==="official" && original ? original : null;
  const aliases = [];
  if(["official","rilanowa","theme","retail"].includes(p.kind)) aliases.push("拉拉熊 リラックマ Rilakkuma San-X 懶懶熊 轻松熊");
  if(p.kind==="craft") aliases.push("手作 工坊 伝統工芸");
  if(p.kind==="heritage") aliases.push("文化 古蹟 神社 寺廟");
  if(p.kind==="fireworks") aliases.push("四尺玉 4尺玉 煙火 花火");
  if(p.id==="poi-katakai-0") aliases.push("新潟 片貝祭 片貝まつり 小千谷 淺原神社");
  if(p.id==="poi-konosu-0") aliases.push("鴻巢花火大會 こうのす花火大会");
  if(p.id==="poi-asakusa-0") aliases.push("淺草寺 雷門 仲見世淺草");
  if(p.id==="official-6") aliases.push("晴空塔 東京晴空街道 Solamachi 押上 晴空塔 拉拉熊專賣店");
  if(p.id==="official-4") aliases.push("東京站 東京車站 一番街 丸之內 八重洲");
  if(p.id==="poi-arashiyama-0"||p.id==="arashi-tea") aliases.push("嵐山 嵐山茶房 嵐山拉拉熊茶房 拉拉熊茶房 拉拉熊之湯");
  const m=p.title.match(/(?:^|[・／])([^・／]*?)(?:站|空港)/);
  if(m) aliases.push(m[1]+"車站",m[1]+"駅");
  let photo = exactPhotos[p.id] || photoAreas[p.area] || prefImages[p.pref];
  if(p.id==="atlas-tokyo-2") photo="odaiba";
  if(p.id==="atlas-north-2") photo="otaru";
  if(p.id==="atlas-tohoku-1") photo="kitakami";
  if(p.id==="atlas-chugoku-1") photo="hiroshima";
  if(p.id==="other-regions-0") photo="kanazawa";
  if(p.id==="miyajima-goods") photo="miyajima";
  let coords = p.coords || related?.coords || null, approx = p.approx || related?.approx;
  if(p.id==="1899") {coords=old.get("poi-tokyo-2").coords;approx=false;}
  if(p.id==="arashi-tea") {coords=old.get("poi-arashiyama-0").coords;approx=false;}
  if(p.id==="hakata-kushi") {coords=old.get("atlas-kyushu-1").coords;approx=true;}
  if(p.id==="miyajima-goods") {coords=old.get("atlas-chugoku-0").coords;approx=true;}
  let title = p.title, note = p.note;
  if(p.id==="poi-katakai-0"){title="片貝祭・四尺玉";note="2027/9/10–9/11 · 新潟小千谷。兩晚可分開安排，觀覽席與接駁等主辦公布。";}
  if(p.id==="poi-konosu-0"){title="鴻巢花火・糠田會場";note="歷屆有四尺玉。2027 日期、場次與進出場安排待公告。";}
  if(p.id==="poi-arashiyama-0")title="嵐山拉拉熊伴手禮店";
  if(p.id==="official-6") title="押上晴空街道拉拉熊店";
  if(p.id==="official-4") title="東京站一番街拉拉熊店";
  if(p.id==="poi-osaka-3")note="從谷町四丁目站步行到大手門，沿石垣進大阪城公園。";
  return {...p,title,note,aliases:aliases.join(" "),coords,approx,photo:sourcePhotos[photo]?photo:null,
    area:p.area||related?.area||({"official-6":"asakusa","official-4":"tokyo","miyajima-goods":""}[p.id]||null),
    nearbyPhoto:!exactPhotos[p.id],canonicalId:used.get(p.id)||p.id};
});
const featured = ["official-6","poi-asakusa-0","poi-asakusa-2","poi-katakai-0","arashi-tea","official-4","poi-arashiyama-1","poi-osaka-3"];
const placesById = new Map(places.map(p=>[p.id,p]));
for (const [k,v] of used) if(placesById.has(v)) placesById.set(k,placesById.get(v));
const assets = Object.keys(sourcePhotos);
const gallery = [...new Set(["bear-skytree","bear-tokyo","bear-kyoto","katakai","sensoji","arashiyama","kawagoe",...assets])].filter(x=>assets.includes(x));
window.ATLAS_CATALOG = {labels,categories,routesPhotos,viewShort,photoAreas,places,placesById,featured,gallery};
})();


