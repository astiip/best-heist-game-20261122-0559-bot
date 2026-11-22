// input.js — keyboard + mouse, nothing else. It owns the key set and the
// one-shot actions (throw, dim, pause, confirm) and hands the world a plain
// object each frame; the world consumes the one-shots so a click never fires twice.
export function createInput(canvas) {
  const input = {
    up: false,
    down: false,
    left: false,
    right: false,
    throwTarget: null,
    dimQueued: false,
    pauseQueued: false,
    confirmQueued: false,
    mouse: { x: 0, y: 0 },
  };

  const keyMap = {
    KeyW: 'up',
    ArrowUp: 'up',
    KeyS: 'down',
    ArrowDown: 'down',
    KeyA: 'left',
    ArrowLeft: 'left',
    KeyD: 'right',
    ArrowRight: 'right',
  };

  window.addEventListener('keydown', (e) => {
    if (keyMap[e.code] !== undefined) {
      input[keyMap[e.code]] = true;
      e.preventDefault();
    } else if (e.code === 'KeyQ') {
      input.throwTarget = { x: input.mouse.x, y: input.mouse.y };
    } else if (e.code === 'KeyE') {
      input.dimQueued = true;
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      input.pauseQueued = true;
    } else if (e.code === 'Space' || e.code === 'Enter') {
      input.confirmQueued = true;
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    if (keyMap[e.code] !== undefined) input[keyMap[e.code]] = false;
  });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouse.x = ((e.clientX - r.left) / r.width) * canvas.width;
    input.mouse.y = ((e.clientY - r.top) / r.height) * canvas.height;
  });
  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * canvas.width;
    const y = ((e.clientY - r.top) / r.height) * canvas.height;
    input.mouse.x = x;
    input.mouse.y = y;
    // Left click throws a Hush Coin at the point; right click does the same.
    input.throwTarget = { x, y };
    e.preventDefault();
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  return input;
}
