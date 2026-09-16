import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { Choice } from '../../types';
import SpinBottleGame from '../SpinBottle/SpinBottleGame';
import { Player } from '../SpinBottle/PeopleSetup';
import SpinWheel from '../SpinWheel';
import EdgeCaseModal from '../EdgeCaseModal';
import Confetti from '../Confetti';

interface ComboGameProps {
  choices: Choice[];
  onRecordResult: (choice: Choice) => void;
  soundEnabled: boolean;
  isDark: boolean;
}

type Step = 'bottle' | 'wheel' | 'result';

const ComboGame: React.FC<ComboGameProps> = ({ choices, onRecordResult, soundEnabled, isDark }) => {
  const [step, setStep] = useState<Step>('bottle');
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [currentChoice, setCurrentChoice] = useState<Choice | null>(null);

  const [showEdgeCase, setShowEdgeCase] = useState(false);
  const [edgePrimary, setEdgePrimary] = useState<Choice | null>(null);
  const [edgeAdjacent, setEdgeAdjacent] = useState<Choice | null>(null);

  const advanceTimerRef = useRef<number>();
  useEffect(() => () => window.clearTimeout(advanceTimerRef.current), []);

  const handleBottleWinner = useCallback((player: Player) => {
    setCurrentPlayer(player);
    window.clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = window.setTimeout(() => setStep('wheel'), 1600);
  }, []);

  const goToWheelNow = useCallback(() => {
    window.clearTimeout(advanceTimerRef.current);
    setStep('wheel');
  }, []);

  const finalizeChoice = useCallback(
    (choice: Choice) => {
      onRecordResult(choice);
      setCurrentChoice(choice);
      setStep('result');
    },
    [onRecordResult]
  );

  const handleWheelSpinComplete = useCallback(
    (winner: Choice, edge: { near: boolean; adjacentIndex: number }) => {
      if (edge.near && edge.adjacentIndex >= 0) {
        setEdgePrimary(winner);
        setEdgeAdjacent(choices[edge.adjacentIndex]);
        setShowEdgeCase(true);
      } else {
        finalizeChoice(winner);
      }
    },
    [choices, finalizeChoice]
  );

  const handleEdgeSelect = useCallback(
    (choice: Choice) => {
      setShowEdgeCase(false);
      setEdgePrimary(null);
      setEdgeAdjacent(null);
      finalizeChoice(choice);
    },
    [finalizeChoice]
  );

  const nextTurn = useCallback(() => {
    setCurrentPlayer(null);
    setCurrentChoice(null);
    setStep('bottle');
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Progress */}
      <div className="flex items-center gap-2 text-xs font-bold text-stone-500 dark:text-stone-400 select-none">
        <span className={step === 'bottle' ? 'text-crimson-600 dark:text-mustard-400' : ''}>1. Pick a person</span>
        <ArrowRight size={12} />
        <span className={step === 'wheel' || step === 'result' ? 'text-crimson-600 dark:text-mustard-400' : ''}>
          2. Spin for a challenge
        </span>
      </div>

      {step === 'bottle' && (
        <div className="w-full flex flex-col items-center gap-4">
          <SpinBottleGame soundEnabled={soundEnabled} isDark={isDark} onWinner={handleBottleWinner} />
          {currentPlayer && (
            <button
              onClick={goToWheelNow}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl font-bold text-sm border-2 border-[var(--ink)] bg-crimson-600 text-white hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              Continue with {currentPlayer.name} <ArrowRight size={14} />
            </button>
          )}
        </div>
      )}

      {step === 'wheel' && currentPlayer && (
        <div className="w-full flex flex-col items-center gap-4">
          <div className="glass-card px-5 py-2.5 inline-flex items-center gap-2 font-display text-sm text-stone-900 dark:text-white">
            Spinning for
            <span style={{ color: currentPlayer.color }}>{currentPlayer.name}</span>
          </div>
          <div className="glass-card p-4 sm:p-6 w-full" style={{ maxWidth: 620 }}>
            <div className="w-full" style={{ maxWidth: 560, margin: '0 auto' }}>
              <SpinWheel
                choices={choices}
                onSpinComplete={handleWheelSpinComplete}
                soundEnabled={soundEnabled}
                isDark={isDark}
              />
            </div>
          </div>
        </div>
      )}

      {step === 'result' && currentPlayer && currentChoice && (
        <>
          <Confetti />
          <div
            className="w-full max-w-sm rounded-3xl overflow-hidden"
            style={{ background: 'var(--paper)', border: '3px solid var(--ink)', boxShadow: '8px 8px 0 var(--shadow-color)' }}
          >
            <div
              className="h-2.5 w-full"
              style={{ backgroundImage: `repeating-linear-gradient(45deg, ${currentChoice.color} 0 10px, var(--ink) 10px 20px)` }}
            />
            <div className="p-8 pt-7 flex flex-col items-center text-center gap-5">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center border-[3px] font-display text-xl text-white"
                style={{ background: currentPlayer.color, borderColor: 'var(--ink)' }}
              >
                {currentPlayer.name[0]?.toUpperCase()}
              </div>

              <div className="space-y-3 w-full">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
                  {currentPlayer.name}'s challenge
                </p>

                <div
                  className="px-6 py-4 rounded-2xl border-[3px]"
                  style={{ background: currentChoice.color, borderColor: 'var(--ink)' }}
                >
                  <h2 className="font-display text-2xl text-white leading-tight break-words">
                    {currentChoice.label}
                  </h2>
                </div>

                {currentChoice.description && (
                  <div className="mt-1 px-4 py-3 rounded-xl border-2 border-stone-300 dark:border-stone-600">
                    <p className="text-base text-stone-700 dark:text-stone-200 leading-relaxed font-medium">
                      {currentChoice.description}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={nextTurn}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl font-bold text-sm border-2 border-[var(--ink)] bg-crimson-600 text-white hover:-translate-y-0.5 active:translate-y-0 transition-all"
              >
                <RotateCcw size={14} /> Next Turn
              </button>
            </div>
          </div>
        </>
      )}

      {showEdgeCase && edgePrimary && edgeAdjacent && (
        <EdgeCaseModal
          primary={edgePrimary}
          adjacent={edgeAdjacent}
          onSelect={handleEdgeSelect}
          onClose={() => { setShowEdgeCase(false); setEdgePrimary(null); setEdgeAdjacent(null); }}
        />
      )}
    </div>
  );
};

export default ComboGame;
