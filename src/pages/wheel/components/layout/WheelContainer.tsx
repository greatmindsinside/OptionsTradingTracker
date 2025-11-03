import React from 'react';

export const WheelContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="cyber-bg relative min-h-screen overflow-hidden bg-black text-zinc-100">
      <div className="pointer-events-none absolute -top-24 -left-20 aspect-square h-112 rounded-full bg-green-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-32 aspect-square h-128 rounded-full bg-green-400/20 blur-3xl" />
      {children}
    </div>
  );
};
