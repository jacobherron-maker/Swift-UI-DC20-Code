import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useCampaignStore } from './store/campaignStore';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import WorkspaceTabs from './components/layout/WorkspaceTabs';
import GlobalCreateDialog from './components/layout/GlobalCreateDialog';
import GlobalSearchDialog from './components/layout/GlobalSearchDialog';
import GMToolsDialog from './components/layout/GMToolsDialog';
import DashboardView from './components/views/DashboardView';
import RulesView from './components/views/RulesView';
import PowersView from './components/views/PowersView';
import CharactersView from './components/views/CharactersView';
import EquipmentView from './components/views/EquipmentView';
import MonstersView from './components/views/MonstersView';
import EncountersView from './components/views/EncountersView';
import CombatView from './components/views/CombatView';
import CampaignView from './components/views/CampaignView';
import HomebrewView from './components/views/HomebrewView';
import type { ContentFocusRequest, CreateTarget, PrimaryDestination } from './navigation/appNavigation';
import { activeEncounterSection, activeLibrarySection, ENCOUNTER_SECTIONS, LIBRARY_SECTIONS, primaryDestinationForSection } from './navigation/appNavigation';
import { HubSectionValues } from './types/models';
import './App.css';
import { themePalette } from './data/themePalettes';

type GlobalOverlay = 'create' | 'search' | 'tools' | null;

