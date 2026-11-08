# Inkblade — a 3D ink fantasy combat game

[繁體中文](README.md)

Inkblade is a playable third-person 3D action prototype inspired by Zhong Kui and Chinese ghost stories. Sword in hand, the hero enters a rain-soaked temple to learn why villagers' names have been taken. Choose a single opponent to practice against, or follow a short campaign through a wolf pack, a swordsman encounter and a final mountain monster.

**[Play in your browser](https://inkblade-e2h.pages.dev/)**

## Gameplay

![Actual gameplay GIF of Zhong Kui fighting wolves in a rainy temple](docs/gameplay.gif)

| Story scene | Mobile controls |
| --- | --- |
| ![3D story scene with Zhong Kui and wolves](docs/gameplay-story.png) | ![Movement stick and three action buttons on mobile](docs/gameplay-mobile.png) |

The online game runs on Cloudflare Pages, serving the files in `dist/` and redeploying when GitHub `main` changes. Before publishing, we resized the four playable character textures to 2048 pixels, used WebP and simplified their meshes. Their combined model files fell from about 55 MB to 9.7 MB.

## Story and modes

The stolen names have trapped the villagers' spirits in the mountains. Zhong Kui follows the trail through a bamboo forest, meets wolves bound by a curse, and faces the swordsman Shen Hanzhou, who has his own reason to guard the road. At the end waits a mountain monster claiming to protect the village. Dialogue, battle cries and an in-game journal carry the story.

- **Single duel:** Choose the wolf, swordsman or mountain monster and enter a fight directly.
- **Campaign:** Clear enemy groups and advance through linked areas, from the wolves to the sword formation and final monster.
- **Action combat:** Chain sword attacks, dash forward and strike, dodge sideways, guard, parry and counterattack. Each opponent has a distinct pace; wolves only fight up close.

## Play locally

```bash
git clone git@github.com:ywchiu/inkblade.git
cd inkblade
npm ci
npm start
```

Open <http://127.0.0.1:4173/> in a WebGL 2 browser. Playing does not require an AI account or API key.

## Basic controls

| Action | Control |
| --- | --- |
| Move | WASD or arrow keys |
| Attack | Tap J / left click; hold for a heavy attack |
| Dodge and forward dash | Space with a movement direction |
| Guard and parry | Hold K / right click |
| Heal / special | R / F |

Tap attack to chain sword strikes, or hold it for a heavy strike. Attack while dashing forward for a dash cut. A well-timed dodge or parry opens a counterattack. On a narrow screen, move with the stick and use the three main action buttons.

## Making the game with AI

1. **Set the scope and visual direction.** Start with the hero, opponents, rainy temple, single duels and a short campaign. Aim for grounded Chinese fantasy, with ink in the atmosphere and combat effects.
2. **Create character references.** GPT Image shaped the hero and environment; Nano Banana 2.1 supplied other character references. Keep costumes, silhouettes and colors consistent before building models.
3. **Build 3D characters.** Tripo H3.1 turned the references into models. Check proportions, materials and different views inside the game.
4. **Make it playable.** JavaScript and Three.js power the 3D world, character movement, combat rules, enemy behavior, levels, interface and touch controls. Game code drives the animations and combat.
5. **Add story and sound.** Write the Borrowed Names Mountain dialogue and voice the characters with the ElevenLabs voice model. Music and effects use Higgsfield, Mirelo and Kenney assets.
6. **Playtest and improve.** Test visuals, controls and combat pace in the browser, then revise until the campaign can be played through.

AI helped create images, models and sound. Three.js and the game code turn those assets into an interactive story and combat experience. The GIF and screenshots above show the running game.

## Repository layout

`dist/` contains the playable web game and assets; `tests/` contains automated combat and story checks; `art/direction/` holds visual references. Run `npm start` to play, or check the code with:

```bash
npm run check
npm test
```
