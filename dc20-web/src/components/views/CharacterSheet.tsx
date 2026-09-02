import React, { useState } from 'react';
import type { Character } from '../../types/models';

interface CharacterSheetProps {
  character: Character;
  onClose?: () => void;
  onEdit?: () => void;
}

const CharacterSheet: React.FC<CharacterSheetProps> = ({ character, onClose, onEdit }) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'attributes' | 'skills' | 'equipment'>('overview');

  const tabs = ['overview', 'attributes', 'skills', 'equipment'] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 border-b border-purple-500 pb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-2">
                {character.name}
              </h1>
              <div className="flex gap-4 text-slate-400">
                <span className="font-semibold">{character.class}</span>
                <span>•</span>
                <span>{character.ancestry}</span>
                <span>•</span>
                <span>Level {character.level}</span>
              </div>
            </div>
            <div className="flex gap-3">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                >
                  Edit
                </button>
              )}
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition"
                >
                  Close
                </button>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 rounded p-3 border border-slate-700">
              <div className="text-xs text-slate-400 font-semibold mb-1">HEALTH</div>
              <div className="text-2xl font-bold text-red-400">{character.healthPoints} / {character.maxHealthPoints}</div>
            </div>
            <div className="bg-slate-800 rounded p-3 border border-slate-700">
              <div className="text-xs text-slate-400 font-semibold mb-1">STAMINA</div>
              <div className="text-2xl font-bold text-blue-400">{character.stamina} / {character.maxStamina}</div>
            </div>
            <div className="bg-slate-800 rounded p-3 border border-slate-700">
              <div className="text-xs text-slate-400 font-semibold mb-1">DEFENSE</div>
              <div className="text-2xl font-bold text-yellow-400">{character.defense}</div>
            </div>
            <div className="bg-slate-800 rounded p-3 border border-slate-700">
              <div className="text-xs text-slate-400 font-semibold mb-1">PRIME MOD</div>
              <div className="text-2xl font-bold text-purple-400">{character.primeModifier >= 0 ? '+' : ''}{character.primeModifier}</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 border-b border-slate-700">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-6 py-3 capitalize font-semibold transition ${
                selectedTab === tab
                  ? 'text-purple-400 border-b-2 border-purple-500'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-purple-300 mb-3">Character Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300">
                  <div>
                    <span className="font-semibold text-slate-400">Class:</span> {character.class}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400">Ancestry:</span> {character.ancestry}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400">Background:</span> {character.background || 'None specified'}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400">Alignment:</span> {character.alignment}
                  </div>
                </div>
              </div>
              {character.notes && (
                <div>
                  <h3 className="text-lg font-bold text-purple-300 mb-3">Notes</h3>
                  <p className="text-slate-300 whitespace-pre-wrap">{character.notes}</p>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'attributes' && (
            <div>
              <h3 className="text-lg font-bold text-purple-300 mb-6">Attributes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(character.attributes).map(([attrKey, attr]) => (
                  <div key={attrKey} className="bg-slate-700 rounded-lg p-6 border border-slate-600">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-lg font-bold text-purple-300">{attr.name}</h4>
                      <span className="text-2xl font-bold text-purple-400">{attr.score}</span>
                    </div>
                    <div className="text-sm text-slate-400">
                      Modifier: <span className={attr.modifier >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {attr.modifier >= 0 ? '+' : ''}{attr.modifier}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTab === 'skills' && (
            <div>
              <h3 className="text-lg font-bold text-purple-300 mb-6">Skills & Masteries</h3>
              {Object.keys(character.skillMasteries || {}).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(character.skillMasteries || {}).map(([skill, mastery]) => (
                    <div key={skill} className="bg-slate-700 rounded p-3 border border-slate-600">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-300">{skill}</span>
                        <span className="text-purple-300 font-bold">{mastery}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">No skills selected</p>
              )}
            </div>
          )}

          {selectedTab === 'equipment' && (
            <div>
              <h3 className="text-lg font-bold text-purple-300 mb-6">Equipment</h3>
              {character.equipment.length > 0 ? (
                <div className="space-y-2">
                  {character.equipment.map(item => (
                    <div key={item.id} className="bg-slate-700 rounded p-3 border border-slate-600 flex justify-between">
                      <span className="text-slate-300">{item.name}</span>
                      <span className="text-slate-400">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">No equipment</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CharacterSheet;
