import React, { useState } from 'react';

const PowersView: React.FC = () => {
  const [filterType, setFilterType] = useState<'spells' | 'maneuvers'>('spells');

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-purple-400 mb-8">Spells & Maneuvers</h1>

      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setFilterType('spells')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            filterType === 'spells'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          ✨ Spells
        </button>
        <button
          onClick={() => setFilterType('maneuvers')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            filterType === 'maneuvers'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          ⚔️ Maneuvers
        </button>
      </div>

      <div className="text-center py-12">
        <p className="text-gray-400">Content coming soon! The powers library will display spells and maneuvers here.</p>
      </div>
    </div>
  );
};

export default PowersView;
