import React, { useEffect, useRef, useState } from 'react';

export default function Controls({ inputRef }) {
  const [visible, setVisible] = useState(false);
  const hold = (key, v) => {
    inputRef.current[key] = v;
  };

  useEffect(() => {
    const onResize = () => setVisible(window.innerWidth < 900);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!visible) return null;

  return (
    <div className="mt-3 select-none">
      <div className="flex justify-between items-center gap-4">
        <div className="flex gap-3">
          <Btn label="◀" onDown={() => hold('left', true)} onUp={() => hold('left', false)} />
          <Btn label="▶" onDown={() => hold('right', true)} onUp={() => hold('right', false)} />
        </div>
        <div className="flex gap-3 items-center">
          <Btn label="A" onDown={() => hold('up', true)} onUp={() => hold('up', false)} />
          <Btn label="B" onDown={() => hold('run', true)} onUp={() => hold('run', false)} />
        </div>
      </div>
      <div className="text-center text-xs opacity-80 mt-1">Touch controls enabled</div>
    </div>
  );
}

function Btn({ label, onDown, onUp }) {
  const ref = useRef(null);
  return (
    <button
      ref={ref}
      className="h-16 w-16 rounded-full bg-white/20 border border-white/30 active:translate-y-[2px] active:bg-white/30 shadow-lg backdrop-blur-sm"
      onMouseDown={(e) => {
        e.preventDefault();
        onDown();
      }}
      onMouseUp={(e) => {
        e.preventDefault();
        onUp();
      }}
      onMouseLeave={(e) => {
        e.preventDefault();
        onUp();
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        onDown();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        onUp();
      }}
    >
      <span className="font-black text-xl drop-shadow-lg">{label}</span>
    </button>
  );
}
