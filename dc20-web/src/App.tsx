import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useCampaignStore } from './store/campaignStore';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import DashboardView from './components/views/DashboardView';
import RulesView from './components/views/RulesView';
import PowersView from './components/views/PowersView';
import DiceRollerView from './components/views/DiceRollerView';
import CharactersView from './components/views/CharactersView';
import EquipmentView from './components/views/EquipmentView';
import MonstersView from './components/views/MonstersView';
import EncountersView from './components/views/EncountersView';
import CombatView from './components/views/CombatView';
import CampaignView from './components/views/CampaignView';
import './App.css';
import { themePalette } from './data/themePalettes';

function App() {
  const { currentSection, isDarkMode, selectedPaletteID, loadCampaign, saveCampaign } = useCampaignStore();
  const contentRef = useRef<HTMLElement>(null);
  const palette = themePalette(selectedPaletteID);
  const themeStyle = {
    '--theme-accent': palette.accent,
    '--theme-highlight': palette.highlight,
    '--theme-bg': palette.background,
    '--theme-bg-secondary': palette.backgroundSecondary,
  } as CSSProperties;

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  useEffect(() => {
    const interval = setInterval(() => {
      saveCampaign();
    }, 30000);
    return () => clearInterval(interval);
  }, [saveCampaign]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [currentSection]);

  const renderContent = () => {
    switch (currentSection) {
      case "Dashboard":
        return <DashboardView />;
      case "Rules":
        return <RulesView />;
      case "Spells & Maneuvers":
        return <PowersView />;
      case "Dice Roller":
        return <DiceRollerView />;
      case "Characters":
        return <CharactersView onNavigate={() => contentRef.current?.scrollTo({ top: 0 })} />;
      case "Equipment":
        return <EquipmentView />;
      case "Monsters":
        return <MonstersView />;
      case "Encounters":
        return <EncountersView />;
      case "Combat":
        return <CombatView />;
      case "Campaign":
        return <CampaignView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div data-palette={palette.id} style={themeStyle} className={`dc20-theme flex h-screen ${isDarkMode ? 'dark' : ''}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main ref={contentRef} className="app-main flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
