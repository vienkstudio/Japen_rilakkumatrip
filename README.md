# 日本拉拉熊旅遊圖鑑

公開互動網站：https://japan-rilakkuma-travel-atlas.vienk.chatgpt.site/

以繁體中文探索拉拉熊門市、四尺玉煙火、古蹟及在地文化體驗。可搜尋日文名稱、篩選地區與縣市、放大有來源的實景照、查附近車站及切換鐵路和街道圖層。收藏保存在瀏覽器。

## 本機預覽

在儲存庫根目錄執行以下指令，開啟 http://127.0.0.1:8732/。

```powershell
python -m http.server 8732 --bind 127.0.0.1 --directory dist
```

網站採靜態 HTML、CSS 與 JavaScript，dist 可直接預覽與部署，無需安裝套件。圖磚及外部官方頁面需要網路。

## 在地體驗

在地體驗入口涵蓋染布、織布、紡紗、賽馬、相撲、和太鼓、歌舞伎及藝伎／舞妓藝能。12 項研究分列成 16 個場館條目，TAIKO-LAB 的青山、秋葉原、京都、梅北和神戶各有自己的地址及預約入口。

可篩選參與方式、預約、教學語言、時間與成人起價。日期查詢顯示已收錄的官方場次或通常休館條件，餘額與臨時異動須回官方查詢。東京競馬本場／場外資訊收錄 2026 年 11 月 JRA 日曆，公園開放日另核官方 PDF。帶廣的日期來自主辦官網，涵蓋範圍以畫面狀態為準。

官方營運資訊和各則實訪心得均附來源。心得保留來源日期、造訪日期查核狀態和作者身分依據。照片及課程圖片可從官方與心得原頁開啟。部分項目仍待確認外語、收費單位或第一手心得，詳情直接列出缺口。

## 資料檔案

- dist/assets/data.js 保留原有店舖、活動、行程和區域資料。
- dist/assets/travel-details.js 收錄押上、嵐山和兩場四尺玉煙火的查核補充。
- dist/assets/culture-data.js 收錄體驗的營運資訊、已核對日期及實訪來源。
- dist/assets/culture.js 提供體驗篩選、日期提示、詳情和行程串接。
- research/local-experiences-2026-11-20.json 與 .md 保留研究交接原稿；網站資料另反映後續核實的價目、交通和日曆，更新差異見 culture-data.js。
- build-data.py、build-media.py、build-rail.py 是既有資料整理工具，使用本機相鄰資料目錄；直接預覽 dist 不需要執行。

## 來源與授權

San-X、商家及主辦官網提供查核依據，Google Maps 與食べログ以對應外部頁面開啟。底圖可切換國土地理院及 OpenStreetMap，鐵路和車站來自日本國土交通省 N02。照片作者、授權、年份及原始來源隨照片顯示。Leaflet 授權見 dist/assets/leaflet-LICENSE.txt。

資料查核日期為 2026-11-20。