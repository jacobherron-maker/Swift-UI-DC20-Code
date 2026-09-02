import React, { useState } from 'react';
import type { Character } from '../../types/models';
import { DC20Attributes } from '../../types/models';

interface CharacterSheetProps {
  character: Character;
  onClose?: () => void;
}

const CharacterSheet: React.FC<CharacterSheetProps> = ({ character, onClose }) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    attributes: true,
    combat: true,
    skills: true,
    equipment: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const attributeOrder = [
    DC20Attributes.MIGHT,
    DC20Attributes.INTELLECT,
    DC20Attributes.PRESENCE,
    DC20Attributes.AGILITY,
    DC20Attributes.FORTITUDE,
    DC20Attributes.ATTUNEMENT,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-2">
              {character.name}
            </h1>
            <div className="flex gap-4 text-slate-400">
              <span className="text-lg">{character.class} · {character.ancestry}</span>
              <span className="text-lg">Level {character.level}</span>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition"
            >
              Close
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Attributes & Combat Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Combat Stats Card */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-purple-400 mb-4 flex items-center justify-between cursor-pointer" onClick={() => toggleSection('combat')}>
                <span>Combat</span>
                <span className="text-sm">{expandedSections.combat ? '▼' : '▶'}</span>
              </h2>
              {expandedSections.combat && (
                <div className="space-y-3">
                  <div className="bg-slate-700 rounded p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-400">Health</span>
                      <span className="text-2xl font-bold text-red-400">{character.healthPoints}</span>
                    </div>
                    <div className="w-full bg-slate-600 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full"
                        style={{ width: `${(character.healthPoints / character.maxHealthPoints) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Max: {character.maxHealthPoints}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-700 rounded p-3">
                      <div className="text-xs text-slate-400 mb-1">Stamina</div>
                      <div className="text-xl font-bold text-yellow-400">{character.stamina}/{character.maxStamina}</div>
                    </div>
                    <div className="bg-slate-700 rounded p-3">
                      <div className="text-xs text-slate-400 mb-1">Defense</div>
                      <div className="text-xl font-bold text-blue-400">{character.defense}</div>
                    </div>
                  </div>

                  {character.maxManaPoints > 0 && (
                    <div className="bg-slate-700 rounded p-3">
                      <div className="text-xs text-slate-400 mb-1">Mana</div>
                      <div className="text-xl font-bold text-purple-400">{character.manaPoints}/{character.maxManaPoints}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Attributes Card */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-purple-400 mb-4 flex items-center justify-between cursor-pointer" onClick={() => toggleSection('attributes')}>
                <span>Attributes</span>
                <span className="text-sm">{expandedSections.attributes ? '▼' : '▶'}</span>
              </h2>
              {expandedSections.attributes && (
                <div className="space-y-2">
                  {attributeOrder.map(attrName => {
                    const attr = character.attributes[attrName];
                    return (
                      <div key={attrName} className="flex justify-between items-center bg-slate-700 rounded p-3">
                        <span className="text-slate-300 font-semibold text-sm">{attrName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-purple-400 font-bold w-6 text-right">{attr.score}</span>
                          <span className={`text-sm font-semibold w-8 text-right ${attr.modifier >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {attr.modifier >= 0 ? '+' : ''}{attr.modifier}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Skills, Equipment, Notes */}
          <div className="lg:col-span-2 space-y-6">
            {/* Skills Card */}
            {character.skills && character.skills.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h2 className="text-2xl font-bold text-purple-400 mb-4 flex items-center justify-between cursor-pointer" onClick={() => toggleSection('skills')}>
                  <span>Skills</span>
                  <span className="text-sm">{expandedSections.skills ? '▼' : '▶'}</span>
                </h2>
                {expandedSections.skills && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {character.skills.map((skill, idx) => (
                      <div key={idx} className="bg-slate-700 rounded p-3 border border-slate-600">
                        <div className="font-semibold text-slate-300 text-sm">{skill.name}</div>
                        <div className="text-xs text-slate-400 mt-1">Related: {skill.relatedAbility}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Equipment Card */}
            {character.equipment && character.equipment.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h2 className="text-2xl font-bold text-purple-400 mb-4 flex items-center justify-between cursor-pointer" onClick={() => toggleSection('equipment')}>
                  <span>Equipment</span>
                  <span className="text-sm">{expandedSections.equipment ? '▼' : '▶'}</span>
                </h2>
                {expandedSections.equipment && (
                  <div className="space-y-2">
                    {character.equipment.map((item) => (
                      <div key={item.id} className="flex justify-between items-center bg-slate-700 rounded p-3 border border-slate-600">
                        <div>
                          <div className="font-semibold text-slate-300">{item.name}</div>
                          {item.rarity !== 'common' && (
                            <div className={`text-xs mt-1 ${item.rarity === 'rare' ? 'text-blue-400' : item.rarity === 'legendary' ? 'text-orange-400' : 'text-slate-400'}`}>
                              {item.rarity}
                            </div>
                          )}
                        </div>
                        <span className="text-slate-400 text-sm">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes Card */}
            {character.notes && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h2 className="text-2xl font-bold text-purple-400 mb-4">Notes</h2>
                <p className="text-slate-300 whitespace-pre-line">{character.notes}</p>
              </div>
            )}

            {/* Class Features Card */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-purple-400 mb-4">Class Information</h2>
              <div className="space-y-3">
                <div className="bg-slate-700 rounded p-3">
                  <div className="text-slate-400 text-sm mb-1">Class</div>
                  <div className="font-semibold text-slate-300">{character.class}</div>
                </div>
                {character.subclass && (
                  <div className="bg-slate-700 rounded p-3">
                    <div className="text-slate-400 text-sm mb-1">Subclass</div>
                    <div className="font-semibold text-slate-300">{character.subclass}</div>
                  </div>
                )}
                <div className="bg-slate-700 rounded p-3">
                  <div className="text-slate-400 text-sm mb-1">Background</div>
                  <div className="font-semibold text-slate-300">{character.background || 'None specified'}</div>
                </div>
                <div className="bg-slate-700 rounded p-3">
                  <div className="text-slate-400 text-sm mb-1">Alignment</div>
                  <div className="font-semibold text-slate-300">{character.alignment}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterSheet;
