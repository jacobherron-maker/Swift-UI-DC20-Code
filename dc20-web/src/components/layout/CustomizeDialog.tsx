import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent, RefObject } from 'react';
import { usePartyCampaigns } from '../../cloud/PartyCampaignContext';
import { paletteContrastRatio, themePalette, themePalettes } from '../../data/themePalettes';
import { useCampaignStore } from '../../store/campaignStore';
import type { AppearanceSettings, CampaignAppearance, CampaignRecord, ThemePalette } from '../../types/models';
import { generateUUID } from '../../utils/gameUtils';

interface CustomizeDialogProps { onClose: () => void }
type CustomizeTab = 'theme' | 'smart' | 'campaign' | 'comfort' | 'effects';
type PreviewSurface = 'Dashboard' | 'Character Sheet' | 'Combat';

const panelClass = 'rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5';
const fieldClass = 'min-h-11 rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none focus:border-violet-400/70';
const tabs: Array<{ id: CustomizeTab; label: string; icon: string }> = [
  { id: 'theme', label: 'Theme', icon: '🎨' }, { id: 'smart', label: 'Automatic', icon: '✦' },
  { id: 'campaign', label: 'Campaigns', icon: '⚑' }, { id: 'comfort', label: 'Comfort', icon: 'Aa' },
  { id: 'effects', label: 'Effects', icon: '✨' },
];

function newCustomPalette(source?: ThemePalette): ThemePalette {
  return { ...(source ?? themePalettes[0]), id: `custom-theme-${generateUUID()}`, name: source ? `${source.name} Copy` : 'My Custom Theme', associatedClass: 'Custom Theme', symbol: source?.symbol ?? '✦', custom: true };
}

function downloadJSON(filename: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function campaignBanner(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file for the campaign banner.');
  if (file.size > 10_000_000) throw new Error('Choose an image smaller than 10 MB.');
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('The banner could not be read.'));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('The banner image could not be opened.'));
    element.src = source;
  });
  const canvas = document.createElement('canvas');
  canvas.width = 1400;
  canvas.height = 460;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot prepare campaign banners.');
  const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  for (const quality of [0.82, 0.68, 0.54, 0.42]) {
    const result = canvas.toDataURL('image/webp', quality);
    if (result.length <= 220_000) return result;
  }
  throw new Error('That image remains too large after optimization. Try a simpler or smaller image.');
}

