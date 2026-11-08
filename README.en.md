# Inkblade — a 3D ink fantasy combat game

[繁體中文](README.md) · [AI game-making guide](docs/AI-GAME-WORKFLOW.en.md) · [中文製作教學](docs/AI-GAME-WORKFLOW.zh-TW.md)

Inkblade is a playable 3D action prototype inspired by Zhong Kui and Chinese ghost stories. Choose a single opponent, or follow a short campaign through a wolf pack, a swordsman encounter and a final mountain monster.

## Gameplay

![Actual gameplay GIF of Zhong Kui fighting wolves in a rainy temple](docs/gameplay.gif)

| Story scene | Mobile controls |
| --- | --- |
| ![3D story scene with Zhong Kui and wolves](docs/gameplay-story.png) | ![Movement stick and three action buttons on mobile](docs/gameplay-mobile.png) |

## Play locally

```bash
git clone git@github.com:ywchiu/inkblade.git
cd inkblade
npm ci
npm start
```

Open <http://127.0.0.1:4173/> in your browser. Playing does not require an AI account or API key.

## Basic controls

| Action | Control |
| --- | --- |
| Move | WASD or arrow keys |
| Attack | Tap J / left click; hold for a heavy attack |
| Dodge and forward dash | Space with a movement direction |
| Guard and parry | Hold K / right click |
| Heal / special | R / F |

On a narrow screen, move with the stick and use the three main action buttons.

## How it was made

1. **GPT Image** and **Nano Banana 2.1** created character and environment references.
2. **Tripo H3.1** turned character references into 3D models.
3. **JavaScript and Three.js** built the world, animations, combat, enemies and campaign.
4. The **ElevenLabs voice model** made the character dialogue; music and effects use Higgsfield, Mirelo and Kenney assets.
5. Browser playtesting guided changes to controls, visuals, combat pacing and story.

This is a playable prototype. AI helped create production assets; code turns those assets into an interactive game. Read the [production guide](docs/AI-GAME-WORKFLOW.en.md) for the workflow.

```bash
npm run check
npm test
```

Generated media follows its providers' terms. Kenney audio licenses are included in `dist/assets/audio/`.
