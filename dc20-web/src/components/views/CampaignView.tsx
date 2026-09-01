import React from 'react';
import { useCampaignStore } from '../../store/campaignStore';

const CampaignView: React.FC = () => {
  const { campaignData, updateCampaignData } = useCampaignStore();
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [isEditingNotes, setIsEditingNotes] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState(campaignData.title);
  const [newNotes, setNewNotes] = React.useState(campaignData.notes);

  const handleSaveTitle = () => {
    updateCampaignData({ title: newTitle });
    setIsEditingTitle(false);
  };

  const handleSaveNotes = () => {
    updateCampaignData({ notes: newNotes });
    setIsEditingNotes(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-purple-400 mb-8">📋 Campaign</h1>

      <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 mb-8">
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-400 mb-2">Campaign Title</h2>
          {isEditingTitle ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
              <button
                onClick={handleSaveTitle}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditingTitle(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingTitle(true)}
              className="text-2xl font-bold text-white cursor-pointer hover:text-purple-300 transition-colors"
            >
              {campaignData.title} ✏️
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-400 mb-2">Campaign Notes</h2>
          {isEditingNotes ? (
            <div className="flex gap-2">
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white min-h-48"
              />
            </div>
          ) : (
            <p
              onClick={() => setIsEditingNotes(true)}
              className="text-gray-300 cursor-pointer hover:text-gray-100 transition-colors bg-gray-700 p-4 rounded-lg"
            >
              {campaignData.notes}
              <span className="ml-2">✏️</span>
            </p>
          )}
          {isEditingNotes && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSaveNotes}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditingNotes(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
          <p className="text-sm text-gray-400 mb-2">Campaigns</p>
          <p className="text-3xl font-bold text-purple-300">{campaignData.campaigns.length}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
          <p className="text-sm text-gray-400 mb-2">Combat Encounters</p>
          <p className="text-3xl font-bold text-purple-300">{campaignData.combats.length}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
          <p className="text-sm text-gray-400 mb-2">Custom Monsters</p>
          <p className="text-3xl font-bold text-purple-300">{campaignData.customMonsters.length}</p>
        </div>
      </div>
    </div>
  );
};

export default CampaignView;
