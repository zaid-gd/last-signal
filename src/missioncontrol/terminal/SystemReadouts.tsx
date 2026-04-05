import { useGameStore } from '../../stores/useGameStore';

export default function SystemReadouts() {
  const healths = useGameStore((state) => state.systemHealth);

  const renderBar = (percent: number) => {
    const total = 10;
    const filledCount = Math.round((percent / 100) * total);
    const emptyCount = total - filledCount;
    
    let color = '#00ff41'; // Green
    if (percent < 30) color = '#ff4444'; // Red
    else if (percent < 60) color = '#ffb000'; // Amber

    return (
      <div className="flex items-center space-x-2 font-mono text-sm" style={{ color }}>
        <span>[{'#'.repeat(filledCount)}{'·'.repeat(emptyCount)}]</span>
        <span className="w-8 tabular-nums text-right">{Math.round(percent)}%</span>
      </div>
    );
  };

  const systems = [
    { key: 'hull', label: 'HULL' },
    { key: 'lifeSupport', label: 'LIFE SUPPORT' },
    { key: 'power', label: 'POWER GRID' },
    { key: 'navigation', label: 'NAVIGATION' },
    { key: 'comms', label: 'COMMS ARRAY' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 rounded border border-[#00ff41]/25 bg-transparent px-4 py-4 backdrop-blur-sm">
      {systems.map((s) => (
        <div key={s.key} className="flex flex-col space-y-1">
          <span className="text-[10px] tracking-[0.2em] text-[#00ff41]/60 uppercase">{s.label}</span>
          {renderBar(healths[s.key as keyof typeof healths])}
        </div>
      ))}
    </div>
  );
}
