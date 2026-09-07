import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRulesReference } from '../hooks/useRulesReference';
import { buildRuleRegistry, type RuleRegistryEntry } from './ruleRegistry';
import { RulesCrossLinkContext, useRulesCrossLink, type OpenRuleOptions, type RulesCrossLinkValue } from './useRulesCrossLink';
const PINNED_KEY = 'dc20.rules.pinned';
const RECENT_KEY = 'dc20.rules.recent';

function storedList(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? '[]');
    return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
  } catch {
    return [];
  }
}

function saveStoredList(key: string, values: string[]) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, JSON.stringify(values)); } catch { /* Local storage is an optional convenience. */ }
}

export function RulesCrossLinkProvider({ children, onOpenFullRule }: { children: ReactNode; onOpenFullRule: (ruleEntryID: string) => void }) {
  const { reference, isLoading, error } = useRulesReference();
  const registry = useMemo(() => reference ? buildRuleRegistry(reference) : null, [reference]);
  const [active, setActive] = useState<{ ruleID: string; sourceVersion?: string } | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [pinnedRuleIDs, setPinnedRuleIDs] = useState(() => storedList(PINNED_KEY));
  const [recentRuleIDs, setRecentRuleIDs] = useState(() => storedList(RECENT_KEY));

  const recordRecent = useCallback((ruleID: string) => {
    setRecentRuleIDs((current) => {
      const next = [ruleID, ...current.filter((id) => id !== ruleID)].slice(0, 12);
      saveStoredList(RECENT_KEY, next);
      return next;
    });
  }, []);

  const openRule = useCallback((ruleID: string, options: OpenRuleOptions = {}) => {
    if (registry && !registry.byID.has(ruleID)) console.warn(`[rules-cross-link] Missing rule reference: ${ruleID}`);
    setActive({ ruleID, sourceVersion: options.sourceVersion });
    setHistory((current) => {
      const next = [...current.slice(0, historyIndex + 1), ruleID].slice(-40);
      setHistoryIndex(next.length - 1);
      return next;
    });
    if (registry?.byID.has(ruleID)) recordRecent(ruleID);
  }, [historyIndex, recordRecent, registry]);

  const navigateHistory = (nextIndex: number) => {
    const ruleID = history[nextIndex];
    if (!ruleID) return;
    setHistoryIndex(nextIndex);
    setActive({ ruleID });
    recordRecent(ruleID);
  };

  const togglePinnedRule = useCallback((ruleID: string) => {
    setPinnedRuleIDs((current) => {
      const next = current.includes(ruleID) ? current.filter((id) => id !== ruleID) : [ruleID, ...current].slice(0, 12);
      saveStoredList(PINNED_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<RulesCrossLinkValue>(() => ({
    registry,
    isLoading,
    error,
    openRule,
    closeRule: () => setActive(null),
    pinnedRuleIDs,
    recentRuleIDs,
    togglePinnedRule,
  }), [error, isLoading, openRule, pinnedRuleIDs, recentRuleIDs, registry, togglePinnedRule]);

  const activeEntry = active && registry ? registry.byID.get(active.ruleID) ?? null : null;
  return <RulesCrossLinkContext.Provider value={value}>
    {children}
    {active && <QuickRulePanel
      entry={activeEntry}
      missingRuleID={activeEntry ? null : active.ruleID}
      sourceVersion={active.sourceVersion}
      pinned={Boolean(activeEntry && pinnedRuleIDs.includes(activeEntry.id))}
      canGoBack={historyIndex > 0}
      canGoForward={historyIndex >= 0 && historyIndex < history.length - 1}
      onBack={() => navigateHistory(historyIndex - 1)}
      onForward={() => navigateHistory(historyIndex + 1)}
      onClose={() => setActive(null)}
      onOpenRelated={(ruleID) => openRule(ruleID)}
      onTogglePin={() => activeEntry && togglePinnedRule(activeEntry.id)}
      onOpenFull={() => {
        if (!activeEntry) return;
        setActive(null);
        onOpenFullRule(activeEntry.ruleEntryID);
      }}
    />}
  </RulesCrossLinkContext.Provider>;
}

function QuickRulePanel({ entry, missingRuleID, sourceVersion, pinned, canGoBack, canGoForward, onBack, onForward, onClose, onOpenRelated, onTogglePin, onOpenFull }: {
  entry: RuleRegistryEntry | null;
  missingRuleID: string | null;
  sourceVersion?: string;
  pinned: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onClose: () => void;
  onOpenRelated: (ruleID: string) => void;
  onTogglePin: () => void;
  onOpenFull: () => void;
}) {
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [onClose]);
  const related = entry?.relatedIDs ?? [];
  const registry = useRulesCrossLink().registry;
  return <div className="fixed inset-0 z-[110] flex items-end justify-end bg-black/35 backdrop-blur-[1px] sm:p-4" role="dialog" aria-modal="true" aria-label={entry ? `Quick Rule: ${entry.canonicalName}` : 'Rule reference unavailable'}>
    <button type="button" aria-label="Close quick rule" onClick={onClose} className="absolute inset-0" />
    <aside className="relative flex max-h-[82dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-violet-400/25 bg-slate-950 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:w-[30rem] sm:rounded-2xl">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-violet-950/80 to-slate-950 px-4 py-3">
        <div className="flex items-center gap-2"><button type="button" disabled={!canGoBack} onClick={onBack} aria-label="Previous quick rule" className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-slate-300 disabled:opacity-25">←</button><button type="button" disabled={!canGoForward} onClick={onForward} aria-label="Next quick rule" className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-slate-300 disabled:opacity-25">→</button></div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">Quick Rule</p>
        <button type="button" autoFocus onClick={onClose} aria-label="Close quick rule" className="grid h-10 w-10 place-items-center rounded-lg bg-slate-800 text-xl text-slate-200">×</button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
        {!entry && <div><h2 className="text-2xl font-black text-white">Rule reference unavailable</h2><p className="mt-3 text-sm leading-6 text-slate-400">This content points to a rule that is not available in the current rules registry. The surrounding content is still safe to use.</p><p className="mt-4 rounded-lg bg-slate-900 p-3 text-xs text-slate-600">Reference: {missingRuleID}</p></div>}
        {entry && <><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="rounded-full bg-violet-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-violet-200">{entry.category}</span><h2 className="mt-3 text-3xl font-black text-white">{entry.canonicalName}</h2></div><button type="button" onClick={onTogglePin} aria-pressed={pinned} className={`rounded-lg border px-3 py-2 text-xs font-black ${pinned ? 'border-amber-400/35 bg-amber-500/15 text-amber-100' : 'border-white/10 bg-white/5 text-slate-300'}`}>{pinned ? '★ Pinned' : '☆ Pin Rule'}</button></div>
          <p className="mt-4 text-base leading-7 text-slate-200">{entry.shortDefinition}</p>
          {sourceVersion && sourceVersion !== entry.rulesVersion && <aside className="mt-4 rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-sm leading-5 text-amber-100">⚠ This content was created under DC20 {sourceVersion}. You’re viewing the {entry.rulesVersion} version of this rule.</aside>}
          <dl className="mt-5 grid gap-2 text-xs sm:grid-cols-2"><div className="rounded-lg bg-slate-900/70 p-3"><dt className="font-black uppercase tracking-wider text-slate-600">Source</dt><dd className="mt-1 text-slate-300">{entry.source}</dd></div><div className="rounded-lg bg-slate-900/70 p-3"><dt className="font-black uppercase tracking-wider text-slate-600">Reference</dt><dd className="mt-1 text-slate-300">{entry.sourcePage}</dd></div></dl>
          {related.length > 0 && <section className="mt-6"><h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Related Rules</h3><div className="mt-2 flex flex-wrap gap-2">{related.map((ruleID) => { const relatedEntry = registry?.byID.get(ruleID); return relatedEntry ? <button type="button" key={ruleID} onClick={() => onOpenRelated(ruleID)} className="rounded-lg border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-100 hover:bg-violet-500/20">{relatedEntry.canonicalName}</button> : null; })}</div></section>}
        </>}
      </div>
      {entry && <footer className="grid shrink-0 grid-cols-2 gap-2 border-t border-white/10 bg-slate-950/95 p-4"><button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-black text-slate-200">Close</button><button type="button" onClick={onOpenFull} className="btn-primary px-4 py-3 text-sm font-black">Open Full Rule →</button></footer>}
    </aside>
  </div>;
}
