import React from 'react';
import { PlayerStats, Item, GameState, ClassType, MinimapData } from '../types';
import { Backpack, Clock, Shield, MapPin } from 'lucide-react';
import { MAP_WIDTH, MAP_HEIGHT } from '../constants';

interface HUDProps {
  stats: PlayerStats;
  inventory: Item[];
  gameState: GameState;
  classType: ClassType;
  message: string | null;
  zoneTimer: number;
  extractionTimer: number;
  isNight: boolean;
  minimap: MinimapData | null;
  onDropItem: (index: number) => void;
  onRestart: () => void;
  onMenu: () => void;
}

const HUD: React.FC<HUDProps> = ({
  stats,
  inventory,
  gameState,
  classType,
  message,
  zoneTimer,
  extractionTimer,
  isNight,
  minimap,
  onDropItem,
  onRestart,
  onMenu
}) => {
  const [showInventory, setShowInventory] = React.useState(false);

  // Keyboard listener for Inventory toggle (TAB or I)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Tab' || e.code === 'KeyI') {
        e.preventDefault(); // Stop tab switching focus
        setShowInventory(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (gameState !== GameState.PLAYING) {
    // Game Over / Win Screen
    return (
      <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white z-50 animate-fade-in">
        <h1 className={`text-6xl font-black mb-4 ${gameState === GameState.EXTRACTED ? 'text-green-500' : 'text-red-600'}`}>
          {gameState === GameState.EXTRACTED ? '行动成功' : '行动失败 - 阵亡'}
        </h1>
        <div className="bg-slate-800 p-8 rounded-lg border border-slate-600 text-center max-w-md w-full">
          <div className="text-sm text-slate-400 uppercase tracking-widest mb-2">带出物资总价值</div>
          <div className="text-5xl font-mono text-yellow-400 mb-8">${stats.score.toLocaleString()}</div>
          
          <div className="space-y-3">
             <button onClick={onRestart} className="w-full py-3 bg-blue-600 hover:bg-blue-500 font-bold rounded">
              再次部署
            </button>
            <button onClick={onMenu} className="w-full py-3 bg-slate-700 hover:bg-slate-600 font-bold rounded">
              返回基地
            </button>
          </div>
        </div>
      </div>
    );
  }

  const weightPercent = Math.min(100, (stats.weight / stats.maxWeight) * 100);

  // Minimap scaling
  const MM_SIZE = 150;
  const mmScale = MM_SIZE / MAP_WIDTH;

  return (
    <div className={`absolute inset-0 pointer-events-none flex flex-col justify-between p-4 ${isNight ? 'text-green-400' : 'text-white'}`}>
      {/* Top HUD */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className="flex gap-4">
          {/* Health & Ammo */}
          <div className="bg-black/60 p-3 rounded backdrop-blur-sm border-l-4 border-red-500 w-48">
             <div className="flex justify-between items-center mb-1">
               <span className="text-xs font-bold uppercase text-slate-400">状态</span>
               <span className="font-mono font-bold">{Math.floor(stats.hp)}/{stats.maxHp}</span>
             </div>
             <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-red-500 transition-all duration-300" 
                 style={{ width: `${(stats.hp / stats.maxHp) * 100}%` }}
               />
             </div>
             <div className="mt-2 flex items-center gap-2 text-sm">
                <Shield size={16} /> 
                <span className="text-slate-300">{classType}</span>
                <span className="text-slate-500">|</span>
                <span className="text-yellow-500 font-mono">弹药: {stats.ammo}/{stats.maxAmmo}</span>
             </div>
          </div>
        </div>

        {/* Center Top Info */}
        <div className="flex flex-col items-center gap-2">
           <div className="bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm border border-slate-700 font-mono font-bold text-xl flex items-center gap-2 text-yellow-400">
             <span>${stats.score.toLocaleString()}</span>
           </div>
           {extractionTimer > 0 && (
             <div className="bg-green-600 text-white px-4 py-1 rounded font-bold animate-pulse">
                撤离中: {Math.ceil(extractionTimer / 1000)}s
             </div>
           )}
           {message && (
             <div className="bg-red-600/90 text-white px-6 py-2 rounded font-bold uppercase tracking-wider animate-bounce shadow-lg">
               {message}
             </div>
           )}
        </div>

        {/* Right Info + Minimap */}
        <div className="flex flex-col items-end gap-2">
          {/* Minimap */}
          {minimap && (
            <div 
              className="bg-black/80 border border-slate-600 rounded overflow-hidden relative"
              style={{ width: MM_SIZE, height: MM_SIZE }}
            >
              {/* Extraction */}
              {minimap.extraction.map((ep, i) => (
                <div 
                   key={i} 
                   className="absolute bg-green-500 rounded-full w-2 h-2 animate-pulse"
                   style={{ left: ep.x * mmScale - 2, top: ep.y * mmScale - 2 }}
                />
              ))}
              {/* Mandel */}
              {minimap.mandel && (
                <div 
                  className="absolute bg-yellow-500 rounded-sm w-3 h-3 border border-white z-10"
                  style={{ left: minimap.mandel.x * mmScale - 3, top: minimap.mandel.y * mmScale - 3 }}
                />
              )}
              {/* Enemies */}
              {minimap.enemies.map((e, i) => (
                <div 
                   key={i} 
                   className="absolute bg-red-500 rounded-full w-1.5 h-1.5"
                   style={{ left: e.x * mmScale - 1.5, top: e.y * mmScale - 1.5 }}
                />
              ))}
              {/* Player */}
              <div 
                className="absolute bg-blue-400 w-2 h-2 rounded-full border border-white shadow-sm z-20"
                style={{ left: minimap.player.x * mmScale - 3, top: minimap.player.y * mmScale - 3 }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Backpack / Inventory UI */}
      <div className={`pointer-events-auto transition-all duration-300 absolute left-1/2 -translate-x-1/2 bottom-20 bg-slate-900/95 border border-slate-600 rounded-lg p-4 shadow-2xl w-full max-w-lg ${showInventory ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        <div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2">
          <h3 className="font-bold flex items-center gap-2 text-slate-200">
            <Backpack size={18} /> 背包
          </h3>
          <span className={`text-xs font-mono ${weightPercent > 90 ? 'text-red-500' : 'text-slate-400'}`}>
            {stats.weight.toFixed(1)}kg / {stats.maxWeight}kg
          </span>
        </div>
        
        <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
          {inventory.map((item, idx) => (
            <div 
              key={`${item.id}-${idx}`}
              className="relative aspect-square bg-slate-800 border border-slate-700 rounded hover:border-slate-500 group cursor-pointer flex flex-col items-center justify-center p-1"
              title={item.type}
              onClick={() => onDropItem(idx)}
            >
              <div 
                className="w-8 h-8 rounded-sm shadow-sm mb-1" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[10px] text-center leading-tight truncate w-full text-slate-300">{item.type}</span>
              
              {/* Drop Overlay */}
              <div className="absolute inset-0 bg-red-900/80 hidden group-hover:flex items-center justify-center text-xs font-bold text-white rounded">
                丢弃
              </div>
            </div>
          ))}
          {/* Empty Slots visualization */}
          {Array.from({ length: Math.max(0, 10 - inventory.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square bg-slate-800/50 border border-slate-800 border-dashed rounded" />
          ))}
        </div>
        <div className="mt-2 text-[10px] text-center text-slate-500">
          点击物品丢弃 • 负重影响速度
        </div>
      </div>

      {/* Bottom HUD */}
      <div className="flex justify-between items-end pointer-events-auto">
        <div className="bg-black/60 p-2 rounded backdrop-blur-sm text-xs text-slate-400">
           <div className="flex gap-4">
              <span className="flex items-center gap-1"><kbd className="bg-slate-700 px-1 rounded">WASD</kbd> 移动</span>
              <span className="flex items-center gap-1"><kbd className="bg-slate-700 px-1 rounded">LMB</kbd> 射击</span>
              <span className="flex items-center gap-1"><kbd className="bg-slate-700 px-1 rounded">TAB</kbd> 背包</span>
              <span className="flex items-center gap-1"><kbd className="bg-slate-700 px-1 rounded">E</kbd> 交互</span>
           </div>
        </div>

        <button 
          onClick={() => setShowInventory(!showInventory)}
          className={`p-3 rounded-full border-2 transition-colors flex items-center justify-center shadow-lg ${showInventory ? 'bg-yellow-600 border-yellow-400 text-white' : 'bg-black/60 border-slate-600 text-slate-400 hover:text-white'}`}
        >
          <Backpack size={24} />
          {inventory.length > 0 && (
             <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
               {inventory.length}
             </span>
          )}
        </button>
      </div>

    </div>
  );
};

export default HUD;