function App() {
  const { currentSection, isDarkMode, selectedPaletteID, loadCampaign, saveCampaign, setCurrentSection, selectCharacter, selectMonster, selectEncounter, selectCampaign } = useCampaignStore();
  const characterPanelRef = useRef<HTMLDivElement>(null);
  const [overlay, setOverlay] = useState<GlobalOverlay>(null);
  const [focusRequest, setFocusRequest] = useState<ContentFocusRequest | null>(null);
  const focusKey = useRef(0);
  const palette = themePalette(selectedPaletteID);
  const currentDestination = primaryDestinationForSection(currentSection);
  const themeStyle = {
    '--theme-accent': palette.accent,
    '--theme-highlight': palette.highlight,
    '--theme-bg': palette.background,
    '--theme-bg-secondary': palette.backgroundSecondary,
  } as CSSProperties;

  useEffect(() => { loadCampaign(); }, [loadCampaign]);

  useEffect(() => {
    if (new URL(window.location.href).searchParams.has('partyInvite')) setCurrentSection(HubSectionValues.CAMPAIGN);
  }, [setCurrentSection]);

  useEffect(() => {
    const interval = setInterval(() => { saveCampaign(); }, 30000);
    return () => clearInterval(interval);
  }, [saveCampaign]);

  useEffect(() => {
    const openSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOverlay('search');
      }
    };
    window.addEventListener('keydown', openSearch);
    return () => window.removeEventListener('keydown', openSearch);
  }, []);

  const requestFocus = useCallback((request: Omit<ContentFocusRequest, 'key'>) => {
    focusKey.current += 1;
    setFocusRequest({ ...request, key: focusKey.current });
  }, []);
  const clearFocus = useCallback(() => setFocusRequest(null), []);

  const navigateToContent = useCallback((target: Omit<ContentFocusRequest, 'key'>) => {
    if (target.kind === 'character') {
      if (target.id) selectCharacter(target.id);
      setCurrentSection(HubSectionValues.CHARACTERS);
    } else if (target.kind === 'monster') {
      if (target.id) selectMonster(target.id);
      setCurrentSection(HubSectionValues.MONSTERS);
    } else if (target.kind === 'encounter') {
      if (target.id) selectEncounter(target.id);
      setCurrentSection(HubSectionValues.ENCOUNTERS);
    } else if (target.kind === 'campaign' || target.kind === 'npc') {
      if (target.kind === 'campaign' && target.id) selectCampaign(target.id);
      setCurrentSection(HubSectionValues.CAMPAIGN);
    } else if (target.kind === 'power') setCurrentSection(HubSectionValues.POWERS);
    else if (target.kind === 'equipment') setCurrentSection(HubSectionValues.EQUIPMENT);
    else setCurrentSection(HubSectionValues.RULES);
    requestFocus(target);
  }, [requestFocus, selectCampaign, selectCharacter, selectEncounter, selectMonster, setCurrentSection]);

  const create = useCallback((target: CreateTarget) => {
    setOverlay(null);
    if (target === 'Character') navigateToContent({ kind: 'character' });
    else if (target === 'Monster') navigateToContent({ kind: 'monster' });
    else if (target === 'Encounter') navigateToContent({ kind: 'encounter' });
    else if (target === 'NPC') navigateToContent({ kind: 'npc', name: 'Create NPC' });
    else if (target === 'Campaign') navigateToContent({ kind: 'campaign' });
    else setCurrentSection(HubSectionValues.HOMEBREW);
  }, [navigateToContent, setCurrentSection]);

  const destinationClass = (destination: PrimaryDestination, overflow = 'overflow-auto') => currentDestination === destination ? `h-full min-h-0 ${overflow}` : 'hidden';
  const activeLibrary = activeLibrarySection(currentSection);
  const activeEncounter = activeEncounterSection(currentSection);

  return (
    <div data-palette={palette.id} style={themeStyle} className={`dc20-theme flex h-[100dvh] min-h-[100dvh] overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
      <Sidebar onOpenCreate={() => setOverlay('create')} onOpenSearch={() => setOverlay('search')} onOpenTools={() => setOverlay('tools')} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onOpenCreate={() => setOverlay('create')} onOpenSearch={() => setOverlay('search')} onOpenTools={() => setOverlay('tools')} />
        <main className="app-main min-h-0 flex-1 overflow-hidden">
          <div className={destinationClass('Dashboard')}><DashboardView onOpenCreate={() => setOverlay('create')} onOpenSearch={() => setOverlay('search')} onOpenTools={() => setOverlay('tools')} /></div>
          <div ref={characterPanelRef} className={destinationClass('Characters')}><CharactersView focusRequest={focusRequest?.kind === 'character' ? focusRequest : null} onFocusHandled={clearFocus} onNavigate={() => characterPanelRef.current?.scrollTo({ top: 0 })} /></div>
          <div className={destinationClass('Encounters', 'flex flex-col overflow-hidden')}>
            <WorkspaceTabs eyebrow="Encounters" tabs={ENCOUNTER_SECTIONS} active={activeEncounter} onChange={setCurrentSection} />
            <div className="min-h-0 flex-1 overflow-hidden">
              <div className={activeEncounter === HubSectionValues.ENCOUNTERS ? 'h-full' : 'hidden'}><EncountersView focusRequest={focusRequest?.kind === 'encounter' ? focusRequest : null} onFocusHandled={clearFocus} /></div>
              <div className={activeEncounter === HubSectionValues.COMBAT ? 'h-full' : 'hidden'}><CombatView /></div>
            </div>
          </div>
          <div className={destinationClass('Library', 'flex flex-col overflow-hidden')}>
            <WorkspaceTabs eyebrow="Library" tabs={LIBRARY_SECTIONS} active={activeLibrary} onChange={setCurrentSection} />
            <div className="min-h-0 flex-1 overflow-hidden">
              <div className={activeLibrary === HubSectionValues.RULES ? 'h-full overflow-auto' : 'hidden'}><RulesView focusRequest={focusRequest?.kind === 'rule' ? focusRequest : null} onFocusHandled={clearFocus} /></div>
              <div className={activeLibrary === HubSectionValues.MONSTERS ? 'h-full' : 'hidden'}><MonstersView focusRequest={focusRequest?.kind === 'monster' ? focusRequest : null} onFocusHandled={clearFocus} /></div>
              <div className={activeLibrary === HubSectionValues.POWERS ? 'h-full overflow-auto' : 'hidden'}><PowersView focusRequest={focusRequest?.kind === 'power' ? focusRequest : null} onFocusHandled={clearFocus} /></div>
              <div className={activeLibrary === HubSectionValues.EQUIPMENT ? 'h-full' : 'hidden'}><EquipmentView focusRequest={focusRequest?.kind === 'equipment' ? focusRequest : null} onFocusHandled={clearFocus} /></div>
              <div className={activeLibrary === HubSectionValues.CHARACTER_OPTIONS ? 'h-full overflow-auto' : 'hidden'}><RulesView preset="character-options" /></div>
              <div className={activeLibrary === HubSectionValues.HOMEBREW ? 'h-full overflow-auto' : 'hidden'}><HomebrewView onCreateMonster={() => navigateToContent({ kind: 'monster' })} onCreateItem={() => navigateToContent({ kind: 'equipment' })} onOpenMonster={(id) => navigateToContent({ kind: 'monster', id })} onOpenItem={(id) => navigateToContent({ kind: 'equipment', id })} /></div>
            </div>
          </div>
          <div className={destinationClass('Campaigns', 'overflow-hidden')}><CampaignView focusRequest={focusRequest && (focusRequest.kind === 'campaign' || focusRequest.kind === 'npc') ? focusRequest : null} onFocusHandled={clearFocus} /></div>
        </main>
      </div>
      {overlay === 'create' && <GlobalCreateDialog onChoose={create} onClose={() => setOverlay(null)} />}
      {overlay === 'search' && <GlobalSearchDialog onClose={() => setOverlay(null)} onNavigate={navigateToContent} />}
      {overlay === 'tools' && <GMToolsDialog onClose={() => setOverlay(null)} onOpenSearch={() => setOverlay('search')} />}
    </div>
  );
}

export default App;
