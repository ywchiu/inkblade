# 東方神怪美術基準

日期：2026-11-07。此目錄保留前期概念與資產來源；主角與三位對手均已整合對戰，環境尚未達概念圖品質。

## 已產出

- `temple-duel-concept.png`：潮濕古寺、降魔武者與巨型妖祟的場景概念。
- `hero-model-reference.png`：沿用概念角色的單人、全身、灰底建模參考。
- `temple-duel-prompt.txt`、`hero-reference-prompt.txt`：實際送出的完整提示詞。

兩張圖片均由內建 imagegen 工具生成，第二張使用第一張作為參考。未使用 Flux、Tripo 或 Blender；工具未回報圖像模型的具體版本。圖片已目視檢查：角色全身可見、主要材質與服裝配色一致。單張參考未定義完整背面結構，也無法驗證生成網格品質。

## 核心方向

寫實材質、厚重肉身與服裝、陰森中國古寺。主角為成熟魁梧的原創降魔武者，保留濃鬚、暗紅破袍、黑鐵札甲、氧化銅獸面扣與葫蘆；避免卡通比例。環境以石板、木構、苔痕、濕潤表面、冷色霧與暖色火光構成。水墨作為招式煙氣與氣氛點綴。

## 下一步製作與驗收

1. 以角色參考生成或製作真實 3D 網格與材質，先驗證一位主角和一位敵人。
2. 修正面部、手指、衣甲穿插與背面結構；整理拓撲、UV、材質及骨架。武器分件，避免與手掌黏合。
3. 製作待機、移動、攻擊、翻滾、受擊及死亡動畫；檢查衣袍在動作中是否穿模。
4. 將資產整合到 Three.js，加入實體古寺場景、材質與照明，再以實際遊戲鏡頭比較概念基準。
5. 驗證載入、幀率、攻擊接觸與動畫銜接。概念圖品質不能視為即時渲染品質或效能保證。

## 實際 3D 產物與驗證

fal 已連接，已執行一次 Tripo 生成及一次 Meshy 綁骨。原始參考圖片與上述 imagegen 來源說明維持不變。

- Tripo：`tripo3d/h3.1/image-to-3d`，request `01a1b4c2-5652-7302-84f3-412c12eb68d5`。
- GLB：`../../dist/assets/hero/demon-queller.glb`，15,319,532 bytes，76,988 三角面，49,190 頂點，一個網格。色彩、金屬／粗糙度及法線貼圖皆為 4096×4096，內嵌於 GLB。
- SHA-256：`ecd6a52818b7fea6c45764c5e8b224d8a6ae215b6bc6e258f2169ecf464459af`。
- 實際在 Three.js 載入並檢視正面與背面；紅袍、札甲、獸面腰扣及葫蘆保留。鬍鬚與破布輪廓仍有網格感。這是第一版生成資產，不是最終美術品質。
- Meshy：`fal-ai/meshy/rigging`，request `01a1b4c5-d660-7291-b936-3f3ae4d49181`。生成 24 關節骨架及待機、走路、跑步動畫。**技術輸出完成，但視覺驗收失敗**：腿部、腰部及衣袍嚴重拉扯。直接播放原始 walking GLB 仍可重現，不能歸因於動畫跨檔套用。原網格朝向與骨架配置疑似不一致，原因仍待修復驗證。
- `hero-fal-submission.json`、`hero-tripo-result.json`、`hero-rig-submission.json`、`hero-rig-result.json` 保存實際參數、request ID、輸出 URL。URL 可能過期，本機 GLB 保留。
- `hero-browser-front.png`、`hero-browser-back.png` 為正常靜態模型；`hero-idle-browser.png`、`hero-walk-browser.png`、`hero-run-browser.png`、`hero-walk-original-check.png` 為變形診斷紀錄。

啟動伺服器後，以 `/hero-preview.html` 檢視正常靜態模型；`/hero-preview.html?rigtest=1` 僅供重現綁骨缺陷。預設頁不播放未通過驗收的動畫。對戰首頁已換成此角色，採用 `dist/characters3d.js` 建立的本機骨架、武器及程序動作；不載入 Meshy 的缺陷骨架。

## 怪物：鎮祟山魈

角色固定特徵：長臂、寬肩、灰色皮膚、黑色鬃毛、裂紋象牙白儺面、單側饕餮銅肩甲、祈禱珠串與破紅布。沿用古寺概念的東方神怪方向，單體參考是依文字設計重新生成，並非對原概念圖的精確圖像編輯。

- 單體參考：`monster-model-reference.png`，1792×2400。經 fal 的 `google/nano-banana-2.1` 生成，request `01a1b525-858a-7510-a999-59177c5b1050`。完整角色描述與提示詞位於 `monster-image-submission.json`。
- 3D：`tripo3d/h3.1/image-to-3d`，request `01a1b526-33c7-7df2-b974-1b25b9413240`。使用上述圖像的 fal URL 直接生成，無需再次上傳。
- GLB：`../../dist/assets/monster/temple-guardian.glb`，13,014,688 bytes，94,813 三角面，59,569 頂點，一個網格。色彩、金屬／粗糙度及法線貼圖皆為 4096×4096，已內嵌。
- SHA-256：`d878fd382bae7e48cc4001da0f23806ffc72ef59950b9b1136331e337e2341d3`。GLB 標頭、下載長度、有限頂點座標與圖片解碼已驗證，見 `monster-validation.json`。
- 預覽：`/monster-preview.html`，可旋轉、縮放、正背面切換與下載。以實際 Three.js 畫面檢視正面與背面，截圖為 `monster-browser-front.png` 與 `monster-browser-back.png`。材質與主要造型已保留，但毛髮為實體網格，局部輪廓有稜角，不是毛髮模擬。
- 所有提交參數、生成紀錄及原始輸出 URL 位於 `monster-image-submission.json`、`monster-image-result.json`、`monster-3d-submission.json`、`monster-3d-result.json`；雲端 URL 可能過期，本機資產保留。

原始 GLB 不含骨架或動畫；遊戲載入後建立 16 骨骨架與蒙皮，接上原有山魈 AI、蓄力、攻擊、受擊及死亡。未提交新的付費綁骨工作。

## 2026-11-07 對戰整合

- 主角高 1.95、山魈高 3.15 遊戲單位，原始 +X 朝向烘焙為戰鬥 +Z 朝向。原始 GLB 不覆寫。
- 依人體區域建立權重，並用下半部網格連通元件隔離垂下的手指，避免抬手時手指被腰腿拉住。
- 原始材質搭配環境反射與 ACES 色調映射；鐵劍為獨立物件掛在右手骨骼。
- 實際對戰已檢查移動、重擊扣血、翻滾、格擋、山魈蓄力、受擊、飲藥、死亡重開、對手切換與模型載入失敗復原。
- 程序蒙皮仍有衣袍／肩部拉伸及穿插限制，未做專業拓撲重製、手指動作、足部 IK、布料解算或動作捕捉；場景仍是原型。
- 實際遊戲截圖見 `../../docs/screenshots/integrated-*.png`；驗證範圍見 `../../docs/verification.md`。

## 無相劍客與墨狼

兩位對手也已透過 fal 生成參考圖與 Tripo H3.1 GLB，取代程序角色；[完整生成與整合紀錄](roster/README.md)。劍客使用 16 骨人形蒙皮、墨狼使用 20 骨四足蒙皮；動畫在本機製作，未另外提交付費綁骨。
