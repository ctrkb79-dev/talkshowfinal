
import React, { useState, useEffect } from 'react';

interface ProgressBarProps {
  progress: number;
  isVisible: boolean;
  language: 'bn' | 'en';
  startTime: number | null;
  finalDuration: number | null;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, isVisible, language, startTime, finalDuration }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);

  const messagesBn = [
    "অডিও সিগন্যাল বিশ্লেষণ করা হচ্ছে...",
    "Google Gemini সার্ভারে সংযোগ স্থাপন...",
    "নিউরাল নেটওয়ার্ক প্রসেসিং শুরু...",
    "স্পেকট্রোগ্রাম বিশ্লেষণ চলছে...",
    "ভয়েস আইসোলেশন অ্যালগরিদম প্রয়োগ...",
    "শব্দ এবং বাক্যের গঠন যাচাই...",
    "কনটেক্সট এবং অর্থ বুঝার চেষ্টা...",
    "টাইমস্ট্যাম্প সিঙ্ক্রোনাইজেশন...",
    "প্রয়োজনীয় মেটাডেটা প্রসেসিং...",
    "ফাইনাল আউটপুট জেনারেট করা হচ্ছে..."
  ];

  const messagesEn = [
    "Analyzing audio signals...",
    "Connecting to Google Gemini servers...",
    "Starting neural network processing...",
    "Analyzing spectrogram data...",
    "Applying voice isolation algorithms...",
    "Verifying syntax and sentence structure...",
    "Understanding context and semantics...",
    "Synchronizing timestamps...",
    "Processing required metadata...",
    "Generating final output..."
  ];

  const currentMessages = language === 'bn' ? messagesBn : messagesEn;

  useEffect(() => {
    if (!isVisible || progress === 100) return;
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % currentMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isVisible, progress, currentMessages.length]);

  useEffect(() => {
    if (!isVisible || !startTime || progress === 100) return;
    
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, startTime, progress]);

  useEffect(() => {
    if (progress === 1) setElapsed(0);
  }, [progress]);

  // Auto-hide popup after 5 seconds
  useEffect(() => {
    if (finalDuration !== null && progress === 100) {
      setShowCompletion(true);
      const timer = setTimeout(() => {
        setShowCompletion(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [finalDuration, progress]);

  const formatTime = (secs: number) => {
    if (secs < 0) return "0m 00s";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}m ${s < 10 ? '0' + s : s}s`;
  };

  const calculateETA = () => {
    if (progress <= 0 || elapsed <= 0) return "--";
    const totalEstimated = (elapsed / progress) * 100;
    const remaining = totalEstimated - elapsed;
    return formatTime(remaining);
  };

  if (!isVisible) return null;

  // 1. PROCESSING STATE (Static Card)
  if (progress < 100) {
    return (
      <div className="glass-card rounded-2xl p-5 md:p-6 transition-all animate-in fade-in slide-in-from-top-6 relative overflow-hidden group border border-blue-500/20 shadow-2xl shadow-blue-900/10">
        
        {/* Background Animated Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent animate-[shimmer_3s_infinite] pointer-events-none"></div>

        <div className="flex justify-between items-end mb-3 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                </span>
                <span className="text-[10px] md:text-xs font-bold text-blue-400 uppercase tracking-widest">
                  {language === 'bn' ? 'প্রসেসিং চলছে' : 'AI Processing'}
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-slate-100 font-mono tracking-tighter">
                {progress}%
              </h3>
            </div>
            <div className="text-right">
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                 {language === 'bn' ? 'আনুমানিক বাকি' : 'Est. Remaining'}
               </div>
               <div className="text-base md:text-lg font-bold text-blue-400 font-mono">
                 {calculateETA()}
               </div>
            </div>
        </div>

        {/* Smart Progress Bar */}
        <div className="w-full bg-slate-800/50 rounded-full h-2.5 mb-5 relative overflow-hidden border border-white/5 backdrop-blur-sm">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 relative transition-all duration-500 ease-out shadow-[0_0_15px_rgba(59,130,246,0.6)]"
            style={{ width: `${progress}%` }}
          >
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-20"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
            <div className="flex items-center gap-3 bg-white/5 px-3 py-2.5 rounded-xl border border-white/5">
              <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400 animate-pulse">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              </div>
              <div className="overflow-hidden">
                  <div className="text-[9px] text-slate-400 uppercase font-bold">Current Task</div>
                  <div className="text-xs md:text-sm font-bold text-slate-200 truncate animate-fade-in-up key={messageIndex}">
                    {currentMessages[messageIndex]}
                  </div>
              </div>
            </div>

            <div className="flex justify-between items-center bg-white/5 px-3 py-2.5 rounded-xl border border-white/5">
              <span className="text-[9px] text-slate-400 uppercase font-bold">
                  {language === 'bn' ? 'সময় পার হয়েছে' : 'Elapsed Time'}
              </span>
              <span className="font-mono text-sm md:text-base font-bold text-slate-200">
                  {formatTime(elapsed)}
              </span>
            </div>
        </div>
        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          @keyframes fade-in-up {
              0% { opacity: 0; transform: translateY(5px); }
              100% { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up {
              animation: fade-in-up 0.3s ease-out forwards;
          }
        `}</style>
      </div>
    );
  }

  // 2. COMPLETED STATE (Floating Overlay)
  if (showCompletion && finalDuration !== null) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
         {/* Floating Centered Card */}
         <div className="glass-card bg-slate-900/90 backdrop-blur-2xl border border-emerald-500/30 p-8 rounded-[2rem] shadow-2xl shadow-emerald-500/20 flex flex-col items-center text-center min-w-[300px] max-w-sm animate-in zoom-in-95 fade-in duration-500 pointer-events-auto">
             
             <div className="relative mb-4">
               <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-[bounce_1s_ease-in-out_1] z-10 relative">
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
               </div>
               <div className="absolute inset-0 bg-emerald-500/30 rounded-full animate-ping"></div>
             </div>
             
             <h3 className="text-2xl md:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300 mb-2">
               {language === 'bn' ? 'কনভার্ট সফল হয়েছে!' : 'Conversion Complete!'}
             </h3>
             
             <div className="w-full h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent my-4"></div>

             <div className="flex flex-col items-center">
                <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold mb-1">
                  {language === 'bn' ? 'মোট সময় লেগেছে' : 'Total Execution Time'}
                </span>
                <span className="text-3xl md:text-4xl font-black text-emerald-400 font-mono tracking-tighter drop-shadow-sm">
                   {Math.floor(finalDuration / 60)}m {Math.floor(finalDuration % 60)}s
                </span>
             </div>
         </div>
      </div>
    );
  }

  return null;
};

export default ProgressBar;
