import React, { useRef, useState } from 'react';
import { themePalette, themePalettes } from '../../data/themePalettes';
import { useCampaignStore } from '../../store/campaignStore';
import { downloadHubBackup } from '../../utils/dataBackup';

interface CustomizeDialogProps {
  onClose: () => void;
}

const CustomizeDialog: React.FC<CustomizeDialogProps> = ({ onClose }) => {
  const { selectedPaletteID, setSelectedPalette, exportData, importData } = useCampaignStore();
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = themePalette(selectedPaletteID);

  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      const document = JSON.parse(await file.text()) as unknown;
      importData(document);
      setMessage(`Restored ${file.name}. Your campaign data and selections are ready.`);
    } catch {
      setMessage('That file is not a valid DC20 Hub backup. No data was changed.');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return <div role="dialog" aria-modal="true" aria-labelledby="customize-heading" className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
      <header className="flex items-start justify-between gap-4 border-b border-white/10 p-6">
        <div><p className="theme-accent-text text-xs font-black uppercase tracking-[0.25em]">Appearance & backups</p><h1 id="customize-heading" className="mt-1 text-3xl font-black text-white">Customize DC20 Hub</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Choose a curated class palette. Changes apply immediately and stay selected on this browser.</p></div>
        <button type="button" onClick={onClose} aria-label="Close customization" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 font-black text-slate-300 hover:bg-white/10">✕</button>
      </header>

      <div className="grid min-h-0 flex-1 overflow-auto lg:grid-cols-[1fr_310px]">
        <section className="grid content-start gap-3 p-6 sm:grid-cols-2 xl:grid-cols-3">
          {themePalettes.map((palette) => <button type="button" key={palette.id} onClick={() => setSelectedPalette(palette.id)} className={`rounded-2xl border p-4 text-left transition ${selectedPaletteID === palette.id ? 'theme-selected-card shadow-lg' : 'border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]'}`}>
            <div className="flex items-center justify-between"><span className="text-2xl" aria-hidden="true">{palette.symbol}</span>{selectedPaletteID === palette.id && <span className="theme-accent-text font-black">✓</span>}</div>
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: palette.highlight }}>{palette.associatedClass}</p>
            <h2 className="mt-1 font-black text-white">{palette.name}</h2>
            <div className="mt-3 flex gap-2" aria-hidden="true"><span className="h-5 w-5 rounded-full" style={{ background: palette.accent }} /><span className="h-5 w-5 rounded-full" style={{ background: palette.highlight }} /><span className="h-5 w-5 rounded-full border border-white/10" style={{ background: palette.backgroundSecondary }} /></div>
          </button>)}
        </section>

        <aside className="border-t border-white/10 p-6 lg:border-l lg:border-t-0" style={{ background: `linear-gradient(160deg, ${selected.backgroundSecondary}, ${selected.background})` }}>
          <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: selected.highlight }}>Live preview</p>
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-center gap-3"><span className="text-3xl">{selected.symbol}</span><div><h2 className="text-xl font-black text-white">{selected.associatedClass}</h2><p className="text-sm text-slate-400">{selected.name}</p></div></div>
            <div className="my-4 h-px bg-white/10" />
            <div className="space-y-2 text-sm font-bold text-slate-300"><p>📚 Rules Reference</p><p>🧙 Character Builder</p><p>⚡ Combat Tracker</p></div>
            <button type="button" className="mt-5 w-full rounded-xl px-4 py-2 font-black text-white" style={{ background: selected.accent }}>Primary Action</button>
          </div>

          <div className="mt-6 border-t border-white/10 pt-6"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Data backup</p><p className="mt-2 text-sm leading-6 text-slate-400">Download everything saved in this browser, or restore a prior DC20 Hub backup.</p><div className="mt-4 grid gap-2"><button type="button" onClick={() => downloadHubBackup(exportData())} className="btn-primary w-full font-black">⬇ Export All Data</button><button type="button" onClick={() => inputRef.current?.click()} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-black text-slate-200 hover:bg-white/10">⬆ Import Backup</button><input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void importBackup(event.target.files?.[0])} /></div>{message && <p role="status" className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-300">{message}</p>}</div>
        </aside>
      </div>
    </div>
  </div>;
};

export default CustomizeDialog;
