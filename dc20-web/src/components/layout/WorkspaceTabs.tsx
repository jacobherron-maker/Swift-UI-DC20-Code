import type { HubSection } from '../../types/models';

interface WorkspaceTabsProps {
  eyebrow: string;
  tabs: Array<{ section: HubSection; label: string; shortLabel?: string }>;
  active: HubSection;
  onChange: (section: HubSection) => void;
}

export default function WorkspaceTabs({ eyebrow, tabs, active, onChange }: WorkspaceTabsProps) {
  return <div className="workspace-tabs z-30 shrink-0 border-b border-white/5 bg-slate-950/90 px-3 py-2 backdrop-blur sm:px-5">
    <div className="mx-auto flex max-w-[1600px] items-center gap-3">
      <span className="hidden shrink-0 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 xl:block">{eyebrow}</span>
      <nav aria-label={`${eyebrow} sections`} className="flex min-w-0 flex-1 gap-1 overflow-x-auto overscroll-contain pb-0.5">
        {tabs.map((tab) => <button type="button" key={tab.section} onClick={() => onChange(tab.section)} aria-current={active === tab.section ? 'page' : undefined} className={`min-h-10 shrink-0 rounded-lg px-3 py-2 text-xs font-black transition sm:px-4 sm:text-sm ${active === tab.section ? 'theme-primary-button text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}><span className="sm:hidden">{tab.shortLabel ?? tab.label}</span><span className="hidden sm:inline">{tab.label}</span></button>)}
      </nav>
    </div>
  </div>;
}
