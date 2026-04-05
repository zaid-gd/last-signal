import React from 'react';

export default function TerminalShell({ children, chatTyping }: { children: React.ReactNode, chatTyping?: boolean }) {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black text-[#00ff41] font-mono selection:bg-[#00ff41] selection:text-black">
      {/* Scanline overlay */}
      <div 
        className="pointer-events-none absolute inset-0 z-50 overflow-hidden"
        style={{
          background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
          backgroundSize: '100% 4px, 3px 100%',
        }}
      />
      
      {/* Flicker animation */}
      <div className="absolute inset-0 z-40 bg-[rgba(18,16,16,0.1)] pointer-events-none animate-flicker" />
      
      {/* Static noise / grain */}
      <div 
        className="pointer-events-none absolute inset-0 z-30 opacity-[0.03]"
        style={{
          backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")',
        }}
      />

      <div className={`relative z-10 flex h-full flex-col p-6 transition-all duration-300 ${chatTyping ? 'blur-[2px] brightness-75' : ''}`}>
        {children}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes flicker {
          0% { opacity: 0.27861; }
          5% { opacity: 0.34769; }
          10% { opacity: 0.23604; }
          15% { opacity: 0.90626; }
          20% { opacity: 0.18128; }
          25% { opacity: 0.83891; }
          30% { opacity: 0.65583; }
          35% { opacity: 0.67807; }
          40% { opacity: 0.26559; }
          45% { opacity: 0.84693; }
          50% { opacity: 0.96019; }
          55% { opacity: 0.08594; }
          60% { opacity: 0.20313; }
          65% { opacity: 0.71988; }
          70% { opacity: 0.53455; }
          75% { opacity: 0.37288; }
          80% { opacity: 0.71428; }
          85% { opacity: 0.70419; }
          90% { opacity: 0.7003; }
          95% { opacity: 0.36108; }
          100% { opacity: 0.24387; }
        }
        .animate-flicker {
          animation: flicker 0.15s infinite;
          opacity: 0.05 !important;
        }
      `}} />
    </div>
  );
}
