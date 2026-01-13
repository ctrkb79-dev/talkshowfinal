
import React, { useRef, useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { AudioInfo } from '../types';
import { compressAudio, formatSize } from '../services/audioService';

interface AudioInputProps {
  onUpload: (info: AudioInfo) => void;
  language: 'bn' | 'en';
  isProcessing: boolean;
  onNotify?: (msg: string, isError: boolean) => void;
}

// Interface for parent to control this component
export interface AudioInputHandle {
    triggerBrowse: () => void;
    triggerRecord: () => void;
}

const MAX_SIZE_MB = 500; 
const SPLIT_THRESHOLD_MB = 60;

const AudioInput = forwardRef<AudioInputHandle, AudioInputProps>(({ onUpload, language, isProcessing, onNotify }, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<any>(null); // Interval ref

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    triggerBrowse: () => {
        if (!isProcessing && !isCompressing) {
            fileInputRef.current?.click();
        }
    },
    triggerRecord: () => {
        if (!isProcessing && !isCompressing) {
            if (isRecording) {
                mediaRecorderRef.current?.stop();
            } else {
                startRecording();
            }
        }
    }
  }));

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatRecordingTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  const handleFile = async (file: File) => {
    setErrorMsg(null);
    if (!file.type.startsWith('audio/') && !file.name.endsWith('.m4a') && !file.name.endsWith('.wav')) {
      const msg = language === 'bn' ? "সঠিক অডিও ফাইল দিন" : "Valid audio required";
      setErrorMsg(msg);
      onNotify?.(msg, true);
      return;
    }
    if (file.size / (1024 * 1024) > MAX_SIZE_MB) {
        const msg = language === 'bn' ? `৫০০ মেগাবাইটের নিচে ফাইল দিন।` : `Under 500MB only.`;
        setErrorMsg(msg);
        onNotify?.(msg, true);
        return;
    }

    // CONDITIONAL LOGIC BASED ON 60MB THRESHOLD
    const isLargeFile = file.size / (1024 * 1024) > SPLIT_THRESHOLD_MB;
    
    if (isLargeFile) {
        // Delayed notification (Fake processing delay for UX/Beep separation)
        setTimeout(() => {
            onNotify?.(language === 'bn' ? 'বড় ফাইল! কমপ্রেস ও অপটিমাইজ করা হচ্ছে...' : 'Large file! Compressing & Optimizing...', false);
        }, 2000);
    }
    
    await processFile(file, isLargeFile);
  };

  const processFile = async (file: File, shouldCompress: boolean) => {
      setIsCompressing(shouldCompress);
      try {
        const originalSize = file.size;
        let processedBlob: Blob = file;
        
        // Only perform compression if the flag is true (Size > 60MB)
        if (shouldCompress) {
             processedBlob = await compressAudio(file); 
        }
        
        const tempUrl = URL.createObjectURL(processedBlob);
        const audio = new Audio(tempUrl);
        
        audio.onloadedmetadata = () => {
          setIsCompressing(false);
          onUpload({
            name: file.name,
            originalSize,
            compressedSize: processedBlob.size,
            duration: audio.duration,
            type: processedBlob.type || file.type, 
            blob: processedBlob,
            url: tempUrl
          });
        };

        audio.onerror = () => {
          setIsCompressing(false);
          URL.revokeObjectURL(tempUrl);
          const msg = language === 'bn' ? "অডিও ফাইলটি পড়া যাচ্ছে না" : "Cannot read audio file";
          setErrorMsg(msg);
          onNotify?.(msg, true);
        };
      } catch (e) {
        setIsCompressing(false);
        const msg = language === 'bn' ? "প্রসেসিং সমস্যা হয়েছে" : "Processing Error";
        setErrorMsg(msg);
        onNotify?.(msg, true);
      }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const startRecording = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        // Stop timer
        if (timerRef.current) clearInterval(timerRef.current);
        
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `Rec_${Date.now()}.webm`, { type: 'audio/webm' });
        
        const isLarge = file.size / (1024 * 1024) > SPLIT_THRESHOLD_MB;
        if (isLarge) {
             // Delayed notification
             setTimeout(() => {
                onNotify?.(language === 'bn' ? 'বড় রেকর্ডিং! অপটিমাইজ করা হচ্ছে...' : 'Large recording! Optimizing...', false);
             }, 2000);
        }
        
        await processFile(file, isLarge);
        
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        setRecordingTime(0);
        onNotify?.(language === 'bn' ? 'রেকর্ডিং সম্পন্ন' : 'Recording Finished', false);
      };
      recorder.start();
      setIsRecording(true);
      
      // Start Timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      onNotify?.(language === 'bn' ? 'রেকর্ডিং শুরু হয়েছে' : 'Recording Started', false);
    } catch (e) {
      const msg = language === 'bn' ? "মাইক্রোফোন পারমিশন নেই" : "No mic permission";
      setErrorMsg(msg);
      onNotify?.(msg, true);
    }
  };

  return (
    <div 
        className={`glass-card rounded-2xl p-8 text-center border-2 border-dashed transition-all relative overflow-hidden ${dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-blue-500/50'}`}
        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
    >
      {isCompressing && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center animate-in fade-in">
             <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
             <p className="text-blue-400 font-bold animate-pulse">{language === 'bn' ? 'অপটিমাইজ করা হচ্ছে...' : 'Optimizing Audio...'}</p>
          </div>
      )}

      <div className="flex flex-col items-center gap-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${dragActive ? 'bg-blue-500 text-white' : 'bg-blue-500/20 text-blue-400'}`}>
          {isRecording ? (
             <div className="relative w-full h-full flex items-center justify-center">
                 <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
                 <svg className="w-8 h-8 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
             </div>
          ) : (
             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
          )}
        </div>
        
        <h3 className="text-xl font-semibold text-white">
            {isRecording ? (language === 'bn' ? 'রেকর্ডিং চলছে...' : 'Recording...') : (language === 'bn' ? 'অডিও ইনপুট' : 'Audio Input')}
        </h3>

        {/* Recording Timer */}
        {isRecording && (
             <div className="text-3xl font-black font-mono text-red-500 tracking-widest animate-pulse drop-shadow-lg">
                 {formatRecordingTime(recordingTime)}
             </div>
        )}

        {errorMsg && <p className="text-red-500 text-sm font-bold">⚠️ {errorMsg}</p>}
        
        <div className="flex gap-4 mt-4">
          <button disabled={isProcessing || isCompressing || isRecording} onClick={() => fileInputRef.current?.click()} className="px-6 py-2 bg-blue-600 text-white rounded-full active:scale-95 disabled:opacity-30 disabled:grayscale font-bold hover:bg-blue-500 shadow-lg shadow-blue-500/20" title="Alt + F">
            {language === 'bn' ? 'ব্রাউজ করুন' : 'Browse File'}
          </button>
          <button disabled={isProcessing || isCompressing} onClick={isRecording ? () => mediaRecorderRef.current?.stop() : startRecording} className={`px-6 py-2 rounded-full active:scale-95 font-bold min-w-[120px] ${isRecording ? 'bg-red-600 text-white animate-pulse shadow-red-500/40 shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'}`} title="Alt + R">
            {isRecording ? (language === 'bn' ? '🛑 থামান' : '🛑 Stop') : (language === 'bn' ? '🎙️ রেকর্ড' : '🎙️ Rec')}
          </button>
        </div>
        <input type="file" ref={fileInputRef} hidden accept="audio/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>
    </div>
  );
});

export default AudioInput;
