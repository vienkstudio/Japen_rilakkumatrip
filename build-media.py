from concurrent.futures import ThreadPoolExecutor
from html import unescape
from io import BytesIO
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from PIL import Image, ImageOps
import json
import re

ROOT = Path(__file__).resolve().parent / "dist" / "assets"
PHOTOS = ROOT / "photos"
PHOTOS.mkdir(exist_ok=True)
WIKI = "https://en.wikipedia.org/w/api.php"
COMMONS = "https://commons.wikimedia.org/w/api.php"
AGENT = "JapanTripAtlas/2.0 (https://japan-rilakkuma-travel-atlas.vienk.chatgpt.site; CC-licensed attribution and travel photo index)"
ARTICLES = {
    "skytree": ("Tokyo Skytree", "東京晴空塔"),
    "sensoji": ("Sensō-ji", "淺草寺"),
    "tokyo": ("Tokyo Station", "東京站"),
    "arashiyama": ("Arashiyama", "京都嵐山"),
    "tenryuji": ("Tenryū-ji", "天龍寺"),
    "kyoto": ("Gion", "祇園街區"),
    "osaka": ("Osaka Castle", "大阪城"),
    "kawagoe": ("Kawagoe, Saitama", "川越"),
    "nagaoka": ("Nagaoka, Niigata", "長岡"),
    "sapporo": ("Sapporo", "札幌"),
    "otaru": ("Otaru", "小樽"),
    "sendai": ("Sendai", "仙台"),
    "yokohama": ("Minato Mirai 21", "橫濱港未來"),
    "kusatsu": ("Kusatsu Onsen", "草津溫泉"),
    "fuji": ("Fuji-Q Highland", "富士急樂園"),
    "nagoya": ("Nagoya Station", "名古屋站"),
    "kobe": ("Kobe Harborland", "神戶港灣"),
    "miyajima": ("Itsukushima Shrine", "宮島嚴島神社"),
    "dogo": ("Dōgo Onsen", "道後溫泉"),
    "fukuoka": ("Hakata Station", "福岡博多站"),
    "kurokawa": ("Kurokawa Onsen", "黑川溫泉"),
    "odaiba": ("Odaiba", "東京台場"),
    "buckwheat": ("Hegi soba", "新潟へぎそば"),
    "kanazawa": ("Kanazawa Station", "金澤站"),
    "kitakami": ("Kitakami, Iwate", "北上"),
    "hiroshima": ("Hiroshima Station", "廣島站"),
    "japan": ("Shibuya Crossing", "東京澀谷"),
}
EXACT = {
    "katakai": ("2011 katakai festival 4-shaku dama.jpg", "片貝祭正四尺玉（2011 年）"),
    "bear-tokyo": ("San-x.jpg", "東京站拉拉熊店（舊照）"),
    "bear-skytree": ("Rilakumma store @ Tokyo Solamachi @ Tokyo Skytree Town (11625967276).jpg", "晴空街道拉拉熊店（舊照）"),
    "bear-kyoto": ("Rilakkuma Cafe Arashiyama 2017-12-05 (25198868708).jpg", "嵐山拉拉熊茶房（2017 年）"),
}
def request(url):
    with urlopen(Request(url,headers={"User-Agent":AGENT}),timeout=18) as response:
        return response.read()

def api(base, **arg):
    return json.loads(request(base+"?"+urlencode({"action":"query","format":"json","formatversion":2,**arg})))

def plain(v):
    return " ".join(unescape(re.sub("<[^>]+>"," ", v)).split())

def get_item(item):
    key,(title,caption),exact=item
    try:
        if exact:
            filename=title
        else:
            hit=api(WIKI,titles=title,redirects=1,prop="pageimages",piprop="name",pilicense="free")["query"]["pages"][0]
            filename=hit.get("pageimage")
        if not filename or filename.lower().endswith((".svg",".webp",".gif",".png")):
            return key,None
        hit=api(COMMONS,titles="File:"+filename,prop="imageinfo",iiprop="url|extmetadata",iiurlwidth=960,iiextmetadatafilter="LicenseShortName|LicenseUrl|Artist|UsageTerms")["query"]["pages"][0]
        info=hit["imageinfo"][0]
        m=info.get("extmetadata",{})
        license=m.get("LicenseShortName",{}).get("value","")
        license_url=m.get("LicenseUrl",{}).get("value","")
        author=plain(m.get("Artist",{}).get("value","")) or "Wikimedia Commons"
        if not re.match(r"^(CC BY(?:-SA)? [1-4]\.|CC0|Public domain)",license,re.I):
            return key,None
        path=PHOTOS/(key+".jpg")
        if key=="katakai" and (ROOT/"katakai.jpg").is_file():
            raw=(ROOT/"katakai.jpg").read_bytes()
        else:
            url=info.get("thumburl") or info["url"]
            try: raw=request(url)
            except Exception: raw=request(info["url"])
        picture=ImageOps.exif_transpose(Image.open(BytesIO(raw))).convert("RGB")
        picture.thumbnail((1040,1040),Image.Resampling.LANCZOS)
        picture.save(path,quality=86,optimize=True)
        print(f"{key} · {license}",flush=True)
        return key,dict(src="photos/"+path.name,label=caption,author=author,license=license,licenseUrl=license_url,
                        source=info["descriptionurl"])
    except Exception as exc:
        print(f"{key}: {type(exc).__name__}: {exc}",flush=True)
        return key,None

jobs=[(k,v,False) for k,v in ARTICLES.items()]+[(k,v,True) for k,v in EXACT.items()]
with ThreadPoolExecutor(max_workers=3) as pool:
    items=dict((k,v) for k,v in pool.map(get_item,jobs) if v)
(ROOT/"photos.js").write_text("window.ATLAS_PHOTOS="+json.dumps(items,ensure_ascii=False,separators=(",",":"))+";\n",encoding="utf-8")
print(f"{len(items)} credited photos",flush=True)

