import { useEffect } from 'react';
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
import CombatView from './components/views/CombatView';
import CampaignView from './components/views/CampaignView';
import './App.css';

function App() {
  const { currentSection, isDarkMode, loadCampaign, saveCampaign } = useCampaignStore();

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  useEffect(() => {
    const interval = setInterval(() => {
      saveCampaign();
    }, 30000);
    return () => clearInterval(interval);
  }, [saveCampaign]);

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
        return <CharactersView />;
      case "Equipment":
        return <EquipmentView />;
      case "Monsters":
        return <MonstersView />;
      case "Combat":
        return <CombatView />;
      case "Campaign":
        return <CampaignView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className={`flex h-screen ${isDarkMode ? 'dark bg-gray-900' : 'bg-white'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
