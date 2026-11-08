# 墨刃 · 3D 水墨格鬥遊戲

[English](README.en.md) · [中文製作教學](docs/AI-GAME-WORKFLOW.zh-TW.md) · [English guide](docs/AI-GAME-WORKFLOW.en.md)

《墨刃》是一款以鍾馗與中國志怪故事為靈感的 3D 動作遊戲原型。你可以選擇單挑，也可以在「無雙征途」中穿過狼群、劍陣，最後挑戰山魈。

## 遊戲畫面

![鍾馗在雨夜古寺迎戰狼群的實際遊戲 GIF](docs/gameplay.gif)

| 劇情對話 | 手機操作 |
| --- | --- |
| ![鍾馗與狼群對峙的 3D 劇情畫面](docs/gameplay-story.png) | ![手機版移動搖桿與三個動作按鈕](docs/gameplay-mobile.png) |

## 開始遊玩

```bash
git clone git@github.com:ywchiu/inkblade.git
cd inkblade
npm ci
npm start
```

在瀏覽器開啟 <http://127.0.0.1:4173/>。遊玩時不需要 AI 帳號或 API key。

## 基本操作

| 動作 | 操作 |
| --- | --- |
| 移動 | WASD 或方向鍵 |
| 攻擊 | 短按 J／滑鼠左鍵；長按可重擊 |
| 閃身與前衝 | 空白鍵；搭配移動方向 |
| 防禦與彈反 | 按住 K／滑鼠右鍵 |
| 回血／絕技 | R／F |

手機版以搖桿移動，右側有攻擊、閃身、防禦三個主要按鈕。

## 這款遊戲怎麼做的

1. 用 **GPT Image** 和 **Nano Banana 2.1** 設計角色與場景參考圖。
2. 用 **Tripo H3.1** 把角色參考圖製成 3D 模型。
3. 用 **JavaScript、Three.js** 做出場景、角色動作、戰鬥、敵人和關卡。
4. 用 **ElevenLabs 語音模型** 製作角色配音；配樂與音效使用 Higgsfield、Mirelo 及 Kenney 素材。
5. 在瀏覽器實際遊玩，調整操作、畫面、戰鬥節奏與故事。

這是一個可玩的遊戲原型。AI 產出的是製作素材，程式負責把素材變成可以操作、對戰和推進的遊戲。[閱讀完整製作教學](docs/AI-GAME-WORKFLOW.zh-TW.md)。

```bash
npm run check
npm test
```

生成素材依各服務的使用條款使用；Kenney 音效授權保留在 `dist/assets/audio/`。
