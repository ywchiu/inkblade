# Making Inkblade with AI: a short guide

[繁體中文](AI-GAME-WORKFLOW.zh-TW.md) · [Back to the game](../README.en.md)

Inkblade combines AI-generated images, 3D characters and sound with a playable browser game. The work followed these steps:

1. **Define the game.** Zhong Kui can duel one opponent or travel through a short campaign, meeting wolves, a swordsman and a mountain monster. Set the movement and three main actions first.
2. **Create visual references.** GPT Image shaped the hero and temple; Nano Banana 2.1 supplied other character references. Keep costumes, colors and the world consistent.
3. **Build character models.** Tripo H3.1 turned the references into 3D models. Check their proportions, materials, fronts and backs.
4. **Make the game playable.** JavaScript and Three.js integrate the characters and environment, then implement movement, attacks, enemy behavior, levels and the interface.
5. **Add story and sound.** Write the Borrowed Names Mountain dialogue, voice the characters with the ElevenLabs voice model, and add music and effects.
6. **Playtest and improve.** Test combat, story and mobile controls in a browser. Run `npm run check` and `npm test` for code checks.

See the real gameplay GIF and screenshots in the [README](../README.en.md). Playing locally needs no AI account; generating new media needs the relevant service accounts.
