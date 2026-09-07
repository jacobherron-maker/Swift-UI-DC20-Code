import React, { useState } from 'react';
import { rollDice, rollD20WithAdjustment } from '../../utils/gameUtils';
import type { DiceKind } from '../../types/models';
import { DiceKindValues } from '../../types/models';

const diceKinds = [
  DiceKindValues.D2,
  DiceKindValues.D4,
  DiceKindValues.D6,
  DiceKindValues.D8,
  DiceKindValues.D10,
  DiceKindValues.D12,
  DiceKindValues.D20,
  DiceKindValues.D100,
];

const panelClass = 'rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl sm:p-6';

const DiceRollerView: React.FC = () => {
  const [diceCount, setDiceCount] = useState(1);
  const [selectedDice, setSelectedDice] = useState<DiceKind>(DiceKindValues.D20);
  const [results, setResults] = useState<number[]>([]);
  const [d20Adjustment, setD20Adjustment] = useState(0);
  const [d20Result, setD20Result] = useState<ReturnType<typeof rollD20WithAdjustment> | null>(null);

  const rollStandard = () => {
    const result = rollDice(selectedDice, diceCount);
    setResults(result);
  };

  const rollD20 = () => {
    const result = rollD20WithAdjustment(d20Adjustment);
    setD20Result(result);
  };

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="grid gap-5 md:grid-cols-2">
        <section className={panelClass}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Any die</p>
          <h2 className="mt-1 text-2xl font-black text-white">Standard Roll</h2>

          <div className="mt-5 space-y-5">
            <div>
              <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Number of dice</span>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/55 p-2">
                <button type="button" aria-label="Roll one fewer die" disabled={diceCount <= 1} onClick={() => setDiceCount((count) => Math.max(1, count - 1))} className="h-11 w-11 rounded-lg bg-slate-800 text-xl font-black text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-35">−</button>
                <span className="text-2xl font-black text-violet-200" aria-live="polite">{diceCount}</span>
                <button type="button" aria-label="Roll one more die" disabled={diceCount >= 20} onClick={() => setDiceCount((count) => Math.min(20, count + 1))} className="h-11 w-11 rounded-lg bg-violet-600 text-xl font-black text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35">+</button>
              </div>
            </div>

            <fieldset>
              <legend className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">Die type</legend>
              <div className="grid grid-cols-4 gap-2">
                {diceKinds.map((die) => <button type="button" key={die} aria-pressed={selectedDice === die} onClick={() => setSelectedDice(die)} className={`rounded-xl border px-2 py-3 text-sm font-black transition ${selectedDice === die ? 'theme-selected-card text-white' : 'border-white/10 bg-slate-950/45 text-slate-400 hover:border-white/20 hover:text-slate-200'}`}>d{die}</button>)}
              </div>
            </fieldset>

            <button type="button" onClick={rollStandard} className="theme-primary-button w-full rounded-xl px-6 py-3 font-black text-white transition hover:brightness-110">
              Roll {diceCount}d{selectedDice}
            </button>

            <div className={`min-h-24 rounded-xl border p-4 ${results.length > 0 ? 'border-violet-400/25 bg-violet-500/10' : 'border-dashed border-white/10 bg-slate-950/30'}`} aria-live="polite">
              {results.length > 0 ? <>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Results</p>
                <p className="mt-1 break-words text-sm text-slate-300">{results.join(', ')}</p>
                <p className="mt-2 text-3xl font-black text-violet-200">Total {results.reduce((a, b) => a + b, 0)}</p>
              </> : <p className="grid min-h-14 place-items-center text-sm text-slate-600">Your roll will appear here.</p>}
            </div>
          </div>
        </section>

        <section className={panelClass}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Stacking check</p>
          <h2 className="mt-1 text-2xl font-black text-white">d20 Roll Mode</h2>

          <div className="mt-5 space-y-5">
            <div>
              <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Advantage / Disadvantage</span>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/55 p-2">
                <button type="button" aria-label="Add one level of Disadvantage" disabled={d20Adjustment <= -5} onClick={() => setD20Adjustment((value) => Math.max(-5, value - 1))} className="h-11 w-11 rounded-lg bg-slate-800 text-xl font-black text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-35">−</button>
                <div className="min-w-0 px-3 text-center">
                  <p className={`font-black ${d20Adjustment > 0 ? 'text-emerald-300' : d20Adjustment < 0 ? 'text-rose-300' : 'text-slate-200'}`}>{d20Adjustment > 0 ? `${d20Adjustment}× Advantage` : d20Adjustment < 0 ? `${Math.abs(d20Adjustment)}× Disadvantage` : 'Normal'}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">Roll {Math.abs(d20Adjustment) + 1}d20</p>
                </div>
                <button type="button" aria-label="Add one level of Advantage" disabled={d20Adjustment >= 5} onClick={() => setD20Adjustment((value) => Math.min(5, value + 1))} className="h-11 w-11 rounded-lg bg-violet-600 text-xl font-black text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35">+</button>
              </div>
            </div>

            <button type="button" onClick={rollD20} className="theme-primary-button w-full rounded-xl px-6 py-3 font-black text-white transition hover:brightness-110">
              Roll d20
            </button>

            <div className={`min-h-32 rounded-xl border p-4 ${d20Result ? 'border-amber-400/25 bg-amber-500/10' : 'border-dashed border-white/10 bg-slate-950/30'}`} aria-live="polite">
              {d20Result ? <>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Dice</p>
                <p className="mt-1 break-words text-sm text-slate-300">{d20Result.rolls.join(', ')}</p>
                <div className="mt-3 flex items-end justify-between gap-3"><p className="text-sm text-slate-400">Chosen <strong className="text-amber-300">{d20Result.chosen}</strong></p><p className="text-3xl font-black text-violet-200">Total {d20Result.total}</p></div>
              </> : <p className="grid min-h-24 place-items-center text-sm text-slate-600">Your d20 result will appear here.</p>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DiceRollerView;
