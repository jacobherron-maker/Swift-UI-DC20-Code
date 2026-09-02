import React, { useMemo, useState } from 'react';
import { useCampaignStore } from '../../store/campaignStore';
import type { Character } from '../../types/models';
import { generateUUID } from '../../utils/gameUtils';

const CharactersView: React.FC = () => {
  const { characters, addCharacter, deleteCharacter, selectCharacter, selectedCharacterId, updateCharacter } = useCampaignStore();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    level: 1,
    ancestry: '',
    class: '',
  });

  const selectedCharacter = useMemo(() => characters.find((c) => c.id === selectedCharacterId) || null, [characters, selectedCharacterId]);

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
      selectCharacter(newCharacter.id);
    }
  };

  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Character>>({});

  const startEdit = (c: Character) => {
    setEditData({ ...c });
    setEditing(true);
  };

  const saveEdit = () => {
    if (!editData || !editData.id) return;
    const toSave: Character = {
      id: editData.id,
      name: editData.name || 'Unnamed',
      level: editData.level || 1,
      ancestry: editData.ancestry || '',
      class: editData.class || '',
      background: editData.background || '',
      alignment: editData.alignment || '',
      stamina: editData.stamina ?? 20,
      maxStamina: editData.maxStamina ?? 20,
      injuries: editData.injuries || [],
      abilities: editData.abilities || [],
      skills: editData.skills || [],
      equipment: editData.equipment || [],
      spells: editData.spells || [],
      maneuvers: editData.maneuvers || [],
      notes: editData.notes || '',
    };
    updateCharacter(toSave);
    setEditing(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-purple-400">Characters</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
          >
            ➕ New Character
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-gray-800 card rounded-lg p-6 border border-gray-700 mb-8">
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
              className="flex-1 btn-primary"
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

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 bg-gray-800 rounded-lg p-4 border border-gray-700 h-[65vh] overflow-auto">
          {characters.length === 0 ? (
            <p className="text-gray-400">No characters yet. Create one to get started!</p>
          ) : (
            characters.map((character) => (
              <div
                key={character.id}
                onClick={() => selectCharacter(character.id)}
                className={`p-3 rounded-lg border mb-3 transition-all cursor-pointer ${
                  selectedCharacterId === character.id
                    ? 'bg-purple-900 border-purple-500 shadow-lg'
                    : 'bg-gray-800 border-gray-700 hover:border-purple-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-purple-300">{character.name}</h3>
                    <p className="text-gray-400">Level {character.level} {character.ancestry} {character.class}</p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <button
                      onClick={(e) => { e.stopPropagation(); startEdit(character); }}
                      className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm('Delete this character?')) deleteCharacter(character.id); }}
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="col-span-2 bg-gray-800 card rounded-lg p-6 border border-gray-700 h-[65vh] overflow-auto">
          {selectedCharacter ? (
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-purple-300">{selectedCharacter.name}</h2>
                  <p className="text-gray-300">Level {selectedCharacter.level} • {selectedCharacter.ancestry} {selectedCharacter.class}</p>
                  <p className="text-sm text-gray-400 mt-2">❤️ {selectedCharacter.stamina}/{selectedCharacter.maxStamina} Stamina</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(selectedCharacter)} className="btn-primary">Edit</button>
                </div>
              </div>

              {editing ? (
                <div className="mt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <input value={editData.name || ''} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="px-4 py-2 bg-gray-900 rounded" />
                    <input type="number" value={editData.level || 1} onChange={(e) => setEditData({ ...editData, level: parseInt(e.target.value) || 1 })} className="px-4 py-2 bg-gray-900 rounded" />
                    <input value={editData.ancestry || ''} onChange={(e) => setEditData({ ...editData, ancestry: e.target.value })} className="px-4 py-2 bg-gray-900 rounded" />
                    <input value={editData.class || ''} onChange={(e) => setEditData({ ...editData, class: e.target.value })} className="px-4 py-2 bg-gray-900 rounded" />
                    <input type="number" value={editData.stamina || 20} onChange={(e) => setEditData({ ...editData, stamina: parseInt(e.target.value) || 0 })} className="px-4 py-2 bg-gray-900 rounded" />
                    <input type="number" value={editData.maxStamina || 20} onChange={(e) => setEditData({ ...editData, maxStamina: parseInt(e.target.value) || 0 })} className="px-4 py-2 bg-gray-900 rounded" />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={saveEdit} className="btn-primary">Save</button>
                    <button onClick={() => setEditing(false)} className="px-4 py-2 bg-gray-700 rounded">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-200">Notes</h3>
                  <p className="text-gray-300 whitespace-pre-wrap">{selectedCharacter.notes || 'No notes yet.'}</p>

                  <h3 className="text-lg font-semibold text-gray-200 mt-4">Abilities</h3>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {selectedCharacter.abilities.map((a) => (
                      <div key={a.name} className="bg-gray-900 p-2 rounded">{a.name}: {a.score} ({a.modifier>=0?'+':''}{a.modifier})</div>
                    ))}
                  </div>

                  <h3 className="text-lg font-semibold text-gray-200 mt-4">Spells & Maneuvers</h3>
                  <div className="mt-2 text-gray-300">{(selectedCharacter.spells?.length || 0) + (selectedCharacter.maneuvers?.length || 0)} items</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-400">Select a character to view details and edit their sheet.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CharactersView;
