from pathlib import Path
import json
import sys
import zipfile
from statistics import mean

site = Path(__file__).resolve().parent
archive = site.parent / "資料" / "work"
sys.path.insert(0, str(archive))
import atlas_data as a
import culture_data as c


import guide_data as g
import nearby_data as n
import render_atlas as r
from culture_geoms import GEOMS

assets = site / "dist" / "assets"
assets.mkdir(parents=True, exist_ok=True)
sources = {**g.SOURCES, **a.SOURCES, **n.SOURCES, **c.SOURCES}
def write(name, data, js=False):
    payload=json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    (assets / name).write_text(("window.ATLAS=" + payload + ";\n") if js else payload, encoding="utf-8")

def links(keys):
    return [[k,sources[k]] for k in keys if k in sources]

native = "北海道 青森 岩手 宮城 秋田 山形 福島 茨城 栃木 群馬 埼玉 千葉 東京 神奈川 新潟 富山 石川 福井 山梨 長野 岐阜 静岡 愛知 三重 滋賀 京都 大阪 兵庫 奈良 和歌山 鳥取 島根 岡山 広島 山口 徳島 香川 愛媛 高知 福岡 佐賀 長崎 熊本 大分 宮崎 鹿児島 沖縄".split()
groups=[{k:v for k,v in reg.items() if k in ("key","name","ids","bounds","subtitle","advice")} for reg in a.REGIONS if reg["key"]!="tokyo"]
def prefecture(value):
    return next((p for p,j in zip(a.PREFS,native) if value.startswith(p) or value.startswith(j)), "")
prefs=[dict(id=i, name=p, jp=native[i-1], center=list(reversed(a.PREF_LABELS[i-1])),
            region=next(x["key"] for x in groups if i in x["ids"]),
            summary=("片貝四尺玉、小千谷機織、長岡摂田屋" if i==15 else a.INDEX.get(i,("",None))[0]),
            motif=a.MOTIFS.get(i,""))
       for i,p in enumerate(a.PREFS,1)]
def point(id, title, pref, kind, note, query, coords=None, **extra):
    return dict(id=id,title=title,pref=pref,kind=kind,note=note,query=query,coords=coords,**extra)

places=[]
for i,(label,floor,hours,tel,jp) in enumerate(n.OFFICIAL):
    p=prefecture(label)
    places.append(point(f"official-{i}",label.replace("｜"," "),p,"official",
                        ("福岡 PARCO 公告 2027/2/28 結束營業，請確認新店公告。" if p=="福岡" else "拉拉熊官方店。發售、庫存與休館日期請查品牌門市或商場最新公告。"),
                        jp+" "+floor,floor=floor,hours=hours,tel=tel,href=sources["官方店完整資料"]))
for i,(pref,shop,address) in enumerate(r.STORES):
    places.append(point(f"rilanowa-{i}",shop,prefecture(pref),"rilanowa",
                        "San-X RilaNowa 認證門市，各店商品與庫存不同。",shop+" "+address,
                        address=address,tel=r.STORE_TELS.get((pref,shop,address)),href=sources["認證店官方名錄"]))
others={
 "other-kanto":["東京"]*6+["神奈川"],
 "other-regions":["石川","新潟","靜岡","香川","熊本","鹿兒島","沖繩"]}
for key,area,t,sub,period,rows,src in n.MORE:
    for i,(district,venue,detail,jp,tel,branch) in enumerate(rows):
        places.append(point(f"{key}-{i}",venue,others[key][i],"retail",detail,jp,
                            district=district,tel=tel,href=branch or sources[src[0]]))
