import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import MainMenu from './components/MainMenu';
import MobileControls from './components/MobileControls';
import { GameState, ClassType, PlayerStats, Item, HighScore, MinimapData } from './types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [selectedClass, setSelectedClass] = useState<ClassType>(ClassType.ASSAULT);
  const [difficulty, setDifficulty] = useState(1);
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [totalAssets, setTotalAssets] = useState<number>(0);
  
  // Game Live Data for HUD
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    hp: 100, maxHp: 100, ammo: 0, maxAmmo: 0, speed: 0, weight: 0, maxWeight: 50, score: 0
  });
  const [inventory, setInventory] = useState<Item[]>([]);
  const [hudMessage, setHudMessage] = useState<string | null>(null);
  const [zoneTimer, setZoneTimer] = useState(300);
  const [extractionTimer, setExtractionTimer] = useState(0);
  const [minimapData, setMinimapData] = useState<MinimapData | null>(null);

  // Load High Scores and Total Assets
  useEffect(() => {
    // Scores
    const savedScores = localStorage.getItem('delta_ops_scores');
    if (savedScores) {
      try {
        setHighScores(JSON.parse(savedScores));
      } catch (e) {
        console.error("Failed to parse scores");
      }
    }

    // Assets
    const savedAssets = localStorage.getItem('delta_ops_assets');
    if (savedAssets) {
      setTotalAssets(parseInt(savedAssets, 10));
    }
  }, []);

  const saveScore = (score: number, extracted: boolean) => {
    const newRecord: HighScore = {
      score,
      classType: selectedClass,
      date: new Date().toISOString(),
      extracted
    };
    const updated = [...highScores, newRecord].slice(-10); // Keep last 10
    setHighScores(updated);
    localStorage.setItem('delta_ops_scores', JSON.stringify(updated));

    // Update Total Assets if extracted
    if (extracted) {
      const newTotal = totalAssets + score;
      setTotalAssets(newTotal);
      localStorage.setItem('delta_ops_assets', newTotal.toString());
    }
  };

  const startGame = (cls: ClassType, diff: number) => {
    setSelectedClass(cls);
    setDifficulty(diff);
    setGameState(GameState.PLAYING);
  };

  const handleGameOver = (finalStats: PlayerStats, extracted: boolean) => {
    setPlayerStats(finalStats); // update final score
    saveScore(finalStats.score, extracted);
    setGameState(extracted ? GameState.EXTRACTED : GameState.DEAD);
  };

  const resetScores = () => {
    localStorage.removeItem('delta_ops_scores');
    localStorage.removeItem('delta_ops_assets');
    setHighScores([]);
    setTotalAssets(0);
  };

  const handleDropItem = (index: number) => {
    // Dispatch event for P5 to pick up
    window.dispatchEvent(new CustomEvent('drop-item', { detail: { index } }));
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-900 select-none">
      
      {/* P5 Layer */}
      <GameCanvas 
        gameState={gameState}
        selectedClass={selectedClass}
        difficulty={difficulty}
        onUpdateHUD={(stats, inv, msg, zTime, eTime, minimap) => {
          setPlayerStats(stats);
          setInventory([...inv]); // copy to trigger render
          setHudMessage(msg);
          setZoneTimer(zTime);
          setExtractionTimer(eTime);
          setMinimapData(minimap);
        }}
        onGameOver={handleGameOver}
      />

      {/* UI Layers */}
      {gameState === GameState.MENU && (
        <MainMenu 
          onStart={startGame} 
          highScores={highScores}
          totalAssets={totalAssets}
          onResetScores={resetScores}
        />
      )}

      {(gameState === GameState.PLAYING || gameState === GameState.EXTRACTED || gameState === GameState.DEAD) && (
        <>
          <HUD 
            stats={playerStats}
            inventory={inventory}
            gameState={gameState}
            classType={selectedClass}
            message={hudMessage}
            zoneTimer={zoneTimer}
            extractionTimer={extractionTimer}
            isNight={false} // Placeholder for future feature
            minimap={minimapData}
            onDropItem={handleDropItem}
            onRestart={() => setGameState(GameState.MENU)}
            onMenu={() => setGameState(GameState.MENU)}
          />
          {/* Always show mobile controls for this request as it's a "mobile adaptation" */}
          {gameState === GameState.PLAYING && <MobileControls />}
        </>
      )}
    </div>
  );
};

export default App;