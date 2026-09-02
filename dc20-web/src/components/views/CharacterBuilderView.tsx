import React, { useState } from 'react';
import { useCampaignStore } from '../../store/campaignStore';
import type { Character, DC20Class, DC20Ancestry, DC20Attribute } from '../../types/models';
import { DC20Classes, DC20Ancestries, DC20Attributes } from '../../types/models';
import { generateUUID } from '../../utils/gameUtils';

type BuilderStep = 'attributes' | 'skills' | 'ancestry' | 'class' | 'equipment' | 'summary';

const CharacterBuilderView: React.FC<{ onCharacterCreated?: (character: Character) => void }> = ({ onCharacterCreated }) => {
  const { addCharacter, selectCharacter } = useCampaignStore();

  const [currentStep, setCurrentStep] = useState<BuilderStep>('attributes');
  const [characterName, setCharacterName] = useState('');

  // Step 1: Attributes (assign scores to 6 attributes)
  const [attributes, setAttributes] = useState<Record<DC20Attribute, number>>({
    [DC20Attributes.MIGHT]: 10,
    [DC20Attributes.INTELLECT]: 10,
    [DC20Attributes.PRESENCE]: 10,
    [DC20Attributes.AGILITY]: 10,
    [DC20Attributes.FORTITUDE]: 10,
    [DC20Attributes.ATTUNEMENT]: 10,
  });

  // Step 2: Skills (select skill proficiencies)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Step 3: Ancestry
  const [selectedAncestry, setSelectedAncestry] = useState<DC20Ancestry>('Human');

  // Step 4: Class
  const [selectedClass, setSelectedClass] = useState<DC20Class>('Wizard');

  // Step 5: Equipment
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const attributeNames = Object.values(DC20Attributes);
  const skillOptions = ['Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival'];
  const equipmentOptions = ['Leather Armor', 'Chain Mail', 'Plate Armor', 'Sword', 'Dagger', 'Bow', 'Staff', 'Shield', 'Backpack', 'Bedroll', 'Rope', 'Torch'];

  const calculateModifier = (score: number): number => Math.floor((score - 10) / 2);

  const handleAttributeChange = (attr: DC20Attribute, value: number) => {
    setAttributes({ ...attributes, [attr]: value });
  };

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleEquipmentToggle = (item: string) => {
    setSelectedEquipment(prev =>
      prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item]
    );
  };

  const calculateHealth = (): number => {
    const fortitudeModifier = calculateModifier(attributes[DC20Attributes.FORTITUDE]);
    // Base health for level 1 (can be expanded for higher levels)
    return 20 + fortitudeModifier * 4;
  };

  const calculateDefense = (): number => {
    const agilityModifier = calculateModifier(attributes[DC20Attributes.AGILITY]);
    return 10 + agilityModifier;
  };

  const finishBuilder = () => {
    if (!characterName.trim()) {
      alert('Please enter a character name');
      return;
    }

    const healthPoints = calculateHealth();
    const newCharacter: Character = {
      id: generateUUID(),
      name: characterName,
      level: 1,
      ancestry: selectedAncestry as DC20Ancestry,
      class: selectedClass as DC20Class,
      subclass: undefined,
      background: selectedSkills.join(', '),
      alignment: 'Neutral',
      attributes: {
        [DC20Attributes.MIGHT]: { name: DC20Attributes.MIGHT, score: attributes[DC20Attributes.MIGHT], modifier: calculateModifier(attributes[DC20Attributes.MIGHT]) },
        [DC20Attributes.INTELLECT]: { name: DC20Attributes.INTELLECT, score: attributes[DC20Attributes.INTELLECT], modifier: calculateModifier(attributes[DC20Attributes.INTELLECT]) },
        [DC20Attributes.PRESENCE]: { name: DC20Attributes.PRESENCE, score: attributes[DC20Attributes.PRESENCE], modifier: calculateModifier(attributes[DC20Attributes.PRESENCE]) },
        [DC20Attributes.AGILITY]: { name: DC20Attributes.AGILITY, score: attributes[DC20Attributes.AGILITY], modifier: calculateModifier(attributes[DC20Attributes.AGILITY]) },
        [DC20Attributes.FORTITUDE]: { name: DC20Attributes.FORTITUDE, score: attributes[DC20Attributes.FORTITUDE], modifier: calculateModifier(attributes[DC20Attributes.FORTITUDE]) },
        [DC20Attributes.ATTUNEMENT]: { name: DC20Attributes.ATTUNEMENT, score: attributes[DC20Attributes.ATTUNEMENT], modifier: calculateModifier(attributes[DC20Attributes.ATTUNEMENT]) },
      },
      healthPoints,
      maxHealthPoints: healthPoints,
      stamina: 10,
      maxStamina: 10,
      manaPoints: 0,
      maxManaPoints: 0,
      defense: calculateDefense(),
      injuries: [],
      skills: selectedSkills.map(name => ({ name, proficiency: 1, relatedAbility: DC20Attributes.INTELLECT })),
      equipment: selectedEquipment.map((name) => ({ id: generateUUID(), name, quantity: 1, weight: 0, rarity: 'common', effects: [] })),
      spells: [],
      maneuvers: [],
      notes,
    };

    addCharacter(newCharacter);
    selectCharacter(newCharacter.id);
    onCharacterCreated?.(newCharacter);
  };

  const canProceed = (): boolean => {
    if (currentStep === 'attributes') return characterName.trim().length > 0;
    return true;
  };

  const steps: BuilderStep[] = ['attributes', 'skills', 'ancestry', 'class', 'equipment', 'summary'];
  const currentStepIndex = steps.indexOf(currentStep);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-2">
            Create Your Character
          </h1>
          <p className="text-slate-400">Step {currentStepIndex + 1} of {steps.length}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 bg-slate-800 rounded-lg p-4">
          <div className="flex justify-between mb-4">
            {steps.map((step, idx) => (
              <div
                key={step}
                className={`flex-1 h-2 mx-1 rounded ${
                  idx <= currentStepIndex ? 'bg-purple-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Attributes</span>
            <span>Skills</span>
            <span>Ancestry</span>
            <span>Class</span>
            <span>Equipment</span>
            <span>Summary</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-slate-800 rounded-lg p-8 mb-8 border border-slate-700">
          {/* Step 1: Attributes */}
          {currentStep === 'attributes' && (
            <div>
              <h2 className="text-2xl font-bold text-purple-400 mb-6">Step 1: Attributes & Character Name</h2>
              <div className="mb-8">
                <label className="block text-slate-300 mb-2 font-semibold">Character Name *</label>
                <input
                  type="text"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  placeholder="Enter character name"
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <p className="text-slate-400 mb-6">Assign scores to your 6 core attributes (3-18). Higher is better!</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {attributeNames.map(attr => (
                  <div key={attr} className="bg-slate-700 rounded p-4 border border-slate-600">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-slate-300 font-semibold">{attr}</label>
                      <span className="text-purple-400 font-bold">Score: {attributes[attr as DC20Attribute]}</span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="18"
                      value={attributes[attr as DC20Attribute]}
                      onChange={(e) => handleAttributeChange(attr as DC20Attribute, parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-slate-400 mt-2">
                      Modifier: <span className={calculateModifier(attributes[attr as DC20Attribute]) >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {calculateModifier(attributes[attr as DC20Attribute]) >= 0 ? '+' : ''}{calculateModifier(attributes[attr as DC20Attribute])}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Skills */}
          {currentStep === 'skills' && (
            <div>
              <h2 className="text-2xl font-bold text-purple-400 mb-6">Step 2: Skills & Background</h2>
              <p className="text-slate-400 mb-6">Select up to 5 skills your character is trained in</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {skillOptions.map(skill => (
                  <label key={skill} className="flex items-center p-3 bg-slate-700 rounded border border-slate-600 cursor-pointer hover:border-purple-500 transition">
                    <input
                      type="checkbox"
                      checked={selectedSkills.includes(skill)}
                      onChange={() => handleSkillToggle(skill)}
                      className="mr-3"
                    />
                    <span className="text-slate-300">{skill}</span>
                    {selectedSkills.includes(skill) && <span className="ml-auto text-purple-400 font-bold">✓</span>}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Ancestry */}
          {currentStep === 'ancestry' && (
            <div>
              <h2 className="text-2xl font-bold text-purple-400 mb-6">Step 3: Choose Your Ancestry</h2>
              <p className="text-slate-400 mb-6">Select your character's ancestral heritage</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.values(DC20Ancestries).map(ancestry => (
                  <button
                    key={ancestry}
                    onClick={() => setSelectedAncestry(ancestry as DC20Ancestry)}
                    className={`p-4 rounded border-2 text-left transition ${
                      selectedAncestry === ancestry
                        ? 'border-purple-500 bg-purple-900/30 text-purple-300'
                        : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-purple-500'
                    }`}
                  >
                    <div className="font-semibold">{ancestry}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Class */}
          {currentStep === 'class' && (
            <div>
              <h2 className="text-2xl font-bold text-purple-400 mb-6">Step 4: Choose Your Class</h2>
              <p className="text-slate-400 mb-6">Select your character's combat/magic class</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.values(DC20Classes).map(cls => (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls as DC20Class)}
                    className={`p-4 rounded border-2 text-left transition ${
                      selectedClass === cls
                        ? 'border-purple-500 bg-purple-900/30 text-purple-300'
                        : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-purple-500'
                    }`}
                  >
                    <div className="font-semibold">{cls}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Equipment */}
          {currentStep === 'equipment' && (
            <div>
              <h2 className="text-2xl font-bold text-purple-400 mb-6">Step 5: Starting Equipment</h2>
              <p className="text-slate-400 mb-6">Select your starting equipment</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {equipmentOptions.map(item => (
                  <label key={item} className="flex items-center p-3 bg-slate-700 rounded border border-slate-600 cursor-pointer hover:border-purple-500 transition">
                    <input
                      type="checkbox"
                      checked={selectedEquipment.includes(item)}
                      onChange={() => handleEquipmentToggle(item)}
                      className="mr-3"
                    />
                    <span className="text-slate-300">{item}</span>
                  </label>
                ))}
              </div>
              <div>
                <label className="block text-slate-300 mb-2 font-semibold">Additional Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes about your character..."
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* Step 6: Summary */}
          {currentStep === 'summary' && (
            <div>
              <h2 className="text-2xl font-bold text-purple-400 mb-6">Step 6: Review Character</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-700 rounded p-4 border border-slate-600">
                  <h3 className="text-lg font-bold text-purple-300 mb-3">Basic Info</h3>
                  <div className="space-y-2 text-sm text-slate-300">
                    <div><span className="font-semibold">Name:</span> {characterName}</div>
                    <div><span className="font-semibold">Class:</span> {selectedClass}</div>
                    <div><span className="font-semibold">Ancestry:</span> {selectedAncestry}</div>
                    <div><span className="font-semibold">Level:</span> 1</div>
                  </div>
                </div>

                <div className="bg-slate-700 rounded p-4 border border-slate-600">
                  <h3 className="text-lg font-bold text-purple-300 mb-3">Combat Stats</h3>
                  <div className="space-y-2 text-sm text-slate-300">
                    <div><span className="font-semibold">HP:</span> {calculateHealth()}</div>
                    <div><span className="font-semibold">Defense:</span> {calculateDefense()}</div>
                    <div><span className="font-semibold">Stamina:</span> 10</div>
                  </div>
                </div>

                <div className="bg-slate-700 rounded p-4 border border-slate-600">
                  <h3 className="text-lg font-bold text-purple-300 mb-3">Attributes</h3>
                  <div className="space-y-1 text-xs text-slate-300">
                    {attributeNames.map(attr => (
                      <div key={attr}>
                        <span className="font-semibold">{attr}:</span> {attributes[attr as DC20Attribute]} ({calculateModifier(attributes[attr as DC20Attribute]) >= 0 ? '+' : ''}{calculateModifier(attributes[attr as DC20Attribute])})
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-700 rounded p-4 border border-slate-600">
                  <h3 className="text-lg font-bold text-purple-300 mb-3">Skills ({selectedSkills.length})</h3>
                  <div className="space-y-1 text-xs text-slate-300">
                    {selectedSkills.length > 0 ? (
                      selectedSkills.map(skill => <div key={skill}>• {skill}</div>)
                    ) : (
                      <div className="text-slate-500">No skills selected</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            onClick={() => {
              const idx = steps.indexOf(currentStep);
              if (idx > 0) setCurrentStep(steps[idx - 1]);
            }}
            disabled={currentStepIndex === 0}
            className="px-6 py-3 bg-slate-700 text-white rounded border border-slate-600 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            ← Previous
          </button>

          {currentStep !== 'summary' ? (
            <button
              onClick={() => {
                const idx = steps.indexOf(currentStep);
                if (idx < steps.length - 1 && canProceed()) {
                  setCurrentStep(steps[idx + 1]);
                }
              }}
              disabled={!canProceed()}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={finishBuilder}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded font-semibold hover:from-green-700 hover:to-emerald-700 transition"
            >
              Create Character
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CharacterBuilderView;
