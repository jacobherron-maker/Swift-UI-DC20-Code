import { useEffect, type ReactNode } from 'react';

export default function OverlayShell({ title, eyebrow, onClose, children, size = 'max-w-5xl' }: { title: string; eyebrow: string; onClose: () => void; children: ReactNode; size?: string }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return <div className="fixed inset-0 z-[80] grid place-items-center p-2 sm:p-5" role="dialog" aria-modal="true" aria-label={title}>
    <button type="button" aria-label={`Close ${title}`} onClick={onClose} className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
    <section className={`relative flex max-h-[calc(100dvh-1rem)] w-full ${size} flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl sm:max-h-[calc(100dvh-2.5rem)]`}>
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-gradient-to-r from-violet-950/70 to-slate-950 px-4 py-3 sm:px-6 sm:py-4"><div><p className="theme-accent-text text-[10px] font-black uppercase tracking-[0.2em]">{eyebrow}</p><h2 className="mt-0.5 text-xl font-black text-white sm:text-2xl">{title}</h2></div><button type="button" onClick={onClose} aria-label={`Close ${title}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-800 text-xl text-slate-200 hover:bg-slate-700">×</button></header>
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain">{children}</div>
    </section>
  </div>;
}
