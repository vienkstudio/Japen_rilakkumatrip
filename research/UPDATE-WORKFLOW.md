# 日本旅遊App資料更新流程

網站：https://japan-rilakkuma-travel-atlas.vienk.chatgpt.site/

更新資料，不重新部署。以本站連接工具official_source_status讀狀態，refresh_official_sources更新固定9來源，再official_source_status讀回確認成功時間、條數、錯誤與變動。工具驗證網站擁有者身分，沒有登入或來源無法讀取時保留舊成功資料並報明原因，勿偽造身分或庫存。

報價來源先從status的verifiedOfferSources取得固定商品/網址。逐一實讀相同SKU或JAN、同款新品、含稅單價、運費與資格，record_verified_offer寫回，再讀回確認。搜尋快取或來源未標時效需在sourceNote說明；無法讀取填fetch-failed，不同商品填not-orderable及amount=null，禁止拿近似款或點數扣抵當現金價格。MZ22201原いしだ屋網址目前指其他商品，維持不適用同款比價，除非重新核實。

區分官方發表日、本站首次收錄和觀察/更新日。日期未知維持未知；新增日期精確度屬資料核對，不是假新公告。官網列時段不是空位、門市取扱不是該SKU現貨、預約受理不是成立。中文通知只報重大日期/場次/價格/官方庫存文字或抓取失敗變動，無變動不打擾；不得下單或訂位。
