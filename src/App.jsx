import React, { useMemo, useRef, useState } from 'react';
import GameCanvas from './components/GameCanvas.jsx';
import HUD from './components/HUD.jsx';
import Controls from './components/Controls.jsx';
import About from './components/About.jsx';

export default function App() {
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [world, setWorld] = useState('1-1');
  const [timeLeft, setTimeLeft] = useState(400);
  const [lives, setLives] = useState(3);
  const [paused, setPaused] = useState(false);

  // Shared input state for keyboard and touch controls
  const inputRef = useRef({ left: false, right: false, up: false, run: false });

  const gameApi = useRef({ reset: () => {}, pause: () => {} });

  const actions = useMemo(
    () => ({
      addScore: (v) => setScore((s) => s + v),
      addCoin: () => {
        setCoins((c) => (c + 1) % 100);
        setScore((s) => s + 200);
      },
      setTime: setTimeLeft,
      loseLife: () => setLives((l) => Math.max(0, l - 1)),
      gainLife: () => setLives((l) => l + 1),
      setWorld,
      reset: () => {
        setScore(0);
        setCoins(0);
        setTimeLeft(400);
        setLives(3);
        setWorld('1-1');
        gameApi.current.reset();
      },
      pauseToggle: () => {
        setPaused((p) => {
          const np = !p;
          gameApi.current.pause(np);
          return np;
        });
      },
    }),
    []
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-300 to-blue-800 text-white">
      <div className="max-w-5xl mx-auto px-4 py-4">
        <header className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-black tracking-tight drop-shadow">Super Retro Platformer</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={actions.pauseToggle}
              className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/20"
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={actions.reset}
              className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/20"
            >
              Reset
            </button>
          </div>
        </header>
        <HUD score={score} coins={coins} world={world} timeLeft={timeLeft} lives={lives} />
        <div className="relative rounded-lg overflow-hidden border border-white/20 shadow-2xl">
          <GameCanvas
            inputRef={inputRef}
            actions={actions}
            paused={paused}
            bindApi={(api) => (gameApi.current = api)}
          />
        </div>
        <Controls inputRef={inputRef} />
        <About />
      </div>
    </div>
  );
}
