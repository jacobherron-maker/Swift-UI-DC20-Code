import React, { useState } from 'react';

const EquipmentView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRarity, setFilterRarity] = useState('all');

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-purple-400 mb-8">⚔️ Equipment</h1>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Search equipment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
          />
          <select
            value={filterRarity}
            onChange={(e) => setFilterRarity(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Rarities</option>
            <option value="common">Common</option>
            <option value="uncommon">Uncommon</option>
            <option value="rare">Rare</option>
            <option value="very rare">Very Rare</option>
            <option value="legendary">Legendary</option>
          </select>
        </div>
      </div>

      <div className="text-center py-12">
        <p className="text-gray-400">Equipment catalog coming soon!</p>
      </div>
    </div>
  );
};

export default EquipmentView;
