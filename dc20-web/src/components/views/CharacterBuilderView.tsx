import React, { useState } from 'react';
import { useCampaignStore } from '../../store/campaignStore';
import type { Character, MasteryLevel } from '../../types/models';
import { DC20Classes, DC20Ancestries, AttributeSelectionMethods } from '../../types/models';
import { generateUUID } from '../../utils/gameUtils';

type BuilderStep = 'attributes' | 'skills' | 'ancestry' | 'class' | 'equipment' | 'summary';
type AttributeMethod = 'standard' | 'pointBuy' | 'diceRoller';

const StandardArray = { Might: 15, Agility: 14, Intelligence: 13, Charisma: 12 };

const CharacterBuilderView: React.FC<{ onCharacterCreated?: (character: Character) => void }> = ({ onCharacterCreated }) => {
  const { addCharacter, selectCharacter } = useCampaignStore();

  const [currentStep, setCurrentStep] = useState<BuilderStep>('attributes');
  const [characterName, setCharacterName] = useState('');

  // Step 1: Attributes - 3 selection methods
  const [attributeMethod, setAttributeMethod] = useState<AttributeMethod>('standard');
  const [attributes, setAttributes] = useState({
    'Might': 15,
    'Agility': 14,
    'Intelligence': 13,
    'Charisma': 12,
  });

  // Step 2: Skills/Mastery
  const [skillMasteries] = useState<Record<string, MasteryLevel>>({});
  const [tradeMasteries] = useState<Record<string, MasteryLevel>>({});

  // Step 3: Ancestry
  const [selectedAncestry, setSelectedAncestry] = useState<string>('Human');

  // Step 4: Class
  const [selectedClass, setSelectedClass] = useState<string>('Wizard');

  // Step 5: Equipment
  const [notes, setNotes] = useState('');

  const calculateModifier = (score: number): number => Math.floor((score - 10) / 2);

  const getPrimeModifier = (): number => {
    const scores = Object.values(attributes);
    const maxScore = Math.max(...scores);
    return calculateModifier(maxScore);
  };

  const rollDice = () => {
    const rolls = [];
    for (let i = 0; i < 4; i++) {
      const roll = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
      roll.sort((a, b) => b - a);
      rolls.push(roll[0] + roll[1] + roll[2]); // Sum of 3 highest
    }
    return rolls;
  };

  const handleAttributeMethod = (method: AttributeMethod) => {
    setAttributeMethod(method);
    if (method === 'standard') {
      setAttributes(StandardArray);
    } else if (method === 'diceRoller') {
      const rolls = rollDice();
      setAttributes({ Might: rolls[0], Agility: rolls[1], Intelligence: rolls[2], Charisma: rolls[3] });
    }
  };

  const handleAttributeChange = (attr: string, value: number) => {
    setAttributes(prev => ({ ...prev, [attr]: Math.max(3, Math.min(18, value)) }));
  };

  const finishBuilder = () => {
    if (!characterName.trim()) {
      alert('Please enter a character name');
      return;
    }

    const newCharacter: Character = {
      id: generateUUID(),
      name: characterName,
      level: 1,
      ancestry: selectedAncestry as any,
      class: selectedClass as any,
      background: '',
      alignment: 'Neutral',
      attributes: {
        'Might': { name: 'Might', score: attributes.Might, modifier: calculateModifier(attributes.Might) },
        'Agility': { name: 'Agility', score: attributes.Agility, modifier: calculateModifier(attributes.Agility) },
        'Intelligence': { name: 'Intelligence', score: attributes.Intelligence, modifier: calculateModifier(attributes.Intelligence) },
        'Charisma': { name: 'Charisma', score: attributes.Charisma, modifier: calculateModifier(attributes.Charisma) },
      } as any,
      primeModifier: getPrimeModifier(),
      skillMasteries,
      tradeMasteries,
      languages: [],
      healthPoints: 20,
      maxHealthPoints: 20,
      stamina: 10,
      maxStamina: 10,
      manaPoints: 0,
      maxManaPoints: 0,
      defense: 10 + calculateModifier(attributes.Agility),
      injuries: [],
      skills: [],
      equipment: [],
      spells: [],
      maneuvers: [],
      notes,
    };

    addCharacter(newCharacter);
    selectCharacter(newCharacter.id);
    onCharacterCreated?.(newCharacter);
  };

  const steps: BuilderStep[] = ['attributes', 'skills', 'ancestry', 'class', 'equipment', 'summary'];
  const currentStepIndex = steps.indexOf(currentStep);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-2">
            Create Your Character
          </h1>
          <p className="text-slate-400">Step {currentStepIndex + 1} of {steps.length}</p>
        </div>

        <div className="mb-8 bg-slate-800 rounded-lg p-4">
          <div className="flex justify-between mb-4">
            {steps.map((step, idx) => (
              <div key={step} className={`flex-1 h-2 mx-1 rounded ${idx <= currentStepIndex ? 'bg-purple-500' : 'bg-slate-700'}`} />
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

        <div className="bg-slate-800 rounded-lg p-8 mb-8 border border-slate-700">
          {currentStep === 'attributes' && (
            <div>
              <h2 className="text-2xl font-bold text-purple-400 mb-6">Step 1: Attributes & Prime Modifier</h2>
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

              <p className="text-slate-400 mb-6">Select your attribute assignment method:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {Object.entries(AttributeSelectionMethods).map(([key, method]) => (
                  <button
                    key={key}
                    onClick={() => handleAttributeMethod(key as AttributeMethod)}
                    className={`p-4 rounded border-2 transition ${
                      attributeMethod === key
                        ? 'border-purple-500 bg-purple-900/30 text-purple-300'
                        : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-purple-500'
                    }`}
                  >
                    <div className="font-semibold">{method}</div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.keys(StandardArray).map(attr => (
                  <div key={attr} className="bg-slate-700 rounded p-4 border border-slate-600">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-slate-300 font-semibold">{attr}</label>
                      <span className="text-purple-400 font-bold">Score: {attributes[attr as keyof typeof attributes]}</span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="18"
                      value={attributes[attr as keyof typeof attributes]}
                      onChange={(e) => handleAttributeChange(attr, parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-slate-400 mt-2">
                      Modifier: <span className={calculateModifier(attributes[attr as keyof typeof attributes]) >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {calculateModifier(attributes[attr as keyof typeof attributes]) >= 0 ? '+' : ''}{calculateModifier(attributes[attr as keyof typeof attributes])}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-purple-900/20 rounded border border-purple-500">
                <div className="font-semibold text-purple-300">Prime Modifier (Highest Attribute)</div>
                <div className="text-2xl font-bold text-purple-400 mt-2">
                  {getPrimeModifier() >= 0 ? '+' : ''}{getPrimeModifier()}
                </div>
              </div>
            </div>
          )}

          {currentStep === 'skills' && (
            <div>
              <h2 className="text-2xl font-bold text-purple-400 mb-6">Step 2: Skill & Trade Mastery</h2>
              <p className="text-slate-400 mb-6">Select mastery levels for skills and trades (Novice to Master)</p>
              <div className="text-slate-300 mb-4 text-sm">Skills & Trades follow the DC20 mastery system with level-based caps.</div>
            </div>
          )}

          {currentStep === 'ancestry' && (
            <div>
              <h2 className="text-2xl font-bold text-purple-400 mb-6">Step 3: Ancestry</h2>
              <p className="text-slate-400 mb-6">Select your ancestry and customize with available traits</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.values(DC20Ancestries).map(ancestry => (
                  <button
                    key={ancestry}
                    onClick={() => setSelectedAncestry(ancestry)}
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

          {currentStep === 'class' && (
            <div>
              <h2 className="text-2xl font-bold text-purple-400 mb-6">Step 4: Class</h2>
              <p className="text-slate-400 mb-6">Select your class</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.values(DC20Classes).map(cls => (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
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

          {currentStep === 'equipment' && (
            <div>
              <h2 className="text-2xl font-bold text-purple-400 mb-6">Step 5: Equipment</h2>
              <p className="text-slate-400 mb-6">Select starting equipment</p>
              <div>
                <label className="block text-slate-300 mb-2 font-semibold">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Character background and notes..."
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
                  rows={4}
                />
              </div>
            </div>
          )}

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
                  </div>
                </div>
                <div className="bg-slate-700 rounded p-4 border border-slate-600">
                  <h3 className="text-lg font-bold text-purple-300 mb-3">Attributes</h3>
                  <div className="space-y-1 text-xs text-slate-300">
                    {Object.entries(attributes).map(([attr, score]) => (
                      <div key={attr}><span className="font-semibold">{attr}:</span> {score} ({calculateModifier(score) >= 0 ? '+' : ''}{calculateModifier(score)})</div>
                    ))}
                    <div className="mt-2 pt-2 border-t border-slate-500"><span className="font-semibold">Prime:</span> {getPrimeModifier() >= 0 ? '+' : ''}{getPrimeModifier()}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

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
                if (idx < steps.length - 1 && characterName.trim()) {
                  setCurrentStep(steps[idx + 1]);
                }
              }}
              disabled={!characterName.trim()}
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
