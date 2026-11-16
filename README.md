# 日本拉拉熊旅遊圖鑑

網站是靜態 HTML、CSS 與 JavaScript。完整 PDF、原始資料、圖磚與原先排版腳本位於相鄰的 資料 資料夾。

預覽時，從本資料夾執行 py -m http.server 8731 --bind 127.0.0.1 --directory dist，再開啟 http://127.0.0.1:8731/。地圖載入當地 JSON，直接以 file:// 開啟會受瀏覽器的本機檔案限制。

開放圖資包括國土地理院（淡色、標準、航照）、OpenStreetMap、國土交通省 2025 N02 與地球地圖縣界。10 個局部視窗的鐵路線形和車站隨網站發佈，可切換線路、圖層與底圖。地點查詢及交通規劃開啟 Google Maps。食べログ使用個別餐廳公開店頁。San-X 索引依官方店舖、RilaNowa 認證名錄與活動公開資料編整，細節連回原頁。

公開檔案都在 dist/。公開站的片貝照片由 Kropsoq 授權為 CC BY 3.0（Wikimedia Commons），網站以 CSS 裁切顯示。先前 PDF 與其中的參考照片僅保存在本機的 資料 資料夾。

build-data.py 從相鄰 資料/work 讀入旅遊資料與圖形，產生 dist/assets 內的 data.js、縣界和鐵路 JSON。執行環境需要 Python 3.10 以上、ReportLab、Pillow 與原圖鑑使用的中文字型。