map_prefs=["新潟"]*3+["埼玉"]*2+["東京"]*2+["京都"]*2+["大阪"]
viewmaps=[]
for j,(key,title,sub,period,filters,stations,pois,blocks,src,related) in enumerate(c.MAPS):
    lat,lon,width,z=GEOMS[key]
    viewmaps.append(dict(id=key,title=title,subtitle=sub,pref=map_prefs[j],center=[lat,lon],width=width,period=period,
                         blocks=blocks,links=links(src),filters=filters))
    for i,(jp,label,plat,plon,_,_) in enumerate(pois):
        name=label[2:] if label[:1] in "①②③④⑤" else label
        if key in ("katakai","konosu"): kind="fireworks"
        elif any(x in name for x in ("拉拉熊","官方店","PARCO","Q’s","北館","茶房","八重洲")): kind="theme"
        elif any(x in name for x in ("扇","切子","織之座","椿之藏")): kind="craft"
        elif name.startswith("1899"): kind="food"
        else: kind="heritage"
        places.append(point(f"poi-{key}-{i}",name,map_prefs[j],kind,next((body for h,body in blocks if name.split("／")[0] in body),sub),jp,[plat,plon],
                            href=sources[src[0]],area=key))
atlas_region_default={"north":"北海道","tohoku":"","kanto":"","tokyo":"東京","chubu":"",
                      "kansai":"","chugoku":"","shikoku":"","kyushu":""}
pref_map={"北上":"岩手","仙台":"宮城","富士急":"山梨","名古屋":"愛知","橫濱":"神奈川","三浦":"神奈川",
          "嵐山":"京都","大阪":"大阪","梅田":"大阪","神戶":"兵庫","宮島":"廣島","道後":"愛媛",
          "黑川":"熊本","福岡":"福岡","博多":"福岡","大分":"大分","草津":"群馬","越谷":"埼玉","富士見":"埼玉","幕張":"千葉","流山":"千葉",
          "真岡":"栃木","湯河原":"神奈川","北千住":"東京","御茶之水":"東京","台場":"東京","札幌":"北海道","水戶":"茨城"}
def nearest_pref(lat,lon,ids):
    return min((p for p in prefs if p["id"] in ids),key=lambda p:(lat-p["center"][0])**2+(lon-p["center"][1])**2)["name"]
for reg in a.REGIONS:
    for i,(title,lat,lon,kind,detail,query,page) in enumerate(reg["stops"]):
        pref=atlas_region_default[reg["key"]] or next((v for k,v in pref_map.items() if k in title),None) or nearest_pref(lat,lon,reg["ids"])
        places.append(point(f"atlas-{reg['key']}-{i}",title,pref,{"visit":"theme","shop":"theme","event":"event","motif":"retail"}.get(kind,"theme"),
                            detail,query,[lat,lon],story=page,approx=True))
for i,(area,name) in enumerate(g.BATHS):
    places.append(point(f"bath-{i}",name,prefecture(area),"event","2027/1/8–4/4 おふろcafé 拉拉熊合作浴池，依各店內容與營業公告。",area+" "+name,
                        href=sources["おふろcafé 聯名預告"],address=area))
food=[
 ("ojiya-soba","小千谷そば角屋","新潟","小千谷桜町，想在花火前吃へぎそば，可排在前往會場前的午餐。","小千谷そば角屋","https://tabelog.com/niigata/A1502/A150201/15001022/","https://www.maff.go.jp/j/pr/aff/2404/heritage06.html"),
 ("wataya","わたや 平沢店","新潟","へぎそば與午餐備選。先看交通與分店，避免把平沢店和本店混在一起。","わたや 平沢店 小千谷","https://tabelog.com/niigata/A1502/A150201/15000087/","https://www.maff.go.jp/j/pr/aff/2404/heritage06.html"),
 ("1899","RESTAURANT 1899 OCHANOMIZU","東京","御茶之水的茶料理，2026/12/1–2027/2/28 的茶小熊期間餐以官方預約頁為準。9 月花火行程可以選一般餐。","RESTAURANT 1899 OCHANOMIZU","https://tabelog.com/tokyo/A1310/A131002/13170863/",sources["1899 菜單與訂位"]),
 ("arashi-tea","嵐山 りらっくま茶房","京都","天龍寺附近。二樓餐廳採現場取號，可先確認午餐最後點餐時間，再安排茶房與伴手禮店。","嵐山 りらっくま茶房","https://tabelog.com/kyoto/A2601/A260403/26029769/","https://rilakkumasabo.jp/shop/%E5%B5%90%E5%B1%B1-"),
 ("hakata-kushi","串家物語 KITTE 博多","福岡","博多站附近。拉拉熊搭配品是否提供取決於聯名檔期與門市，訂位時按活動與分店官網確認。","串家物語 KITTE博多店","https://tabelog.com/fukuoka/A4001/A400101/40042685/",sources["串家物語聯名"]),
 ("miyajima-goods","宮島茶房｜限定伴手禮","廣島","商品店仍營業。餐廳及外帶區已結束營業，可把宮島餐食安排在其他店。","宮島 りらっくま茶房",None,"https://rilakkumasabo.jp/3975"),
]
for id,title,pref,note,q,tab,href in food:
    places.append(point(id,title,pref,"food" if tab else "theme",note,q,tabelog=tab,href=href))
