import React, { useEffect, useRef } from 'react';

// Retro platformer engine with bespoke pixel art and a long side-scrolling level.
// Implemented as tile-based physics on HTMLCanvas for crisp pixels.

export default function GameCanvas({ inputRef, actions, paused, bindApi }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const stateRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const TILE = 16; // base pixel tile
    const SCALE = 3; // pixel scale up
    const VIEW_W = Math.floor(canvas.clientWidth / (TILE * SCALE));
    const VIEW_H = Math.floor(canvas.clientHeight / (TILE * SCALE));

    canvas.width = VIEW_W * TILE * SCALE;
    canvas.height = VIEW_H * TILE * SCALE;

    // Palette
    const PAL = {
      skyTop: '#7ec9ff',
      skyBottom: '#3480de',
      groundA: '#8b4b1e',
      groundB: '#c56d2d',
      grass: '#63b52f',
      brick: '#b0502f',
      brickHL: '#d97a58',
      q: '#f4a935',
      qHL: '#ffd56c',
      coin: '#ffd949',
      coinHL: '#fff7b1',
      pipe: '#2dbb6a',
      pipeHL: '#6be39a',
      player: '#ff3a4e',
      playerHL: '#ffd1d6',
      enemy: '#6b3b1a',
      enemyHL: '#d7a579',
      flag: '#ffffff',
      flagPole: '#d0f5ff',
      castle: '#59341f',
    };

    // Level encoded as strings; each char = tile
    // Legend: # ground, B brick, ? question/coin, C coin floating, P pipe, E enemy spawn, F flagpole, K castle, _ empty, ^ hill deco
    const LEVEL = [
      "__________________________________________________________________________________________________________",
      "__________________________________________________________________________________________________________",
      "__________________________________________________________________________________________________________",
      "__________________________________________________________________________________________________________",
      "_____________________________C______________________________B__?_______C__________________________________",
      "___________________________BBB___________________________B_____B____BBBBB_________________________________",
      "_____________________________B___________________________B_____B___________________________________________",
      "_____________________________B_______E___________________B_____B______________E____________________________",
      "_____________________________B___________________________BBBBBBB__________________________________________",
      "_____________________________B______________________________P______________________________________________",
      "_____________________________B______________________________P______________________________________________",
      "_____________________________B______________________________P______________________________________________",
      "_____________________________B_____________BBB_____________PP_____________________________________________",
      "_____________________________B_____________________________PP_____________________________F________________",
      "_____________________________B_______C_____________________PP_____________________________F________________",
      "_____________________________BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB_____________________________F____________KKK_",
      "##########################################################################################################",
      "##########################################################################################################",
    ];

    // Game world
    const world = {
      tile: TILE,
      scale: SCALE,
      width: LEVEL[0].length,
      height: LEVEL.length,
      gravity: 0.5,
      maxRun: 1.8,
      maxSprint: 2.6,
      friction: 0.85,
      jumpVel: -8,
      camX: 0,
    };

    // Player
    const player = {
      x: 2 * TILE,
      y: (world.height - 4) * TILE,
      vx: 0,
      vy: 0,
      w: 12,
      h: 14,
      onGround: false,
      facing: 1,
      invincible: 0,
      dead: false,
    };

    // Enemy factory
    const enemies = [];
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        if (LEVEL[y][x] === 'E') {
          enemies.push({ x: x * TILE, y: y * TILE - 1, vx: -0.6, vy: 0, w: 12, h: 12, alive: true });
        }
      }
    }

    // Coins floating
    const floatingCoins = [];
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        const ch = LEVEL[y][x];
        if (ch === 'C') floatingCoins.push({ x: x * TILE + 4, y: y * TILE + 4, taken: false, t: 0 });
      }
    }

    // Time
    let timeLeft = 400;
    let timeAccumulator = 0;

    // Helpers
    const getTile = (tx, ty) => {
      if (tx < 0 || ty < 0 || tx >= world.width || ty >= world.height) return '#';
      return LEVEL[ty][tx];
    };
    const solidAt = (tx, ty) => {
      const t = getTile(tx, ty);
      return t === '#' || t === 'B' || t === 'P' || t === 'K';
    };

    const hitRectTile = (x, y, w, h) => {
      const left = Math.floor(x / TILE);
      const right = Math.floor((x + w - 1) / TILE);
      const top = Math.floor(y / TILE);
      const bottom = Math.floor((y + h - 1) / TILE);
      const hits = [];
      for (let ty = top; ty <= bottom; ty++) {
        for (let tx = left; tx <= right; tx++) {
          if (solidAt(tx, ty)) hits.push({ tx, ty, t: getTile(tx, ty) });
        }
      }
      return hits;
    };

    function rectVsRect(ax, ay, aw, ah, bx, by, bw, bh) {
      return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    function setTime(t) {
      timeLeft = Math.max(0, Math.floor(t));
      actions.setTime(timeLeft);
    }

    function reset() {
      player.x = 2 * TILE;
      player.y = (world.height - 4) * TILE;
      player.vx = 0;
      player.vy = 0;
      player.onGround = false;
      player.dead = false;
      player.invincible = 0;
      world.camX = 0;
      for (const e of enemies) {
        e.alive = true;
        e.vx = -0.6;
        e.vy = 0;
      }
      for (const c of floatingCoins) {
        c.taken = false;
        c.t = 0;
      }
      setTime(400);
    }

    function pause(p) {
      // handled by main loop reading paused flag
    }

    bindApi({ reset, pause });
    stateRef.current = { world, player, enemies, floatingCoins };

    // Input handlers
    const keyMap = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'up',
      z: 'up',
      Z: 'up',
      k: 'up',
      K: 'up',
      x: 'run',
      X: 'run',
      l: 'run',
      L: 'run',
    };

    const down = (e) => {
      const k = keyMap[e.key];
      if (k) {
        inputRef.current[k] = true;
        e.preventDefault();
      }
      if (e.key === 'Escape') actions.pauseToggle?.();
    };
    const up = (e) => {
      const k = keyMap[e.key];
      if (k) {
        inputRef.current[k] = false;
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);

    // Main loop
    let last = performance.now();
    function loop(now) {
      const dt = Math.min(33, now - last);
      last = now;

      if (!paused) {
        update(dt / 16.67);
        render();
      } else {
        render(true);
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    function update(dt) {
      // timer
      timeAccumulator += dt;
      if (timeAccumulator >= 1) {
        timeAccumulator -= 1;
        setTime(timeLeft - 1);
        if (timeLeft <= 0 && !player.dead) {
          killPlayer();
        }
      }

      const runPressed = inputRef.current.run;
      const targetSpeed = runPressed ? world.maxSprint : world.maxRun;

      // horizontal input
      if (inputRef.current.left) {
        player.vx = Math.max(player.vx - 0.2 * dt * (runPressed ? 1.3 : 1), -targetSpeed);
        player.facing = -1;
      } else if (inputRef.current.right) {
        player.vx = Math.min(player.vx + 0.2 * dt * (runPressed ? 1.3 : 1), targetSpeed);
        player.facing = 1;
      } else {
        player.vx *= world.friction;
        if (Math.abs(player.vx) < 0.05) player.vx = 0;
      }

      // gravity
      player.vy += world.gravity * dt * 1.0;

      // jump
      if (inputRef.current.up && player.onGround && !player.dead) {
        player.vy = world.jumpVel;
        player.onGround = false;
      }

      // Integrate X with collisions
      player.x += player.vx * TILE * dt;
      let hits = hitRectTile(player.x, player.y, player.w, player.h);
      for (const h of hits) {
        const tx = h.tx * TILE;
        const ty = h.ty * TILE;
        if (player.vx > 0 && player.x + player.w > tx && player.x < tx) {
          player.x = tx - player.w - 0.01;
          player.vx = 0;
        } else if (player.vx < 0 && player.x < tx + TILE && player.x + player.w > tx + TILE) {
          player.x = tx + TILE + 0.01;
          player.vx = 0;
        }
      }

      // Integrate Y with collisions
      player.y += player.vy * dt;
      player.onGround = false;
      hits = hitRectTile(player.x, player.y, player.w, player.h);
      for (const h of hits) {
        const tx = h.tx * TILE;
        const ty = h.ty * TILE;
        if (player.vy > 0 && player.y + player.h > ty && player.y < ty) {
          player.y = ty - player.h - 0.01;
          player.vy = 0;
          player.onGround = true;
        } else if (player.vy < 0 && player.y < ty + TILE && player.y + player.h > ty + TILE) {
          // bump block
          player.y = ty + TILE + 0.01;
          player.vy = 0.5;
          bumpBlock(h.tx, h.ty);
        }
      }

      // World bounds
      if (player.y > (world.height + 2) * TILE && !player.dead) {
        killPlayer();
      }

      // Camera follow
      const centerX = player.x + player.w / 2;
      const viewWidthPx = canvas.width / SCALE;
      const camTarget = Math.max(0, Math.min(centerX - viewWidthPx * 0.35, world.width * TILE - viewWidthPx));
      world.camX += (camTarget - world.camX) * 0.2;

      // Enemies
      for (const e of enemies) {
        if (!e.alive) continue;
        e.vy += world.gravity * dt;
        e.x += e.vx * TILE * dt;
        // turns on hitting solid
        const eHitsX = hitRectTile(e.x, e.y, e.w, e.h);
        for (const h of eHitsX) {
          const tx = h.tx * TILE;
          if (e.vx > 0 && e.x + e.w > tx && e.x < tx) {
            e.x = tx - e.w - 0.01;
            e.vx *= -1;
          } else if (e.vx < 0 && e.x < tx + TILE && e.x + e.w > tx + TILE) {
            e.x = tx + TILE + 0.01;
            e.vx *= -1;
          }
        }
        e.y += e.vy * dt;
        let onGround = false;
        const eHitsY = hitRectTile(e.x, e.y, e.w, e.h);
        for (const h of eHitsY) {
          const ty = h.ty * TILE;
          if (e.vy > 0 && e.y + e.h > ty && e.y < ty) {
            e.y = ty - e.h - 0.01;
            e.vy = 0;
            onGround = true;
          } else if (e.vy < 0) {
            e.y = ty + TILE + 0.01;
            e.vy = 0.5;
          }
        }
        // edge turn
        if (onGround) {
          const ahead = e.x + (e.vx > 0 ? e.w + 1 : -1);
          const footY = Math.floor((e.y + e.h + 1) / TILE);
          const tileAhead = Math.floor(ahead / TILE);
          if (!solidAt(tileAhead, footY)) e.vx *= -1;
        }

        // Enemy vs player
        if (!player.dead && rectVsRect(player.x, player.y, player.w, player.h, e.x, e.y, e.w, e.h)) {
          const playerTop = player.y + player.h - 4;
          if (player.vy > 0 && playerTop < e.y + 4) {
            // stomp
            e.alive = false;
            actions.addScore(100);
            player.vy = -6;
          } else if (player.invincible <= 0) {
            killPlayer();
          }
        }
      }

      // Collect floating coins
      for (const c of floatingCoins) {
        if (c.taken) continue;
        c.t += dt;
        if (rectVsRect(player.x, player.y, player.w, player.h, c.x, c.y, 8, 8)) {
          c.taken = true;
          actions.addCoin();
          actions.addScore(100);
        }
      }

      // Reaching flagpole (F tiles)
      const px = Math.floor((player.x + player.w / 2) / TILE);
      const py = Math.floor((player.y + player.h / 2) / TILE);
      if (getTile(px, py) === 'F') {
        actions.addScore(1000);
        actions.setWorld('1-2');
        setTimeout(reset, 800);
      }
    }

    function bumpBlock(tx, ty) {
      const t = getTile(tx, ty);
      if (t === 'B') {
        // breakable brick surrogate: score
        actions.addScore(50);
      } else if (t === '?') {
        // question block gives a coin once
        actions.addCoin();
        actions.addScore(200);
      }
    }

    function killPlayer() {
      if (player.dead) return;
      player.dead = true;
      actions.loseLife();
      setTimeout(() => {
        reset();
      }, 900);
    }

    function drawBackground() {
      // sky gradient
      const grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grd.addColorStop(0, PAL.skyTop);
      grd.addColorStop(1, PAL.skyBottom);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function drawTile(ch, x, y) {
      // x,y in pixels (world units, before SCALE)
      if (ch === '#') {
        // ground block with top grass
        ctx.fillStyle = PAL.groundB;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = PAL.groundA;
        ctx.fillRect(x + 1, y + 5, TILE - 2, TILE - 6);
        // grass
        ctx.fillStyle = PAL.grass;
        ctx.fillRect(x, y, TILE, 4);
        ctx.fillStyle = '#ffffff33';
        ctx.fillRect(x, y, TILE, 1);
      } else if (ch === 'B') {
        // brick
        ctx.fillStyle = PAL.brick;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = PAL.brickHL;
        for (let i = 2; i < TILE; i += 4) {
          ctx.fillRect(x + 2, y + i, TILE - 4, 1);
        }
        ctx.fillRect(x + 2, y + 2, TILE - 4, 1);
        ctx.fillRect(x + 2, y + 8, TILE - 4, 1);
      } else if (ch === '?') {
        // question block
        ctx.fillStyle = PAL.q;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = PAL.qHL;
        ctx.fillRect(x + 2, y + 2, TILE - 4, 1);
        ctx.fillRect(x + 2, y + 13, TILE - 4, 1);
        ctx.fillRect(x + 1, y + 1, 1, TILE - 2);
        ctx.fillRect(x + 14, y + 1, 1, TILE - 2);
        // mark
        ctx.fillStyle = '#6b3b1a';
        ctx.fillRect(x + 7, y + 6, 2, 2);
      } else if (ch === 'P') {
        // pipe
        ctx.fillStyle = PAL.pipe;
        ctx.fillRect(x + 2, y, TILE - 4, TILE);
        ctx.fillStyle = PAL.pipeHL;
        ctx.fillRect(x + 2, y, TILE - 4, 3);
        ctx.fillRect(x + 2, y + 12, TILE - 4, 2);
        ctx.fillRect(x + 1, y + 2, 2, TILE - 4);
      } else if (ch === 'F') {
        // flag pole segment
        ctx.fillStyle = PAL.flagPole;
        ctx.fillRect(x + TILE / 2 - 1, y - TILE * 2, 2, TILE * 3);
        ctx.fillStyle = PAL.flag;
        ctx.fillRect(x + TILE / 2 + 1, y - 10, 10, 6);
      } else if (ch === 'K') {
        // simple castle
        ctx.fillStyle = PAL.castle;
        ctx.fillRect(x, y - 8, TILE, TILE + 8);
        ctx.fillStyle = '#00000055';
        ctx.fillRect(x + 5, y + 4, 6, 6);
      }
    }

    function drawPlayer(px, py) {
      // main body
      ctx.fillStyle = PAL.player;
      ctx.fillRect(px, py + 4, 12, 10);
      // head
      ctx.fillStyle = PAL.playerHL;
      ctx.fillRect(px + 2, py, 8, 6);
      // face detail
      ctx.fillStyle = '#7a2431';
      ctx.fillRect(px + (stateRef.current.player.facing > 0 ? 8 : 2), py + 2, 2, 2);
      // feet
      ctx.fillStyle = '#3b1d11';
      ctx.fillRect(px + 1, py + 14, 4, 2);
      ctx.fillRect(px + 7, py + 14, 4, 2);
    }

    function drawEnemy(ex, ey) {
      ctx.fillStyle = PAL.enemy;
      ctx.fillRect(ex, ey + 4, 12, 8);
      ctx.fillStyle = PAL.enemyHL;
      ctx.fillRect(ex + 2, ey, 8, 6);
      ctx.fillStyle = '#2b150a';
      ctx.fillRect(ex + 2, ey + 12, 3, 2);
      ctx.fillRect(ex + 7, ey + 12, 3, 2);
    }

    function render(pausedOverlay = false) {
      drawBackground();

      const { camX } = world;
      const viewW = canvas.width / SCALE;
      const viewH = canvas.height / SCALE;

      // Draw tiles in view
      const startX = Math.floor(camX / TILE) - 2;
      const endX = Math.ceil((camX + viewW) / TILE) + 2;
      for (let ty = 0; ty < world.height; ty++) {
        for (let tx = startX; tx < endX; tx++) {
          const ch = getTile(tx, ty);
          if (ch && ch !== '_' && ch !== 'E' && ch !== 'C') {
            const x = tx * TILE - camX;
            const y = ty * TILE;
            ctx.save();
            ctx.scale(SCALE, SCALE);
            drawTile(ch, x / SCALE, y / SCALE);
            ctx.restore();
          }
        }
      }

      // Floating coins
      for (const c of floatingCoins) {
        if (c.taken) continue;
        const x = c.x - camX;
        const y = c.y + Math.sin(c.t * 3) * 1.5;
        ctx.save();
        ctx.scale(SCALE, SCALE);
        ctx.fillStyle = PAL.coin;
        ctx.fillRect(x / SCALE, y / SCALE, 8, 8);
        ctx.fillStyle = PAL.coinHL;
        ctx.fillRect(x / SCALE + 2, y / SCALE + 2, 2, 2);
        ctx.restore();
      }

      // Player
      const px = Math.floor(player.x - camX);
      const py = Math.floor(player.y);
      ctx.save();
      ctx.scale(SCALE, SCALE);
      drawPlayer(px / SCALE, py / SCALE);
      ctx.restore();

      // Enemies
      for (const e of enemies) {
        if (!e.alive) continue;
        const ex = Math.floor(e.x - camX);
        const ey = Math.floor(e.y);
        if (ex + e.w < -20 || ex > canvas.width + 20) continue;
        ctx.save();
        ctx.scale(SCALE, SCALE);
        drawEnemy(ex / SCALE, ey / SCALE);
        ctx.restore();
      }

      if (pausedOverlay) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Paused', canvas.width / 2, canvas.height / 2);
      }
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, bindApi, paused]);

  return (
    <div className="w-full aspect-[16/9] bg-black">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
