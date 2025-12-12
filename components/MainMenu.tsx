import React from 'react';
import { ClassType, HighScore } from '../types';
import { CLASS_CONFIG } from '../constants';
import { Trophy, Share2, AlertTriangle, Crosshair, Briefcase } from 'lucide-react';

interface MainMenuProps {
  onStart: (selectedClass: ClassType, difficulty: number) => void;
  highScores: HighScore[];
  totalAssets: number;
  onResetScores: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStart, highScores, totalAssets, onResetScores }) => {
  const [selectedClass, setSelectedClass] = React.useState<ClassType>(ClassType.ASSAULT);
  const [difficulty, setDifficulty] = React.useState<number>(1); // 1: Normal, 1.5: Hard, 2: Insane

  const shareScore = () => {
    const text = `我正在玩《习之平面三角洲》！我的生涯总资产已达 $${totalAssets.toLocaleString()}！来挑战我吧！`;
    if (navigator.share) {
      navigator.share({ title: '习之平面三角洲', text, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('链接已复制到剪贴板！');
    }
  };

  return (
    <div className="absolute inset-0 bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="max-w-4xl w-full bg-slate-800 border border-slate-600 shadow-2xl rounded-lg p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Col: Game Setup */}
        <div className="space-y-6">
          <header className="text-center lg:text-left">
            <h1 className="text-4xl font-black tracking-tighter text-yellow-500 flex items-center gap-3 justify-center lg:justify-start">
              <Crosshair size={36} /> 习之平面三角洲
            </h1>
            <p className="text-slate-400 mt-2 text-sm uppercase tracking-widest">战术提取射击游戏</p>
          </header>

          <div className="space-y-4">
            <h3 className="text-lg font-bold border-b border-slate-700 pb-2">选择干员</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(ClassType).map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedClass(c)}
                  className={`p-3 rounded border-2 text-left transition-all ${
                    selectedClass === c 
                      ? 'border-yellow-500 bg-slate-700 ring-2 ring-yellow-500/20' 
                      : 'border-slate-600 hover:bg-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="font-bold text-sm" style={{color: CLASS_CONFIG[c].color}}>{c}</div>
                  <div className="text-xs text-slate-400 mt-1">{CLASS_CONFIG[c].desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold border-b border-slate-700 pb-2">行动难度</h3>
            <div className="flex gap-2">
              {[
                { label: '普通', val: 1, color: 'text-green-400' },
                { label: '机密', val: 1.5, color: 'text-orange-400' },
                { label: '绝密', val: 2.0, color: 'text-red-500' }
              ].map((d) => (
                <button
                  key={d.label}
                  onClick={() => setDifficulty(d.val)}
                  className={`flex-1 py-2 rounded font-bold text-sm ${
                    difficulty === d.val ? 'bg-slate-600 border border-slate-400' : 'bg-slate-900 border border-slate-800'
                  } ${d.color}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onStart(selectedClass, difficulty)}
            className="w-full py-4 bg-yellow-600 hover:bg-yellow-500 text-black font-black text-xl uppercase tracking-wider rounded shadow-lg transition-transform active:scale-95"
          >
            部署到区域
          </button>
        </div>

        {/* Right Col: Info & Scores */}
        <div className="space-y-6 border-t lg:border-t-0 lg:border-l border-slate-700 lg:pl-8 pt-6 lg:pt-0">
          
          {/* Total Assets Card */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 border border-yellow-500/50 p-4 rounded shadow-lg">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold uppercase text-yellow-500 flex items-center gap-2">
                 <Briefcase size={14} /> 生涯总资产
              </span>
            </div>
            <div className="text-4xl font-mono font-bold text-yellow-400 tracking-tight">
              ${totalAssets.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              通过成功撤离累积物资价值
            </div>
          </div>

          <div className="bg-black/30 p-4 rounded border border-slate-700">
            <h3 className="text-yellow-500 font-bold mb-2 flex items-center gap-2">
              <AlertTriangle size={18} /> 任务简报
            </h3>
            <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4">
              <li>潜入 <span className="text-slate-100 font-bold">沙漠废墟</span>。</li>
              <li>搜刮物资。注意负重限制。</li>
              <li>寻找 <span className="text-red-400 font-bold">曼德尔砖</span> (金箱) 以获取巨额回报，但注意：拾取会暴露你的位置。</li>
              <li>在 <span className="text-green-400 font-bold">绿色信号弹</span> 处撤离。坚守3秒。</li>
            </ul>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Trophy size={18} className="text-yellow-500" /> 近期战绩
              </h3>
              <div className="flex gap-2">
                <button onClick={shareScore} className="p-1 hover:text-blue-400"><Share2 size={16}/></button>
              </div>
            </div>
            
            <div className="bg-slate-900 rounded h-32 overflow-y-auto border border-slate-700 p-2">
              {highScores.length === 0 ? (
                <div className="text-center text-slate-500 py-6 italic">暂无记录。</div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                      <th className="pb-1">干员</th>
                      <th className="pb-1">分数</th>
                      <th className="pb-1">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {highScores.sort((a,b) => b.score - a.score).map((s, i) => (
                      <tr key={i} className="border-b border-slate-800/50">
                        <td className="py-2 text-slate-300">{s.classType}</td>
                        <td className="py-2 font-mono text-yellow-400">${s.score.toLocaleString()}</td>
                        <td className={`py-2 ${s.extracted ? 'text-green-500' : 'text-red-500'}`}>
                          {s.extracted ? '已撤离' : '阵亡'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <button 
              onClick={onResetScores}
              className="mt-2 text-xs text-slate-500 underline hover:text-slate-300"
            >
              重置记录与资产
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MainMenu;