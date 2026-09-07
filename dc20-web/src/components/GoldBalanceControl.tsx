import { useState } from 'react';

export function GoldBalanceControl({ currentGold, onAdjust, title = 'Current Gold', description }: {
  currentGold?: number;
  onAdjust: (delta: number) => void;
  title?: string;
  description?: string;
}) {
  const [amountText, setAmountText] = useState('1');
  const balance = Math.max(0, Math.trunc(Number(currentGold) || 0));
  const amount = Math.max(0, Math.trunc(Number(amountText) || 0));
  const canAdd = amount > 0;
  const canSubtract = amount > 0 && amount <= balance;

  return <section className="mb-6 rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-950/35 to-slate-950/65 p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Currency</p>
        <h2 className="mt-1 text-xl font-black text-white">{title}</h2>
        {description && <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>}
      </div>
      <div className="rounded-xl border border-amber-300/20 bg-amber-500/10 px-5 py-3 text-center">
        <div className="text-3xl font-black text-amber-200">{balance.toLocaleString()}</div>
        <div className="text-[10px] font-black uppercase tracking-widest text-amber-400/70">Gold</div>
      </div>
    </div>
    <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(8rem,1fr)_auto_auto]">
      <label className="text-xs font-bold text-slate-400">Amount
        <input type="number" min={1} step={1} inputMode="numeric" value={amountText} onChange={(event) => setAmountText(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950/70 px-3 py-2 text-slate-100 outline-none focus:border-amber-400" aria-label={`${title} adjustment amount`} />
      </label>
      <button type="button" disabled={!canSubtract} onClick={() => onAdjust(-amount)} className="min-h-11 self-end rounded-lg bg-slate-800 px-4 py-2 text-sm font-black text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-35">− Subtract</button>
      <button type="button" disabled={!canAdd} onClick={() => onAdjust(amount)} className="min-h-11 self-end rounded-lg bg-amber-700 px-4 py-2 text-sm font-black text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-35">+ Add</button>
    </div>
    {amount > balance && amount > 0 && <p className="mt-2 text-xs font-bold text-amber-300">You can’t subtract {amount.toLocaleString()} gold from a balance of {balance.toLocaleString()}.</p>}
  </section>;
}
