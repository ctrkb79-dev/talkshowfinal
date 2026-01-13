
import React, { useEffect, useRef, useState } from 'react';
import { AudioInfo } from '../types';
import { formatSize, formatDuration } from '../services/audioService';

interface AudioInfoProps {
  info: AudioInfo;
  onDelete: () => void;
  language: 'bn' | 'en';
  isProcessing: boolean;
  audioRef: React.RefObject<HTMLAudioElement>;
  isDarkMode: boolean;
  onToggleProcess: () => void;
  hasCompleted: boolean;
  onNotify?: (msg: string, isError: boolean) => void;
}

const AudioInfoDisplay: React.FC<AudioInfoProps> = ({ 
  info, onDelete, language, isProcessing, audioRef, isDarkMode,
  onToggleProcess, hasCompleted, onNotify
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Audio Playback Speed Control
  const changeSpeed = (speed: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
      setPlaybackRate(speed);
      onNotify?.(`Playback Speed: ${speed}x`, false);
    }
  };

  // Sync state with audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioRef]);

  // Visualizer Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Colors: White, Red, Blue
    const getColors = () => {
      return ['#ffffff', '#ef4444', '#3b82f6']; // White, Red, Blue
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 60;
      const barWidth = canvas.width / bars;
      const colors = getColors();

      for (let i = 0; i < bars; i++) {
        // Height logic:
        // If playing: Random dynamic height
        // If paused: Very small static height (flat line effect)
        let h = isPlaying 
          ? Math.random() * (canvas.height * 0.8) + (canvas.height * 0.1) 
          : 3; 

        const x = i * barWidth;
        
        // Pick a random color from the palette for each bar
        const colorIndex = Math.floor(Math.random() * colors.length);
        ctx.fillStyle = colors[colorIndex];
        
        // Rounded top bars
        ctx.beginPath();
        ctx.roundRect(x + 1, canvas.height - h, barWidth - 2, h, [4, 4, 0, 0]);
        ctx.fill();
      }
      
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, isDarkMode]);

  // Determine button appearance based on state
  const getToggleButtonUI = () => {
    if (isProcessing) {
      return {
        label: language === 'bn' ? 'থামান' : 'Stop',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>,
        classes: "text-white bg-rose-500 hover:bg-rose-600 shadow-rose-500/30 animate-pulse"
      };
    } else if (hasCompleted) {
      return {
        label: language === 'bn' ? 'আবার শুরু' : 'Restart',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
        classes: "text-white bg-violet-600 hover:bg-violet-700 shadow-violet-500/30"
      };
    } else {
      return {
        label: language === 'bn' ? 'শুরু করুন' : 'Start',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        classes: "text-white bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30"
      };
    }
  };

  const btnUI = getToggleButtonUI();

  return (
    <div className="glass-card rounded-2xl p-6 transition-all shadow-xl border border-blue-500/20 bg-white/5">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-bold truncate max-w-[150px] md:max-w-[200px] text-slate-100">{info.name}</h4>
          <span className={`text-[10px] font-black uppercase tracking-widest ${isProcessing ? 'text-emerald-400 animate-pulse' : 'text-blue-400'}`}>
            {isProcessing ? (language === 'bn' ? 'কাজ চলছে...' : 'Processing...') : (hasCompleted ? (language === 'bn' ? 'সম্পন্ন' : 'Completed') : (language === 'bn' ? 'রেডি' : 'Ready'))}
          </span>
        </div>
        
        <div className="flex gap-2">
           {/* Smart Toggle Button */}
           <button 
             onClick={onToggleProcess}
             className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-xs shadow-lg transition-all active:scale-90 ${btnUI.classes}`}
             title={btnUI.label}
           >
             {btnUI.icon}
             <span className="hidden md:inline">{btnUI.label}</span>
           </button>

           <button 
             onClick={onDelete} 
             disabled={isProcessing} 
             className="text-red-400 p-2 bg-white/5 hover:bg-red-500/20 rounded-xl transition-all disabled:opacity-30 border border-white/10"
             title="Delete"
           >
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
           </button>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Visualizer Canvas */}
        <div className="h-16 w-full bg-black/30 rounded-xl overflow-hidden border border-white/10 relative backdrop-blur-sm">
          <canvas ref={canvasRef} width={500} height={64} className="w-full h-full" />
        </div>

        <audio ref={audioRef} controls src={info.url} className="w-full h-10 custom-audio-player" />
        
        {/* Speed Control & Stats */}
        <div className="flex flex-col gap-3">
            {/* Speed Buttons */}
            <div className="flex justify-center gap-2 p-2 glass-card bg-white/5 rounded-xl border-white/10">
                <span className="text-[10px] font-bold self-center mr-2 text-slate-400 uppercase">Speed:</span>
                {[0.5, 1.0, 1.5, 2.0].map((rate) => (
                    <button
                        key={rate}
                        onClick={() => changeSpeed(rate)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            playbackRate === rate 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'bg-white/10 hover:bg-white/20 text-slate-200'
                        }`}
                    >
                        {rate}x
                    </button>
                ))}
            </div>

            {/* Sizes and Duration */}
            <div className="grid grid-cols-3 gap-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <div className="glass-card p-3 rounded-xl bg-white/5 flex flex-col items-center border border-white/5">
                    <div>{language === 'bn' ? 'আসল সাইজ' : 'Original'}</div>
                    <div className="text-white mt-1">{formatSize(info.originalSize)}</div>
                </div>
                <div className="glass-card p-3 rounded-xl bg-emerald-500/10 flex flex-col items-center border border-emerald-500/20">
                    <div className="text-emerald-400">{language === 'bn' ? 'অপটিমাইজড' : 'Optimized'}</div>
                    <div className="text-emerald-300 mt-1">{formatSize(info.compressedSize)}</div>
                </div>
                <div className="glass-card p-3 rounded-xl bg-white/5 flex flex-col items-center border border-white/5">
                    <div>{language === 'bn' ? 'সময়' : 'Duration'}</div>
                    <div className="text-white mt-1">{formatDuration(info.duration)}</div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AudioInfoDisplay);
