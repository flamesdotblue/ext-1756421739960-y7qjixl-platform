import React from 'react';

export default function About() {
  return (
    <section className="mt-6 rounded-lg border border-white/20 bg-white/5 p-4 leading-relaxed text-sm text-white/90">
      <h2 className="text-base font-semibold mb-2">About this game</h2>
      <p>
        A lovingly crafted retro platformer inspired by classic side-scrollers. Run, jump, collect coins, bop enemies, and reach the goal flag. Keyboard controls: Left/Right to move, Z or K to jump, X or L to sprint. Mobile has touch controls.
      </p>
      <p className="mt-2 opacity-80">
        Note: This is an original tribute with bespoke pixel art and level design echoing familiar vibes, not a reproduction of any specific commercial game or assets.
      </p>
    </section>
  );
}
