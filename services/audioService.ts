
export const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s]
    .map(v => v < 10 ? "0" + v : v)
    .filter((v, i) => v !== "00" || i > 0)
    .join(":");
};

export const playBeep = (enabled: boolean) => {
  if (!enabled) return;
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);

  } catch (e) {
    console.error("Audio beep error", e);
  }
};

/**
 * Slices a blob based on percentage range
 */
export const sliceAudioBlob = async (blob: Blob, startPercent: number, endPercent: number): Promise<Blob> => {
  const size = blob.size;
  const startByte = Math.floor(size * (startPercent / 100));
  const endByte = Math.floor(size * (endPercent / 100));
  return blob.slice(startByte, endByte, blob.type);
};

/**
 * Calculates how many chunks are needed for a specific file size (Target 30MB)
 */
export const calculateChunks = (totalSize: number, targetChunkSize: number = 25 * 1024 * 1024): number => {
    return Math.ceil(totalSize / targetChunkSize);
};

/**
 * Compresses audio by downsampling to 16kHz Mono using OfflineAudioContext
 * This ensures maximum quality for Speech-to-Text while minimizing file size.
 */
export const compressAudio = async (file: File): Promise<Blob> => {
  try {
    // 1. Create Audio Context to decode
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // 2. Prepare Offline Context for Resampling (16kHz, Mono)
    const targetSampleRate = 16000;
    const channelCount = 1;
    const duration = audioBuffer.duration;
    const offlineCtx = new OfflineAudioContext(channelCount, duration * targetSampleRate, targetSampleRate);

    // 3. Connect Source
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start();

    // 4. Render Reduced Audio
    const renderedBuffer = await offlineCtx.startRendering();

    // 5. Encode to WAV
    return bufferToWav(renderedBuffer);

  } catch (error) {
    console.warn("Audio compression failed, using original file.", error);
    return new Blob([file], { type: file.type });
  }
};

// Helper to convert AudioBuffer to WAV Blob
const bufferToWav = (abuffer: AudioBuffer): Blob => {
  const numOfChan = abuffer.numberOfChannels;
  const length = abuffer.length * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // write RIFF chunk
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + abuffer.length * numOfChan * 2, true);
  writeString(view, 8, 'WAVE');

  // write fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numOfChan, true);
  view.setUint32(24, abuffer.sampleRate, true);
  view.setUint32(28, abuffer.sampleRate * 2 * numOfChan, true);
  view.setUint16(32, numOfChan * 2, true);
  view.setUint16(34, 16, true);

  // write data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, abuffer.length * numOfChan * 2, true);

  // write interleaved data
  for (i = 0; i < abuffer.numberOfChannels; i++)
    channels.push(abuffer.getChannelData(i));

  offset = 44;
  while (pos < abuffer.length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][pos]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(offset, sample, true);
      offset += 2;
    }
    pos++;
  }

  return new Blob([buffer], { type: 'audio/wav' });
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};
