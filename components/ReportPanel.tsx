
import React, { useEffect, useState, useRef } from 'react';
import { ReportData, ReportHistoryItem } from '../types';
import HistoryLog from './HistoryLog';
import { playBeep } from '../services/audioService';

interface Props {
  report: ReportData;
  onDelete: () => void;
  language: 'bn' | 'en';
  isDarkMode: boolean;
  viewType: 'report' | 'summary';
  history: ReportHistoryItem[];
  onDeleteHistory: (id: string) => void;
  onLoad: (item: ReportHistoryItem) => void;
  onNotify?: (msg: string, isError: boolean) => void;
  beepEnabled?: boolean;
  audioRef?: React.RefObject<HTMLAudioElement>;
}

const ReportPanel: React.FC<Props> = ({ 
  report, onDelete, language, isDarkMode, viewType,
  history, onDeleteHistory, onLoad, onNotify, beepEnabled = true, audioRef
}) => {
  
  const [showPreview, setShowPreview] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [playingTimestamp, setPlayingTimestamp] = useState<string | null>(null);

  // Auto-scroll to this panel when it mounts or viewType changes
  useEffect(() => {
    const element = document.getElementById('report-div');
    if (element) {
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [viewType]);

  // Sync Audio State
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    const onPauseOrEnd = () => setPlayingTimestamp(null);
    audio.addEventListener('pause', onPauseOrEnd);
    audio.addEventListener('ended', onPauseOrEnd);

    return () => {
        audio.removeEventListener('pause', onPauseOrEnd);
        audio.removeEventListener('ended', onPauseOrEnd);
    };
  }, [audioRef]);

  // Close preview when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (previewRef.current && !previewRef.current.contains(event.target as Node)) {
        setShowPreview(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // isEmpty means the report hasn't been initialized properly
  const isEmpty = report.summary.totalDuration === "00:00" && report.details.length === 0;

  const handleTimestampClick = (time: string) => {
    if (!audioRef?.current) {
        onNotify?.(language === 'bn' ? 'অডিও প্লেয়ার পাওয়া যায়নি' : 'Audio Player Not Found', true);
        return;
    }

    if (playingTimestamp === time) {
        audioRef.current.pause();
        setPlayingTimestamp(null);
    } else {
        const parts = time.split(':').map(Number);
        let seconds = 0;
        if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        else seconds = parts[0] * 60 + parts[1];

        audioRef.current.currentTime = seconds;
        audioRef.current.play().catch(e => console.error("Play failed", e));
        setPlayingTimestamp(time);
    }
  };

  const downloadData = () => {
    if (isEmpty) {
        onNotify?.(language === 'bn' ? 'দয়া করে হিস্টোরি লোড করুন' : 'Please Load History', true);
        return;
    }
    if (report.details.length === 0) {
        onNotify?.(language === 'bn' ? 'ডাউনলোড করার মতো কোনো ডাটা নেই' : 'No data to download', true);
        return;
    }

    let content = "";
    if (viewType === 'summary') {
      content += language === 'bn' ? "সামারি রিপোর্ট\n" : "SUMMARY REPORT\n";
      content += "================\n\n";
      content += `${language === 'bn' ? 'মোট অডিও দৈর্ঘ্য' : 'Total Duration'}: ${report.summary.totalDuration}\n\n`;
      if (report.summary.keywordCounts) {
        content += language === 'bn' ? "স্পটলাইট বিশ্লেষণ:\n" : "SPOTLIGHT ANALYSIS:\n";
        content += "------------------\n";
        Object.entries(report.summary.keywordCounts).forEach(([keyword, count]) => {
            content += `${keyword}: ${count}\n`;
        });
        content += "------------------\n";
      }
      content += `${language === 'bn' ? 'সর্বমোট স্পটলাইট সংখ্যা' : 'Total Spotlight Count'}: ${report.summary.spotlightCount}\n\n`;
      content += `${language === 'bn' ? 'পাওয়া যাওয়ার সময়' : 'Found At Timestamps'}: ${report.summary.spotlightTimestamps.join(", ") || "N/A"}\n`;
    } else {
      content += language === 'bn' ? "বিস্তারিত রিপোর্ট\n" : "DETAILED REPORT\n";
      content += "================\n\n";
      if (report.details.length === 0) {
        content += language === 'bn' ? "কোনো তথ্য পাওয়া যায়নি।\n" : "No data found.\n";
      } else {
        report.details.forEach((item, index) => {
          const sentiment = item.sentiment === 'positive' ? (language === 'bn' ? 'ইতিবাচক' : 'Positive') : 
                            item.sentiment === 'negative' ? (language === 'bn' ? 'নেতিবাচক' : 'Negative') : 
                            (language === 'bn' ? 'নিরপেক্ষ' : 'Neutral');
          content += `${index + 1}. [${item.timestamp}] - ${sentiment}\n`;
          content += `   "${item.sentence}"\n\n`;
        });
      }
    }

    const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${viewType}_${Date.now()}.txt`;
    a.click();
    playBeep(beepEnabled);
  };

  const handleHistoryLoad = (item: ReportHistoryItem) => {
    onLoad(item);
    setShowPreview(false);
    setShowFullScreen(false);
  };

  const historyTitle = viewType === 'summary' 
    ? (language === 'bn' ? 'সামারি হিস্টোরি' : 'Summary History')
    : (language === 'bn' ? 'রিপোর্ট হিস্টোরি' : 'Report History');

  // Strict filtering: Only show history items that match the current view type
  const filteredHistory = history.filter(item => item.viewType === viewType);
  
  // Show all history items (scrollable)
  const recentHistory = filteredHistory;

  return (
    <>
      <div id="report-div" className="glass-card rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-white/20 h-full min-h-[600px] flex flex-col transition-all animate-in slide-in-from-bottom-12 duration-500 relative">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${viewType === 'summary' ? 'bg-indigo-500/10' : 'bg-emerald-500/10'}`}>
              {viewType === 'summary' ? (
                <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <h3 className={`text-2xl font-bold bg-clip-text text-transparent ${viewType === 'summary' ? 'bg-gradient-to-r from-indigo-400 to-blue-400' : 'bg-gradient-to-r from-emerald-400 to-teal-400'}`}>
              {viewType === 'summary' 
                ? (language === 'bn' ? 'সামারি রিপোর্ট' : 'Summary Report') 
                : (language === 'bn' ? 'বিস্তারিত রিপোর্ট' : 'Detailed Report')}
            </h3>
          </div>
          
          <div className="flex items-center gap-3">
              {/* Close Button */}
              <button 
                onClick={onDelete} 
                className="p-3 hover:bg-red-500/10 rounded-2xl text-red-500 transition-all active:scale-90 bg-white/10 shadow-sm border border-white/5"
                title={language === 'bn' ? 'বন্ধ করুন' : 'Close'}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-6">
          {isEmpty ? (
              <div className="flex flex-col items-center justify-center h-full animate-pulse text-slate-400 min-h-[200px]">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                      <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="font-bold text-xl mb-2">{language === 'bn' ? 'কোনো ডাটা নেই' : 'No Data Available'}</p>
                  <p className="text-sm opacity-60 max-w-xs text-center leading-relaxed">
                    {language === 'bn' 
                      ? 'নিচের হিস্টোরি আইকন থেকে পুরনো ডাটা লোড করুন।' 
                      : 'Load previous data from the history icon below.'}
                  </p>
              </div>
          ) : (
            <>
              {/* Summary View */}
              {viewType === 'summary' && (
                <div className="animate-in fade-in slide-in-from-top-4 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-card bg-white/5 p-8 rounded-[2rem] text-center border border-white/5 shadow-inner flex flex-col justify-center">
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">{language === 'bn' ? 'মোট অডিও দৈর্ঘ্য' : 'Total Duration'}</div>
                      <div className="text-4xl font-black text-white">{report.summary.totalDuration}</div>
                    </div>
                    <div className="glass-card bg-white/5 p-8 rounded-[2rem] text-center border border-white/5 shadow-inner flex flex-col justify-center">
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">{language === 'bn' ? 'সর্বমোট স্পটলাইট' : 'Total Spotlights'}</div>
                      <div className="text-5xl font-black text-indigo-400">{report.summary.spotlightCount}</div>
                    </div>
                  </div>
                  {report.summary.keywordCounts && (
                    <div className="glass-card bg-indigo-500/5 p-6 rounded-[2rem] border border-indigo-200/10">
                        <h4 className="text-center text-sm font-bold uppercase tracking-widest text-indigo-400 mb-4 border-b border-indigo-500/30 pb-2">
                            {language === 'bn' ? 'স্পটলাইট বিশ্লেষণ' : 'Spotlight Analysis'}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {Object.entries(report.summary.keywordCounts).map(([keyword, count]) => (
                                <div key={keyword} className="bg-white/10 p-3 rounded-xl flex justify-between items-center shadow-sm hover:bg-white/15 transition-all">
                                    <span className="font-medium text-slate-200 text-sm truncate mr-2" title={keyword}>{keyword}</span>
                                    <span className="bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-lg text-xs font-bold">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                  )}
                  <div className="glass-card bg-white/5 p-8 rounded-[2rem] text-center border border-white/5 shadow-inner">
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">{language === 'bn' ? 'পাওয়া যাওয়ার সময় (ক্লিক করে শুনুন)' : 'Found At Timestamps (Click to Play)'}</div>
                      <div className="flex flex-wrap justify-center gap-2 mt-2">
                        {report.summary.spotlightTimestamps.length > 0 ? report.summary.spotlightTimestamps.map((t, idx) => (
                          <button 
                            key={idx} 
                            onClick={() => handleTimestampClick(t)}
                            className={`px-3 py-1 text-xs font-black rounded-lg transition-all flex items-center gap-1 active:scale-95 ${
                                playingTimestamp === t 
                                ? 'bg-indigo-500 text-white animate-pulse shadow-indigo-500/30 shadow-lg' 
                                : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300'
                            }`}
                          >
                            {playingTimestamp === t ? (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                            ) : (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            )}
                            {t}
                          </button>
                        )) : <span className="text-slate-500 text-xs italic">N/A</span>}
                      </div>
                  </div>
                </div>
              )}

              {/* Report View */}
              {viewType === 'report' && (
                <div className="animate-in fade-in slide-in-from-top-4 space-y-6">
                  {report.details.length > 0 ? report.details.map((item, idx) => (
                    <div key={idx} className={`flex gap-6 items-start p-6 glass-card rounded-3xl transition-all border-l-4 ${
                      item.sentiment === 'positive' ? 'border-emerald-500 bg-emerald-500/10' :
                      item.sentiment === 'negative' ? 'border-rose-500 bg-rose-500/10' :
                      'border-slate-500 bg-slate-500/10'
                    }`}>
                      <span className="bg-white/10 shadow-sm w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 text-slate-200">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-black text-slate-400 bg-white/5 px-3 py-1 rounded-lg">
                            {item.timestamp}
                          </span>
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${
                            item.sentiment === 'positive' ? 'bg-emerald-500/20 text-emerald-400 font-bold' :
                            item.sentiment === 'negative' ? 'bg-rose-500/20 text-rose-400 font-bold' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {item.sentiment === 'positive' ? (language === 'bn' ? 'ইতিবাচক' : 'Positive') : 
                            item.sentiment === 'negative' ? (language === 'bn' ? 'নেতিবাচক' : 'Negative') : 
                            (language === 'bn' ? 'নিরপেক্ষ' : 'Neutral')}
                          </span>
                        </div>
                        <p className="text-sm md:text-base leading-relaxed text-slate-200 font-medium italic">
                          "{item.sentence}"
                        </p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-20 opacity-40 italic text-slate-400">
                      {language === 'bn' ? 'কোনো বিস্তারিত ডাটা পাওয়া যায়নি' : 'No detailed data found'}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer with Icons */}
        <div className="mt-auto pt-4 border-t border-white/10 flex items-center gap-3 relative">
            
            {/* History Button - Shows recent list */}
            <button 
              onClick={() => { setShowPreview(!showPreview); playBeep(beepEnabled); }}
              className={`p-4 rounded-2xl font-bold shadow-lg border border-white/10 transition-all active:scale-95 flex items-center justify-center gap-2 ${showPreview ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'}`}
              title={historyTitle}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>

            {/* Download Button */}
            <button 
              onClick={downloadData}
              className={`flex-1 py-4 text-white rounded-2xl font-black shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2 ${isEmpty ? 'bg-slate-700 opacity-50' : viewType === 'summary' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30'}`}
              title={language === 'bn' ? 'ডাউনলোড' : 'Download'}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span>{language === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
            </button>

            {/* FLOATING HISTORY PREVIEW (Pop-up) */}
            {showPreview && (
              <div 
                ref={previewRef}
                className="absolute bottom-full left-0 mb-4 w-64 glass-card rounded-2xl p-4 shadow-2xl border border-white/20 animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 z-50 bg-[#0f0518]"
              >
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/10">
                     <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{language === 'bn' ? 'সাম্প্রতিক' : 'Recent'}</span>
                     
                     {/* History Count & Expand Controls (Inside Popup) */}
                     {filteredHistory.length > 0 && (
                        <div className="flex items-center gap-2 bg-slate-800/80 p-1 pr-1.5 rounded-xl border border-white/10 backdrop-blur-md shadow-inner">
                            {/* Count Badge */}
                            <button 
                                onClick={() => setShowFullScreen(true)}
                                className="w-7 h-7 flex items-center justify-center bg-[#584093] hover:bg-[#6a4db0] text-white font-bold text-xs rounded-lg shadow-lg transition-all active:scale-95"
                            >
                                {filteredHistory.length}
                            </button>
                            
                            {/* Expand Icon */}
                            <button
                                onClick={() => setShowFullScreen(true)}
                                className="text-slate-400 hover:text-white p-0.5 transition-all active:scale-90"
                                title={language === 'bn' ? 'বড় করে দেখুন' : 'Expand View'}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                </svg>
                            </button>
                        </div>
                     )}
                  </div>
                  
                  {/* List Container - Scrollable, showing 2 items approx view height */}
                  <div className="space-y-2 mb-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                      {recentHistory.length > 0 ? recentHistory.map(item => (
                          <div 
                            key={item.id}
                            onClick={() => handleHistoryLoad(item)}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer border border-white/5 hover:border-white/10 transition-all active:scale-95"
                          >
                             <div className="text-sm font-bold text-slate-200 truncate">{item.fileName}</div>
                             <div className="text-[10px] text-slate-500 mt-1">{item.timestamp}</div>
                          </div>
                      )) : (
                          <div className="text-center py-4 text-xs text-slate-500 italic">
                             {language === 'bn' ? 'কোনো হিস্টোরি নেই' : 'No history found'}
                          </div>
                      )}
                  </div>
              </div>
            )}
        </div>
    </div>

    {/* FULL SCREEN EXPANDED HISTORY MODAL */}
    {showFullScreen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-0 md:p-6 animate-in fade-in duration-200">
            {/* Backdrop Tap to Close */}
            <div className="absolute inset-0" onClick={() => setShowFullScreen(false)}></div>
            
            {/* Modal Content */}
            <div className="glass-card w-full h-[100dvh] md:max-w-xl md:h-[80vh] rounded-none md:rounded-3xl p-6 md:p-8 relative z-10 flex flex-col shadow-2xl border-none md:border md:border-white/20">
                    
                    {/* Modal Header */}
                    <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4 shrink-0 mt-4 md:mt-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/20 rounded-xl">
                                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                                {historyTitle}
                            </h3>
                            <span className="bg-white/10 px-2 py-0.5 rounded text-xs font-bold text-slate-400">{filteredHistory.length}</span>
                        </div>
                        
                        <button 
                        onClick={() => setShowFullScreen(false)}
                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-slate-400 hover:bg-red-500/20 hover:text-red-500 transition-all active:scale-90"
                        >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    
                    {/* Full Scrollable List */}
                    <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 min-h-0">
                        <HistoryLog 
                            history={filteredHistory} 
                            onDelete={onDeleteHistory}
                            onLoad={handleHistoryLoad} 
                            language={language} 
                            title={historyTitle} 
                            variant="list"
                        />
                    </div>
            </div>
        </div>
    )}
    </>
  );
};

export default React.memo(ReportPanel);
