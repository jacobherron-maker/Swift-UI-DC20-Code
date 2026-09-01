import React, { useState } from 'react';

const CombatView: React.FC = () => {
  const [combatRound, setCombatRound] = useState(1);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-purple-400">⚔️ Combat Tracker</h1>
        <div className="text-2xl font-bold text-yellow-400">Round {combatRound}</div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-blue-500">
          <h2 className="text-2xl font-bold text-blue-300 mb-4">Heroes</h2>
          <div className="text-gray-400">No combatants added yet</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-red-500">
          <h2 className="text-2xl font-bold text-red-300 mb-4">Enemies</h2>
          <div className="text-gray-400">No combatants added yet</div>
        </div>
      </div>

      <div className="flex gap-4 mt-8">
        <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors">
          ➕ Add Combatant
        </button>
        <button
          onClick={() => setCombatRound(Math.max(1, combatRound - 1))}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
        >
          ⬅️ Previous Round
        </button>
        <button
          onClick={() => setCombatRound(combatRound + 1)}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
        >
          Next Round ➡️
        </button>
      </div>
    </div>
  );
};

export default CombatView;
