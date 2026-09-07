import type { CreateTarget } from '../../navigation/appNavigation';
import OverlayShell from './OverlayShell';

const createOptions: Array<{ id: CreateTarget; icon: string; description: string; home: string }> = [
  { id: 'Character', icon: '🧙', description: 'Open the complete player character builder.', home: 'Characters' },
  { id: 'Monster', icon: '🐾', description: 'Start a custom monster stat block.', home: 'Library' },
  { id: 'Encounter', icon: '⚔', description: 'Build a balanced encounter from PCs and monsters.', home: 'Encounters' },
  { id: 'NPC', icon: '🎭', description: 'Create a named NPC record in the active campaign notes.', home: 'Campaigns' },
  { id: 'Campaign', icon: '🗺', description: 'Start a new campaign workspace.', home: 'Campaigns' },
  { id: 'Homebrew', icon: '⚒', description: 'Open the homebrew workshop for custom game content.', home: 'Library' },
];

export default function GlobalCreateDialog({ onChoose, onClose }: { onChoose: (target: CreateTarget) => void; onClose: () => void }) {
  return <OverlayShell title="Create" eyebrow="Start from anywhere" onClose={onClose} size="max-w-3xl">
    <div className="p-4 sm:p-6"><p className="mb-5 max-w-2xl text-sm leading-6 text-slate-400">Choose what you want to make. DC20 Hub will take you directly to the relevant workflow without making you find its section first.</p>
      <div className="grid gap-3 sm:grid-cols-2">{createOptions.map((option) => <button type="button" key={option.id} onClick={() => onChoose(option.id)} className="group rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-400/35 hover:bg-violet-500/10 sm:p-5"><div className="flex items-start justify-between gap-3"><span className="text-3xl" aria-hidden="true">{option.icon}</span><span className="rounded-full bg-slate-800 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500">{option.home}</span></div><h3 className="mt-4 text-lg font-black text-white">{option.id}</h3><p className="mt-1 text-sm leading-5 text-slate-400">{option.description}</p><span className="theme-accent-text mt-4 block text-xs font-black uppercase tracking-wider">Create now →</span></button>)}</div>
    </div>
  </OverlayShell>;
}
