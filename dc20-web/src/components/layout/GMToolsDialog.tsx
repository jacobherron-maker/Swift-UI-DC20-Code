import { useMemo, useState } from 'react';
import { useRulesReference } from '../../hooks/useRulesReference';
import CombatView from '../views/CombatView';
import DiceRollerView from '../views/DiceRollerView';
import OverlayShell from './OverlayShell';
import { RuleAwareText } from '../rules/RuleAwareText';

type GMTool = 'dice' | 'initiative' | 'conditions';

const tools: Array<{ id: GMTool | 'rules'; icon: string; title: string; description: string }> = [
  { id: 'dice', icon: '🎲', title: 'Dice Roller', description: 'Roll any standard die or stack Advantage and Disadvantage.' },
  { id: 'initiative', icon: '⚡', title: 'Initiative Tracker', description: 'Open live combats without leaving the current workspace.' },
  { id: 'rules', icon: '⌕', title: 'Quick Rules Search', description: 'Search the complete rules and content index.' },
  { id: 'conditions', icon: '◈', title: 'Condition Reference', description: 'Look up condition rules in a temporary reference panel.' },
];

function ConditionsTool() {
  const { reference, isLoading, error } = useRulesReference();
  const [query, setQuery] = useState('');
  const [selectedID, setSelectedID] = useState<string | null>(null);
  const conditions = useMemo(() => (reference?.entries ?? []).filter(({ kind, title, summary, text }) => kind === 'Condition' && (!query.trim() || [title, summary, text].some((value) => value.toLowerCase().includes(query.trim().toLowerCase())))), [query, reference?.entries]);
  const selected = conditions.find(({ id }) => id === selectedID) ?? conditions[0] ?? null;
  if (isLoading) return <div className="p-8 text-slate-400">Loading conditions…</div>;
  if (error) return <div className="p-8 text-red-300">{error}</div>;
  return <div className="grid min-h-[34rem] md:grid-cols-[18rem_1fr]"><aside className="border-b border-white/10 bg-slate-950/50 p-4 md:border-b-0 md:border-r"><input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setSelectedID(null); }} placeholder="Search conditions…" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400" /><div className="mt-3 max-h-72 space-y-1 overflow-auto md:max-h-[55vh]">{conditions.map((entry) => <button type="button" key={entry.id} onClick={() => setSelectedID(entry.id)} className={`w-full rounded-lg px-3 py-2 text-left text-sm font-bold ${selected?.id === entry.id ? 'theme-selected-card text-white' : 'text-slate-400 hover:bg-white/5'}`}>{entry.title}</button>)}</div></aside><article className="p-5 sm:p-7">{selected ? <><div className="border-b border-white/10 pb-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">Condition • {selected.page}</p><h3 className="mt-1 text-3xl font-black text-white">{selected.title}</h3><p className="mt-2 text-violet-200"><RuleAwareText text={selected.summary} /></p></div><div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-300"><RuleAwareText text={selected.text} /></div></> : <p className="text-slate-500">No conditions match.</p>}</article></div>;
}

export default function GMToolsDialog({ onClose, onOpenSearch }: { onClose: () => void; onOpenSearch: () => void }) {
  const [activeTool, setActiveTool] = useState<GMTool | null>(null);
  const title = tools.find(({ id }) => id === activeTool)?.title ?? 'GM Tools';
  return <OverlayShell title={title} eyebrow="Available everywhere" onClose={onClose} size={activeTool === 'initiative' ? 'max-w-[1500px]' : 'max-w-5xl'}>
    {activeTool && <div className="border-b border-white/10 bg-slate-950/70 px-4 py-2"><button type="button" onClick={() => setActiveTool(null)} className="rounded-lg px-3 py-2 text-xs font-black text-violet-200 hover:bg-violet-500/10">← All GM Tools</button></div>}
    {!activeTool && <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6">{tools.map((tool) => <button type="button" key={tool.id} onClick={() => { if (tool.id === 'rules') onOpenSearch(); else setActiveTool(tool.id); }} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-left transition hover:-translate-y-0.5 hover:border-violet-400/35 hover:bg-violet-500/10"><span className="text-3xl" aria-hidden="true">{tool.icon}</span><h3 className="mt-4 text-lg font-black text-white">{tool.title}</h3><p className="mt-1 text-sm leading-5 text-slate-400">{tool.description}</p><span className="theme-accent-text mt-4 block text-xs font-black uppercase tracking-wider">Open →</span></button>)}</div>}
    {activeTool === 'dice' && <DiceRollerView />}
    {activeTool === 'initiative' && <div className="h-[min(72vh,850px)]"><CombatView /></div>}
    {activeTool === 'conditions' && <ConditionsTool />}
  </OverlayShell>;
}