stories=[]
for p in g.PAGES+a.EXTRA_PAGES:
    stories.append({**{k:v for k,v in p.items() if k not in ("rows","links")},
                    "links":links(p["links"]),
                    "photoRefs":[{"caption":cap,"credit":cr} for _,images in p["rows"] for _,cap,cr,_ in images]})
routes=[]
route_prefs=["北海道","宮城","東京","東京","東京","埼玉","神奈川","群馬","山梨","愛知","京都","大阪","兵庫","廣島","愛媛","福岡","熊本"]
for i,(key,region,title,sub,period,_,stops,notes,src,map_key,details) in enumerate(n.ROUTES):
    routes.append(dict(id=key,title=title,region=region,pref=route_prefs[i],subtitle=sub,period=period,
                       steps=[dict(when=t,title=label,query=q,note=note) for t,label,q,note in stops],
                       notes=notes,links=links(src),story=details))
routes.insert(0,dict(id="katakai-6",title="新潟片貝＋東京 6 天",region="新潟・東京",pref="新潟",
    subtitle="長岡住 3 晚，東京住 2 晚。把兩晚的觀覽席與散場巴士安排好，再訂新幹線與工房。",
    period="2027/9/9–9/14｜片貝 9/10、9/11；打揚時間、售票與交通等 2027 年公告",
    steps=[dict(when=t,title=label,note=note,map=m.removeprefix("geo-")) for t,label,note,m in c.KATAKAI_PLAN],
    notes=[["煙火優先","往例兩晚各有 22:00 四尺玉。當年節目、票價與交通以主辦方為準。"],
           ["雨天調整","看主辦是否照常、改時或延期。摂田屋發酵博物館、機織與東京購物可調換。"]],
    links=links(["片貝｜2027 正式日期","片貝｜主辦方祭典與節目","新潟｜織之座預約","東京｜江戶切子預約"])))
routes.append(dict(id="konosu-culture",title="川越・鴻巢・東京 3 天",region="埼玉・東京",pref="埼玉",
    subtitle="鴻巢曾施放四尺玉，等 2027 日期及節目確認。川越留完整一天，花火當天按票種選動線。",
    period="備選｜2027 日期、票種與花火節目待公告",
    steps=[dict(when="第 1 天",title="川越藏造街、真山車、達摩彩繪",note="西武本川越或東武／JR 川越站進出。一番街、時之鐘、祭典會館與椿之藏可步行串連。",map="kawagoe"),
           dict(when="第 2 天",title="JR 高崎線到鴻巢",note="糠田會場從鴻巢西口或北鴻巢，依主辦指定道路步行。2026 常規參考約 40 分鐘，散場另留時間。",map="konosu"),
           dict(when="第 3 天",title="東京・淺草到錦糸町",note="淺草神社、押上官方店、江戶切子館。以工房約到的時間調整先後。",map="asakusa")],
    notes=[["住宿動線","住大宮可用川越線與高崎線分別來回。住池袋也可由東武東上線前往川越。"]],
    links=links(["鴻巢｜主辦方與歷屆紀錄","鴻巢｜火花節交通","埼玉｜川越祭典會館","埼玉｜椿之藏達摩"])))
events_fixed=[
 ("2026-11-20","2026-12-06"),("2026-11-25","2026-12-25"),("2026-09-01","2026-11-30"),
 ("2026-12-01","2027-02-28"),("2026-12-06","2026-12-06"),("2026-10-16","2026-12-20"),
 ("2026-12-18","2027-01-17"),("2026-11-13","2026-12-27"),("2027-01-08","2027-04-04")]
