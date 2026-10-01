// Touch-Steuerung fürs Handy: Joystick links (laufen), rechts wischen (umsehen), Aktions-Buttons.
export const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

export function setupTouch(game) {
  if (!isTouch) return;
  document.body.classList.add('touch');
  const root = document.createElement('div');
  root.id = 'touch';
  root.innerHTML = `
    <div id="t-look"></div>
    <div id="t-stick"><div id="t-knob"></div></div>
    <div id="t-btns">
      <button id="t-run" class="t-b small">🏃</button>
      <button id="t-crouch" class="t-b small">⬇️</button>
      <button id="t-item" class="t-b small">🔄</button>
      <button id="t-act" class="t-b">👊</button>
      <button id="t-use" class="t-b big">E</button>
    </div>`;
  document.querySelector('#hud').appendChild(root);
  game.touchMove = { x: 0, y: 0 };
  game.touchRun = false;

  // Joystick
  const stick = root.querySelector('#t-stick'), knob = root.querySelector('#t-knob');
  let sid = null, cx = 0, cy = 0;
  const R = 50;
  stick.addEventListener('pointerdown', (e) => {
    sid = e.pointerId; try { stick.setPointerCapture(sid); } catch {}
    const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    move(e);
  });
  const move = (e) => {
    if (e.pointerId !== sid) return;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    game.touchMove = { x: dx / R, y: dy / R };
  };
  const end = (e) => { if (e.pointerId !== sid) return; sid = null; knob.style.transform = ''; game.touchMove = { x: 0, y: 0 }; };
  stick.addEventListener('pointermove', move);
  stick.addEventListener('pointerup', end);
  stick.addEventListener('pointercancel', end);

  // Umsehen durch Wischen
  const look = root.querySelector('#t-look');
  let lid = null, lx = 0, ly = 0;
  look.addEventListener('pointerdown', (e) => { lid = e.pointerId; lx = e.clientX; ly = e.clientY; try { look.setPointerCapture(lid); } catch {} });
  look.addEventListener('pointermove', (e) => {
    if (e.pointerId !== lid) return;
    game.yaw -= (e.clientX - lx) * 0.006;
    game.pitch = Math.max(-0.9, Math.min(0.6, game.pitch - (e.clientY - ly) * 0.005));
    lx = e.clientX; ly = e.clientY;
  });
  const lend = (e) => { if (e.pointerId === lid) lid = null; };
  look.addEventListener('pointerup', lend);
  look.addEventListener('pointercancel', lend);

  // Buttons
  const tap = (id, fn) => root.querySelector(id).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
  tap('#t-use', () => game.interact());
  tap('#t-act', () => { if (game.held) game.throwProp(); else if (game.equipped >= 0) game.useItem(); });
  tap('#t-item', () => game.cycleItem());
  tap('#t-crouch', () => { game.crouch = !game.crouch; root.querySelector('#t-crouch').classList.toggle('on', game.crouch); });
  tap('#t-run', () => { game.touchRun = !game.touchRun; root.querySelector('#t-run').classList.toggle('on', game.touchRun); });
}
