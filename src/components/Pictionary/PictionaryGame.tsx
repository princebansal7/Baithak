import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, X, SkipForward, Play, Undo2, Plus, Minus, Trash2, Users, RotateCcw, Trophy, Crown, Star } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSound } from '../../hooks/useSound';
import { generateId } from '../../utils/id';
import Confetti from '../Confetti';
import { WORDS, DIFFICULTIES, Difficulty } from '../../constants/words';

interface DictPlayer { id: string; name: string; score: number }
interface DictTeam { id: string; name: string; players: DictPlayer[]; nextPlayer: number }
interface Settings { correct: number; wrong: number; skip: number; seconds: number }

type Phase = 'setup' | 'ready' | 'running' | 'done' | 'over';
type Action = 'correct' | 'wrong' | 'skip';

interface PictionaryGameProps {
  soundEnabled: boolean;
}

const DEFAULT_SETTINGS: Settings = { correct: 2, wrong: -1, skip: -1, seconds: 120 };

const newTeam = (name: string): DictTeam => ({ id: generateId(), name, players: [], nextPlayer: 0 });

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
const scoreColor = (n: number) =>
  n > 0 ? 'text-emerald-600 dark:text-emerald-400' : n < 0 ? 'text-red-600 dark:text-red-400' : 'text-stone-500 dark:text-stone-400';
const buzz = (ms: number | number[]) => {
  try { navigator.vibrate?.(ms); } catch { /* unsupported */ }
};
const hasTurnLeft = (t: DictTeam) => t.nextPlayer < t.players.length;
const PLAYER_COLORS = ['#7c3aed', '#2563eb', '#db2777', '#0d9488', '#ea580c', '#0891b2', '#65a30d', '#c026d3'];
const teamTotal = (t: DictTeam) => t.players.reduce((sum, p) => sum + p.score, 0);

const inputCls =
  'w-full px-3 py-2 rounded-lg text-sm bg-transparent border-2 border-stone-300 dark:border-stone-600 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-crimson-600';
const btnCls =
  'flex items-center justify-center gap-1.5 rounded-lg font-bold border-2 transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:pointer-events-none';

const Stepper: React.FC<{
  label: string; value: number; step: number; min: number; max: number;
  format?: (n: number) => string; onChange: (n: number) => void;
}> = ({ label, value, step, min, max, format, onChange }) => (
  <div className="flex flex-col items-center gap-1">
    <span className="text-xs font-semibold text-stone-600 dark:text-stone-400">{label}</span>
    <div className="flex items-center gap-1">
      <button
        className={`${btnCls} w-10 h-10 border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-200`}
        onClick={() => onChange(Math.max(min, value - step))}
        aria-label={`Decrease ${label}`}
      >
        <Minus size={14} />
      </button>
      <span className="w-14 text-center font-display text-lg text-stone-900 dark:text-stone-100">
        {format ? format(value) : signed(value)}
      </span>
      <button
        className={`${btnCls} w-10 h-10 border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-200`}
        onClick={() => onChange(Math.min(max, value + step))}
        aria-label={`Increase ${label}`}
      >
        <Plus size={14} />
      </button>
    </div>
  </div>
);

