import React, { useState } from 'react';
import { rollDice, rollD20WithAdjustment } from '../../utils/gameUtils';
import type { DiceKind } from '../../types/models';
import { DiceKindValues } from '../../types/models';

const DiceRollerView: React.FC = () => {
  const [diceCount, setDiceCount] = useState(1);
  const [selectedDice, setSelectedDice] = useState<DiceKind>(DiceKindValues.D20);
  const [results, setResults] = useState<number[]>([]);
  const [d20Adjustment, setD20Adjustment] = useState(0);
  const [d20Result, setD20Result] = useState<any>(null);

  const rollStandard = () => {
    const result = rollDice(selectedDice, diceCount);
    setResults(result);
  };

  const rollD20 = () => {
    const result = rollD20WithAdjustment(d20Adjustment);
    setD20Result(result);
  };

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-purple-400 mb-8">🎲 Dice Roller</h1>

      <div className="grid grid-cols-2 gap-8">
        {/* Standard Roller */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-2xl font-bold text-purple-300 mb-6">Standard Roll</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Count</label>
              <input
                type="number"
                min="1"
                max="20"
                value={diceCount}
                onChange={(e) => setDiceCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Dice Type</label>
              <select
                value={selectedDice}
                onChange={(e) => setSelectedDice(parseInt(e.target.value) as DiceKind)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value={DiceKindValues.D2}>D2</option>
                <option value={DiceKindValues.D4}>D4</option>
                <option value={DiceKindValues.D6}>D6</option>
                <option value={DiceKindValues.D8}>D8</option>
                <option value={DiceKindValues.D10}>D10</option>
                <option value={DiceKindValues.D12}>D12</option>
                <option value={DiceKindValues.D20}>D20</option>
                <option value={DiceKindValues.D100}>D100</option>
              </select>
            </div>

            <button
              onClick={rollStandard}
              className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors"
            >
              Roll {diceCount}D{selectedDice}
            </button>

            {results.length > 0 && (
              <div className="bg-gray-700 rounded-lg p-4 mt-4">
                <p className="text-sm text-gray-400 mb-2">Results: {results.join(', ')}</p>
                <p className="text-2xl font-bold text-purple-300">Total: {results.reduce((a, b) => a + b, 0)}</p>
              </div>
            )}
          </div>
        </div>

        {/* D20 Roller */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-2xl font-bold text-purple-300 mb-6">D20 With Advantage/Disadvantage</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Adjustment</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={d20Adjustment}
                  onChange={(e) => setD20Adjustment(parseInt(e.target.value) || 0)}
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
                <p className="text-gray-400 py-2">
                  {d20Adjustment > 0 ? '✓ Advantage' : d20Adjustment < 0 ? '✗ Disadvantage' : 'Normal'}
                </p>
              </div>
            </div>

            <button
              onClick={rollD20}
              className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors"
            >
              Roll D20
            </button>

            {d20Result && (
              <div className="bg-gray-700 rounded-lg p-4 mt-4">
                <p className="text-sm text-gray-400 mb-2">Rolls: {d20Result.rolls.join(', ')}</p>
                <p className="text-lg text-gray-300 mb-2">Chosen: <span className="font-bold text-yellow-400">{d20Result.chosen}</span></p>
                <p className="text-2xl font-bold text-purple-300">Total: {d20Result.total}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiceRollerView;
