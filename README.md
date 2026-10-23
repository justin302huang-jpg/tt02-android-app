# TT-02 改裝助手 2.0（PWA）

## 主要功能
- 零件資料庫：品牌、料號、分類、價格、圖片網址、購買網址、TT-02/TT-02B/TT-02D 相容性標記與備註。
- 購物報價：每個零件可記多筆台灣賣場報價，含商品價、運費、其他費用、查價日與購買狀態。
- 性能設定：儲存底盤、KV、電壓、齒數、輪胎尺寸、避震、電裝與操控心得。
- 計算器：總齒比、理論馬達轉速、輪胎周長、理論車速估算。
- 保養提醒：齒輪潤滑、軸承、避震器與電池檢查。
- 改裝照片牆：IndexedDB 本機存圖，每次最多 4 張，每張 3 MB 以下。
- 可互動的 3D 風格示意車、外觀顏色與輪胎尺寸設定（非精確 CAD 模型）。
- JSON 完整備份與還原；匯入前下載安全備份。
- 可選 Firebase Email/Password + Firestore 雲端備份；照片目前不雲端同步。
- PWA 離線快取。

## 保留舊版資料
新版首次啟動時，若找不到 `tt02-assistant-v2`，會讀取 `tt02-assistant-v1`，把原有 budget/shipping/other/parts/logs 轉換到新格式，並保留 `tt02-assistant-v1.pre-v2-backup` 安全副本。請仍在升級前手動匯出舊版 JSON。新版使用新的 localStorage key，舊版 key 不會被刪除。

## 部署到 GitHub Pages
1. 先在舊網站匯出 JSON 備份。
2. 將本專案所有檔案（`index.html`, `manifest.webmanifest`, `sw.js`, `icon.svg`, `icon-192.png`, `icon-512.png`, `README.md`）上傳到原 GitHub repository 根目錄，選擇覆蓋同名檔案並 Commit changes。
3. Repository → Settings → Pages，確認 Source 為 `Deploy from a branch`、Branch 為 `main`、資料夾為 `/(root)`。
4. 等待 Pages 部署完成，開啟原網站 URL。若看到舊版，Chrome 網站設定中清除該網站快取/網站資料，或先關閉 App 再重新開啟；清除前務必先匯出舊資料。
5. 驗證零件、購物、設定、保養、照片、備份、離線功能後，再重新「加到主畫面」。

## Firebase 雲端備份設定（選配）
1. 到 Firebase Console 建立專案與 Web App，複製 Web App 設定 JSON。
2. Authentication → Sign-in method 啟用 Email/Password。
3. Firestore Database 建立資料庫。
4. 將 Firebase 設定 JSON 貼到 App「備份／同步」頁；註冊或登入後可手動上傳或下載整份資料。
5. 在 Firebase Authentication 限制授權網域，只加入你的 GitHub Pages 網域。不要將 Firebase Admin SDK 私密金鑰放入前端。
6. 建議 Firestore 規則限制使用者只能存取自己的 UID 路徑。可採用以下規則（在 Firebase Console 的 Firestore Rules 貼上並發布）：

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/backups/{documentId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

雲端按鈕是手動備份／還原，不是即時雙向同步；上傳會覆蓋雲端單一備份，下載會覆蓋本機資料（會先下載本機安全備份）。照片目前只存在本機 IndexedDB，匯出 JSON 才能備份照片。Firebase 設定、Email/Password 登入與 Firestore Rules 需由使用者在自己的 Firebase 專案完成，本專案不含任何私密憑證。

## 注意事項
- 價格、庫存與相容性不會自動從賣場驗證；範本料號僅供搜尋起點，請自行核對。
- 3D 區為互動示意，不是原廠工程模型；尚未提供可替換的真實 3D mesh 檔匯入功能。
- 本機資料可因清除網站資料、瀏覽器限制或裝置損壞而遺失，請定期匯出。