export default function CustomizeDialog({ onClose }: CustomizeDialogProps) {
  const {
    selectedPaletteID, customPalettes, appearanceSettings, campaignData, selectedCampaignId,
    setSelectedPalette, updateAppearanceSettings, saveCustomPalette, removeCustomPalette,
    resetAppearance, resetCustomPalettes, updateCampaign,
  } = useCampaignStore();
  const partyHub = usePartyCampaigns();
  const [tab, setTab] = useState<CustomizeTab>('theme');
  const [previewSurface, setPreviewSurface] = useState<PreviewSurface>('Dashboard');
  const [mobilePreview, setMobilePreview] = useState(false);
  const [draft, setDraft] = useState<ThemePalette | null>(null);
  const [campaignID, setCampaignID] = useState(selectedCampaignId ?? campaignData.campaigns[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const themeImportRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const allPalettes = useMemo(() => [...customPalettes, ...themePalettes], [customPalettes]);
  const selected = themePalette(selectedPaletteID, customPalettes);
  const previewPalette = draft ?? selected;
  const selectedCampaign = campaignData.campaigns.find(({ id }) => id === campaignID) ?? null;

  const updateSetting = (changes: Partial<AppearanceSettings>) => updateAppearanceSettings(changes);
  const saveDraft = () => {
    if (!draft?.name.trim()) return;
    saveCustomPalette({ ...draft, name: draft.name.trim(), associatedClass: draft.associatedClass.trim() || 'Custom Theme' });
    setSelectedPalette(draft.id);
    setMessage(`${draft.name.trim()} is saved and active.`);
    setDraft(null);
  };
  const importThemes = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const records = Array.isArray(parsed) ? parsed : parsed && typeof parsed === 'object' && Array.isArray((parsed as { themes?: unknown[] }).themes) ? (parsed as { themes: unknown[] }).themes : [parsed];
      let count = 0;
      for (const record of records) {
        if (!record || typeof record !== 'object' || typeof (record as ThemePalette).name !== 'string') continue;
        const imported = record as ThemePalette;
        saveCustomPalette({ ...imported, id: themePalettes.some(({ id }) => id === imported.id) ? `custom-theme-${generateUUID()}` : imported.id || `custom-theme-${generateUUID()}`, custom: true });
        count += 1;
      }
      setMessage(count ? `Imported ${count} custom ${count === 1 ? 'theme' : 'themes'}.` : 'No valid themes were found in that file.');
    } catch { setMessage('That file is not a valid DC20 Hub theme file.'); }
    finally { if (themeImportRef.current) themeImportRef.current.value = ''; }
  };
  const publishCampaignAppearance = (campaign: CampaignRecord, appearance: CampaignAppearance) => {
    updateCampaign({ ...campaign, appearance });
    const party = campaign.party ? partyHub.parties.find(({ id }) => id === campaign.party?.partyId) : undefined;
    const manager = party?.role === 'gm' || party?.role === 'co-gm';
    if (campaign.party && manager && (appearance.shareWithPlayers || campaign.appearance?.shareWithPlayers)) {
      void partyHub.updatePartyAppearance(campaign.party.partyId, appearance)
        .then(() => setMessage(appearance.shareWithPlayers ? 'Campaign appearance shared with the party.' : 'Player-facing campaign appearance turned off.'))
        .catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'The campaign appearance could not be shared.'));
    }
  };
  const changeCampaignAppearance = (changes: Partial<CampaignAppearance>) => {
    if (!selectedCampaign) return;
    const base = selectedCampaign.appearance ?? { paletteID: selectedPaletteID, shareWithPlayers: false };
    const next = { ...base, ...changes };
    const palette = themePalette(next.paletteID, customPalettes);
    next.paletteSnapshot = palette.custom ? palette : undefined;
    publishCampaignAppearance(selectedCampaign, next);
  };
  const setBanner = async (event: ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      changeCampaignAppearance({ bannerDataURL: await campaignBanner(file) });
      setMessage('Campaign banner saved.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The banner could not be saved.'); }
    finally { event.target.value = ''; }
  };
  const contrastWarnings = [
    paletteContrastRatio(previewPalette.highlight, previewPalette.background) < 4.5 ? 'Highlight text may be hard to read on the main background.' : '',
    paletteContrastRatio('#FFFFFF', previewPalette.accent) < 3 ? 'White button text may need a darker accent color.' : '',
  ].filter(Boolean);

  return <div role="dialog" aria-modal="true" aria-labelledby="customize-heading" className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-2 backdrop-blur-sm sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl sm:max-h-[94dvh] sm:rounded-3xl">
      <header className="flex items-start justify-between gap-3 border-b border-white/10 p-4 sm:p-6"><div><p className="theme-accent-text text-xs font-black uppercase tracking-[0.25em]">Appearance workspace</p><h1 id="customize-heading" className="mt-1 text-2xl font-black text-white sm:text-3xl">Customize DC20 Hub</h1><p className="mt-2 max-w-3xl text-sm text-slate-400">Shape the whole interface, build reusable themes, or give each character and campaign its own visual identity.</p></div><button type="button" onClick={onClose} aria-label="Close customization" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 font-black text-slate-300 hover:bg-white/10">✕</button></header>
      <nav className="shrink-0 overflow-x-auto border-b border-white/10 p-2" aria-label="Customization sections"><div className="flex min-w-max gap-2">{tabs.map((entry) => <button type="button" key={entry.id} onClick={() => setTab(entry.id)} className={`min-h-11 rounded-xl px-4 text-sm font-black ${tab === entry.id ? 'theme-primary-button text-white' : 'text-slate-400 hover:bg-white/5'}`}>{entry.icon} {entry.label}</button>)}</div></nav>
      <div className="grid min-h-0 flex-1 overflow-auto xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="min-w-0 p-4 sm:p-6">
          {tab === 'theme' && <div className="space-y-5">
            <section className={panelClass}><SectionHeading eyebrow="Appearance mode" title="Match the way you play" description="Follow your device automatically, or lock DC20 Hub to a light or dark appearance." /><Segmented values={['System', 'Light', 'Dark']} selected={appearanceSettings.mode} onSelect={(mode) => updateSetting({ mode: mode as AppearanceSettings['mode'] })} /></section>
            <section><SectionHeading eyebrow="Curated palettes" title="Class-inspired themes" description="Choose any palette globally. Each one remains available for automatic character themes and campaign styling." /><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{allPalettes.map((palette) => <PaletteCard key={palette.id} palette={palette} selected={selectedPaletteID === palette.id} onSelect={() => setSelectedPalette(palette.id)} />)}</div></section>
            <section className={panelClass}><div className="flex flex-wrap items-start justify-between gap-3"><SectionHeading eyebrow="Custom palette builder" title={draft ? 'Edit your palette' : 'Create something unique'} description="Choose every key interface color. Contrast checks flag combinations that may be difficult to read." /><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setDraft(newCustomPalette())} className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-black text-white">New</button><button type="button" onClick={() => setDraft(newCustomPalette(selected))} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-slate-200">Duplicate Active</button></div></div>
              {draft ? <div className="mt-5 space-y-4"><div className="grid gap-3 sm:grid-cols-3"><LabeledInput label="Theme name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} /><LabeledInput label="Theme label" value={draft.associatedClass} onChange={(associatedClass) => setDraft({ ...draft, associatedClass })} /><LabeledInput label="Symbol" value={draft.symbol} onChange={(symbol) => setDraft({ ...draft, symbol: symbol.slice(0, 4) })} /></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ColorField label="Accent" value={draft.accent} onChange={(accent) => setDraft({ ...draft, accent })} /><ColorField label="Highlight" value={draft.highlight} onChange={(highlight) => setDraft({ ...draft, highlight })} /><ColorField label="Background" value={draft.background} onChange={(background) => setDraft({ ...draft, background })} /><ColorField label="Panel" value={draft.backgroundSecondary} onChange={(backgroundSecondary) => setDraft({ ...draft, backgroundSecondary })} /></div>{contrastWarnings.length > 0 && <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-xs leading-5 text-amber-200">{contrastWarnings.map((warning) => <p key={warning}>⚠ {warning}</p>)}</div>}<div className="flex flex-wrap gap-2"><button type="button" disabled={!draft.name.trim()} onClick={saveDraft} className="btn-primary font-black disabled:opacity-40">Save Theme</button><button type="button" onClick={() => setDraft(null)} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300">Cancel</button></div></div> : <p className="mt-4 rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">Start a blank theme or duplicate the active palette.</p>}
            </section>
            <section className={panelClass}><SectionHeading eyebrow="Theme management" title="Move themes between devices" description="Export one theme or your full custom collection, import a theme file, rename by editing, and reset safely." /><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => downloadJSON(`${selected.name.replaceAll(' ', '-').toLowerCase()}.dc20-theme.json`, selected)} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-slate-200">Export Active</button><button type="button" disabled={!customPalettes.length} onClick={() => downloadJSON('dc20-hub-custom-themes.json', { format: 'dc20hub-themes', themes: customPalettes })} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-slate-200 disabled:opacity-35">Export All Custom</button><button type="button" onClick={() => themeImportRef.current?.click()} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-slate-200">Import Themes</button>{selected.custom && <><button type="button" onClick={() => setDraft({ ...selected })} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black text-slate-200">Edit Active</button><button type="button" onClick={() => { if (window.confirm(`Delete the custom theme “${selected.name}”?`)) removeCustomPalette(selected.id); }} className="rounded-xl border border-red-400/25 px-4 py-2 text-sm font-black text-red-300">Delete Active</button></>}<button type="button" disabled={!customPalettes.length} onClick={() => { if (window.confirm('Delete every custom theme? Curated themes will remain.')) resetCustomPalettes(); }} className="rounded-xl px-4 py-2 text-sm font-black text-red-300 disabled:opacity-35">Reset Custom Themes</button></div><input ref={themeImportRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void importThemes(event.target.files?.[0])} /></section>
          </div>}
          {tab === 'smart' && <div className="space-y-5"><section className={panelClass}><SectionHeading eyebrow="Automatic class themes" title="Let each character set the mood" description="When a character builder or sheet is open, its class palette temporarily replaces your global palette." /><Toggle checked={appearanceSettings.automaticClassThemes} onChange={(automaticClassThemes) => updateSetting({ automaticClassThemes })} label="Use class themes on character pages" detail="Artificers get brass and teal, Barbarians ember red, Druids verdant green, and every supported class gets its curated identity." /></section><section className={panelClass}><SectionHeading eyebrow="Campaign themes" title="Style campaign workspaces" description="Use the selected campaign's palette, banner, and icon whenever its workspace is open." /><Toggle checked={appearanceSettings.campaignThemes} onChange={(campaignThemes) => updateSetting({ campaignThemes })} label="Apply campaign themes automatically" detail="Your global palette remains the fallback everywhere else." /></section><section className={panelClass}><SectionHeading eyebrow="Theme priority" title="Predictable at every turn" description="DC20 Hub resolves themes in a clear order." /><ol className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-3"><li className="rounded-xl bg-violet-500/10 p-3"><strong className="theme-accent-text">1. Character</strong><br />On a selected character when enabled.</li><li className="rounded-xl bg-violet-500/10 p-3"><strong className="theme-accent-text">2. Campaign</strong><br />Inside its campaign workspace.</li><li className="rounded-xl bg-violet-500/10 p-3"><strong className="theme-accent-text">3. Global</strong><br />Everywhere else in the hub.</li></ol></section></div>}
          {tab === 'campaign' && <CampaignThemePanel campaigns={campaignData.campaigns} campaign={selectedCampaign} campaignID={campaignID} palettes={allPalettes} onSelectCampaign={setCampaignID} onChange={changeCampaignAppearance} onBanner={() => bannerRef.current?.click()} onBannerFile={setBanner} bannerRef={bannerRef} partyHub={partyHub} />}
          {tab === 'comfort' && <div className="space-y-5"><section className={panelClass}><SectionHeading eyebrow="Interface scale" title="Make every screen comfortable" description="Scaling changes typography and controls across desktop and mobile." /><Segmented values={['Small', 'Standard', 'Large', 'Extra Large']} selected={appearanceSettings.interfaceScale} onSelect={(interfaceScale) => updateSetting({ interfaceScale: interfaceScale as AppearanceSettings['interfaceScale'] })} /></section><section className={panelClass}><SectionHeading eyebrow="Preference storage" title="Choose where appearance follows you" description="Game data always cloud-saves when signed in. This setting only changes whether appearance preferences do too." /><div className="mt-4 grid gap-3 sm:grid-cols-2"><ChoiceCard selected={appearanceSettings.syncScope === 'Cloud'} title="Follow My Account" detail="Themes and appearance move with you to every signed-in device." onClick={() => updateSetting({ syncScope: 'Cloud' })} /><ChoiceCard selected={appearanceSettings.syncScope === 'Device'} title="This Device Only" detail="Keep this device's appearance independent while game data still syncs." onClick={() => updateSetting({ syncScope: 'Device' })} /></div></section><section className={panelClass}><SectionHeading eyebrow="Reset" title="Return to defaults" description="Restore the Amethyst palette and standard appearance without touching characters, campaigns, or custom themes." /><button type="button" onClick={() => { if (window.confirm('Reset appearance settings to their defaults?')) resetAppearance(); }} className="mt-4 rounded-xl border border-red-400/25 px-4 py-2 text-sm font-black text-red-300">Reset Appearance</button></section></div>}
          {tab === 'effects' && <div className="space-y-5"><section className={panelClass}><SectionHeading eyebrow="Background texture" title="Set the atmosphere" description="Textures remain subtle so rules and character data stay easy to read." /><Segmented values={['None', 'Arcane Mist', 'Parchment', 'Starfield']} selected={appearanceSettings.backgroundTexture} onSelect={(backgroundTexture) => updateSetting({ backgroundTexture: backgroundTexture as AppearanceSettings['backgroundTexture'] })} /></section><section className={panelClass}><SectionHeading eyebrow="Visual intensity" title="Tune depth and glow" description="Adjust decoration without changing information or source wording." /><div className="mt-4 space-y-5"><RangeSetting label="Accent glow" value={appearanceSettings.glowIntensity} onChange={(glowIntensity) => updateSetting({ glowIntensity })} /><RangeSetting label="Panel transparency" value={appearanceSettings.panelTransparency} max={40} onChange={(panelTransparency) => updateSetting({ panelTransparency })} /><RangeSetting label="Shadow depth" value={appearanceSettings.shadowIntensity} onChange={(shadowIntensity) => updateSetting({ shadowIntensity })} /></div></section><section className={panelClass}><SectionHeading eyebrow="Motion" title="Choose an animation level" description="Reduced and None are useful for motion sensitivity and lower-powered devices." /><Segmented values={['None', 'Reduced', 'Full']} selected={appearanceSettings.animationLevel} onSelect={(animationLevel) => updateSetting({ animationLevel: animationLevel as AppearanceSettings['animationLevel'] })} /></section></div>}
          {message && <p role="status" className="mt-5 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-sm font-bold text-violet-100">{message}</p>}
        </main>
        <aside className="theme-preview border-t border-white/10 p-4 sm:p-6 xl:border-l xl:border-t-0" style={{ background: `linear-gradient(160deg, ${previewPalette.backgroundSecondary}, ${previewPalette.background})` }}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: previewPalette.highlight }}>Live preview</p><button type="button" onClick={() => setMobilePreview((value) => !value)} className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] font-black text-slate-300">{mobilePreview ? 'Desktop' : 'Mobile'}</button></div><div className="mt-3 flex gap-1 overflow-x-auto">{(['Dashboard', 'Character Sheet', 'Combat'] as PreviewSurface[]).map((surface) => <button type="button" key={surface} onClick={() => setPreviewSurface(surface)} className={`rounded-lg px-2 py-1.5 text-[10px] font-black ${previewSurface === surface ? 'text-white' : 'bg-black/20 text-slate-400'}`} style={previewSurface === surface ? { background: previewPalette.accent } : undefined}>{surface}</button>)}</div><div className={`mx-auto mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/25 shadow-2xl transition-all ${mobilePreview ? 'max-w-[235px]' : 'w-full'}`}><Preview palette={previewPalette} surface={previewSurface} mobile={mobilePreview} /></div><div className="mt-5 grid grid-cols-4 gap-2" aria-label="Active theme colors"><ColorSwatch label="Accent" color={previewPalette.accent} /><ColorSwatch label="Highlight" color={previewPalette.highlight} /><ColorSwatch label="Panel" color={previewPalette.backgroundSecondary} /><ColorSwatch label="Canvas" color={previewPalette.background} /></div><p className="mt-4 text-xs leading-5 text-slate-400"><strong className="text-slate-200">{previewPalette.symbol} {previewPalette.name}</strong><br />{previewPalette.associatedClass}</p></aside>
      </div>
    </div>
  </div>;
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <div><p className="theme-accent-text text-[10px] font-black uppercase tracking-[0.2em]">{eyebrow}</p><h2 className="mt-1 text-xl font-black text-white">{title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{description}</p></div>; }
function Segmented({ values, selected, onSelect }: { values: string[]; selected: string; onSelect: (value: string) => void }) { return <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">{values.map((value) => <button type="button" key={value} onClick={() => onSelect(value)} className={`min-h-11 rounded-xl border px-4 text-sm font-black ${selected === value ? 'theme-primary-button border-transparent text-white' : 'border-white/10 bg-slate-950/45 text-slate-300 hover:bg-white/5'}`}>{value}</button>)}</div>; }
function PaletteCard({ palette, selected, onSelect }: { palette: ThemePalette; selected: boolean; onSelect: () => void }) { return <button type="button" onClick={onSelect} className={`rounded-2xl border p-4 text-left transition ${selected ? 'theme-selected-card shadow-lg' : 'border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]'}`}><div className="flex items-center justify-between"><span className="text-2xl">{palette.symbol}</span>{palette.custom ? <span className="rounded-full bg-sky-500/10 px-2 py-1 text-[9px] font-black uppercase text-sky-200">Custom</span> : selected ? <span className="theme-accent-text font-black">✓</span> : null}</div><p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: palette.highlight }}>{palette.associatedClass}</p><h3 className="mt-1 font-black text-white">{palette.name}</h3><div className="mt-3 flex gap-2"><span className="h-5 w-5 rounded-full" style={{ background: palette.accent }} /><span className="h-5 w-5 rounded-full" style={{ background: palette.highlight }} /><span className="h-5 w-5 rounded-full border border-white/10" style={{ background: palette.backgroundSecondary }} /></div></button>; }
function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="text-xs font-bold text-slate-400">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className={`${fieldClass} mt-1 w-full`} /></label>; }
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="text-xs font-bold text-slate-400">{label}<span className="mt-1 flex items-center gap-2"><input type="color" value={value} onChange={(event) => onChange(event.target.value.toUpperCase())} className="h-11 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1" /><input value={value} onChange={(event) => { if (/^#[0-9a-f]{6}$/i.test(event.target.value)) onChange(event.target.value.toUpperCase()); }} className={`${fieldClass} min-w-0 flex-1 font-mono`} /></span></label>; }
function Toggle({ checked, onChange, label, detail, disabled = false }: { checked: boolean; onChange: (value: boolean) => void; label: string; detail: string; disabled?: boolean }) { return <label className={`mt-4 flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-slate-950/45 p-4 ${disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'}`}><span><span className="block font-black text-slate-100">{label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{detail}</span></span><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-violet-500" /></label>; }
function ChoiceCard({ selected, title, detail, onClick }: { selected: boolean; title: string; detail: string; onClick: () => void }) { return <button type="button" onClick={onClick} className={`rounded-xl border p-4 text-left ${selected ? 'theme-selected-card' : 'border-white/10 bg-slate-950/45'}`}><span className="font-black text-slate-100">{selected ? '✓ ' : ''}{title}</span><span className="mt-2 block text-xs leading-5 text-slate-500">{detail}</span></button>; }
function RangeSetting({ label, value, max = 100, onChange }: { label: string; value: number; max?: number; onChange: (value: number) => void }) { return <label className="block"><span className="flex justify-between text-xs font-black text-slate-300"><span>{label}</span><span>{value}%</span></span><input type="range" min="0" max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 w-full accent-violet-500" /></label>; }

function CampaignThemePanel({ campaigns, campaign, campaignID, palettes, onSelectCampaign, onChange, onBanner, onBannerFile, bannerRef, partyHub }: { campaigns: CampaignRecord[]; campaign: CampaignRecord | null; campaignID: string; palettes: ThemePalette[]; onSelectCampaign: (id: string) => void; onChange: (changes: Partial<CampaignAppearance>) => void; onBanner: () => void; onBannerFile: (event: ChangeEvent<HTMLInputElement>) => void; bannerRef: RefObject<HTMLInputElement | null>; partyHub: ReturnType<typeof usePartyCampaigns> }) {
  const appearance = campaign?.appearance;
  const party = campaign?.party ? partyHub.parties.find(({ id }) => id === campaign.party?.partyId) : undefined;
  const manager = party?.role === 'gm' || party?.role === 'co-gm';
  if (!campaigns.length) return <section className={panelClass}><SectionHeading eyebrow="Campaign themes" title="Create a campaign first" description="Once a campaign exists, you can give it a palette, banner, icon, and optional player-facing appearance." /></section>;
  return <div className="space-y-5"><section className={panelClass}><SectionHeading eyebrow="Campaign themes" title="Give every world its own identity" description="Campaign appearance overrides the global palette only while that campaign is open." /><label className="mt-4 block text-xs font-bold text-slate-400">Campaign<select value={campaignID} onChange={(event) => onSelectCampaign(event.target.value)} className={`${fieldClass} mt-1 w-full`}>{campaigns.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}{entry.party ? ' — Group' : ' — Solo'}</option>)}</select></label></section>{campaign && <><section className={panelClass}><div className="grid gap-4 sm:grid-cols-[1fr_9rem]"><label className="text-xs font-bold text-slate-400">Campaign palette<select value={appearance?.paletteID ?? themePalettes[0].id} onChange={(event) => onChange({ paletteID: event.target.value })} className={`${fieldClass} mt-1 w-full`}>{palettes.map((palette) => <option key={palette.id} value={palette.id}>{palette.symbol} {palette.name}</option>)}</select></label><label className="text-xs font-bold text-slate-400">Campaign icon<select value={appearance?.icon ?? '⚑'} onChange={(event) => onChange({ icon: event.target.value })} className={`${fieldClass} mt-1 w-full`}><option>⚑</option><option>✦</option><option>⚔</option><option>🛡</option><option>🐉</option><option>🏰</option><option>🗺</option><option>☠</option></select></label></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={onBanner} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-slate-200">{appearance?.bannerDataURL ? 'Replace Banner' : 'Add Banner'}</button>{appearance?.bannerDataURL && <button type="button" onClick={() => onChange({ bannerDataURL: undefined })} className="rounded-xl px-4 py-2 text-sm font-black text-red-300">Remove Banner</button>}</div><input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={(event) => void onBannerFile(event)} />{appearance?.bannerDataURL && <img src={appearance.bannerDataURL} alt="Campaign banner preview" className="mt-4 aspect-[3/1] w-full rounded-xl object-cover" />}</section><section className={panelClass}><SectionHeading eyebrow="Player-facing theme" title={campaign.party ? 'Share the atmosphere' : 'Solo campaign'} description={campaign.party ? 'GMs and co-GMs can publish this campaign palette, banner, and icon to every member.' : 'Connect this campaign to a party before sharing its appearance with players.'} />{campaign.party && <Toggle checked={Boolean(appearance?.shareWithPlayers)} disabled={!manager} onChange={(shareWithPlayers) => onChange({ shareWithPlayers })} label="Share appearance with campaign members" detail={manager ? 'Players receive the campaign theme through the connected party.' : 'Only a GM or co-GM can change the shared campaign appearance.'} />}</section></>}</div>;
}

function Preview({ palette, surface, mobile }: { palette: ThemePalette; surface: PreviewSurface; mobile: boolean }) {
  const buttonStyle = { background: palette.accent };
  return <div className="text-slate-200"><div className="flex items-center justify-between border-b border-white/10 p-3"><span className="text-sm font-black">{palette.symbol} DC20 Hub</span><span className="text-[9px] uppercase" style={{ color: palette.highlight }}>{surface}</span></div><div className="p-3">{surface === 'Dashboard' && <><p className="text-[9px] font-black uppercase" style={{ color: palette.highlight }}>Welcome back</p><h3 className="mt-1 text-lg font-black">Dashboard</h3><div className={`mt-3 grid gap-2 ${mobile ? 'grid-cols-1' : 'grid-cols-2'}`}><PreviewCard title="Characters" value="4" /><PreviewCard title="Campaigns" value="2" /><PreviewCard title="Encounters" value="7" /><PreviewCard title="Rules" value="Search" /></div></>}{surface === 'Character Sheet' && <><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full" style={buttonStyle}>W</span><div><h3 className="font-black">Willow Vale</h3><p className="text-[10px] text-slate-400">Level 4 Druid</p></div></div><div className="mt-3 grid grid-cols-3 gap-2"><PreviewCard title="HP" value="18/22" /><PreviewCard title="SP" value="6/6" /><PreviewCard title="MP" value="8/10" /></div><button type="button" className="mt-3 w-full rounded-lg px-3 py-2 text-xs font-black text-white" style={buttonStyle}>Roll Awareness +6</button></>}{surface === 'Combat' && <><div className="flex justify-between"><div><p className="text-[9px] font-black uppercase" style={{ color: palette.highlight }}>Round 3</p><h3 className="font-black">Ruined Keep</h3></div><span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[9px] font-black text-emerald-200">Live</span></div><div className="mt-3 space-y-2"><PreviewCombatant name="Willow Vale" hp="18/22" active color={palette.accent} /><PreviewCombatant name="Stone Drake" hp="31/48" color={palette.accent} /><PreviewCombatant name="Bandit" hp="8/12" color={palette.accent} /></div></>}</div></div>;
}
function PreviewCard({ title, value }: { title: string; value: string }) { return <div className="rounded-lg border border-white/10 bg-white/5 p-2"><p className="text-[9px] uppercase text-slate-500">{title}</p><p className="mt-1 text-sm font-black">{value}</p></div>; }
function PreviewCombatant({ name, hp, active, color }: { name: string; hp: string; active?: boolean; color: string }) { return <div className="flex items-center justify-between rounded-lg border p-2 text-xs" style={{ borderColor: active ? color : 'rgba(255,255,255,.1)', background: active ? `${color}22` : 'rgba(255,255,255,.03)' }}><span className="font-bold">{name}</span><span className="text-[10px] text-slate-400">HP {hp}</span></div>; }
function ColorSwatch({ label, color }: { label: string; color: string }) { return <div className="text-center"><span className="mx-auto block h-7 w-7 rounded-full border border-white/10" style={{ background: color }} /><span className="mt-1 block text-[8px] uppercase text-slate-500">{label}</span></div>; }
