import React, { useState } from 'react';
import { useCampaignStore } from '../../store/campaignStore';
import type { Character } from '../../types/models';
import { generateUUID } from '../../utils/gameUtils';

const CharactersView: React.FC = () => {
  const { characters, addCharacter, deleteCharacter, selectCharacter, selectedCharacterId } = useCampaignStore();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    level: 1,
    ancestry: '',
    class: '',
  });

  const handleAddCharacter = () => {
    if (formData.name.trim()) {
      const newCharacter: Character = {
        id: generateUUID(),
        name: formData.name,
        level: formData.level,
        ancestry: formData.ancestry,
        class: formData.class,
        background: '',
        alignment: '',
        stamina: 20,
        maxStamina: 20,
        injuries: [],
        abilities: [],
        skills: [],
        equipment: [],
        spells: [],
        maneuvers: [],
        notes: '',
      };
      addCharacter(newCharacter);
      setFormData({ name: '', level: 1, ancestry: '', class: '' });
      setShowForm(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-purple-400">Characters</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
        >
          ➕ New Character
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <h2 className="text-xl font-bold text-purple-300 mb-4">Create New Character</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Character Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
            />
            <input
              type="number"
              min="1"
              max="20"
              placeholder="Level"
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
            />
            <input
              type="text"
              placeholder="Ancestry"
              value={formData.ancestry}
              onChange={(e) => setFormData({ ...formData, ancestry: e.target.value })}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
            />
            <input
              type="text"
              placeholder="Class"
              value={formData.class}
              onChange={(e) => setFormData({ ...formData, class: e.target.value })}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddCharacter}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {characters.length > 0 ? (
          characters.map((character) => (
            <div
              key={character.id}
              onClick={() => selectCharacter(character.id)}
              className={`p-6 rounded-lg border transition-all cursor-pointer ${
                selectedCharacterId === character.id
                  ? 'bg-purple-900 border-purple-500 shadow-lg'
                  : 'bg-gray-800 border-gray-700 hover:border-purple-500'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-purple-300">{character.name}</h3>
                  <p className="text-gray-400">
                    Level {character.level} {character.ancestry} {character.class}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    ❤️ {character.stamina}/{character.maxStamina} Stamina
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCharacter(character.id);
                  }}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400">No characters yet. Create one to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CharactersView;
