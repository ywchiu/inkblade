# Inkblade — a 3D ink fantasy combat prototype

[繁體中文](README.md) · [AI game-making guide](docs/AI-GAME-WORKFLOW.en.md) · [中文製作教學](docs/AI-GAME-WORKFLOW.zh-TW.md)

Inkblade is a playable browser game about Zhong Kui recovering stolen names from a false mountain god. Fight a wolf pack, a swordsman and a mountain monster in a short story campaign, or choose a single opponent. It is a third-person 3D action prototype, not a VR headset application or an AAA production.

![Gameplay animation](docs/gameplay.gif)

Story scene:

![Zhong Kui faces the wolf pack in a rainy 3D arena](docs/gameplay-story.png)

Mobile controls:

![Three touch actions and movement stick](docs/gameplay-mobile.png)

## Run locally

```sh
git clone git@github.com:ywchiu/inkblade.git
cd inkblade
npm ci
npm start
```

Open <http://127.0.0.1:4173/> in a WebGL 2 browser. Runtime assets are local; playing does not need an API key or an AI account. `npm run check` checks JavaScript syntax and `npm test` runs combat, story, controls and audio tests.

## Controls

WASD / arrows move. Tap **J** or left click for a sword combo; hold for a heavy attack. **Space** dodges, or dashes when moving forward; attack during a dash for a dash cut. Hold **K** or right click to guard and time it for a parry. **R** heals; **F** uses the special attack. Counterattacks and executions use the same attack button when their windows open. On a narrow touch screen, use the stick and three primary action buttons.

## What AI made, and what code made

| Part | Tools used | Result |
| --- | --- | --- |
| Visual direction | OpenAI image generation; fal Nano Banana 2.1 | Character and scene reference images |
| Character meshes | Tripo H3.1 through fal | Four textured GLB meshes for the hero, monster, swordsman and wolf |
| Sound and voices | Higgsfield: ElevenLabs Music, ElevenLabs speech and Mirelo; Kenney CC0 for selected effects | Two music loops, game effects and 37 voiced lines; 35 character lines were later directed for stronger emotion |
| Game and animation | JavaScript and Three.js 0.187.0 | WebGL rendering, runtime rigs, procedural poses, combat, enemy AI, campaign, UI and audio integration |

Meshy Rigging was tried, but its deformed output was not used in gameplay. Flux 3 Max and Blender were not used. The movements are procedural, not motion capture. The references to other action games are design study, not copied game assets.

See the [step-by-step guide](docs/AI-GAME-WORKFLOW.en.md) for the actual production workflow, test gates and the difference between generated assets and working game systems. The four shipped character meshes contain their textures; no cloud media service is called while playing. Generated media follows its provider's terms. Kenney audio licenses are included in `dist/assets/audio/`.