const PictionaryGame: React.FC<PictionaryGameProps> = ({ soundEnabled }) => {
  const { playTick, playWin, playStart, playCorrect, playWrong, playSkip, playTimeUp } = useSound(soundEnabled);

  const [teams, setTeams] = useLocalStorage<DictTeam[]>('stw-pictionary-teams', [newTeam('Team A'), newTeam('Team B')]);
  const [teamIdx, setTeamIdx] = useLocalStorage<number>('stw-pictionary-turn', 0);
  const [settings, setSettings] = useLocalStorage<Settings>('stw-pictionary-settings', DEFAULT_SETTINGS);
  const [difficulty, setDifficulty] = useLocalStorage<Difficulty>('stw-pictionary-diff', 'easy');

  const [phase, setPhase] = useState<Phase>('setup');
  const [word, setWord] = useState('');
  const [timeLeft, setTimeLeft] = useState(settings.seconds);
  const [log, setLog] = useState<{ action: Action; delta: number }[]>([]);
  const [playerDrafts, setPlayerDrafts] = useState<Record<string, string>>({});

  const endAtRef = useRef(0);
  const usedRef = useRef<Set<string>>(new Set());

  const safeIdx = teams.length ? teamIdx % teams.length : 0;
  const activeTeam = teams[safeIdx];
  const drawer = activeTeam && hasTurnLeft(activeTeam) ? activeTeam.players[activeTeam.nextPlayer] : null;
  const isLastTurn = teams.filter(hasTurnLeft).length <= 1 && !!activeTeam && activeTeam.nextPlayer + 1 >= activeTeam.players.length;

  const canStart = teams.length > 0 && teams.every((t) => t.players.length > 0);
  // stable colour per player, by join order across all teams
  const colorOf = (id: string) => {
    const i = teams.flatMap((t) => t.players).findIndex((p) => p.id === id);
    return PLAYER_COLORS[Math.max(i, 0) % PLAYER_COLORS.length];
  };
  const turnScore = log.reduce((s, l) => s + l.delta, 0);

  // ── Teams / players ────────────────────────────────────────────────────
  const addTeam = () =>
    setTeams((ts) => [...ts, newTeam(`Team ${String.fromCharCode(65 + (ts.length % 26))}${ts.length >= 26 ? ts.length : ''}`)]);
  const removeTeam = (id: string) => setTeams((ts) => ts.filter((t) => t.id !== id));
  const renameTeam = (id: string, name: string) =>
    setTeams((ts) => ts.map((t) => (t.id === id ? { ...t, name } : t)));
  const addPlayer = (teamId: string) => {
    const name = (playerDrafts[teamId] || '').trim();
    if (!name) return;
    setTeams((ts) =>
      ts.map((t) => (t.id === teamId ? { ...t, players: [...t.players, { id: generateId(), name, score: 0 }] } : t))
    );
    setPlayerDrafts((d) => ({ ...d, [teamId]: '' }));
  };
  const removePlayer = (teamId: string, playerId: string) =>
    setTeams((ts) => ts.map((t) => (t.id === teamId ? { ...t, players: t.players.filter((p) => p.id !== playerId) } : t)));

  const addPlayerRow = (t: DictTeam) => (
    <div className="flex gap-2 mt-2">
      <input
        className={inputCls}
        placeholder="Add player"
        value={playerDrafts[t.id] || ''}
        onChange={(e) => setPlayerDrafts((d) => ({ ...d, [t.id]: e.target.value }))}
        onKeyDown={(e) => e.key === 'Enter' && addPlayer(t.id)}
        maxLength={24}
      />
      <button
        className={`${btnCls} px-3 flex-shrink-0 border-stone-300 dark:border-stone-600 text-stone-800 dark:text-stone-200`}
        onClick={() => addPlayer(t.id)}
        aria-label={`Add player to ${t.name}`}
      >
        <Plus size={16} />
      </button>
    </div>
  );

  // ── Words ──────────────────────────────────────────────────────────────
  const nextWord = useCallback(() => {
    const pool = WORDS[difficulty];
    let fresh = pool.filter((w) => !usedRef.current.has(w));
    if (!fresh.length) {
      usedRef.current.clear();
      fresh = pool;
    }
    const w = fresh[Math.floor(Math.random() * fresh.length)];
    usedRef.current.add(w);
    setWord(w);
  }, [difficulty]);

  // ── Turn flow ──────────────────────────────────────────────────────────
  const startTurn = () => {
    setLog([]);
    nextWord();
    playStart();
    buzz(30);
    endAtRef.current = Date.now() + settings.seconds * 1000;
    setTimeLeft(settings.seconds);
    setPhase('running');
  };

  useEffect(() => {
    if (phase !== 'running') return;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setTimeLeft((prev) => {
        if (left !== prev && left > 0 && left <= 5) playTick();
        return left;
      });
      if (left <= 0) {
        window.clearInterval(id);
        playTimeUp();
        buzz([200, 80, 200]);
        setPhase('done');
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [phase, playTick, playTimeUp]);

  const applyScore = (playerId: string, delta: number) =>
    setTeams((ts) =>
      ts.map((t) => ({ ...t, players: t.players.map((p) => (p.id === playerId ? { ...p, score: p.score + delta } : p)) }))
    );

  const act = (action: Action) => {
    if (phase !== 'running' || !drawer) return;
    const delta = settings[action];
    applyScore(drawer.id, delta);
    setLog((l) => [...l, { action, delta }]);
    if (action === 'correct') { playCorrect(); buzz([20, 40, 20]); }
    else if (action === 'wrong') { playWrong(); buzz(120); }
    else { playSkip(); buzz(15); }
    if (action !== 'wrong') nextWord(); // a wrong guess keeps the same word
  };

  const undo = () => {
    if (phase !== 'running' || !drawer || !log.length) return;
    applyScore(drawer.id, -log[log.length - 1].delta);
    setLog((l) => l.slice(0, -1));
  };

  const endTurn = () => {
    const updated = teams.map((t, i) => (i === safeIdx ? { ...t, nextPlayer: t.nextPlayer + 1 } : t));
    setTeams(updated);
    setLog([]);
    // pass the turn to the next team that still has a player who hasn't drawn
    for (let step = 1; step <= updated.length; step++) {
      const idx = (safeIdx + step) % updated.length;
      if (hasTurnLeft(updated[idx])) {
        setTeamIdx(idx);
        setPhase('ready');
        return;
      }
    }
    playWin();
    buzz([60, 40, 60, 40, 200]);
    setPhase('over');
  };

  const restart = (next: Phase) => {
    setTeams((ts) => ts.map((t) => ({ ...t, nextPlayer: 0, players: t.players.map((p) => ({ ...p, score: 0 })) })));
    setTeamIdx(0);
    setLog([]);
    setPhase(next);
  };

  const resetScores = () => {
    if (window.confirm('Reset all scores and turn order?')) restart('ready');
  };

  // Starting from setup: if everyone has already drawn, begin a fresh game;
  // otherwise continue with the next team that still has a player to go.
  const startGame = () => {
    const idx = teams.findIndex((_, i) => hasTurnLeft(teams[(safeIdx + i) % teams.length]));
    if (idx === -1) return restart('ready');
    setTeamIdx((safeIdx + idx) % teams.length);
    setPhase('ready');
  };

  const maxTotal = Math.max(...teams.map(teamTotal));
  const leaderIds = teams.filter((t) => teamTotal(t) === maxTotal && maxTotal !== 0).map((t) => t.id);

  // ── Setup screen ───────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="flex flex-col gap-4 max-w-2xl mx-auto">
        <div className="glass-card card-flat p-4 flex flex-col gap-3">
          <h2 className="font-display text-base text-stone-900 dark:text-stone-100">Scoring &amp; timer</h2>
          <div className="flex flex-wrap justify-around gap-3">
            <Stepper label="Correct" value={settings.correct} step={1} min={0} max={20} onChange={(n) => setSettings((s) => ({ ...s, correct: n }))} />
            <Stepper label="Wrong" value={settings.wrong} step={1} min={-20} max={0} onChange={(n) => setSettings((s) => ({ ...s, wrong: n }))} />
            <Stepper label="Skip" value={settings.skip} step={1} min={-20} max={0} onChange={(n) => setSettings((s) => ({ ...s, skip: n }))} />
            <Stepper label="Timer" value={settings.seconds} step={30} min={30} max={600} format={fmt} onChange={(n) => setSettings((s) => ({ ...s, seconds: n }))} />
          </div>
        </div>

        {teams.map((t) => (
          <div key={t.id} className="glass-card card-flat p-4">
            <div className="flex gap-2 items-center">
              <input className={`${inputCls} font-bold`} value={t.name} onChange={(e) => renameTeam(t.id, e.target.value)} maxLength={24} aria-label="Team name" />
              {teams.length > 1 && (
                <button
                  className={`${btnCls} w-10 h-10 flex-shrink-0 border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-300`}
                  onClick={() => removeTeam(t.id)}
                  aria-label={`Remove ${t.name}`}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {t.players.map((p) => (
                <span key={p.id} className="flex items-center gap-1 pl-3 pr-1 py-1 rounded-full text-sm font-semibold border-2" style={{ color: colorOf(p.id), borderColor: colorOf(p.id) }}>
                  {p.name}
                  <button className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10" onClick={() => removePlayer(t.id, p.id)} aria-label={`Remove ${p.name}`}>
                    <X size={13} />
                  </button>
                </span>
              ))}
              {!t.players.length && <span className="text-xs text-stone-500 dark:text-stone-400">No players yet</span>}
            </div>
            {addPlayerRow(t)}
          </div>
        ))}

        <button className={`${btnCls} py-2.5 border-dashed border-stone-400 dark:border-stone-600 text-stone-700 dark:text-stone-300`} onClick={addTeam}>
          <Users size={16} /> Add team
        </button>
        <button
          className={`${btnCls} py-3.5 text-base bg-crimson-600 border-transparent text-white`}
          disabled={!canStart}
          onClick={startGame}
        >
          <Play size={18} /> {canStart ? 'Start game' : 'Every team needs at least one player'}
        </button>
      </div>
    );
  }

  // ── Final results ──────────────────────────────────────────────────────
  if (phase === 'over') {
    const ranked = [...teams].sort((a, b) => teamTotal(b) - teamTotal(a));
    const top = teamTotal(ranked[0]);
    const winners = ranked.filter((t) => teamTotal(t) === top);
    const bestScore = Math.max(...teams.flatMap((t) => t.players.map((p) => p.score)));
    return (
      <div className="flex flex-col gap-4 max-w-2xl mx-auto">
        <Confetti />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="glass-card card-flat p-6 text-center flex flex-col items-center gap-1"
        >
          <Crown size={36} className="text-crimson-600" />
          <div className="text-xs font-semibold text-stone-600 dark:text-stone-400">
            {winners.length > 1 ? "It's a tie!" : 'Winner'}
          </div>
          <div className="font-display text-3xl text-stone-900 dark:text-stone-100">
            {winners.map((t) => t.name).join(' & ')}
          </div>
          <div className={`font-display text-5xl tabular-nums ${scoreColor(top)}`}>{top}</div>
        </motion.div>

        {ranked.map((t, i) => {
          const total = teamTotal(t);
          const isWinner = total === top;
          const pct = top > 0 ? Math.max(0, (total / top) * 100) : 0;
          return (
            <motion.div
              key={t.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 + i * 0.12 }}
              className={`glass-card card-flat p-4 ${isWinner ? 'ring-2 ring-crimson-600' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-100">
                    {isWinner ? <Trophy size={14} className="text-crimson-600" /> : i + 1}
                  </span>
                  {t.name}
                </span>
                <span className={`font-display text-2xl tabular-nums ${scoreColor(total)}`}>{total}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${total < 0 ? 'bg-red-500' : 'bg-emerald-500'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ delay: 0.3 + i * 0.12, duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <ul className="mt-3 divide-y divide-stone-200 dark:divide-stone-700">
                {[...t.players].sort((a, b) => b.score - a.score).map((p) => (
                  <li key={p.id} className="flex justify-between items-center py-1.5 text-sm text-stone-800 dark:text-stone-200">
                    <span className="flex items-center gap-1.5">
                      <span className="font-semibold" style={{ color: colorOf(p.id) }}>{p.name}</span>
                      {p.score === bestScore && bestScore > 0 && <Star size={13} className="text-crimson-600" fill="currentColor" />}
                    </span>
                    <span className={`tabular-nums font-bold ${scoreColor(p.score)}`}>{p.score}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}

        <div className="flex gap-2">
          <button className={`${btnCls} flex-1 py-3 bg-crimson-600 border-transparent text-white`} onClick={() => restart('ready')}>
            <RotateCcw size={16} /> Play again
          </button>
          <button className={`${btnCls} flex-1 py-3 border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300`} onClick={() => restart('setup')}>
            <Users size={16} /> Edit teams
          </button>
        </div>
      </div>
    );
  }

  // ── Play screen ────────────────────────────────────────────────────────
  const running = phase === 'running';
  const lowTime = running && timeLeft <= 10;

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto">
      <div className="glass-card card-flat p-4 sm:p-6 flex flex-col items-center gap-4 text-center">
        <div>
          <div className="text-xs font-semibold text-stone-600 dark:text-stone-400">{activeTeam?.name} · drawing now</div>
          <div className="font-display text-4xl sm:text-5xl break-words" style={{ color: drawer ? colorOf(drawer.id) : undefined }}>{drawer?.name ?? '—'}</div>
        </div>

        <div className={`font-display text-6xl tabular-nums ${lowTime ? 'text-red-600 animate-pulse' : 'text-stone-900 dark:text-stone-100'}`}>
          {fmt(running ? timeLeft : phase === 'done' ? 0 : settings.seconds)}
        </div>

        {phase === 'ready' && (
          <>
            <div className="flex gap-1 p-1 rounded-xl border-2 border-stone-300 dark:border-stone-600" role="radiogroup" aria-label="Difficulty">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  role="radio"
                  aria-checked={difficulty === d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={`px-4 min-h-[40px] rounded-lg text-sm font-bold transition-all ${difficulty === d.id ? 'bg-crimson-600 text-white' : 'text-stone-600 dark:text-stone-300'}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <button className={`${btnCls} w-full py-4 text-lg bg-crimson-600 border-transparent text-white`} onClick={startTurn} disabled={!drawer}>
              <Play size={20} /> Start {fmt(settings.seconds)} round
            </button>
          </>
        )}

        {running && (
          <>
            <div className="w-full py-6 px-3 rounded-xl border-2 border-dashed border-stone-400 dark:border-stone-600">
              <div className="font-display text-3xl sm:text-4xl text-stone-900 dark:text-stone-100 break-words">{word}</div>
            </div>
            <div className="grid grid-cols-3 gap-2 w-full">
              <button className={`${btnCls} flex-col py-4 bg-emerald-600 border-transparent text-white`} onClick={() => act('correct')}>
                <Check size={22} /> Correct <span className="text-xs font-semibold">{signed(settings.correct)}</span>
              </button>
              <button className={`${btnCls} flex-col py-4 bg-red-600 border-transparent text-white`} onClick={() => act('wrong')}>
                <X size={22} /> Wrong <span className="text-xs font-semibold">{signed(settings.wrong)}</span>
              </button>
              <button className={`${btnCls} flex-col py-4 border-stone-300 dark:border-stone-600 text-stone-800 dark:text-stone-200`} onClick={() => act('skip')}>
                <SkipForward size={22} /> Skip <span className="text-xs font-semibold">{signed(settings.skip)}</span>
              </button>
            </div>
            <div className="flex items-center justify-between w-full text-sm text-stone-700 dark:text-stone-300">
              <span>This turn: <motion.b key={log.length} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className={`inline-block font-display text-2xl ${scoreColor(turnScore)}`}>{signed(turnScore)}</motion.b></span>
              <button className={`${btnCls} px-3 min-h-[40px] border-stone-300 dark:border-stone-600`} onClick={undo} disabled={!log.length}>
                <Undo2 size={14} /> Undo
              </button>
            </div>
          </>
        )}

        {phase === 'done' && (
          <>
            <div className="text-stone-700 dark:text-stone-300">
              Time's up! <b style={{ color: drawer ? colorOf(drawer.id) : undefined }}>{drawer?.name}</b> scored <b className={`font-display text-2xl ${scoreColor(turnScore)}`}>{signed(turnScore)}</b> this turn
              <div className="text-sm">Total: <b className={scoreColor(drawer?.score ?? 0)}>{drawer?.score}</b></div>
            </div>
            <button className={`${btnCls} w-full py-4 text-lg bg-crimson-600 border-transparent text-white`} onClick={endTurn}>
              {isLastTurn ? <>See results <Trophy size={18} /></> : <>Next turn <SkipForward size={18} /></>}
            </button>
          </>
        )}
      </div>

      {/* ── Scoreboard ─────────────────────────────────────────────────── */}
      {teams.map((t) => (
        <div key={t.id} className={`glass-card card-flat p-4 ${t.id === activeTeam?.id ? 'ring-2 ring-crimson-600' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              {leaderIds.includes(t.id) && <Trophy size={15} className="text-crimson-600" />} {t.name}
            </span>
            <span className={`font-display text-2xl tabular-nums ${scoreColor(teamTotal(t))}`}>{teamTotal(t)}</span>
          </div>
          <ul className="mt-2 divide-y divide-stone-200 dark:divide-stone-700">
            {t.players.map((p) => (
              <li key={p.id} className="flex justify-between py-1.5 text-sm text-stone-800 dark:text-stone-200">
                <span
                  className={p.id === drawer?.id && t.id === activeTeam?.id ? 'font-bold text-lg' : 'font-semibold'}
                  style={{ color: colorOf(p.id) }}
                >
                  {p.name}
                </span>
                <span className={`tabular-nums font-bold ${scoreColor(p.score)}`}>{p.score}</span>
              </li>
            ))}
          </ul>
          {!running && addPlayerRow(t)}
        </div>
      ))}

      {!running && (
        <div className="flex gap-2">
          <button className={`${btnCls} flex-1 py-2.5 border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300`} onClick={() => setPhase('setup')}>
            <Users size={15} /> Edit teams &amp; scoring
          </button>
          <button className={`${btnCls} flex-1 py-2.5 border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300`} onClick={resetScores}>
            <RotateCcw size={15} /> Reset scores
          </button>
        </div>
      )}
    </div>
  );
};

export default PictionaryGame;
