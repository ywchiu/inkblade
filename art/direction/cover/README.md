# 封面主視覺

日期：2026-11-14。標題頁原本直接顯示即時 3D 場景（兩個角色站在廣場中央），改為一張主視覺蓋在場景上，開始對戰時淡出。

- 模型：Higgsfield `nano_banana_2_1`，16:9、2k、`thinking_level: high`，工作 `548148d0-389b-48f4-b002-8885b77037af`，2 點。
- 參考圖：`../hero-model-reference.png`、`../monster-model-reference.png`（縮到 1536 像素後上傳），讓畫中的鍾馗與山魈和遊戲模型一致。
- 原圖 2752×1536，存為 `key-art.jpg`。遊戲用的是 `dist/assets/cover/` 裡的 WebP（2560 與 1440 寬）和分享預覽用的 `share.jpg`（1200×630）。

## 提示詞

> Cinematic key art for an original dark Chinese ink-wash fantasy action game, wide 16:9 title-screen illustration, painterly realism with visible ink-wash brush texture, AAA game cover quality. Use the two reference images as the exact character designs: image 1 is the hero, a bearded demon-queller judge in dark lamellar armour with a tattered oxblood-red cloak, black official cap with red ribbons, and a long straight iron sword; image 2 is the enemy, a towering hunched mountain demon with a pale carved mask face, shaggy black mane, dark skin, one oxidized bronze pauldron, bronze bracers and a torn red loincloth. Keep their faces, costumes, colours and proportions faithful to the references. Composition: the LEFT 42 percent of the frame is calm, dark, low-detail negative space of night rain, drifting mist and a faint silhouette of bamboo and mountain, kept empty for a title overlay. On the RIGHT side, dramatic low camera angle: the hero stands in the right foreground, seen in three-quarter view from slightly behind and to the side, turned toward the enemy, feet planted wide on wet stone, sword drawn and held low and ready in his right hand with rain streaming off the blade and a streak of black ink trailing from its edge, cloak whipped by the wind. Beyond him, larger and higher in the frame, the masked mountain demon looms out of the mist on the steps of an old Chinese mountain temple, leaning forward with claws spread, backlit. The temple's dark tiled eaves and glowing amber lattice windows and two stone lanterns sit behind the demon. Rainy night, a fork of distant lightning rim-lights both figures in cold blue-white, warm amber lantern glow reflected in the wet flagstones, falling rain streaks, splashes, torn paper talismans and a few embers in the air, sweeping black ink-splash brushstrokes framing the lower right corner. Palette of ink charcoal, deep teal-blue night, oxblood red and lantern amber, strong contrast, deep shadows, cinematic depth of field. Absolutely no text, no letters, no calligraphy, no logo, no watermark, no UI, no border.

## 版面

樣式在 `dist/style3d.css` 最後的 `.cover` 區塊：

- 桌機與橫向：圖鋪滿畫面，左側壓暗放標題，圖緩慢推移，每 11 秒一次閃電。
- 直式手機：圖放在下半部，放大到山魈與鍾馗的上半身剛好填滿模式按鈕與對手列之間的空位。
- `prefers-reduced-motion` 時不動。
