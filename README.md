# 日本拉拉熊旅遊圖鑑

同屏旅遊規劃和照片瀏覽。從本目錄啟動本機伺服器：
py -m http.server 8732 --bind 127.0.0.1 --directory dist

dist 是公開版。build-data.py 產生旅遊資料，build-rail.py 從相鄰「資料」目錄的國土交通省鐵路資料產生按地區下載的線路與車站檔。build-media.py 下載可重用照片並記錄作者、授權與原始出處。原有 PDF 和參考資料保存在相鄰「資料」目錄。

站內地圖使用國土地理院與 OpenStreetMap 圖磚。實景照有些是店舖舊照，其餘標示為區域實景。Google Maps 提供定位和大眾運輸導航，食べログ使用公開店舖頁，拉拉熊官方資料連回 San-X 公告。
