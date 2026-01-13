
export interface AudioInfo {
  name: string;
  originalSize: number;
  compressedSize: number;
  duration: number;
  type: string;
  blob: Blob;
  url: string;
}

export interface TranscriptionPart {
  speaker: string;
  text: string;
  time: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  endTime?: string; // Used for scoped playback
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  fileName: string;
  output: TranscriptionPart[];
}

export interface ReportHistoryItem {
  id: string;
  timestamp: string;
  fileName: string;
  reportData: ReportData;
  viewType: 'summary' | 'report';
}

// Fix: Added missing Spotlight interface to resolve errors in App.tsx, SpotlightManager.tsx, and OutputPanel.tsx
export interface Spotlight {
  id: string;
  text: string;
}

// Fix: Added missing Segment interface to resolve errors in AudioSplit.tsx
export interface Segment {
  id: number;
  label: string;
  start: string;
  end: string;
}

export interface ReportData {
  summary: {
    totalDuration: string;
    spotlightCount: number;
    spotlightTimestamps: string[];
    // Fix: Added keywordCounts to support spotlight analysis display in ReportPanel.tsx
    keywordCounts?: { [key: string]: number };
  };
  details: any[];
}

export enum TranscribeStage {
  ANALYZING = "ফাইল বিশ্লেষণ হচ্ছে...",
  CHUNKING = "অটোমেটিক টুকরো করা হচ্ছে...",
  AI_PROCESSING = "এআই বিশ্লেষণ করছে...",
  MERGING = "সব অংশ একত্রিত করা হচ্ছে...",
  CLEANUP = "ফাইনাল ক্লিনআপ..."
}
