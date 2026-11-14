import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL(`../dist/${name}`, import.meta.url), 'utf8');

// On a phone, fast taps on the attack button are double taps, and Safari answers a double tap by zooming into the
// block under the finger: the three buttons fill the screen and the stick is pushed off it. Nothing may zoom the page.
test('the page cannot be zoomed by a double tap or a pinch', () => {
  const css = read('style3d.css'), html = read('index.html'), game = read('game3d.js');
  assert.match(css, /html\{touch-action:pan-x pan-y/, 'the page scrolls but never zooms');
  assert.match(css, /#touch,#touch \*,#hud,#hud \*\{touch-action:none/, 'the controls, the gaps between them and the HUD leave nothing to the browser');
  const viewport = html.match(/<meta name="viewport" content="([^"]*)"/)[1].split(',');
  assert.ok(viewport.includes('maximum-scale=1') && viewport.includes('user-scalable=no'), viewport.join(','));
  assert.match(game, /for\(const surface of\[canvas,\$\('touch'\)\]\)for\(const type of\['touchstart','touchmove','touchend'\]\)/, 'touches on the play surface are cancelled before the browser can read a gesture into them');
  assert.match(game, /'gesturestart','gesturechange','gestureend'/, 'Safari’s own pinch events are cancelled');
});
