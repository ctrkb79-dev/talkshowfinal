
import React, { useState, useRef } from 'react';

// Define a generic interface that matches both HistoryItem and ReportHistoryItem
interface GenericHistoryItem {
  id: string;
  timestamp: string;
  fileName: string;
  [key: string]: any; // Allow other properties
}

interface Props {
  history: GenericHistoryItem[];
  setHistory?: React.Dispatch<React.SetStateAction<any[]>>; 
  onDelete?: (id: string) => void;
  onLoad: (item: any) => void;
  language: 'bn' | 'en';
  title?: string;
  variant?: 'card' | 'list'; // Removed 'grid'
}

const HistoryLog: React.FC<Props> = ({ history, onDelete, onLoad, language, title, variant = 'list' }) => {
  
  const hasHistory = history && history.length > 0;
  
  // State to track which item is in "Delete Mode"
  const [deleteModeId, setDeleteModeId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const pressTimer = useRef<any>(null);

  // --- Long Press Logic ---
  const handlePressStart = (id: string) => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      setDeleteModeId(id);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 2000); // 2 Seconds
  };

  const handlePressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleView = (e: React.MouseEvent, item: any) => {
      e.stopPropagation();
      setDeleteModeId(null); 
      if (isExpanded) setIsExpanded(false);
      onLoad(item);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      setDeleteModeId(null);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (onDelete) {
          onDelete(id);
          setDeleteModeId(null); 
      }
  };

  // Helper to Group History Items by Month
  const groupHistoryByMonth = (items: GenericHistoryItem[]) => {
      const groups: { [key: string]: GenericHistoryItem[] } = {};
      
      items.forEach(item => {
          // Use the ID (which is a timestamp) for reliable date parsing
          const date = new Date(Number(item.id));
          const monthYear = date.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US', { month: 'long', year: 'numeric' });
          
          if (!groups[monthYear]) {
              groups[monthYear] = [];
          }
          groups[monthYear].push(item);
      });
      return groups;
  };

  // Shared List Rendering Logic with Grouping
  const renderList = () => {
    const groupedHistory = groupHistoryByMonth(history);
    const groupKeys = Object.keys(groupedHistory); 

    return (
      <div className="space-y-6 px-1 pb-4 relative">
        {groupKeys.map((month) => (
            <div key={month} className="animate-in fade-in slide-in-from-bottom-2 relative">
                {/* Month Header - Sticky Floating Pill with Glass Effect */}
                <div className="sticky top-0 z-30 flex justify-center py-2 pointer-events-none">
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 px-4 py-1.5 rounded-full shadow-lg ring-1 ring-black/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white drop-shadow-sm">
                            {month}
                        </span>
                    </div>
                </div>

                {/* The "Box" container for the month's items */}
                <div className="bg-white/[0.03] rounded-3xl p-2.5 border border-white/5 shadow-inner space-y-2.5 backdrop-blur-sm">
                    {groupedHistory[month].map((item, idx) => {
                        const isDeleteMode = deleteModeId === item.id;
                        // Sleek Gradient Item Styles
                        const itemStyle = idx % 2 === 0 
                            ? 'bg-gradient-to-r from-blue-900/10 to-slate-900/30 border-blue-500/10 hover:border-blue-500/30 hover:bg-blue-900/20' 
                            : 'bg-gradient-to-r from-purple-900/10 to-slate-900/30 border-purple-500/10 hover:border-purple-500/30 hover:bg-purple-900/20';

                        return (
                            <div 
                                key={item.id} 
                                onMouseDown={() => handlePressStart(item.id)}
                                onMouseUp={handlePressEnd}
                                onMouseLeave={handlePressEnd}
                                onTouchStart={() => handlePressStart(item.id)}
                                onTouchEnd={handlePressEnd}
                                onTouchMove={handlePressEnd}
                                className={`group p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex justify-between items-center shadow-lg hover:shadow-xl hover:-translate-y-0.5 relative overflow-hidden select-none ${itemStyle} ${isDeleteMode ? '!ring-2 !ring-red-500/50 !bg-red-500/10' : ''}`}
                            >
                                <div className="flex-1 mr-4 overflow-hidden">
                                <div className={`font-bold text-sm truncate transition-colors ${isDeleteMode ? 'text-red-300' : 'text-slate-200 group-hover:text-white'}`}>
                                    {item.fileName}
                                </div>
                                <div className="text-[10px] font-medium text-slate-500 mt-1.5 flex items-center gap-2 group-hover:text-slate-400 transition-colors">
                                    <span className="opacity-50">📅</span> {item.timestamp}
                                </div>
                                </div>
                                
                                <div className="flex gap-2 items-center">
                                {onDelete && isDeleteMode && (
                                    <button 
                                        onClick={(e) => handleDelete(e, item.id)}
                                        className="text-white text-[10px] font-bold bg-gradient-to-r from-red-600 to-pink-600 px-3 py-2 rounded-xl transition-all active:scale-90 animate-in fade-in zoom-in duration-200 shadow-md shadow-red-500/30 flex items-center gap-1"
                                        title="Delete"
                                    >
                                        {language === 'bn' ? 'মুছুন' : 'Del'}
                                    </button>
                                )}

                                {isDeleteMode ? (
                                    <button 
                                        onClick={handleCancelDelete}
                                        className="text-[10px] font-bold bg-slate-500/20 px-3 py-2 rounded-xl shadow-sm hover:bg-slate-500/30 transition-all active:scale-90 text-slate-300 animate-in fade-in"
                                    >
                                        {language === 'bn' ? 'বাতিল' : 'Cancel'}
                                    </button>
                                ) : (
                                    <button 
                                        onClick={(e) => handleView(e, item)}
                                        className="text-[10px] font-bold bg-white/5 px-3 py-2 rounded-xl shadow-sm hover:bg-white/20 hover:text-white transition-all active:scale-90 text-slate-400 border border-white/5"
                                    >
                                        {language === 'bn' ? 'দেখুন' : 'View'}
                                    </button>
                                )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        ))}
      </div>
    );
  };
  
  const renderEmpty = () => (
      <div className="flex flex-col items-center justify-center py-10 opacity-50">
           <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-3">
               <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           </div>
           <p className="text-sm italic text-slate-400">
               {language === 'bn' ? 'কোনো হিস্টোরি পাওয়া যায়নি' : 'No history found'}
           </p>
      </div>
  );

  // --- CARD VARIANT (Used in Main Dashboard) ---
  if (variant === 'card') {
      return (
          <>
            <div className="glass-card rounded-[2.5rem] p-6 md:p-8 relative border border-white/10 shadow-2xl">
                {/* Header inside Card */}
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/10 rounded-2xl">
                           <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                            {title || (language === 'bn' ? 'হিস্টোরি' : 'History')}
                        </h3>
                    </div>
                    
                    {/* Count acts as Expand Button */}
                    {hasHistory && (
                        <button 
                            onClick={() => setIsExpanded(true)}
                            className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 transition-all active:scale-95 flex items-center gap-2 border border-white/10 shadow-sm group"
                            title={language === 'bn' ? 'বড় করে দেখুন' : 'Expand View'}
                        >
                            <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-lg">{history.length}</span>
                            <span className="hidden sm:inline opacity-70 group-hover:opacity-100 transition-opacity">
                                {language === 'bn' ? 'সব দেখুন' : 'View All'}
                            </span>
                            <svg className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                        </button>
                    )}
                </div>

                {/* Collapsed View: Mobile ~3 items (260px), Desktop ~6 items (520px) */}
                <div className="overflow-y-auto custom-scrollbar pr-2 max-h-[260px] md:max-h-[520px]">
                    {hasHistory ? renderList() : renderEmpty()}
                </div>
            </div>

            {/* EXPANDED FULL SCREEN MODAL */}
            {isExpanded && hasHistory && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-0 md:p-6 animate-in fade-in duration-200">
                    {/* Backdrop Tap to Close */}
                    <div className="absolute inset-0" onClick={() => setIsExpanded(false)}></div>
                    
                    {/* Modal Content - Full Screen on Mobile (100dvh) */}
                    <div className="glass-card w-full h-[100dvh] md:max-w-xl md:h-[80vh] rounded-none md:rounded-3xl p-6 md:p-8 relative z-10 flex flex-col shadow-2xl border-none md:border md:border-white/20">
                         
                         {/* Modal Header */}
                         <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4 shrink-0 mt-4 md:mt-0">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/20 rounded-xl">
                                    <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                </div>
                                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                                    {title || (language === 'bn' ? 'সকল হিস্টোরি' : 'All History')}
                                </h3>
                                <span className="bg-white/10 px-2 py-0.5 rounded text-xs font-bold text-slate-400">{history.length}</span>
                              </div>
                              
                              <button 
                                onClick={() => setIsExpanded(false)}
                                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-slate-400 hover:bg-red-500/20 hover:text-red-500 transition-all active:scale-90"
                              >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                         </div>
                         
                         {/* Full Scrollable List - min-h-0 fixes flex scroll issue */}
                         <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 min-h-0">
                             {renderList()}
                         </div>
                    </div>
                </div>
            )}
          </>
      );
  }

  // --- LIST VARIANT (Default fallback) ---
  if (!hasHistory) return renderEmpty();

  return (
    <div className="transition-all">
      {renderList()}
    </div>
  );
};

export default React.memo(HistoryLog);
