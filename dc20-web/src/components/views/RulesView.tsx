import React, { useState } from 'react';

interface Rule {
  id: string;
  name: string;
  category: string;
  description: string;
}

const RulesView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const rules: Rule[] = [];  // Placeholder - will be loaded from JSON

  const filteredRules = rules.filter(
    (rule) =>
      rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-purple-400 mb-8">DC20 Rules</h1>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
        <input
          type="text"
          placeholder="Search rules..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
        />
      </div>

      <div className="grid gap-4">
        {filteredRules.length > 0 ? (
          filteredRules.map((rule) => (
            <div key={rule.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-purple-500 transition-colors">
              <h3 className="text-lg font-semibold text-purple-300 mb-2">{rule.name}</h3>
              <p className="text-sm text-gray-400 mb-3">Category: {rule.category}</p>
              <p className="text-gray-300">{rule.description}</p>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400">No rules found. More content coming soon!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RulesView;
