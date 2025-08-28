import React from 'react';

export default function HUD({ score, coins, world, timeLeft, lives }) {
  return (
    <div className="w-full mb-2 grid grid-cols-4 gap-2 text-sm font-mono">
      <InfoBlock label="SCORE" value={score.toString().padStart(6, '0')} />
      <InfoBlock label="COINS" value={`x${coins.toString().padStart(2, '0')}`} />
      <InfoBlock label="WORLD" value={world} />
      <InfoBlock label="TIME" value={timeLeft.toString().padStart(3, '0')} />
      <div className="col-span-4 text-right text-xs opacity-80">Lives: {lives}</div>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="rounded bg-white/10 border border-white/20 p-2">
      <div className="opacity-70 tracking-widest text-[10px]">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
