# 骨架動畫流程

日期：2026-11-13。目標是讓角色帶著真正的骨架與動捕動畫片段進遊戲，取代 `dist/characters3d.js` 的程式姿勢。先做主角一條完整流程，通過後再複製到劍客、山魈與墨狼。

## 上次為什麼失敗

Tripo 產出的主角網格面朝 +X，Meshy 綁骨把它當成面朝 +Z 擺骨架，兩者差 90 度，所以走路時腿和衣袍被橫向拉扯。用檢視頁可以重現：

```
/motion-lab.html?rig=./assets/hero/demon-queller-walk-original.glb&view=front&bones=1&cols=6&rows=1
```

從正面鏡頭看到的是角色側面，骨架卻是正面張開的。因此送綁骨前一律先轉正。

## 模型規格

| 項目 | 要求 |
| --- | --- |
| 站姿 | 對稱 A 字，手臂離身體 45 度、手肘打直，雙腿之間看得到背景 |
| 朝向 | 面朝 +Z，腳底在 y=0，站在原點，節點沒有位移旋轉 |
| 手 | 空手，手指分開；劍是另一個模型，進遊戲才掛到右手骨頭 |
| 布料 | 袍與裙甲在膝上收尾並分片；不要披風，只留肩上短披 |
| 面數 | 30 萬面以下（Tripo 綁骨文件的建議上限） |

參考圖提示詞在 `hero-rig-reference-prompt.txt`，以 `../hero-model-reference.png` 作為外觀參考。

## 步驟

1. 用提示詞生成正面 A 字參考圖，目視確認四肢分開、沒有披風。
2. 圖轉 3D（`tripo3d/h3.1/image-to-3d`，參數沿用 `../hero-fal-submission.json`）。
3. 轉正並落地：

   ```bash
   node scripts/prepare-rig-input.mjs raw.glb hero-rig-input.glb --yaw=-90 --height=1.9
   ```

   `--yaw` 是把模型轉到面朝 +Z 所需的角度；輸出報告若出現 `warning`，表示還是側著。再用檢視頁從正面看一次：`/motion-lab.html?rig=<檔案>&view=front&cols=1&rows=1`。
4. 送自動綁骨，輸出 Mixamo 骨骼命名，並取回動畫片段。
5. 每段動畫在檢視頁逐格檢查（`&clip=<名稱片段>`，加 `&bones=1` 顯示骨架）。腿、腰、肩沒有拉扯才算通過。
6. 改寫遊戲動畫層：`AnimationMixer` 播放與交叉淡入，命中時間對到出刀那一格。

## 主角動畫清單

第一批是能完成一場戰鬥的最少片段；第二批補齊現有全部招式。

| 批次 | 片段 | 循環 | 對應遊戲狀態 |
| --- | --- | --- | --- |
| 1 | 持劍待機 | 是 | `idle` |
| 1 | 跑 | 是 | `idle` 移動（3.25 m/s） |
| 1 | 輕斬一、二、三 | 否 | `light`：斜斬、反手橫斬、迴身落刃 |
| 1 | 重擊 | 否 | `heavy`：蓄勢破甲 |
| 1 | 閃身 | 否 | `roll` |
| 1 | 持劍格擋 | 是 | `guard` |
| 1 | 受擊 | 否 | 受擊反應 |
| 1 | 倒地 | 否 | `dead` |
| 2 | 衝刺 | 是 | `idle` 衝刺（5.8 m/s） |
| 2 | 格擋慢走 | 是 | `guard` 移動（1.45 m/s） |
| 2 | 前衝與疾衝斬 | 否 | `dash`、疾風拔斬 |
| 2 | 上挑、橫掃 | 否 | 挑月斬、迴風掃蕩 |
| 2 | 迴旋斬 | 否 | `special`：墨破山河（`guard`→`shout`→`heavy`→`judgment` 串接，見 `HERO_RIG.sequences.spin`；`shout` 舉劍朝天、`judgment` 躍起下劈為專屬動作，連斬段用專屬的 `flurry`，以數倍速播放） |
| 2 | 反擊、處決 | 否 | 乘隙反斬、鎮魂處決 |
| 3 | 輕斬四 | 否 | `light`：雙燕迴翔（未買新片段；`light2` 的左橫斬 → `light3` 收尾的右上挑，兩刀各對一個接觸格，見 `HERO_RIG.sequences.twin`） |
| 3 | 輕斬五 | 否 | `light`：崩山斷（`shout` 舉劍 → `light1` 後半的下劈，見 `sequences.crash`） |
| 3 | 衝刺躍斬 | 否 | `light`：躍淵斬（`judgment` 自蹲伏起跳到落地，落地格對判定，見 `sequences.leap`） |
| 3 | 架勢劍氣 | 否 | `light`：飛墨斬（`guard` → `heavy` 橫斬最快的一段，出刀格放出劍氣，見 `sequences.inkWave`） |
| 3 | 架勢鎮印 | 否 | `heavy`：敕令 · 鎮（`shout` 舉劍 → `plant` 的收尾：落地單膝、手按地面，見 `sequences.seal`；該步驟用 `aim` 讓劍尖朝下插進地面） |
| 2 | 破勢失衡 | 否 | `stagger` |
| 2 | 飲藥 | 否 | `heal` |

