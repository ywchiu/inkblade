# 無相劍客與墨狼：fal 生成與整合

2026-11-07。兩個角色已完成生成並取代實際對戰的程序模型。

參考圖使用 `google/nano-banana-2.1`；3D 使用 `tripo3d/h3.1/image-to-3d`。保留 PBR 貼圖，未使用 Flux 或 Blender。兩次圖像生成、兩次 3D 生成；沒有另外付費綁骨。

## 無相劍客

- [本機參考圖](ronin-reference.png)；圖像 request `01a1b68f-e686-71c0-bd1d-66ac0f037653`。
- [本機 GLB](../../../dist/assets/ronin/faceless-swordsman.glb)：11,816,272 bytes，82,383 三角面，47,762 頂點，3 張 4096×4096 貼圖。
- 3D request `01a1b690-a200-7490-affa-97f655dc841a`；task `c77a1cc1-b2b6-4878-8b06-9bdf8ff16efe`。
- SHA-256：`da9647b05f278ac1c352a8feab78712a557a83ae2fc9e7a0bd5d4ce661f2895d`。
- [fal GLB](https://v3b.fal.media/files/b/0ab1866a/-EIzIqkl_slXOVIBlY682_model.glb) · [fal 模型預覽](https://v3b.fal.media/files/b/0ab1866b/X2xizE7u5ZLnWerz8ydgZ_preview.png)

## 墨狼

- [本機參考圖](wolf-reference.png)；圖像 request `01a1b68f-e674-7610-92eb-6d6843c7efbb`。
- [本機 GLB](../../../dist/assets/wolf/ink-wolf.glb)：14,707,732 bytes，83,551 三角面，49,888 頂點，3 張 4096×4096 貼圖。
- 3D request `01a1b690-a211-7792-804b-24cfe66ccb9e`；task `ac099a8a-404b-45a3-8ff4-e1904094e0db`。
- SHA-256：`7d77f1e8bff1f13594e7d40a7e0bdee888218203dbe31aa8ab9683be72b6140d`。
- [fal GLB](https://v3b.fal.media/files/b/0ab1866a/TE1AO9LHhvdb4nD7fjJnl_model.glb) · [fal 模型預覽](https://v3b.fal.media/files/b/0ab1866b/_utMEvjVuzgWvLNr7uB9Y_preview.png)

## 整合與限制

- 無相劍客：白色儺面、黑鐵札甲、暗紅腰帶；原始 +X 朝向旋轉為 +Z，高 2.05。16 骨程序蒙皮，獨立劍掛右手；左右連斬、直刺、受擊與倒地接上既有 AI，命中時點維持攻擊進度 40%。
- 墨狼：黑色鬃毛、銅甲、紅布綁帶；原始 -Z 朝向旋轉 180 度成 +Z，高 1.72。獨立 20 骨四足骨架（軀幹、頭頸、三節尾巴、四條腿），使用四足步態、蹲伏、撲咬、受擊與側倒，避免套用人形動畫。倒地高度已修正，避免軀幹沉入地面。
- 原始 GLB 不含骨架或動畫；遊戲載入時建立蒙皮。毛髮是網格表面，沒有毛髮／布料物理、足部 IK 或動捕；局部穿插、滑步仍可能出現，未達 AAA 成品品質。
- 兩個模型增加約 26.5 MB 首次下載；與主角、山魈一起預載，尚未做 LOD 或手機實機效能驗收。
- 本機預覽：`/ronin-preview.html`、`/wolf-preview.html`。`/roster-preview.html?kind=wolf` 是中性光照的動畫檢視工具，不是實戰截圖。
- 完整提示詞與生成參數在 `reference-submissions.json`、`model-submissions.json`；原始輸出 URL 在 `reference-results.json`、`model-results.json`；`validation.json` 保存大小、雜湊、面數和圖片尺寸。雲端 URL 可能過期，本機資產已保留。
- 語法檢查通過，50 項測試通過；實戰兩位對手均完成重擊命中和反擊扣血，詳見 [驗證紀錄](../../../docs/verification.md)。