events=[dict(id=f"date-{i}",when=w,title=t,story=k,start=l,end=h,kind="event") for i,((w,t,k),(l,h)) in enumerate(zip(g.DATES,events_fixed,strict=True))]
events.extend([
 dict(id="katakai-event",when="2027/9/10–9/11",title="片貝祭・四尺玉",start="2027-09-10",end="2027-09-11",map="katakai",kind="fireworks",href=sources["片貝｜2027 正式日期"]),
 dict(id="konosu-event",when="2027 待公告",title="鴻巢花火大會",map="konosu",kind="fireworks",href=sources["鴻巢｜主辦方與歷屆紀錄"]),
 dict(id="exam-event",when="2027/3/14",title="拉拉熊檢定見面會，2026/12/3 報名截止",start="2027-03-14",end="2027-03-14",story="examday",kind="event")])
events[5].update(title="串家物語聯名",story=None,href=sources["串家物語聯名"])
events.append(dict(id="kitakami-book",when="11/20–12/20",title="岩手北上拉拉熊書咖啡",start="2026-11-20",end="2026-12-20",story="book",kind="event"))
events.sort(key=lambda e: e.get("start") or "9999")
write("data.js",dict(regions=groups,prefs=prefs,places=places,routes=routes,events=events,stories=stories,views=viewmaps,sources=sources),True)

def sample_ring(ring):
    stride=max(1,len(ring)//170)
    result=[[round(x,4),round(y,4)] for x,y in ring[::stride]]
    if result[-1]!=result[0]: result.append(result[0])
    return result
prefdata=json.loads((archive/"japan.geojson").read_text(encoding="utf-8"))
for f in prefdata["features"]:
    polys=f["geometry"]["coordinates"]
    if f["geometry"]["type"]=="Polygon": polys=[polys]
    rings=sorted((p[0] for p in polys if len(p[0])>10),key=len,reverse=True)[:42]
    if not rings: rings=[polys[0][0]]
    f["geometry"]={"type":"MultiPolygon","coordinates":[[sample_ring(ring)] for ring in rings]}
    f["properties"]={"id":f["properties"]["id"]}
write("prefectures.json",prefdata)

with zipfile.ZipFile(archive/"culture_maps"/"rail.zip") as z:
    def load(s):
        return json.load(z.open(next(f for f in z.namelist() if f.endswith("_"+s+".geojson"))))["features"]
    rails,stations=load("RailroadSection"),load("Station")
def parts(f):
    geom=f["geometry"]
    return [geom["coordinates"]] if geom["type"]=="LineString" else geom["coordinates"]
def roundpart(pl):
    return [[round(lon,5),round(lat,5)] for lon,lat in pl]
for j,(key,*_) in enumerate(c.MAPS):
    lat,lon,width,_=GEOMS[key]
    delta=max(.021,width/125000)
    def local(p):
        return any(abs(x-lon)<delta and abs(y-lat)<delta for x,y in p)
    lines=[]
    for f in rails:
        prop=f["properties"]
        lines.extend([dict(line=prop["N02_003"],agency=prop["N02_004"],path=roundpart(p)) for p in parts(f) if local(p)])
    stops={}
    for f in stations:
        prop=f["properties"]
        coords=[x for p in parts(f) for x in p]
        if not local(coords): continue
        x,y=zip(*coords)
        k=(prop["N02_005"],prop["N02_004"])
        if k not in stops:
            stops[k]=dict(name=k[0],agency=k[1],coord=[round(mean(y),6),round(mean(x),6)],lines=[])
        if prop["N02_003"] not in stops[k]["lines"]: stops[k]["lines"].append(prop["N02_003"])
    write(f"rail-{key}.json",dict(lines=lines,stations=list(stops.values())))
print(f"{len(prefs)} prefectures, {len(places)} directory entries, {len(routes)} routes, {len(stories)} guides, {len(viewmaps)} detailed rail map files")


