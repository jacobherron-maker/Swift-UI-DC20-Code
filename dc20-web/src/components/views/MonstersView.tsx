import React, { useState } from 'react';

const MonstersView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-purple-400 mb-8">👹 Monsters</h1>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
        <input
          type="text"
          placeholder="Search monsters..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
        />
      </div>

      <div className="text-center py-12">
        <p className="text-gray-400">Monster reference coming soon!</p>
      </div>
    </div>
  );
};

export default MonstersView;
