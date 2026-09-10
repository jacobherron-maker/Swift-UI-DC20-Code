import React from 'react';

interface RulesVersionComingSoonProps {
  onReturnToCurrent: () => void;
}

const RulesVersionComingSoon: React.FC<RulesVersionComingSoonProps> = ({ onReturnToCurrent }) => (
  <div className="grid h-full min-h-0 overflow-y-auto p-4 sm:p-8">
    <section className="m-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-violet-400/20 bg-slate-950/70 shadow-2xl shadow-black/30">
      <div className="h-1.5 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400" />
      <div className="p-7 text-center sm:p-12">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-violet-300/20 bg-violet-500/10 text-4xl shadow-xl shadow-violet-950/30" aria-hidden="true">✦</div>
        <p className="mt-7 text-xs font-black uppercase tracking-[0.24em] text-violet-300">Rules Version Preview</p>
        <h1 className="mt-2 text-4xl font-black text-white sm:text-5xl">DC20 Beta 0.11</h1>
        <span className="mt-5 inline-flex rounded-full border border-amber-300/20 bg-amber-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-amber-200">Coming Soon</span>
        <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">This rules workspace is ready for the upcoming 0.11 Beta. Its rules, characters, equipment, powers, and encounter data will remain separate from the current edition while the new source material is incorporated and audited.</p>
        <button type="button" onClick={onReturnToCurrent} className="btn-primary mt-8 min-h-11 px-5 font-black">Return to 0.10.5 Beta</button>
      </div>
    </section>
  </div>
);

export default RulesVersionComingSoon;
