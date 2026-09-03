import React, { useMemo, useState } from 'react';
import { useCampaignStore } from '../../store/campaignStore';
import CharacterBuilderView from './CharacterBuilderView';
import CharacterSheet from './CharacterSheet';
import { CharacterAvatar } from '../character/CharacterAvatar';

const CharactersView: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const { characters, deleteCharacter, selectCharacter, selectedCharacterId, updateCharacter } = useCampaignStore();
  const [mode, setMode] = useState<'list' | 'builder' | 'sheet'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = (nextMode: 'list' | 'builder' | 'sheet') => {
    setMode(nextMode);
    requestAnimationFrame(() => onNavigate?.());
  };

  const selectedCharacter = useMemo(
    () => characters.find((c) => c.id === selectedCharacterId) || null,
    [characters, selectedCharacterId]
  );

  const filteredCharacters = useMemo(
    () =>
      characters.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.ancestry.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [characters, searchTerm]
  );

  if (mode === 'builder') {
    return (
      <CharacterBuilderView
        character={selectedCharacter}
        onCompleted={() => navigate('sheet')}
      />
    );
  }

  if (mode === 'sheet' && selectedCharacter) {
    return (
      <CharacterSheet
        character={selectedCharacter}
        onClose={() => navigate('list')}
        onEdit={() => navigate('builder')}
        onCharacterChange={updateCharacter}
      />
    );
  }

  // List view
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Characters
        </h1>
        <button
          onClick={() => {
            selectCharacter(null);
            navigate('builder');
          }}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition"
        >
          + New Character
        </button>
      </div>

      {/* Search */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="Search characters by name, class, or ancestry..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-purple-500 focus:outline-none"
        />
      </div>

      {/* Characters Grid */}
      {filteredCharacters.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-400 text-lg mb-6">
            {characters.length === 0
              ? "No characters yet. Create your first character to begin!"
              : "No characters match your search."}
          </p>
          {characters.length === 0 && (
            <button
              onClick={() => {
                selectCharacter(null);
                navigate('builder');
              }}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition"
            >
              Create First Character
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCharacters.map((character) => (
            <div
              key={character.id}
              className={`bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border-2 transition cursor-pointer transform hover:scale-105 ${
                selectedCharacterId === character.id
                  ? 'border-purple-500 ring-2 ring-purple-500'
                  : 'border-slate-700 hover:border-purple-500'
              }`}
              onClick={() => {
                selectCharacter(character.id);
                navigate('sheet');
              }}
            >
              <div className="mb-4 flex items-center gap-4">
                <CharacterAvatar image={character.avatarDataURL} name={character.name} className="w-20 shrink-0" />
                <div className="min-w-0">
                  <h3 className="break-words text-2xl font-bold text-purple-400">{character.name}</h3>
                  <p className="text-slate-400 text-sm">
                    Level {character.level} {character.class}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-4 text-sm text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Ancestry:</span>
                  <span className="font-semibold">{character.ancestry}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">HP:</span>
                  <span className={character.healthPoints < character.maxHealthPoints / 2 ? 'text-red-400' : 'text-green-400'}>
                    {character.healthPoints}/{character.maxHealthPoints}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Defenses:</span>
                  <span className="text-blue-400 font-semibold">PD {character.physicalDefense} • AD {character.arcaneDefense}</span>
                </div>
              </div>

              {/* Attributes Summary */}
              <div className="bg-slate-700/50 rounded p-3 mb-4">
                <div className="text-xs text-slate-400 mb-2 font-semibold">Attributes</div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {(['Might', 'Agility', 'Charisma', 'Intelligence'] as const).map((attribute) => (
                    <div key={attribute} className="bg-slate-600 rounded p-2 text-center">
                      <div className="text-slate-400">{attribute.slice(0, 3).toUpperCase()}</div>
                      <div className="font-bold text-purple-300">{character.attributes[attribute].modifier >= 0 ? '+' : ''}{character.attributes[attribute].modifier}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    selectCharacter(character.id);
                    navigate('sheet');
                  }}
                  className="flex-1 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition text-sm font-semibold"
                >
                  View
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete ${character.name}?`)) {
                      deleteCharacter(character.id);
                    }
                  }}
                  className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CharactersView;
