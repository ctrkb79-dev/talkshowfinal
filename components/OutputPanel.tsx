
import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { TranscriptionPart, Spotlight } from '../types';
import { translateBatch } from '../services/geminiService';

interface Props {
  output: TranscriptionPart[];
  onViewToggle: (view: 'report' | 'summary') => void;
  spotlights: Spotlight[];
  setSpotlights: React.Dispatch<React.SetStateAction<Spotlight[]>>; 
  language: 'bn' | 'en';
  onDelete: () => void;
  isDarkMode: boolean;
  isProcessing?: boolean;
  audioRef?: React.RefObject<HTMLAudioElement>;
  onNotify?: (msg: string, isError: boolean) => void;
  onUpdate?: (index: number, newText: string) => void;
  beepEnabled?: boolean;
}

export interface OutputPanelHandle {
    focusSearch: () => void;
    focusSpotlight: () => void;
    toggleDownloadMenu: () => void;
}

const OutputPanel = forwardRef<OutputPanelHandle, Props>(({ 
    output, onViewToggle, spotlights, setSpotlights, language, onDelete, 
    isDarkMode, isProcessing, audioRef, onNotify, onUpdate, beepEnabled 
}, ref) => {
  const [speakerNames, setSpeakerNames] = useState<{[key: string]: string}>({});
  const [currentlyPlayingTime, setCurrentlyPlayingTime] = useState<string | null>(null);
  
  // Navigation & Scroll
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [showBottomBtn, setShowBottomBtn] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  
  // Search Features
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchTerm, setActiveSearchTerm] = useState(""); 
  const [matchedIndices, setMatchedIndices] = useState<number[]>([]); 
  const [currentMatchStep, setCurrentMatchStep] = useState(0); 
  
  // Spotlight Local State for Input
  const [spotlightInput, setSpotlightInput] = useState("");

  // Sticky Tool State
  const [stickyActiveTool, setStickyActiveTool] = useState<'search' | 'spotlight' | null>(null);
  const [showStickyDownloadMenu, setShowStickyDownloadMenu] = useState(false);

  // Translation Features
  const [activeTab, setActiveTab] = useState<'original' | 'translated'>('original');
  const [translatedOutput, setTranslatedOutput] = useState<TranscriptionPart[] | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  // Download Dropdown State
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const stickyDownloadWrapperRef = useRef<HTMLDivElement>(null);
  
  // Input Refs for Keyboard Shortcuts
  const searchInputRef = useRef<HTMLInputElement>(null);
  const spotlightInputRef = useRef<HTMLInputElement>(null);
  const stickyInputRef = useRef<HTMLInputElement>(null);

  // Auto Scroll / Karaoke
  const [autoScroll, setAutoScroll] = useState(true);
  const activeItemRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
      focusSearch: () => {
          if (isSticky) {
             setStickyActiveTool('search');
             setTimeout(() => stickyInputRef.current?.focus(), 100);
          } else {
             searchInputRef.current?.focus();
          }
      },
      focusSpotlight: () => {
          if (isSticky) {
             setStickyActiveTool('spotlight');
             setTimeout(() => stickyInputRef.current?.focus(), 100);
          } else {
             spotlightInputRef.current?.focus();
          }
      },
      toggleDownloadMenu: () => {
          setShowDownloadMenu(prev => !prev);
      }
  }));

  // Dynamic Speaker Colors Palette
  const speakerColors = [
    { name: 'blue', badge: 'bg-blue-600', text: 'text-blue-100', box: 'bg-blue-500/5 border-blue-500/10 hover:border-blue-500/30' },
    { name: 'emerald', badge: 'bg-emerald-600', text: 'text-emerald-100', box: 'bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/30' },
    { name: 'violet', badge: 'bg-violet-600', text: 'text-violet-100', box: 'bg-violet-500/5 border-violet-500/10 hover:border-violet-500/30' },
    { name: 'orange', badge: 'bg-orange-600', text: 'text-orange-100', box: 'bg-orange-500/5 border-orange-500/10 hover:border-orange-500/30' },
    { name: 'pink', badge: 'bg-pink-600', text: 'text-pink-100', box: 'bg-pink-500/5 border-pink-500/10 hover:border-pink-500/30' },
    { name: 'cyan', badge: 'bg-cyan-600', text: 'text-cyan-100', box: 'bg-cyan-500/5 border-cyan-500/10 hover:border-cyan-500/30' },
  ];

  const getSpeakerStyle = (name: string) => {
     let hash = 0;
     for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
     return speakerColors[Math.abs(hash) % speakerColors.length];
  };

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        // Standard Download Menu
        if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
            setShowDownloadMenu(false);
        }
        // Sticky Download Menu Wrapper (Button + Menu)
        if (stickyDownloadWrapperRef.current && !stickyDownloadWrapperRef.current.contains(event.target as Node)) {
            setShowStickyDownloadMenu(false);
        }

        const target = event.target as HTMLElement;
        if (stickyActiveTool && !target.closest('.sticky-tool-container')) {
            setStickyActiveTool(null);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [stickyActiveTool]);

  // Focus sticky input when tool opens
  useEffect(() => {
      if (stickyActiveTool && stickyInputRef.current) {
          setTimeout(() => stickyInputRef.current?.focus(), 100);
      }
  }, [stickyActiveTool]);

  // --- SHORTCUTS & AUDIO SYNC ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!audioRef?.current) return;
        
        if (e.key === 'F1') {
            e.preventDefault();
            if (audioRef.current.paused) audioRef.current.play();
            else audioRef.current.pause();
        }
        if (e.key === 'F2') {
            e.preventDefault();
            audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
            onNotify?.("⏪ -5s", false);
        }
        if (e.key === 'F3') {
            e.preventDefault();
            audioRef.current.currentTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 5);
            onNotify?.("⏩ +5s", false);
        }
        if (e.altKey && e.key.toLowerCase() === 's') {
            e.preventDefault();
            exportWord();
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [audioRef]);

  // Karaoke Effect & Auto Scroll
  useEffect(() => {
    if (!audioRef?.current) return;
    
    const parseTime = (str: string) => {
        const parts = str.split(':').map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return parts[0] * 60 + parts[1];
    };

    const handleTimeUpdate = () => {
        if (!audioRef.current) return;
        if (audioRef.current.paused) return;

        const currentSec = audioRef.current.currentTime;
        const activePart = output.reduce((prev, curr) => {
            const t = parseTime(curr.time);
            return t <= currentSec ? curr : prev;
        }, output[0]);

        if (activePart && activePart.time !== currentlyPlayingTime) {
            setCurrentlyPlayingTime(activePart.time);
            if (autoScroll && activeItemRef.current) {
                activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };

    const handlePauseOrEnd = () => {
        setCurrentlyPlayingTime(null);
    };

    audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
    audioRef.current.addEventListener('pause', handlePauseOrEnd);
    audioRef.current.addEventListener('ended', handlePauseOrEnd);

    return () => {
        audioRef.current?.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current?.removeEventListener('pause', handlePauseOrEnd);
        audioRef.current?.removeEventListener('ended', handlePauseOrEnd);
    };
  }, [output, autoScroll, audioRef, currentlyPlayingTime]);


  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    
    setShowTopBtn(scrollTop > 50);
    setShowBottomBtn(scrollTop + clientHeight < scrollHeight - 50);
    
    // Sticky Threshold: 60px.
    const shouldSticky = scrollTop > 60 && output.length > 0;
    if (isSticky !== shouldSticky) {
        setIsSticky(shouldSticky);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [isSticky, output]);

  // --- ACTIONS ---
  const addSpotlight = () => {
    if (!spotlightInput.trim()) return;
    setSpotlights(prev => [...prev, { id: Date.now().toString(), text: spotlightInput.trim() }]);
    setSpotlightInput("");
    setStickyActiveTool(null);
    onNotify?.(language === 'bn' ? 'স্পটলাইট যোগ করা হয়েছে' : 'Spotlight Added', false);
  };

  const removeSpotlight = (id: string) => {
    setSpotlights(prev => prev.filter(s => s.id !== id));
    onNotify?.(language === 'bn' ? 'স্পটলাইট মুছে ফেলা হয়েছে' : 'Spotlight Removed', true);
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
        handleClearSearch();
        return;
    }
    setActiveSearchTerm(searchQuery.trim().toLowerCase());
    const indices: number[] = [];
    const currentData = activeTab === 'translated' && translatedOutput ? translatedOutput : output;
    
    currentData.forEach((part, idx) => {
        if (part.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
            part.speaker.toLowerCase().includes(searchQuery.toLowerCase())) {
            indices.push(idx);
        }
    });

    setMatchedIndices(indices);
    setCurrentMatchStep(0);
    if (!isSticky) setStickyActiveTool(null);

    const count = indices.length;
    const msg = language === 'bn' ? `${count} টি ফলাফল পাওয়া গেছে` : `Found ${count} matches`;
    onNotify?.(msg, count === 0);

    if (indices.length > 0) scrollToMatch(indices[0]);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setActiveSearchTerm("");
    setMatchedIndices([]);
    setCurrentMatchStep(0);
    setAutoScroll(true); 
    if (isSticky) stickyInputRef.current?.focus();
    else searchInputRef.current?.focus();
  };

  const nextMatch = () => {
      if (matchedIndices.length === 0) return;
      const nextStep = (currentMatchStep + 1) % matchedIndices.length;
      setCurrentMatchStep(nextStep);
      scrollToMatch(matchedIndices[nextStep]);
  };

  const prevMatch = () => {
      if (matchedIndices.length === 0) return;
      const prevStep = (currentMatchStep - 1 + matchedIndices.length) % matchedIndices.length;
      setCurrentMatchStep(prevStep);
      scrollToMatch(matchedIndices[prevStep]);
  };

  const scrollToMatch = (index: number) => {
      if (itemRefs.current[index]) {
          itemRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setAutoScroll(false); 
      }
  };

  // --- EXPORT ---
  const getFileName = () => {
    const now = new Date();
    const d = now.getDate().toString().padStart(2, '0');
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const y = now.getFullYear();
    const dateStr = `${d}-${m}-${y}`;
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    const timeStr = `${hours}-${minutes}-${ampm}`;

    const currentData = activeTab === 'translated' && translatedOutput ? translatedOutput : output;
    let subject = language === 'bn' ? 'ট্রান্সক্রিপশন' : 'Transcription';
    
    if (currentData.length > 0) {
        const text = currentData[0].text;
        const cleanText = text.replace(/[^\w\s\u0980-\u09FF]/gi, '').replace(/\s+/g, ' ').trim();
        const words = cleanText.split(' ');
        subject = words.slice(0, 4).join('_');
        if (subject.length > 25) subject = subject.substring(0, 25);
    }
    return `${subject}-${dateStr}-${timeStr}`;
  };

  const handleCopy = () => {
    if (output.length === 0) return;
    const currentData = activeTab === 'translated' && translatedOutput ? translatedOutput : output;
    const textContent = currentData.map(p => `[${p.time}] ${speakerNames[p.speaker] || p.speaker}: ${p.text}`).join('\n');
    navigator.clipboard.writeText(textContent).then(() => {
        onNotify?.(language === 'bn' ? 'টেক্সট কপি করা হয়েছে' : 'Copied to Clipboard', false);
    });
  };

  const downloadTxt = () => {
    if (output.length === 0) return;
    const currentData = activeTab === 'translated' && translatedOutput ? translatedOutput : output;
    const textContent = currentData.map(p => `[${p.time}] ${speakerNames[p.speaker] || p.speaker}: ${p.text}`).join('\n');
    const blob = new Blob(['\uFEFF' + textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getFileName()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify?.(language === 'bn' ? 'নোটপ্যাড ডাউনলোড হয়েছে' : 'Notepad Downloaded', false);
  };

  const exportWord = () => {
    if (output.length === 0) return;
    const currentData = activeTab === 'translated' && translatedOutput ? translatedOutput : output;
    let htmlBody = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Transcription</title>
      <style>body { font-family: 'Calibri', sans-serif; font-size: 11pt; } p.speaker { font-weight: bold; color: #2563EB; margin-top: 10px; margin-bottom: 2px; } p.text { margin-top: 0; margin-bottom: 10px; line-height: 1.5; } span.time { color: #64748B; font-size: 9pt; margin-right: 10px; }</style></head><body><h2>Transcription Output</h2>`;
    currentData.forEach(p => {
        htmlBody += `<p class="speaker"><span class="time">[${p.time}]</span>${speakerNames[p.speaker] || p.speaker}</p><p class="text">${p.text}</p>`;
    });
    htmlBody += "</body></html>";
    const blob = new Blob([htmlBody], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getFileName()}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify?.(language === 'bn' ? 'ওয়ার্ড ফাইল ডাউনলোড হয়েছে' : 'Word Doc Downloaded', false);
  };

  const printAsPDF = () => {
     const originalTitle = document.title;
     document.title = getFileName();
     window.print();
     setTimeout(() => { document.title = originalTitle; }, 1000);
  };

  const downloadSRT = () => {
    if (output.length === 0) return;
    const currentData = activeTab === 'translated' && translatedOutput ? translatedOutput : output;
    let srtContent = "";
    currentData.forEach((p, index) => {
        const parts = p.time.split(':').map(Number);
        let seconds = 0;
        if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        else seconds = parts[0] * 60 + parts[1];
        
        const formatSRTTime = (totalSec: number) => {
             const h = Math.floor(totalSec / 3600);
             const m = Math.floor((totalSec % 3600) / 60);
             const s = Math.floor(totalSec % 60);
             return `${h < 10 ? '0'+h : h}:${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s},000`;
        };
        srtContent += `${index + 1}\n${formatSRTTime(seconds)} --> ${formatSRTTime(seconds + 4)}\n${p.text}\n\n`;
    });
    const blob = new Blob(['\uFEFF' + srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getFileName()}.srt`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify?.(language === 'bn' ? 'সাবটাইটেল ডাউনলোড হয়েছে' : 'SRT Downloaded', false);
  };

  const handleTranslate = async () => {
      if (translatedOutput) {
          setActiveTab('translated');
          return;
      }
      setIsTranslating(true);
      onNotify?.(language === 'bn' ? 'অনুবাদ হচ্ছে...' : 'Translating...', false);
      try {
          const targetLang = language === 'bn' ? 'en' : 'bn';
          const translations = await translateBatch(output, targetLang);
          const newParts: TranscriptionPart[] = output.map((p, i) => ({
              ...p,
              text: translations[i] || p.text
          }));
          setTranslatedOutput(newParts);
          setActiveTab('translated');
          onNotify?.(language === 'bn' ? 'অনুবাদ সম্পন্ন' : 'Translation Complete', false);
      } catch (e) {
          onNotify?.(language === 'bn' ? 'অনুবাদ ব্যর্থ হয়েছে' : 'Translation Failed', true);
      } finally {
          setIsTranslating(false);
      }
  };

  const togglePlay = (timeStr: string) => {
    if (!audioRef?.current) return;
    
    if (currentlyPlayingTime === timeStr && !audioRef.current.paused) {
      audioRef.current.pause();
      setCurrentlyPlayingTime(null);
    } else {
      const parts = timeStr.split(':').map(Number);
      let startSec = 0;
      if (parts.length === 3) startSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
      else startSec = parts[0] * 60 + parts[1];
      
      audioRef.current.currentTime = startSec;
      setCurrentlyPlayingTime(timeStr); 
      audioRef.current.play().catch(console.error);
    }
  };

  const scrollToTop = () => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollToBottom = () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });

  const renameSpeaker = (oldName: string) => {
    const newName = prompt(language === 'bn' ? `সব "${oldName}"-এর নতুন নাম দিন:` : `Rename all "${oldName}" to:`, speakerNames[oldName] || oldName);
    if (newName) {
       setSpeakerNames(prev => ({ ...prev, [oldName]: newName }));
       onNotify?.(language === 'bn' ? 'সব নাম আপডেট হয়েছে' : 'All occurrences updated', false);
    }
  };

  const renderText = (text: string) => {
    if (!text) return null;
    let parts: { text: string, type: 'normal' | 'search' | 'spotlight' }[] = [{ text, type: 'normal' }];

    if (activeSearchTerm) {
        const newParts: typeof parts = [];
        parts.forEach(p => {
            if (p.type !== 'normal') {
                newParts.push(p); return;
            }
            const regex = new RegExp(`(${activeSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            const split = p.text.split(regex);
            split.forEach(s => {
                if (regex.test(s)) newParts.push({ text: s, type: 'search' });
                else newParts.push({ text: s, type: 'normal' });
            });
        });
        parts = newParts;
    }

    if (spotlights.length > 0) {
        const keywords = spotlights.map(s => s.text.trim()).filter(t => t.length > 0);
        if (keywords.length > 0) {
            const newParts: typeof parts = [];
            const pattern = `(${keywords.map(kw => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`;
            const regex = new RegExp(pattern, 'gi');

            parts.forEach(p => {
                if (p.type !== 'normal') {
                    newParts.push(p); return;
                }
                const split = p.text.split(regex);
                split.forEach(s => {
                    if (regex.test(s)) newParts.push({ text: s, type: 'spotlight' });
                    else newParts.push({ text: s, type: 'normal' });
                });
            });
            parts = newParts;
        }
    }

    return parts.map((p, i) => {
        if (p.type === 'search') return <mark key={i} className="bg-blue-500 text-white px-0.5 rounded animate-pulse">{p.text}</mark>;
        if (p.type === 'spotlight') return <mark key={i} className="bg-yellow-300 dark:bg-yellow-500/80 px-1 rounded font-bold shadow-sm text-slate-900">{p.text}</mark>;
        return <span key={i}>{p.text}</span>;
    });
  };

  const displayData = activeTab === 'translated' && translatedOutput ? translatedOutput : output;

  return (
    <div id="output-panel" className="glass-card rounded-[2.5rem] p-0 max-h-[85vh] h-[750px] flex flex-col min-h-[600px] shadow-2xl relative print:shadow-none print:border-none print:bg-white print:text-black group/panel overflow-hidden border border-white/20">
      
      {/* 1. STICKY HEADER TOOLBAR (Absolute Top - Slides Down) */}
      <div className={`absolute top-0 left-0 right-0 z-50 flex justify-between items-center px-6 py-3 bg-[#0f0518]/90 [.office-mode_&]:bg-white/95 backdrop-blur-xl border-b border-white/10 [.office-mode_&]:border-slate-200 transition-all duration-300 ${isSticky ? 'translate-y-0 opacity-100 shadow-xl' : '-translate-y-full opacity-0 pointer-events-none'}`}>
          <div className="flex items-center gap-2">
             <button onClick={() => onViewToggle('summary')} className="p-2 hover:bg-white/10 [.office-mode_&]:hover:bg-slate-100 rounded-xl text-indigo-400 [.office-mode_&]:text-indigo-600" title="Summary"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg></button>
             <button onClick={() => onViewToggle('report')} className="p-2 hover:bg-white/10 [.office-mode_&]:hover:bg-slate-100 rounded-xl text-emerald-400 [.office-mode_&]:text-emerald-600" title="Report"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg></button>
             <div className="w-px h-6 bg-white/10 [.office-mode_&]:bg-slate-300 mx-1"></div>
             <button onClick={handleTranslate} disabled={isTranslating} className={`p-2 rounded-xl transition-all ${activeTab === 'translated' ? 'text-purple-400 [.office-mode_&]:text-purple-600 font-bold' : 'text-slate-400 [.office-mode_&]:text-slate-500 hover:text-white [.office-mode_&]:hover:text-black'}`} title="Translate">
                {isTranslating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span className="font-bold text-xs">{language === 'bn' ? 'EN' : 'BN'}</span>}
             </button>
             
             {/* Sticky Download Button with dedicated state & wrapper */}
             <div className="relative" ref={stickyDownloadWrapperRef}>
                <button 
                  onClick={() => setShowStickyDownloadMenu(!showStickyDownloadMenu)} 
                  className={`p-2 hover:bg-white/10 [.office-mode_&]:hover:bg-slate-100 rounded-xl transition-all ${showStickyDownloadMenu ? 'text-blue-500 bg-blue-500/10' : 'text-blue-400 [.office-mode_&]:text-blue-600'}`} 
                  title="Download"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </button>
                {showStickyDownloadMenu && (
                    <div className="absolute left-0 top-full mt-2 w-48 bg-[#0f0518] [.office-mode_&]:bg-white border border-white/10 [.office-mode_&]:border-slate-200 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                        {[ { label: 'Text File (.txt)', action: downloadTxt, icon: '📄' }, { label: 'Word Doc (.doc)', action: exportWord, icon: '📝' }, { label: 'Subtitle (.srt)', action: downloadSRT, icon: '🎬' }, { label: 'Print / PDF', action: printAsPDF, icon: '🖨️' }, { label: 'Copy Text', action: handleCopy, icon: '📋' } ].map((item, i) => (
                            <button key={i} onClick={() => { item.action(); setShowStickyDownloadMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-white/10 [.office-mode_&]:hover:bg-slate-100 text-slate-300 [.office-mode_&]:text-slate-700 text-sm font-medium flex items-center gap-2 border-b border-white/5 last:border-0"><span>{item.icon}</span> {item.label}</button>
                        ))}
                    </div>
                )}
             </div>
          </div>

          <div className="flex items-center gap-2 relative sticky-tool-container">
             {/* Search Tool */}
             <div className="relative">
                <button 
                    onClick={() => setStickyActiveTool(stickyActiveTool === 'search' ? null : 'search')} 
                    className={`p-2 rounded-xl transition-all ${stickyActiveTool === 'search' || searchQuery ? 'text-blue-400 bg-white/10 [.office-mode_&]:bg-blue-50 [.office-mode_&]:text-blue-600' : 'text-slate-400 [.office-mode_&]:text-slate-500 hover:text-white [.office-mode_&]:hover:text-black'}`}
                    title="Search"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </button>
                {stickyActiveTool === 'search' && (
                    <div className="absolute top-full right-0 mt-3 p-3 bg-slate-900 [.office-mode_&]:bg-white border border-white/10 [.office-mode_&]:border-slate-200 rounded-xl shadow-2xl w-64 animate-in slide-in-from-top-2 z-50">
                        <input 
                            ref={stickyInputRef}
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search..."
                            className="w-full bg-black/30 [.office-mode_&]:bg-slate-50 border border-white/10 [.office-mode_&]:border-slate-300 rounded-lg px-3 py-2 text-sm text-white [.office-mode_&]:text-black focus:ring-1 focus:ring-blue-500 outline-none mb-2"
                        />
                        <div className="flex justify-between">
                            <button onClick={handleSearch} className="px-3 py-1 bg-blue-600 rounded-lg text-xs font-bold text-white">Find</button>
                            <button onClick={handleClearSearch} className="px-3 py-1 bg-white/10 [.office-mode_&]:bg-slate-200 rounded-lg text-xs font-bold text-slate-300 [.office-mode_&]:text-slate-600">Clear</button>
                        </div>
                    </div>
                )}
             </div>

             {/* Spotlight Tool */}
             <div className="relative">
                <button 
                    onClick={() => setStickyActiveTool(stickyActiveTool === 'spotlight' ? null : 'spotlight')} 
                    className={`p-2 rounded-xl transition-all ${stickyActiveTool === 'spotlight' ? 'text-yellow-400 bg-white/10 [.office-mode_&]:bg-yellow-50 [.office-mode_&]:text-yellow-600' : 'text-slate-400 [.office-mode_&]:text-slate-500 hover:text-white [.office-mode_&]:hover:text-black'}`}
                    title="Spotlight"
                >
                    <span className="text-lg leading-none">✨</span>
                </button>
                {stickyActiveTool === 'spotlight' && (
                    <div className="absolute top-full right-0 mt-3 p-3 bg-slate-900 [.office-mode_&]:bg-white border border-white/10 [.office-mode_&]:border-slate-200 rounded-xl shadow-2xl w-64 animate-in slide-in-from-top-2 z-50">
                        <input 
                            ref={stickyInputRef}
                            type="text" 
                            value={spotlightInput}
                            onChange={(e) => setSpotlightInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addSpotlight()}
                            placeholder="Keyword..."
                            className="w-full bg-black/30 [.office-mode_&]:bg-slate-50 border border-white/10 [.office-mode_&]:border-slate-300 rounded-lg px-3 py-2 text-sm text-white [.office-mode_&]:text-black focus:ring-1 focus:ring-yellow-500 outline-none mb-2"
                        />
                        <button onClick={addSpotlight} className="w-full px-3 py-1 bg-yellow-600 rounded-lg text-xs font-bold text-white">Add</button>
                    </div>
                )}
             </div>

             <div className="w-px h-6 bg-white/10 [.office-mode_&]:bg-slate-300 mx-1"></div>
             <button onClick={onDelete} className="p-2 hover:bg-red-500/20 rounded-xl text-red-500" title="Delete"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
          </div>
      </div>

      {/* 2. STANDARD SCROLLABLE CONTENT */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth p-8 pt-0"
      >
        {/* Regular Header Section (STATIC, scrolls away) */}
        <div className="flex flex-col gap-4 mb-6 border-b border-white/10 pb-6 print:hidden pt-8">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                    {language === 'bn' ? 'ফলাফল' : 'Output'}
                </h3>
                {/* Standard Toolbar */}
                <div className="flex gap-2 relative">
                    <button onClick={() => onViewToggle('summary')} className="p-2 rounded-xl bg-white/5 [.office-mode_&]:bg-slate-100 hover:bg-indigo-500/20 text-indigo-400 [.office-mode_&]:text-indigo-600 border border-white/10 [.office-mode_&]:border-slate-200" title="Summary">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                    </button>
                    <button onClick={() => onViewToggle('report')} className="p-2 rounded-xl bg-white/5 [.office-mode_&]:bg-slate-100 hover:bg-emerald-500/20 text-emerald-400 [.office-mode_&]:text-emerald-600 border border-white/10 [.office-mode_&]:border-slate-200" title="Report">
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </button>
                    <div className="w-px bg-white/10 [.office-mode_&]:bg-slate-300 mx-1 h-8 self-center"></div>
                    <button onClick={handleTranslate} disabled={isTranslating} className={`p-2 rounded-xl border border-white/10 [.office-mode_&]:border-slate-200 transition-all active:scale-95 ${activeTab === 'translated' ? 'bg-purple-600 text-white' : 'bg-white/5 [.office-mode_&]:bg-slate-100 hover:bg-white/10 text-slate-300 [.office-mode_&]:text-slate-600'}`}>
                        {isTranslating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (language === 'bn' ? 'EN' : 'BN')}
                    </button>
                    <div className="relative">
                        <button onClick={() => setShowDownloadMenu(!showDownloadMenu)} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2">
                            <span>{language === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
                            <svg className={`w-4 h-4 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {showDownloadMenu && (
                            <div ref={downloadMenuRef} className="absolute right-0 top-full mt-2 w-48 bg-[#0f0518] [.office-mode_&]:bg-white border border-white/10 [.office-mode_&]:border-slate-200 rounded-xl shadow-2xl z-50">
                                {[ { label: 'Text File (.txt)', action: downloadTxt, icon: '📄' }, { label: 'Word Doc (.doc)', action: exportWord, icon: '📝' }, { label: 'Subtitle (.srt)', action: downloadSRT, icon: '🎬' }, { label: 'Print / PDF', action: printAsPDF, icon: '🖨️' }, { label: 'Copy Text', action: handleCopy, icon: '📋' } ].map((item, i) => (
                                    <button key={i} onClick={() => { item.action(); setShowDownloadMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-white/10 [.office-mode_&]:hover:bg-slate-100 text-slate-300 [.office-mode_&]:text-slate-700 text-sm font-medium flex items-center gap-2 border-b border-white/5 last:border-0"><span>{item.icon}</span> {item.label}</button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={onDelete} className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white border border-red-500/20"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
            </div>

            {/* Standard Search & Spotlight */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative group">
                    <input ref={searchInputRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder={language === 'bn' ? 'শব্দ খুঁজুন... (Alt+/)' : 'Search... (Alt+/)'} className="w-full bg-black/20 [.office-mode_&]:bg-slate-50 border border-white/10 [.office-mode_&]:border-slate-300 rounded-xl px-4 py-2.5 pl-10 pr-28 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-slate-200 [.office-mode_&]:text-slate-800" />
                    <svg className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {matchedIndices.length > 0 && (<><span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-md font-bold min-w-[30px] text-center">{currentMatchStep + 1}/{matchedIndices.length}</span><button onClick={prevMatch} className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg></button><button onClick={nextMatch} className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button><div className="w-px h-3 bg-white/20 mx-0.5"></div></>)}
                        {searchQuery.length > 0 ? (<button onClick={handleClearSearch} className="p-1.5 hover:bg-red-500/20 rounded-full text-slate-400 hover:text-red-400"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>) : (<button onClick={handleSearch} className="p-1.5 hover:bg-white/10 rounded-full text-slate-500 hover:text-blue-400"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></button>)}
                    </div>
                </div>
                <div className="relative group">
                    <input ref={spotlightInputRef} type="text" value={spotlightInput} onChange={(e) => setSpotlightInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSpotlight()} placeholder={language === 'bn' ? 'স্পটলাইট শব্দ... (Alt+K)' : 'Add Keyword... (Alt+K)'} className="w-full bg-black/20 [.office-mode_&]:bg-slate-50 border border-white/10 [.office-mode_&]:border-slate-300 rounded-xl px-4 py-2.5 pl-10 text-sm focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 text-slate-200 [.office-mode_&]:text-slate-800" />
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg leading-none grayscale group-focus-within:grayscale-0">✨</span>
                    <button onClick={addSpotlight} className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-white/10 [.office-mode_&]:bg-slate-200 hover:bg-white/20 rounded-lg text-xs font-bold text-slate-300 [.office-mode_&]:text-slate-600">{language === 'bn' ? 'যোগ' : 'ADD'}</button>
                </div>
            </div>
             {spotlights.length > 0 && (<div className="flex flex-wrap gap-2"><div className="text-[10px] uppercase font-bold text-slate-500 self-center mr-1">Spotlights:</div>{spotlights.map(s => (<span key={s.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">{s.text}<button onClick={() => removeSpotlight(s.id)} className="hover:text-red-400 ml-1">×</button></span>))}</div>)}
        </div>

        {/* Content Body */}
        {displayData.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-full opacity-30 select-none min-h-[400px]">
              <div className="w-24 h-24 bg-white/5 [.office-mode_&]:bg-slate-200 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              </div>
              <p className="text-xl font-bold text-slate-400">{language === 'bn' ? 'ফলাফল এখানে আসবে' : 'Transcription will appear here'}</p>
              <p className="text-sm mt-2 text-slate-500">{language === 'bn' ? 'অডিও আপলোড করে শুরু করুন' : 'Upload audio to start'}</p>
           </div>
        ) : (
           <div className="space-y-4 pb-10 transition-all duration-300">
              {displayData.map((part, index) => {
                 const style = getSpeakerStyle(part.speaker);
                 const isActive = currentlyPlayingTime === part.time;
                 const isTranslated = activeTab === 'translated';
                 
                 return (
                    <div 
                        key={index} 
                        ref={(el) => { itemRefs.current[index] = el; if (isActive) activeItemRef.current = el; }}
                        className={`group relative p-4 rounded-2xl border transition-all duration-300 ${style.box} ${isActive ? 'ring-2 ring-indigo-500 shadow-lg scale-[1.01] bg-indigo-500/10' : 'hover:bg-white/5 [.office-mode_&]:hover:bg-slate-50'}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${style.badge} text-white shadow-sm`}>
                                    {speakerNames[part.speaker] || part.speaker}
                                </span>
                                <button onClick={() => renameSpeaker(part.speaker)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-white [.office-mode_&]:hover:text-black" title="Rename Speaker"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-indigo-300' : 'text-slate-500'}`}>{part.time}</span>
                                <button onClick={() => togglePlay(part.time)} className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-indigo-500 text-white animate-pulse' : 'bg-white/10 [.office-mode_&]:bg-slate-200 text-slate-400 hover:bg-white/20 hover:text-white [.office-mode_&]:hover:text-black'}`}>{isActive ? (<svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>) : (<svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>)}</button>
                            </div>
                        </div>
                        <div className={`text-sm md:text-base leading-relaxed font-medium outline-none ${style.text} [.office-mode_&]:text-slate-800 ${isTranslated ? 'italic' : ''}`} contentEditable={!isTranslated} suppressContentEditableWarning onBlur={(e) => { const newText = e.currentTarget.textContent || ""; if (newText !== part.text && onUpdate) onUpdate(index, newText); }}>
                            {renderText(part.text)}
                        </div>
                    </div>
                 );
              })}
           </div>
        )}
      </div>

      {/* Top/Bottom Buttons */}
      {displayData.length > 0 && (
          <div className={`absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 transition-all duration-300 print:hidden ${showTopBtn || showBottomBtn ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                 <button onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} className={`w-8 h-8 rounded-full bg-white/10 [.office-mode_&]:bg-white/80 text-white [.office-mode_&]:text-black hover:bg-blue-500 hover:text-white backdrop-blur-sm border border-white/10 shadow-lg flex items-center justify-center transition-all active:scale-90 ${showTopBtn ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0 pointer-events-none'}`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg></button>
                 <button onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })} className={`w-8 h-8 rounded-full bg-white/10 [.office-mode_&]:bg-white/80 text-white [.office-mode_&]:text-black hover:bg-indigo-500 hover:text-white backdrop-blur-sm border border-white/10 shadow-lg flex items-center justify-center transition-all active:scale-90 ${showBottomBtn ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0 pointer-events-none'}`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg></button>
          </div>
      )}
    </div>
  );
});

export default React.memo(OutputPanel);
