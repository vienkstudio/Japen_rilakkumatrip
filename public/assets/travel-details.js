(() => {
"use strict";

const rilanowa = "https://www.san-x.co.jp/rilakkuma/rilanowa/";
const solamachi = "https://www.tokyo-solamachi.jp/";
const sabo = "https://rilakkumasabo.jp/";
const saboLocation = "https://maps.app.goo.gl/ZStavtpuccwm8EST6";
const saboSeason = "https://www.san-x.co.jp/ja/blog/2026-10-post-0529220/";
const saboGoods = "https://www.san-x.co.jp/ja/blog/2026-11-post-0425070/";
const katakai = "https://katakaimachi-enkakyokai.info/";
const konosu = "https://kounosuhanabi.com/";
const districtGuide = solamachi + "pdf/floorguide/floorguide_ja.pdf";
const arashiAddress = "京都府京都市右京区嵯峨天龍寺北造路町15";
const arashiStations = [
 {name:"嵐電 嵐山站", line:"嵐電嵐山本線・北岸・店方標示步行約 1 分", coords:[35.015365,135.678215], query:"嵐山駅 京福電気鉄道"},
 {name:"JR 嵯峨嵐山站", line:"JR 嵯峨野線・北岸・步行約 9 分", coords:[35.018785,135.68131], query:"JR 嵯峨嵐山駅"},
 {name:"阪急 嵐山站", line:"阪急嵐山線・南岸・過渡月橋步行約 12 分", coords:[35.00987,135.68233], query:"阪急 嵐山駅"}
];
const updates = {
 "official-6":{
  title:"押上拉拉熊店",
  japanese:"リラックマストア 東京スカイツリータウン・ソラマチ店",
  aliases:"押上拉拉熊店 押上晴空街道拉拉熊店 晴空塔拉拉熊 Oshiage Solamachi リラックマストア 東京ソラマチ店",
  query:"リラックマストア 東京スカイツリータウン・ソラマチ店 東京都墨田区押上1-1-2",
  floor:"西棟 3F・3 番地", hours:"10:00–21:00", address:"東京都墨田区押上1-1-2",
  summary:"西棟 3F・3 番地 · 10:00–21:00",
  note:"拉拉熊、角落小夥伴與晴空塔合作商品。限定款發售及庫存可查 San-X 和商場公告。",
  access:"搭東武到東京晴空塔站，較靠近西棟。搭半藏門線、淺草線或京成線到押上站，進商場後沿樓層指示往西棟 3F。",
  stations:[
   {name:"東京晴空塔站", line:"東武晴空塔線・西棟側", coords:[35.71047,139.80940], query:"とうきょうスカイツリー駅"},
   {name:"押上站", line:"東京Metro 半藏門線 H14／都營淺草線 A20／京成押上線／東武", coords:[35.71022,139.81241], query:"押上駅 スカイツリー前"}
  ],
  related:["rilanowa-34"],
  sources:[["San-X 官方門市","https://www.san-x.co.jp/ja/store-blogs/2026-06-post-0741260/"],["RilaNowa 認證名錄",rilanowa],["東京晴空街道樓層圖 PDF",districtGuide],["商場車站與入口",solamachi+"access/"]]
 },
 "rilanowa-34":{
  floor:"東棟 1F・10 番地", summary:"東棟 1F・10 番地 · RilaNowa 認證雜貨店",
  note:"角色雜貨店，販售商品與庫存依各店公告。從押上站進商場可先逛東棟 1F。",
  aliases:"押上 パーティリコ パーティ リコ Party Rico 晴空街道",
  related:["official-6"],
  sources:[["RilaNowa 認證名錄",rilanowa],["東京晴空街道樓層圖 PDF",districtGuide]]
 },
 "arashi-tea":{
  title:"嵐山拉拉熊茶房", japanese:"嵐山 りらっくま茶房",
  aliases:"嵐山茶房 嵐山拉拉熊茶房 嵐山拉拉熊伴手禮店 嵐山拉拉熊店 りらっくま茶房 嵐山 Arashiyama Rilakkuma Sabo",
  area:"arashiyama", address:arashiAddress, tags:["bear"], coords:[35.0162951,135.6771103], approx:false,
  summary:"1F 伴手禮／外帶 · 2F 餐廳／現場取號",
  note:"店舖位於天龍寺正門對面；採買、外帶與內用各有營業時段。",
  floors:[
   {title:"1F 伴手禮／外帶", standard:"商店 10:00–18:00；外帶 10:00–17:30", winter:"商店 10:00–17:30；外帶 10:00–17:00", note:"可找茶房限定的京胡蘿蔔茶小熊吊飾（2026/11/28 發售）。", links:[["官方商品照片",saboGoods],["官方外帶菜單",sabo+"takeout"]]},
   {title:"2F 餐廳／內用", standard:"10:30–17:30；午餐最後點餐 16:30，咖啡 17:00", winter:"10:30–17:00；午餐最後點餐 16:00，咖啡 16:30", note:"當天用門口機器取號。店方有時會提早停止取號，電話及網路不接受預約。", tabelog:true, links:[["官方餐點照片・秋季咖哩",sabo+"foods-5288/"]]}
  ],
  access:"嵐電、JR 都在桂川北岸。阪急嵐山站在南岸，前往茶房需過渡月橋。", stations:arashiStations,
  related:["arashiyama-yu","poi-arashiyama-1"],
  sources:[["茶房官網｜店舖與交通",sabo+"#access"],["茶房官網提供的地圖",saboLocation],["San-X｜茶房及之湯營業資料",saboSeason],["RilaNowa 認證名錄",rilanowa]]
 },
 "poi-katakai-0":{
  japanese:"片貝まつり 浅原神社秋季例大祭奉納大煙火",
  summary:"2027/9/10–11 已公告 · 新潟小千谷",
  note:"主辦現行概況四尺玉預定22:00；個別番付、觀覽席及交通異動仍待核對。",
  guide:{
   notice:"以下為 2026 年歷屆動線。2027 年的站位、班次與票券待主辦方公布。",
   arrival:[{title:"從 JR 長岡站出發", stops:["長岡站大手口","越後交通往片貝","五之町臨時巴士站","淺原神社／觀覽區"], note:"臨時站與道路管制請對照當年官方交通圖。", links:[["2026 官方交通圖 PDF",katakai+"r8_traffic_information2.pdf"]]}],
   departure:[
    {title:"搭臨時巴士回 JR 長岡站", stops:["觀覽區","五之町臨時巴士站","臨時巴士","長岡站東口"], note:"回長岡的上車點是五之町。回到長岡後請另查當日轉乘及鐵路末班時刻。", links:[["2026 官方回程圖 PDF",katakai+"r8_traffic_information2.pdf"]]},
    {title:"搭停車場接駁", stops:["片貝製作所前","臨時接駁","小千谷市總合體育館等停車場"], note:"西部線接駁按停車場分流。請確認停車場編號及回程停靠站。", links:[["2026 停車場與接駁",katakai+"etc_info.html"]]}
   ]
  },
  sources:[["主辦方｜2027 日期",katakai],["2026 主辦方交通與接駁",katakai+"etc_info.html"],["奉納煙火介紹",katakai+"enka_info.html"]]
 },
 "poi-konosu-0":{
  japanese:"こうのす花火大会・糠田運動場",
  aliases:"鴻巢 鴻巣 鴻巢四尺玉 こうのす Konosu",
  summary:"2027 日期與場次待公告 · 埼玉鴻巢",
  note:"歷屆有四尺玉。2027 日期、四尺玉節目、觀覽票及管制均待主辦方公告。",
  guide:{
   notice:"以下為 2026 年歷屆動線。2027 年閘口、分流、票區與車班以當年公告為準。",
   arrival:[{title:"鴻巢站西口出發，按票區分流", stops:["JR 鴻巢站西口","持票往糠田／免費往 Poppy 會場"], note:"鴻巢站到糠田約步行 40 分。請先確認票面和官方分流圖。", links:[["2026 官方入場分流圖",konosu+"2026/10/04/station-route/"],["主辦方車站交通",konosu+"access/accsess-train.html"]]}],
   departure:[
    {title:"往大宮／東京", stops:["糠田會場","按官方順路走地下道","鴻巢站東口・上行臨時閘口"], note:"依照主辦回程圖及現場站務人員指示前往上行閘口。", links:[["2026 官方東口回程圖",konosu+"wp-content/uploads/Okaeri-1024x631.jpg"],["2026 地下道分流詳圖",konosu+"wp-content/uploads/792db35f50fd33f34f3a42c9be3b4f46-e1727097561630-811x756.png"]]},
    {title:"往熊谷／高崎", stops:["糠田會場","鴻巢站西口／北鴻巢站","JR 高崎線往北"], note:"往西口需經鴻巢站入口（西口）路口。從糠田會場出發也可考慮官方北鴻巢步行動線。", links:[["2026 官方北鴻巢回程圖",konosu+"wp-content/uploads/1a6b624510d8e81a6143d4e5678e8eed-708x1024.png"],["2026 官方散場說明",konosu+"access/accsess-train.html"]]}
   ]
  },
  sources:[["主辦方最新公告",konosu],["2026 官方列車與散場說明",konosu+"access/accsess-train.html"],["埼玉縣觀光素材相簿","https://saitama-supportdesk.com/ja/photos/post-15136/"]]
 }
};
const additionalPlaces = [{
 id:"arashiyama-yu", pref:"京都", kind:"theme", area:"arashiyama",
 title:"嵐山拉拉熊之湯禮品店", japanese:"おみやげどころ 嵐山 りらっくまの湯",
 aliases:"拉拉熊之湯 嵐山之湯 りらっくまの湯 Rilakkuma no Yu",
 query:"おみやげどころ 嵐山 りらっくまの湯 京都市右京区嵯峨天龍寺北造路町15",
 coords:updates["arashi-tea"].coords, approx:true, address:arashiAddress,
 summary:"溫泉主題禮品店 · 商店 10:00 開門",
 note:"嵐山之湯和茶房使用相同街道地址。這間禮品店的限定吊飾是藍浴衣茶小熊（2026/11/28 發售）。",
 hours:"3/6–12/5 10:00–18:00；12/6–3/5 10:00–17:30",
 access:updates["arashi-tea"].access, stations:arashiStations, related:["arashi-tea"],
 sources:[["之湯官網",sabo+"rilakkumanoyu/"],["San-X｜之湯專屬商品照片",saboGoods],["San-X｜之湯營業資料",saboSeason]]
}];

const regionalRows = [
 ['akita','秋田','千秋公園・久保田城跡','千秋公園 久保田城跡',[39.722,140.124],['JR 秋田駅西口','千秋公園入口','二之丸跡'], '秋田站走到公園入口約 5 分，到二之丸跡約 15 分。','https://www.city.akita.lg.jp/kurashi/doro-koen/1003685/1007159/1007194.html'],
 ['nagano','長野','善光寺與門前町','信州善光寺',[36.662,138.188],['JR 長野駅善光寺口','善光寺大門（巴士）','善光寺本堂'], '長野站善光寺口 1 號站牌搭車，到善光寺大門後步行約 5 分。','https://www.zenkoji.jp/access/'],
 ['gifu','岐阜','白川鄉合掌造聚落','白川郷 荻町合掌造り集落',[36.257,136.907],['白川郷バスターミナル','和田家','荻町城跡展望台'], '從高山或金澤等地轉巴士到荻町；和田家和展望台可從巴士總站步行接上。','https://shirakawa-go.gr.jp/access/'],
 ['nara','奈良','東大寺・奈良公園','東大寺 大仏殿',[34.689,135.840],['近鉄奈良駅','登大路町往東','東大寺大佛殿'], '從近鐵奈良站步行約 20 分；也可搭市內循環巴士，在東大寺大仏殿・春日大社前下車。','https://www.todaiji.or.jp/access/'],
 ['wakayama','和歌山','和歌山城與櫸木大道','史跡 和歌山城',[34.228,135.171],['JR 和歌山駅中央口','けやき大通り','和歌山城公園'], '從和歌山站沿櫸木大道向西。也可搭巴士至「市役所前」，按公園入口指示進城。','https://wakayamajo.jp/access/'],
 ['kochi','高知','高知城與路面電車','高知城',[33.561,133.531],['JR 高知駅','はりまや橋（轉車）','高知城前'], '從高知站前搭路面電車，到播磨屋橋轉往高知城前，再步行上城。','https://shikoku-tourism.com/access/movement/kochist/kochi'],
 ['saga','佐賀','佐賀城本丸歷史館','佐賀城本丸歴史館',[33.244,130.303],['JR 佐賀駅南口','佐賀駅バスセンター','博物館前'], '從佐賀站搭往佐賀城跡方向的巴士，在博物館前下車，走進本丸歷史館。','https://saga-museum.jp/sagajou/access/'],
 ['miyazaki','宮崎','青島神社','青島神社 宮崎',[31.805,131.476],['JR 青島駅','弥生橋','青島神社'], 'JR 日南線青島站下車步行，走彌生橋上島；過橋後有一段沙地。','https://www.kanko-miyazaki.jp/spot/1207']
];
const regionalRoutes = regionalRows.map(([key,pref,title,japanese,coords,walk,note,href])=>{
 const id="regional-"+key;
 additionalPlaces.push({
  id, pref, title, japanese, query:japanese, coords, approx:true, kind:"heritage",
  note, summary:walk.join(" → "), sources:[["官方交通資訊",href]]
 });
 return {
  id:"local-"+key, pref, region:pref, title, subtitle:note, period:"半日文化散步",
  steps:walk.map((stop,i)=>({when:"第 "+(i+1)+" 站",title:stop,query:stop+" "+pref,note:i===0?note:""})),
  notes:[], links:[["官方交通資訊",href]], stops:[id]
 };
});
window.ATLAS_TRAVEL_DETAILS = {
 updates, additionalPlaces, regionalRoutes,
 aliases:{"rilanowa-21":"official-6","rilanowa-46":"arashi-tea","poi-arashiyama-0":"arashi-tea"}
};
})();

