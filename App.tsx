
import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import AudioInput, { AudioInputHandle } from './components/AudioInput';
import AudioInfoDisplay from './components/AudioInfoDisplay';
import ProgressBar from './components/ProgressBar';
import HistoryLog from './components/HistoryLog';
import OutputPanel, { OutputPanelHandle } from './components/OutputPanel';
import ReportPanel from './components/ReportPanel';
import Footer from './components/Footer';
import { AudioInfo, Spotlight, HistoryItem, TranscriptionPart, ReportData, ReportHistoryItem } from './types';
import { playBeep, sliceAudioBlob, calculateChunks } from './services/audioService';
import { transcribeAudio } from './services/geminiService';
import { useTheme } from './hooks/useTheme';
import { 
  subscribeToHistory, 
  addHistoryItemToFirebase, 
  deleteHistoryItemFromFirebase,
  subscribeToSpotlights,
  saveSpotlightsToFirebase,
  subscribeToReportHistory,
  addReportHistoryToFirebase,
  deleteReportHistoryFromFirebase
} from './services/firebaseService';

const App: React.FC = () => {
  // Use custom hook for 3-way theme support
  const { theme, toggleTheme } = useTheme();
  
  // Backward compatibility for components expecting boolean 'isDarkMode'
  // Dark mode is strictly 'dark'. Office mode is technically a 'light' variation for high contrast.
  const isDarkMode = theme === 'dark';

  const [language, setLanguage] = useState<'bn' | 'en'>('bn');
  const [beepEnabled, setBeepEnabled] = useState(true);
  const [showNotification, setShowNotification] = useState<{msg: string, isError: boolean} | null>(null);

  const [audioInfo, setAudioInfo] = useState<AudioInfo | null>(null);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Spotlight State with Lazy Initialization for Persistence
  const [spotlights, setSpotlights] = useState<Spotlight[]>(() => {
    try {
      const saved = localStorage.getItem('spotlights');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  
  // MAIN History State (Transcriptions)
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // REPORT History State (Summaries & Reports)
  const [reportHistory, setReportHistory] = useState<ReportHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('report_history');
      const parsed = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed)) {
         // Sort by ID descending (Newest first)
         return parsed.sort((a: ReportHistoryItem, b: ReportHistoryItem) => Number(b.id) - Number(a.id));
      }
      return [];
    } catch (e) {
      return [];
    }
  });
  
  const [currentOutput, setCurrentOutput] = useState<TranscriptionPart[]>([]);
  const [activeView, setActiveView] = useState<'report' | 'summary' | null>(null);
  const [currentReport, setCurrentReport] = useState<ReportData | null>(null);

  const [showGlobalTop, setShowGlobalTop] = useState(false);
  const [showGlobalBottom, setShowGlobalBottom] = useState(false);
  
  // Auto-hide Scroll Nav State
  const [isScrollNavVisible, setIsScrollNavVisible] = useState(false);
  const scrollNavTimeout = useRef<any>(null);

  // Time tracking states
  const [startTime, setStartTime] = useState<number | null>(null);
  const [finalDuration, setFinalDuration] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const abortRef = useRef(false);
  
  // Refs for Shortcut Handling
  const audioInputRef = useRef<AudioInputHandle>(null);
  const outputPanelRef = useRef<OutputPanelHandle>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  // --- RETENTION POLICY LOGIC (365 DAYS / 1 YEAR) ---
  const cleanupOldData = (items: any[], type: 'history' | 'report') => {
      const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const validItems: any[] = [];
      let hasDeleted = false;

      items.forEach(item => {
          // ID is usually the timestamp of creation
          const itemTime = Number(item.id);
          if (now - itemTime > ONE_YEAR_MS) {
              // Item is older than 1 year, delete it
              if (type === 'history') deleteHistoryItemFromFirebase(item.id);
              else deleteReportHistoryFromFirebase(item.id);
              hasDeleted = true;
          } else {
              validItems.push(item);
          }
      });

      if (hasDeleted) {
          console.log(`Cleaned up old ${type} items (>1 year).`);
      }
      return validItems;
  };

  // Persistence Effect for Spotlights (Local + Firebase)
  useEffect(() => {
    // 1. Save to Local Storage (Instant)
    localStorage.setItem('spotlights', JSON.stringify(spotlights));
    // 2. Save to Firebase (Cloud Persistence)
    if (spotlights.length > 0) {
        saveSpotlightsToFirebase(spotlights);
    }
  }, [spotlights]);

  // Persistence for Report History
  useEffect(() => {
    localStorage.setItem('report_history', JSON.stringify(reportHistory));
  }, [reportHistory]);

  useEffect(() => {
    // 1. Load History from LocalStorage
    const savedHistory = localStorage.getItem('transcription_history');
    if (savedHistory) {
        try {
            let parsed = JSON.parse(savedHistory);
            // Run Cleanup on Local Data immediately
            parsed = cleanupOldData(parsed, 'history');
            parsed.sort((a: HistoryItem, b: HistoryItem) => Number(b.id) - Number(a.id));
            setHistory(parsed);
        } catch (e) {
            console.error("Error parsing history", e);
            setHistory([]);
        }
    }

    // 2. Subscribe to Firebase History
    const unsubscribeHistory = subscribeToHistory((data) => {
        if (data) {
            // Run cleanup on incoming server data
            const cleanData = cleanupOldData(data, 'history');
            setHistory(cleanData);
            localStorage.setItem('transcription_history', JSON.stringify(cleanData));
        }
    });

    // 3. Subscribe to Firebase Report History
    const unsubscribeReports = subscribeToReportHistory((data) => {
        if (data) {
             // Run cleanup on incoming server data
            const cleanData = cleanupOldData(data, 'report');
            setReportHistory(cleanData as ReportHistoryItem[]); // Casting for TS
            localStorage.setItem('report_history', JSON.stringify(cleanData));
        }
    });

    // 4. Subscribe to Firebase Spotlights
    const unsubscribeSpotlights = subscribeToSpotlights((data) => {
        if (data && data.length > 0) {
            setSpotlights(data);
            localStorage.setItem('spotlights', JSON.stringify(data));
        } else {
            const local = localStorage.getItem('spotlights');
            if (local) {
                const parsed = JSON.parse(local);
                if (parsed.length > 0) {
                    saveSpotlightsToFirebase(parsed);
                }
            }
        }
    });

    const handleWindowScroll = () => {
      setShowGlobalTop(window.scrollY > 300);
      setShowGlobalBottom((window.innerHeight + window.scrollY) < document.documentElement.scrollHeight - 100);
      
      // Auto-Show Buttons on Scroll
      setIsScrollNavVisible(true);
      if (scrollNavTimeout.current) clearTimeout(scrollNavTimeout.current);
      
      // Auto-Hide after 3 seconds of inactivity
      scrollNavTimeout.current = setTimeout(() => {
        setIsScrollNavVisible(false);
      }, 3000);
    };

    window.addEventListener('scroll', handleWindowScroll);
    return () => {
        window.removeEventListener('scroll', handleWindowScroll);
        unsubscribeHistory(); 
        unsubscribeReports();
        unsubscribeSpotlights();
        if (scrollNavTimeout.current) clearTimeout(scrollNavTimeout.current);
    };
  }, []);

  // --- GLOBAL KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
        
        if (isTyping && !e.altKey && !e.ctrlKey && !e.key.startsWith('F')) return;

        if (e.altKey) {
            switch(e.key.toLowerCase()) {
                case 'f': e.preventDefault(); audioInputRef.current?.triggerBrowse(); break;
                case 'r': e.preventDefault(); audioInputRef.current?.triggerRecord(); break;
                case 'k': e.preventDefault(); outputPanelRef.current?.focusSpotlight(); break;
                case '/': e.preventDefault(); outputPanelRef.current?.focusSearch(); break;
                case 'd': e.preventDefault(); outputPanelRef.current?.toggleDownloadMenu(); break;
                case 'h': e.preventDefault(); historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
                case 'arrowup': e.preventDefault(); scrollToGlobalTop(); break;
                case 'arrowdown': e.preventDefault(); scrollToGlobalBottom(); break;
            }
        }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  const notify = (msg: string, isError: boolean = false) => {
    setShowNotification({ msg, isError });
    playBeep(beepEnabled);
    setTimeout(() => setShowNotification(null), 2500);
  };

  const handleAudioUpload = (info: AudioInfo) => {
    if (audioInfo?.url) URL.revokeObjectURL(audioInfo.url);
    setAudioInfo(info);
    setCurrentOutput([]);
    setActiveView(null);
    setCurrentReport(null);
    setProgress(0);
    setFinalDuration(null);
    setStartTime(null);
    notify(language === 'bn' ? 'অডিও লোড করা হয়েছে' : 'Audio Loaded Successfully');
    setTimeout(() => startAutoTranscription(info), 100);
  };

  const generateSmartFileName = (parts: TranscriptionPart[], originalName: string) => {
     if (!parts || parts.length === 0) return originalName;
     const sampleText = parts.slice(0, 3).map(p => p.text).join(' ');
     const cleanText = sampleText.replace(/[^\w\s\u0980-\u09FF]/gi, '').replace(/\s+/g, ' ').trim();
     if (cleanText.length < 3) return originalName;
     const words = cleanText.split(' ');
     let smartTitle = words.slice(0, 7).join(' ');
     if (smartTitle.length > 40) smartTitle = smartTitle.substring(0, 40) + '...';
     return smartTitle || originalName;
  };

  const startAutoTranscription = async (info: AudioInfo) => {
    if (isProcessing) return;
    abortRef.current = false;
    setIsProcessing(true);
    setProgress(1);
    setCurrentOutput([]);
    
    setTimeout(() => {
        setShowNotification({ msg: language === 'bn' ? 'প্রসেসিং শুরু হচ্ছে...' : 'Processing Started...', isError: false });
        playBeep(beepEnabled); 
        setTimeout(() => setShowNotification(null), 2500);
    }, 2000);
    
    const startTimestamp = Date.now();
    setStartTime(startTimestamp);
    setFinalDuration(null);
    
    try {
      const targetChunkSize = 25 * 1024 * 1024;
      const numChunks = calculateChunks(info.blob.size, targetChunkSize);
      
      await new Promise(r => setTimeout(r, 1200));

      const allParts: TranscriptionPart[] = [];
      
      for (let i = 0; i < numChunks; i++) {
        if (abortRef.current) break;

        const chunkNum = i + 1;
        setProgress(Math.floor((i / numChunks) * 100) + 2);

        const startPct = (i / numChunks) * 100;
        const endPct = ((i + 1) / numChunks) * 100;
        const chunkStartTime = info.duration * (startPct / 100);

        const chunkBlob = await sliceAudioBlob(info.blob, startPct, endPct);
        
        if (abortRef.current) break;
        
        const reader = new FileReader();
        const base64String: string = await new Promise((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(chunkBlob);
        });

        if (abortRef.current) break;

        const result = await transcribeAudio(
          base64String, 
          info.type, 
          spotlights.map(s => s.text), 
          `Part ${chunkNum}`,
          chunkStartTime 
        );

        if (abortRef.current) break;

        allParts.push(...result.transcription);
        setCurrentOutput([...allParts]);
        
        setProgress(Math.floor(((i + 1) / numChunks) * 100));
        await new Promise(r => setTimeout(r, 500));
      }

      if (abortRef.current) {
        setStartTime(null);
        notify(language === 'bn' ? 'প্রসেসিং বাতিল করা হয়েছে' : 'Processing Cancelled', true);
      } else {
        setProgress(100);
        
        const durationInSeconds = (Date.now() - startTimestamp) / 1000;
        setFinalDuration(durationInSeconds);

        const report = generateDynamicReport(allParts, spotlights);
        setCurrentReport(report);

        const smartName = generateSmartFileName(allParts, info.name);

        const newItem: HistoryItem = {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleString(),
            fileName: smartName,
            output: allParts
        };

        const currentLocal = JSON.parse(localStorage.getItem('transcription_history') || '[]');
        const updatedLocal = [newItem, ...currentLocal];
        localStorage.setItem('transcription_history', JSON.stringify(updatedLocal));
        setHistory(updatedLocal);

        addHistoryItemToFirebase(newItem);

        notify(language === 'bn' ? "ট্রান্সক্রিপশন সম্পন্ন!" : "Transcription Complete!");

        setTimeout(() => {
          const outputPanel = document.getElementById('output-panel');
          if (outputPanel) {
            outputPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 5000);
      }

    } catch (error) {
      console.error(error);
      setStartTime(null);
      notify(language === 'bn' ? "দুঃখিত, কোনো সমস্যা হয়েছে" : "Error occurred", true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleProcess = () => {
    if (isProcessing) {
      abortRef.current = true;
      notify(language === 'bn' ? "থামানো হচ্ছে..." : "Stopping...");
    } else {
      if (audioInfo) {
        startAutoTranscription(audioInfo);
      }
    }
  };

  const handleUpdateOutput = (index: number, newText: string) => {
    const newOutput = [...currentOutput];
    if (newOutput[index]) {
      newOutput[index].text = newText;
      setCurrentOutput(newOutput);
    }
  };

  const generateDynamicReport = (output: TranscriptionPart[], currentSpotlights: Spotlight[]): ReportData => {
    let count = 0;
    const timestamps = new Set<string>();
    const keywords = currentSpotlights.map(s => s.text.trim().toLowerCase()).filter(s => s);
    const keywordCounts: {[key: string]: number} = {};
    keywords.forEach(kw => keywordCounts[kw] = 0);

    const details: any[] = [];

    output.forEach(part => {
      let foundInPart = false;
      keywords.forEach(kw => {
        if (part.text.toLowerCase().includes(kw)) { 
          count++; 
          timestamps.add(part.time);
          keywordCounts[kw]++;
          foundInPart = true;
        }
      });
      if (foundInPart) {
        details.push({
          timestamp: part.time,
          sentence: part.text,
          sentiment: part.sentiment || 'neutral'
        });
      }
    });

    return { 
      summary: { 
        totalDuration: output.length > 0 ? output[output.length - 1]?.time : "00:00", 
        spotlightCount: count, 
        spotlightTimestamps: Array.from(timestamps),
        keywordCounts
      }, 
      details: details 
    };
  };

  const handleViewToggle = (view: 'report' | 'summary') => {
    const hasOutput = currentOutput.length > 0;
    const hasSpotlights = spotlights.length > 0;

    if (hasOutput) {
      if (!hasSpotlights) {
        notify(language === 'bn' ? "আগে স্পটলাইট শব্দ যোগ করুন!" : "Add spotlight words first!", true);
        return;
      }
      const report = generateDynamicReport(currentOutput, spotlights);
      setCurrentReport(report);
      setActiveView(view);
      
      if (report.summary.spotlightCount > 0) {
          const namePrefix = view === 'summary' 
            ? (language === 'bn' ? 'সামারি' : 'Summary') 
            : (language === 'bn' ? 'রিপোর্ট' : 'Report');

          const smartName = generateSmartFileName(currentOutput, audioInfo?.name || 'Unknown');

          const newItem: ReportHistoryItem = {
              id: Date.now().toString(),
              timestamp: new Date().toLocaleString(),
              fileName: `${namePrefix}: ${smartName}`,
              reportData: report,
              viewType: view
          };

          setReportHistory(prev => [newItem, ...prev]);
          addReportHistoryToFirebase(newItem);
          
          notify(language === 'bn' ? 'রিপোর্ট জেনারেট ও সেভ হয়েছে' : 'Report Generated & Saved');
      } else {
          notify(language === 'bn' ? 'কোনো মিল পাওয়া যায়নি (সেভ করা হয়নি)' : 'No matches found (Not Saved)', true);
      }

    } 
    else {
      const emptyReport: ReportData = {
        summary: { totalDuration: "00:00", spotlightCount: 0, spotlightTimestamps: [] },
        details: []
      };
      setCurrentReport(emptyReport);
      setActiveView(view);
      notify(language === 'bn' ? 'হিস্টোরি লোড করুন' : 'Load History');
    }
  };
  
  const handleMainHistoryLoad = (item: HistoryItem) => {
     setCurrentOutput(item.output);
     const report = generateDynamicReport(item.output, spotlights);
     setCurrentReport(report);
     notify(language === 'bn' ? 'হিস্টোরি লোড করা হয়েছে' : 'History Loaded');

     // Scroll to output
     setTimeout(() => {
        const element = document.getElementById('output-panel');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
     }, 100);
  };

  const handleDeleteHistory = (id: string) => {
     const updated = history.filter(h => h.id !== id);
     localStorage.setItem('transcription_history', JSON.stringify(updated));
     setHistory(updated);
     deleteHistoryItemFromFirebase(id);
     notify(language === 'bn' ? 'হিস্টোরি মুছে ফেলা হয়েছে' : 'History Deleted', true);
  };

  const handleDeleteReportHistory = (id: string) => {
    const updated = reportHistory.filter(h => h.id !== id);
    setReportHistory(updated);
    localStorage.setItem('report_history', JSON.stringify(updated));
    deleteReportHistoryFromFirebase(id);
    notify(language === 'bn' ? 'মুছে ফেলা হয়েছে' : 'Deleted', true);
  };

  const handleLoadReportFromHistory = (item: ReportHistoryItem) => {
      setCurrentReport(item.reportData);
      setActiveView(item.viewType);
      notify(language === 'bn' ? 'রিপোর্ট লোড হয়েছে' : 'Report Loaded');
  };

  const scrollToGlobalTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollToGlobalBottom = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : (theme === 'office' ? 'office-mode' : 'bg-[#0f0518] text-slate-100')}`}>
      
      {showNotification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
           <div className={`glass-card backdrop-blur-xl px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 border ${showNotification.isError ? 'border-red-500/30 bg-red-500/10' : 'border-blue-500/30 bg-blue-500/10'}`}>
              <div className={`w-2 h-2 rounded-full ${showNotification.isError ? 'bg-red-500 animate-pulse' : 'bg-blue-400'}`}></div>
              <span className={`text-xs font-black uppercase tracking-widest ${showNotification.isError ? 'text-red-400' : 'text-blue-100'}`}>
                {showNotification.msg}
              </span>
           </div>
        </div>
      )}

      {/* Global Scroll Nav - Auto Hide on Inactivity */}
      <div 
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none"
        onMouseEnter={() => {
            setIsScrollNavVisible(true);
            if (scrollNavTimeout.current) clearTimeout(scrollNavTimeout.current);
        }}
        onMouseLeave={() => {
            if (scrollNavTimeout.current) clearTimeout(scrollNavTimeout.current);
            scrollNavTimeout.current = setTimeout(() => setIsScrollNavVisible(false), 3000);
        }}
      >
        <button 
          onClick={scrollToGlobalTop}
          className={`w-12 h-12 bg-white/10 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all duration-300 border-2 border-white/20 backdrop-blur-md ${showGlobalTop && isScrollNavVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-10 pointer-events-none'}`}
          title="Page Top (Alt + Up)"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
        </button>
        <button 
          onClick={scrollToGlobalBottom}
          className={`w-12 h-12 bg-white/10 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all duration-300 border-2 border-white/20 backdrop-blur-md ${showGlobalBottom && isScrollNavVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-10 pointer-events-none'}`}
          title="Page Bottom (Alt + Down)"
        >
           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7-7-7m7 7V3" /></svg>
        </button>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <Header 
            theme={theme}
            toggleTheme={toggleTheme}
            language={language} 
            setLanguage={setLanguage} 
            beepEnabled={beepEnabled} 
            setBeepEnabled={setBeepEnabled} 
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-10">
          <div className="flex flex-col gap-8">
            <AudioInput 
                ref={audioInputRef}
                onUpload={handleAudioUpload} 
                language={language} 
                isProcessing={isProcessing} 
                onNotify={notify} 
            />
            {audioInfo && (
              <>
                <AudioInfoDisplay 
                  info={audioInfo} 
                  audioRef={audioRef} 
                  onDelete={() => {
                    setAudioInfo(null);
                    notify(language === 'bn' ? 'অডিও মুছে ফেলা হয়েছে' : 'Audio Removed', true);
                  }} 
                  language={language} 
                  isProcessing={isProcessing}
                  isDarkMode={isDarkMode}
                  onToggleProcess={handleToggleProcess}
                  hasCompleted={progress === 100}
                  onNotify={notify}
                />
                <ProgressBar 
                  progress={progress} 
                  isVisible={isProcessing || progress === 100} 
                  language={language} 
                  startTime={startTime}
                  finalDuration={finalDuration}
                />
              </>
            )}
            
            <div ref={historyRef}>
                <HistoryLog 
                  history={history} 
                  onDelete={handleDeleteHistory}
                  onLoad={handleMainHistoryLoad} 
                  language={language} 
                  title={language === 'bn' ? 'ট্রান্সক্রিপশন হিস্টোরি' : 'Transcription History'}
                  variant="card"
                />
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <OutputPanel 
              ref={outputPanelRef}
              output={currentOutput} 
              onViewToggle={handleViewToggle} 
              spotlights={spotlights} 
              setSpotlights={setSpotlights} 
              language={language} 
              onDelete={() => {
                setCurrentOutput([]);
                setCurrentReport(null);
                setActiveView(null);
                notify(language === 'bn' ? 'আউটপুট মুছে ফেলা হয়েছে' : 'Output Cleared', true);
              }} 
              isDarkMode={isDarkMode} 
              isProcessing={isProcessing}
              audioRef={audioRef}
              onNotify={notify}
              onUpdate={handleUpdateOutput} 
              beepEnabled={beepEnabled} 
            />
            {activeView && currentReport && (
              <ReportPanel 
                report={currentReport} 
                onDelete={() => {
                  setActiveView(null);
                  setTimeout(() => {
                    document.getElementById('output-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 100);
                }} 
                language={language} 
                isDarkMode={isDarkMode} 
                viewType={activeView}
                history={reportHistory} 
                onDeleteHistory={handleDeleteReportHistory}
                onLoad={handleLoadReportFromHistory}
                onNotify={notify}
                beepEnabled={beepEnabled}
                audioRef={audioRef}
              />
            )}
          </div>
        </div>
        <Footer language={language} />
      </div>
    </div>
  );
};

export default App;
