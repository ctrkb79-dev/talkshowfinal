
import React, { useState } from 'react';
import { Spotlight } from '../types';

interface Props {
  spotlights: Spotlight[];
  setSpotlights: React.Dispatch<React.SetStateAction<Spotlight[]>>;
  language: 'bn' | 'en';
  onNotify?: (msg: string, isError: boolean) => void;
}

const SpotlightManager: React.FC<Props> = ({ spotlights, setSpotlights, language, onNotify }) => {
  const [input, setInput] = useState("");

  const addSpotlight = () => {
    if (!input.trim()) return;
    setSpotlights(prev => [...prev, { id: Date.now().toString(), text: input.trim() }]);
    setInput("");
    onNotify?.(language === 'bn' ? 'স্পটলাইট যোগ করা হয়েছে' : 'Spotlight Added', false);
  };

  const removeSpotlight = (id: string) => {
    setSpotlights(prev => prev.filter(s => s.id !== id));
    onNotify?.(language === 'bn' ? 'স্পটলাইট মুছে ফেলা হয়েছে' : 'Spotlight Removed', true);
  };

  return (
    <div className="glass-card rounded-2xl p-6 transition-all">
      <h4 className="font-bold mb-4 flex items-center gap-2">
        <span className="p-1 bg-yellow-500/20 rounded">✨</span>
        {language === 'bn' ? 'স্পটলাইট শব্দ' : 'Spotlight Words'}
      </h4>

      <div className="flex gap-2 mb-4">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addSpotlight()}
          className="flex-1 glass-card bg-white/5 rounded-lg px-3 py-2 text-sm outline-none"
          placeholder={language === 'bn' ? 'শব্দ লিখুন...' : 'Add keyword...'}
        />
        <button 
          onClick={addSpotlight}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold"
        >
          {language === 'bn' ? 'যোগ করুন' : 'Add'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {spotlights.map(s => (
          <div key={s.id} className="glass-card bg-blue-500/10 px-3 py-1 rounded-full flex items-center gap-2 text-sm border border-blue-500/20">
            <span>{s.text}</span>
            <button onClick={() => removeSpotlight(s.id)} className="text-red-500 font-bold">×</button>
          </div>
        ))}
        {spotlights.length === 0 && (
          <p className="text-xs text-slate-400 italic">
            {language === 'bn' ? 'কোনো স্পটলাইট যোগ করা হয়নি' : 'No spotlights added'}
          </p>
        )}
      </div>
    </div>
  );
};

export default SpotlightManager;
