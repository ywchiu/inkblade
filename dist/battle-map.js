import { STAGES, PICKUPS, JOURNEY, ZONES, bounds } from './journey3d.js';
// The road map: a strip on the left shows the whole climb, the rest is the stretch around the hero (north is up).
const SPAN = 34, STRIP = 16;
export function drawBattleMap(canvas, game) {
  const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height, p = game.player, scale = h / (SPAN * 2), cx = STRIP + 6 + (w - STRIP - 6) / 2;
  const X = v => cx + v * scale, Z = v => h / 2 + (v - p.z) * scale, opened = i => i < game.stage || i === game.stage && game.cleared;
  ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#121e26'; ctx.fillRect(0, 0, w, h);
  // Local stretch of road, traced from the same edges the hero is held to.
  const south = Math.min(JOURNEY.south, p.z + SPAN), north = Math.max(JOURNEY.north, p.z - SPAN);
  ctx.beginPath(); for (let z = south; z >= north; z -= 1) { const b = bounds(z); ctx.lineTo(X(b.min), Z(z)); } for (let z = north; z <= south; z += 1) ctx.lineTo(X(bounds(z).max), Z(z));
  ctx.closePath(); ctx.fillStyle = '#414c45'; ctx.fill(); ctx.strokeStyle = '#7f8b7866'; ctx.lineWidth = 1; ctx.stroke();
  STAGES.forEach((stage, i) => { if (stage.instant || stage.final || stage.gate > south || stage.gate < north) return; const b = bounds(stage.gate); ctx.strokeStyle = opened(i) ? '#dec38c' : '#bb694b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(b.min), Z(stage.gate)); ctx.lineTo(X(b.max), Z(stage.gate)); ctx.stroke(); });
  for (const item of PICKUPS) { if (item.z > south || item.z < north) continue; const taken = game.collected.has(item.id), x = X(item.x), y = Z(item.z); ctx.fillStyle = taken ? '#6d705f' : item.kind === 'rubbing' ? '#f1ce88' : '#9fd6c1'; ctx.beginPath(); if (item.kind === 'rubbing') { ctx.moveTo(x, y - 4); ctx.lineTo(x + 3, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 3, y); } else ctx.rect(x - 3, y - 3, 6, 6); ctx.closePath(); ctx.fill(); }
  for (const e of game.enemies) { if (e.hp <= 0 || e.z > south || e.z < north) continue; ctx.fillStyle = e === game.enemy && e.alert ? '#ffdf91' : e.alert ? '#e98665' : '#a8644f'; ctx.beginPath(); ctx.arc(X(e.x), Z(e.z), Math.max(2.5, e.radius * scale * 1.3), 0, Math.PI * 2); ctx.fill(); }
  // Where the road leads: a ring when in view, an arrow on the frame's edge when not.
  const goal = game.waypoint();
  if (goal) { ctx.strokeStyle = '#ffe3a0'; ctx.fillStyle = '#ffe3a0'; ctx.lineWidth = 2; const y = Z(goal.z), x = X(goal.x); if (y > 8 && y < h - 8) { if (goal.kind !== 'foe') { ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.stroke(); } } else { const up = y <= 8, ay = up ? 4 : h - 4, ax = Math.max(STRIP + 12, Math.min(w - 8, x)); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax - 6, ay + (up ? 9 : -9)); ctx.lineTo(ax + 6, ay + (up ? 9 : -9)); ctx.closePath(); ctx.fill(); } }
  ctx.save(); ctx.translate(X(p.x), Z(p.z)); ctx.rotate(-p.yaw); ctx.fillStyle = '#c5e9eb'; ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(-4, -4); ctx.lineTo(4, -4); ctx.closePath(); ctx.fill(); ctx.restore();
  // The whole climb at a glance.
  const length = JOURNEY.south - JOURNEY.north, S = v => 3 + (v - JOURNEY.north) / length * (h - 6);
  ctx.fillStyle = '#0c151b'; ctx.fillRect(0, 0, STRIP, h);
  ZONES.forEach((zone, i) => { const reached = p.z <= zone.from; ctx.fillStyle = reached ? (i % 2 ? '#8a7650' : '#a58b5c') : (i % 2 ? '#2a343a' : '#323d44'); ctx.fillRect(3, S(zone.to), STRIP - 6, S(zone.from) - S(zone.to) - 1); });
  STAGES.forEach((stage, i) => { if (stage.instant || stage.final) return; ctx.fillStyle = opened(i) ? '#dec38c' : '#bb694b'; ctx.fillRect(1, S(stage.gate) - 1, STRIP - 2, 2); });
  ctx.fillStyle = '#c5e9eb'; ctx.beginPath(); ctx.moveTo(STRIP + 4, S(p.z)); ctx.lineTo(STRIP - 3, S(p.z) - 4); ctx.lineTo(STRIP - 3, S(p.z) + 4); ctx.closePath(); ctx.fill();
}