第三批除了敕令 · 鎮以外都沒有專屬片段，由現有片段剪接（`MOVE_CLIPS` 另有單一片段的退路）。若之後要買，優先順序：二連斬（雙燕迴翔）、劍氣揮斬（飛墨斬）。

序列的每一步除了 `tilt`（在手中轉動劍，弧度）之外，也可以用 `aim` 指定劍尖在角色座標中的方向（x 右、y 上、z 前），例如 `[0, -1, .35]` 是朝下略偏前；不論動作片段裡手腕怎麼轉，劍都會指向那個方向。

每段攻擊要記錄「出刀接觸」的時間點，寫進招式資料，讓傷害判定跟動畫同一格發生。

## 遊戲端接法（已完成）

- `dist/rig-clips.js`：`HERO_RIG` 清單（骨架檔、身高、朝向、每個 clip 的檔案與原始移動速度）與「角色狀態 → clip」對應。新增動作只要在 `clips` 加一行，名稱用上面清單的 id（`light1`–`light3`、`heavy`、`spin`、`dodge`、`guard`、`hurt`、`death`…）。
- `dist/rigged-character3d.js`：載入、正規化到遊戲身高、掛劍、`AnimationMixer` 播放。攻擊／閃避用戰鬥計時器逐格對位（命中幀跟判定一致），移動依速度調整播放率，根位移固定在原地。
- 缺少的 clip 會退回 idle，並記在 `model.missing`。
- 2026-11-14 起為預設：主角、劍客、山魈都播放骨架動畫，載入失敗自動退回程序骨架。網址加 `?rig=0` 可切回舊的程序動作做比較。墨狼與石獸沒有骨架動畫片段，仍用四足程序動作。
- 主角已換成新綁骨（`dist/assets/hero/rig2/`）：`hero.glb` 是模型＋骨架，其餘每個動作一個只含關鍵幀的小檔。

## 產生新動作（Higgsfield → Meshy 綁骨，每個 8 點）

1. 輸入檔固定用同一個（`scripts/prepare-rig-input.mjs` 轉正後的模型）；同一輸入多次綁骨產出的骨架一致，動作可共用。
2. `3d_rigging`，`height_meters: 1.9`、`enable_animation: true`、`animation_action_id: <編號>`。
3. `node scripts/extract-clip.mjs 下載檔.glb dist/assets/hero/rig2/<名稱>.glb`（16 MB → 幾十 KB）。
4. 在 `dist/rig-clips.js` 的 `HERO_RIG.clips` 加一行；攻擊類用 `range` 指定出刀區間（秒），原地動作加 `inPlace` 或 `speed`。
5. `motion-lab.html?who=hero&clip=<動作>` 檢查。

已用編號：idle 0、run 16、light1 97、light2 219、light3 240、heavy 242、dodge 158、guard 147、hurt 178、death 187、shout 101（Sword_Shout）、judgment 102（Sword_Judgment）、plant 202（Weapon_Combo_1，只用 2.2 秒後的落地收尾）、flurry 199（Weapon_Combo）。
