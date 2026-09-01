import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  HubSection,
  CampaignData,
  Character,
  HubState,
  CampaignRecord,
  SavedCombat,
} from '../types/models';

const defaultCampaignData: CampaignData = {
  title: 'The Amethyst Chronicle',
  notes: 'Welcome to your campaign. Keep locations, factions, session notes, and secrets here.',
  combats: [],
  campaigns: [],
  customMonsters: [],
};

interface CampaignStore extends HubState {
  setCurrentSection: (section: HubSection) => void;
  updateCampaignData: (data: Partial<CampaignData>) => void;
  addCharacter: (character: Character) => void;
  updateCharacter: (character: Character) => void;
  deleteCharacter: (id: string) => void;
  selectCharacter: (id: string | null) => void;
  toggleDarkMode: () => void;
  saveCampaign: () => void;
  loadCampaign: () => void;
  addCampaign: (campaign: CampaignRecord) => void;
  addCombat: (combat: SavedCombat) => void;
  removeCombat: (id: string) => void;
  updateCombat: (combat: SavedCombat) => void;
}

export const useCampaignStore = create<CampaignStore>()(
  persist(
    (set, get) => ({
      currentSection: "Dashboard",
      campaignData: defaultCampaignData,
      characters: [],
      selectedCharacterId: null,
      isDarkMode: true,

      setCurrentSection: (section: HubSection) =>
        set({ currentSection: section }),

      updateCampaignData: (data: Partial<CampaignData>) =>
        set((state) => ({
          campaignData: { ...state.campaignData, ...data },
        })),

      addCharacter: (character: Character) =>
        set((state) => ({
          characters: [...state.characters, character],
        })),

      updateCharacter: (character: Character) =>
        set((state) => ({
          characters: state.characters.map((c) =>
            c.id === character.id ? character : c
          ),
        })),

      deleteCharacter: (id: string) =>
        set((state) => ({
          characters: state.characters.filter((c) => c.id !== id),
          selectedCharacterId:
            state.selectedCharacterId === id ? null : state.selectedCharacterId,
        })),

      selectCharacter: (id: string | null) =>
        set({ selectedCharacterId: id }),

      toggleDarkMode: () =>
        set((state) => ({ isDarkMode: !state.isDarkMode })),

      saveCampaign: () => {
        const state = get();
        localStorage.setItem(
          'dc20-campaign',
          JSON.stringify({
            campaignData: state.campaignData,
            characters: state.characters,
          })
        );
      },

      loadCampaign: () => {
        const saved = localStorage.getItem('dc20-campaign');
        if (saved) {
          const data = JSON.parse(saved);
          set({
            campaignData: data.campaignData || defaultCampaignData,
            characters: data.characters || [],
          });
        }
      },

      addCampaign: (campaign: CampaignRecord) =>
        set((state) => ({
          campaignData: {
            ...state.campaignData,
            campaigns: [...state.campaignData.campaigns, campaign],
          },
        })),

      addCombat: (combat: SavedCombat) =>
        set((state) => ({
          campaignData: {
            ...state.campaignData,
            combats: [...state.campaignData.combats, combat],
          },
        })),

      removeCombat: (id: string) =>
        set((state) => ({
          campaignData: {
            ...state.campaignData,
            combats: state.campaignData.combats.filter((c) => c.id !== id),
          },
        })),

      updateCombat: (combat: SavedCombat) =>
        set((state) => ({
          campaignData: {
            ...state.campaignData,
            combats: state.campaignData.combats.map((c) =>
              c.id === combat.id ? combat : c
            ),
          },
        })),
    }),
    {
      name: 'campaign-store',
    }
  )
);
