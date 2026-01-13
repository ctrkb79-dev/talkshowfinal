
import React, { useState } from 'react';
import { Segment, AudioInfo } from '../types';
import { sliceAudioBlob } from '../services/audioService';

interface AudioSplitProps {
  language: 'bn' | 'en';
  audioInfo: AudioInfo | null;
  onPromoteSegment: (newInfo: AudioInfo) => void;
  onDelete: () => void;
  segments: Segment[];
  setSegments: React.Dispatch<React.SetStateAction<Segment[]>>;
}

const AudioSplit: React.FC<AudioSplitProps> = ({ language, audioInfo, onPromoteSegment, onDelete, segments, setSegments }) => {
  const [partsInput, setPartsInput] = useState("2");
  const [isSplitting, setIsSplitting] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  if (!audioInfo) return null;

  const duration = audioInfo.duration;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  const handleSplitClick = async () => {
    setIsSplitting(true);
    setSegments([]);

    await new Promise(r => setTimeout(r, 800));

    let numParts = partsInput === 'auto' ? Math.ceil(duration / 300) : parseInt(partsInput);
    if (numParts < 2) numParts = 2;

    const partDuration = duration / numParts;
    const newSegments: Segment[] = [];

    for (let i = 0; i < numParts; i++) {
      newSegments.push({
        id: i,
        label: language === 'bn' ? `অংশ ${i + 1}` : `Part ${i + 1}`,
        start: formatTime(i * partDuration),
        end: formatTime((i === numParts - 1) ? duration : (i + 1) * partDuration)
      });
    }

    setSegments(newSegments);
    setIsSplitting(false);
  };

  const handlePromoteToMain = async (seg: Segment) => {
    if (!audioInfo) return;
    setLoadingId(seg.id);
    
    try {
        const parseToSecs = (time: string) => {
            const [m, s] = time.split(':').map(Number);
            return (m * 60) + s;
        };

        const startSec = parseToSecs(seg.start);
        const endSec = parseToSecs(seg.end);
        const segmentDuration = endSec - startSec;
        
        const startPercent = (startSec / duration) * 100;
        const endPercent = (endSec / duration) * 100;

        const slicedBlob = await sliceAudioBlob(audioInfo.blob, startPercent, endPercent);
        
        // Create a completely new independent AudioInfo object
        const newInfo: AudioInfo = {
            name: `${audioInfo.name.split('.')[0]}_[${seg.label}]`,
            originalSize: slicedBlob.size,
            compressedSize: slicedBlob.size,
            duration: segmentDuration,
            type: audioInfo.type,
            blob: slicedBlob,
            url: URL.createObjectURL(slicedBlob)
        };

        onPromoteSegment(newInfo);
    } catch (e) {
        console.error("Slicing failed", e);
    } finally {
        setLoadingId(null);
    }
  };

  const handleDownloadSegment = async (seg: Segment) => {
    if (!audioInfo) return;
    setLoadingId(seg.id);
    
    try {
        const parseToSecs = (time: string) => {
            const [m, s] = time.split(':').map(Number);
            return (m * 60) + s;
        };

        const startSec = parseToSecs(seg.start);
        const endSec = parseToSecs(seg.end);
        const startPercent = (startSec / duration) * 100;
        const endPercent = (endSec / duration) * 100;

        const slicedBlob = await sliceAudioBlob(audioInfo.blob, startPercent, endPercent);
        const url = URL.createObjectURL(slicedBlob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${audioInfo.name.split('.')[0]}_${seg.label}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Download failed", e);
    } finally {
        setLoadingId(null);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 transition-all border border-orange-500/20 shadow-lg shadow-orange-900/5">
      <h4 className="font-bold mb-4 flex items-center gap-2">
        <span className="p-1 bg-orange-500/20 rounded">🔪</span>
        {language === 'bn' ? 'অডিও স্প্লিট ও স্বাধীন কনভার্ট' : 'Split & Independent Convert'}
      </h4>
      
      <div className="flex items-center gap-4 mb-4">
        <select 
          value={partsInput}
          onChange={(e) => setPartsInput(e.target.value)}
          className="flex-1 glass-card bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-500 dark:bg-slate-800"
        >
          <option value="2">2 Parts</option>
          <option value="3">3 Parts</option>
          <option value="4">4 Parts</option>
          <option value="auto">Auto (5 min)</option>
        </select>
        
        <button 
          onClick={handleSplitClick}
          disabled={isSplitting}
          className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all text-sm font-bold active:scale-95 disabled:opacity-70 flex items-center gap-2"
        >
          {isSplitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
          {language === 'bn' ? 'স্প্লিট' : 'Split'}
        </button>
      </div>

      {segments.length > 0 && (
        <div className="grid grid-cols-1 gap-3 mt-4 animate-in slide-in-from-top-2">
          {segments.map((seg) => (
            <div 
              key={seg.id}
              className="group p-4 rounded-2xl border border-orange-200 dark:border-orange-800/50 bg-orange-50/50 dark:bg-orange-900/10 flex justify-between items-center hover:shadow-md transition-all"
            >
              <div className="flex-1">
                <div className="text-sm font-bold text-orange-700 dark:text-orange-400">{seg.label}</div>
                <div className="text-xs text-slate-500 font-mono">{seg.start} - {seg.end}</div>
              </div>
              
              <div className="flex gap-2">
                {/* Convert this independent part */}
                <button 
                  onClick={() => handlePromoteToMain(seg)}
                  disabled={loadingId === seg.id}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all active:scale-90 shadow-sm disabled:opacity-50"
                  title="Load as independent file for conversion"
                >
                  {loadingId === seg.id ? "..." : (language === 'bn' ? 'কনভার্ট' : 'Convert')}
                </button>

                <button 
                  onClick={() => handleDownloadSegment(seg)}
                  disabled={loadingId === seg.id}
                  className="p-2 bg-white dark:bg-slate-800 rounded-xl text-orange-600 shadow-sm hover:scale-110 active:scale-90 transition-all disabled:opacity-50"
                  title="Download this part"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AudioSplit;
