import React, { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Choice, SpinResult } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTheme } from './hooks/useTheme';
import { generateId } from './utils/id';
import { DEFAULT_PARTY_CHOICES } from './constants/presets';
import Header, { GameMode } from './components/Header';
import SpinWheel from './components/SpinWheel';
import ChoicePanel from './components/ChoicePanel';
import ResultModal from './components/ResultModal';
import EdgeCaseModal from './components/EdgeCaseModal';
import SpinHistory from './components/SpinHistory';
import StatisticsPanel from './components/StatisticsPanel';
import SpinBottleGame from './components/SpinBottle/SpinBottleGame';

const App: React.FC = () => {
  const { theme, toggleTheme, isDark } = useTheme();
  const [soundEnabled, setSoundEnabled] = useLocalStorage('stw-sound', true);
  const [gameMode, setGameMode] = useLocalStorage<GameMode>('stw-mode', 'wheel');

  // ── Wheel state ──────────────────────────────────────────────────────────
  const [choices, setChoices] = useLocalStorage<Choice[]>('stw-choices', DEFAULT_PARTY_CHOICES);
  const [history, setHistory] = useLocalStorage<SpinResult[]>('stw-history', []);
  const [winner, setWinner] = useState<Choice | null>(null);
  const [showEdgeCase, setShowEdgeCase] = useState(false);
  const [edgePrimary, setEdgePrimary] = useState<Choice | null>(null);
  const [edgeAdjacent, setEdgeAdjacent] = useState<Choice | null>(null);

  const recordResult = useCallback(
    (choice: Choice) => {
      const result: SpinResult = { id: generateId(), choice, timestamp: Date.now() };
      setHistory((prev) => [...prev.slice(-99), result]);
    },
    [setHistory]
  );

  const handleSpinComplete = useCallback(
    (win: Choice, edge: { near: boolean; adjacentIndex: number }) => {
      if (edge.near && edge.adjacentIndex >= 0) {
        setEdgePrimary(win);
        setEdgeAdjacent(choices[edge.adjacentIndex]);
        setShowEdgeCase(true);
      } else {
        recordResult(win);
        setWinner(win);
      }
    },
    [choices, recordResult]
  );

  const handleEdgeSelect = useCallback(
    (choice: Choice) => {
      setShowEdgeCase(false);
      setEdgePrimary(null);
      setEdgeAdjacent(null);
      recordResult(choice);
      setWinner(choice);
    },
    [recordResult]
  );

  return (
    <div className={`app-bg ${isDark ? 'dark' : ''}`}>
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((s) => !s)}
        gameMode={gameMode}
        onGameModeChange={setGameMode}
      />

      <main className="relative z-10 pt-14 min-h-screen">
        <div className="max-w-[1200px] mx-auto px-3 sm:px-4 md:px-6 py-6">
          <AnimatePresence mode="wait">
            {gameMode === 'wheel' ? (
              <motion.div
                key="wheel"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25 }}
              >
                <div className="flex flex-col lg:flex-row gap-5">
                  {/* Left panel */}
                  <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0 flex flex-col gap-4 order-2 lg:order-1">
                    <div
                      className="glass-card p-4 flex flex-col"
                      style={{ minHeight: 360, maxHeight: '60vh' }}
                    >
                      <ChoicePanel choices={choices} onChange={setChoices} />
                    </div>
                  </aside>

                  {/* Wheel + history */}
                  <div className="flex-1 flex flex-col gap-4 order-1 lg:order-2 min-w-0">
                    <div className="glass-card p-4 sm:p-6">
                      <div className="w-full" style={{ maxWidth: 560, margin: '0 auto' }}>
                        <SpinWheel
                          choices={choices}
                          onSpinComplete={handleSpinComplete}
                          soundEnabled={soundEnabled}
                          isDark={isDark}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <SpinHistory history={history} onClear={() => setHistory([])} />
                      <StatisticsPanel history={history} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="bottle"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25 }}
              >
                <SpinBottleGame soundEnabled={soundEnabled} isDark={isDark} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {showEdgeCase && edgePrimary && edgeAdjacent && (
        <EdgeCaseModal
          primary={edgePrimary}
          adjacent={edgeAdjacent}
          onSelect={handleEdgeSelect}
          onClose={() => { setShowEdgeCase(false); setEdgePrimary(null); setEdgeAdjacent(null); }}
        />
      )}
      <ResultModal
        winner={winner}
        onClose={() => setWinner(null)}
        onSpinAgain={() => setWinner(null)}
      />
    </div>
  );
};

export default App;
