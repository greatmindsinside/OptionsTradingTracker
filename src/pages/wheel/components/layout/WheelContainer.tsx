import React from 'react';

export const WheelContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen relative overflow-hidden bg-black text-zinc-100 cyber-bg">
      <div className="pointer-events-none absolute -top-24 -left-20 rounded-full bg-green-500/15 blur-3xl h-112 aspect-square" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 rounded-full bg-green-400/20 blur-3xl h-128 aspect-square" />
      {children}
    </div>
  );
};
