
import React, { useState } from 'react';

interface AudioRangeProps {
  start: string;
  end: string;
  setStart: (val: string) => void;
  setEnd: (val: string) => void;
  onConvert: () => void;
  isProcessing: boolean;
  language: 'bn' | 'en';
  getCurrentTime: () => string;
  conversionTime: number | null;
  estimatedTime: number | null; 
}

const AudioRange: React.FC<AudioRangeProps> = ({ 
  start, end, setStart, setEnd, 
  onConvert, isProcessing, language, getCurrentTime,
  conversionTime
}) => {
  const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);

  const formatSeconds = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    const toBangla = (num: number) => {
        const eng = num < 10 ? '0' + num : num.toString();
        if (language === 'en') return eng;
        return eng.replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);
    };
    return `${toBangla(m)}:${toBangla(s)}`;
  };

  const handleDialClick = (type: 'start' | 'end') => {
    setShowPicker(type);
  };

  const setTimeFromClock = (m: number, s: number) => {
    const timeStr = `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    if (showPicker === 'start') setStart(timeStr);
    else if (showPicker === 'end') setEnd(timeStr);
    setShowPicker(null);
  };

  return (
    <div id="audio-range-div" className="glass-card rounded-2xl p-6 transition-all border border-green-500/20 shadow-lg shadow-green-900/5 relative z-20">
      <h4 className="font-bold mb-4 flex items-center gap-2">
        <span className="p-1 bg-green-500/20 rounded">✂️</span>
        {language === 'bn' ? 'অডিও সীমা নির্বাচন (ঘড়ি)' : 'Select Audio Range (Clock)'}
      </h4>
      
      <div className="flex gap-4 mb-6">
        {/* Start Clock-style Picker */}
        <div className="flex-1 text-center">
          <label className="text-xs text-slate-500 block mb-2 font-bold uppercase tracking-widest">{language === 'bn' ? 'শুরু' : 'Start'}</label>
          <button 
            disabled={isProcessing}
            onClick={() => handleDialClick('start')}
            className="w-full aspect-square max-w-[120px] mx-auto rounded-full border-4 border-green-500/30 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-800 hover:scale-105 active:scale-95 transition-all shadow-xl relative group disabled:opacity-50"
          >
             <div className="absolute inset-2 border border-green-500/10 rounded-full animate-spin-slow group-hover:animate-none"></div>
             <span className="text-xl font-black font-mono text-green-600 dark:text-green-400">{start}</span>
             <span className="text-[10px] opacity-50 font-bold">SET</span>
          </button>
          <button 
            disabled={isProcessing}
            onClick={() => setStart(getCurrentTime())} 
            className="mt-3 text-[10px] font-bold text-green-500 hover:underline disabled:opacity-30"
          >
            📍 {language === 'bn' ? 'বর্তমান সময়' : 'Current'}
          </button>
        </div>

        {/* End Clock-style Picker */}
        <div className="flex-1 text-center">
          <label className="text-xs text-slate-500 block mb-2 font-bold uppercase tracking-widest">{language === 'bn' ? 'শেষ' : 'End'}</label>
          <button 
            disabled={isProcessing}
            onClick={() => handleDialClick('end')}
            className="w-full aspect-square max-w-[120px] mx-auto rounded-full border-4 border-red-500/30 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-800 hover:scale-105 active:scale-95 transition-all shadow-xl relative group disabled:opacity-50"
          >
             <div className="absolute inset-2 border border-red-500/10 rounded-full animate-spin-slow group-hover:animate-none"></div>
             <span className="text-xl font-black font-mono text-red-600 dark:text-red-400">{end}</span>
             <span className="text-[10px] opacity-50 font-bold">SET</span>
          </button>
          <button 
            disabled={isProcessing}
            onClick={() => setEnd(getCurrentTime())} 
            className="mt-3 text-[10px] font-bold text-red-500 hover:underline disabled:opacity-30"
          >
            📍 {language === 'bn' ? 'বর্তমান সময়' : 'Current'}
          </button>
        </div>
      </div>

      {/* Clock Modal Selection */}
      {showPicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card rounded-[2.5rem] p-8 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <h5 className="text-center font-black mb-6 uppercase tracking-widest text-slate-500">
                {showPicker === 'start' ? (language === 'bn' ? 'শুরুর সময়' : 'Start Time') : (language === 'bn' ? 'শেষের সময়' : 'End Time')}
            </h5>
            <div className="grid grid-cols-2 gap-4 max-h-[300px] overflow-y-auto custom-scrollbar p-2">
                {[0,1,2,3,4,5,6,7,8,9,10,15,20,30,45,60].map(m => (
                    <div key={m} className="space-y-2">
                        <div className="text-[10px] font-bold text-slate-400 text-center">{m} MIN</div>
                        <div className="grid grid-cols-1 gap-1">
                            {[0, 15, 30, 45].map(s => (
                                <button 
                                    key={s}
                                    onClick={() => setTimeFromClock(m, s)}
                                    className="py-2 text-sm font-bold bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-blue-500 hover:text-white transition-all"
                                >
                                    {m < 10 ? '0'+m : m}:{s < 10 ? '0'+s : s}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={() => setShowPicker(null)} className="w-full mt-6 py-3 bg-slate-200 dark:bg-slate-700 rounded-2xl font-bold">{language === 'bn' ? 'বন্ধ করুন' : 'Close'}</button>
          </div>
        </div>
      )}

      {/* Total Time Taken Display (No Estimated Time) */}
      {!isProcessing && conversionTime !== null && (
          <div className="flex flex-col items-center mb-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">
                  {language === 'bn' ? 'মোট সময় লেগেছে' : 'Total Time Taken'}
              </div>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono bg-emerald-100 dark:bg-emerald-900/30 px-4 py-1 rounded-lg">
                  {formatSeconds(conversionTime)} 
              </div>
          </div>
      )}

      <button 
        disabled={isProcessing}
        onClick={onConvert}
        className="w-full py-4 bg-gradient-to-r from-green-600 to-teal-600 text-white font-black text-lg rounded-2xl shadow-lg hover:shadow-green-500/30 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
      >
        {isProcessing && <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>}
        {language === 'bn' ? 'কনভার্ট করুন' : 'CONVERT'}
      </button>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default AudioRange;
