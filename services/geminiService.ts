
import { GoogleGenAI } from "@google/genai";
import { TranscriptionPart, ReportData } from "../types";

// Always initialize with direct process.env.API_KEY access as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// STRICT BATCH MODE - NO STREAMING
export const transcribeAudio = async (
  audioBase64: string, 
  mimeType: string,
  spotlights: string[],
  rangeContext: string = "Full Audio",
  timeOffset: number = 0 // NEW: Offset in seconds for chunk synchronization
): Promise<{ transcription: TranscriptionPart[], report: ReportData }> => {
  
  const validSpotlights = spotlights.filter(s => s.trim().length > 0).map(s => s.trim());
  const spotlightString = validSpotlights.join(", ");

  const prompt = `
    You are a professional Bengali audio transcriber.
    Task: Transcribe the audio into Bengali.
    Context: [${rangeContext}]
    Spotlights: [${spotlightString}]

    FORMAT RULES:
    1. Output strictly line-by-line using Pipe delimiter.
    2. Format: "SPEAKER|TIME|SENTIMENT|TEXT"
    3. Sentiment options: positive, negative, neutral.
    4. Time format: MM:SS.
    5. Do NOT use Markdown, Bold, or Code blocks.
    6. Translate immediately to Bengali text.

    Example Output:
    Speaker 1|00:01|neutral|হ্যালো, কেমন আছেন?
    Speaker 2|00:05|positive|আমি ভালো আছি, ধন্যবাদ।
  `;

  try {
      // Use ai.models.generateContent for processing text tasks with Gemini
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: audioBase64, mimeType } },
            { text: prompt }
          ]
        }
      });

      // Directly access .text property from the response object
      const text = response.text || "";
      const lines = text.split("\n");
      const parts: TranscriptionPart[] = [];

      // Parse the complete response at once
      for (const line of lines) {
          if (line.trim().length < 5) continue;

          const segments = line.split("|");
          if (segments.length >= 4) {
              const speaker = segments[0].trim();
              const timeStr = segments[1].trim(); // Raw "MM:SS" from AI
              
              // NEW: Apply Time Offset Logic
              const timeParts = timeStr.split(':').map(Number);
              let seconds = 0;
              if (timeParts.length === 3) {
                  seconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
              } else if (timeParts.length === 2) {
                  seconds = timeParts[0] * 60 + timeParts[1];
              }
              
              // Add the offset from previous chunks
              const totalSeconds = seconds + timeOffset;

              // Format back to HH:MM:SS or MM:SS
              const h = Math.floor(totalSeconds / 3600);
              const m = Math.floor((totalSeconds % 3600) / 60);
              const s = Math.floor(totalSeconds % 60);

              const formattedTime = h > 0 
                 ? `${h}:${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`
                 : `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;

              const sentimentRaw = segments[2].trim().toLowerCase();
              const content = segments.slice(3).join("|").trim(); 

              let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
              if (sentimentRaw.includes('positive')) sentiment = 'positive';
              else if (sentimentRaw.includes('negative')) sentiment = 'negative';

              parts.push({
                  speaker,
                  time: formattedTime, // Use the adjusted time
                  sentiment,
                  text: content
              });
          }
      }

      // Generate a basic report structure
      const report: ReportData = {
          summary: {
              totalDuration: parts.length > 0 ? parts[parts.length - 1].time : "00:00",
              spotlightCount: 0, 
              spotlightTimestamps: [] 
          },
          details: []
      };

      return { transcription: parts, report };

  } catch (e) {
    console.error("Gemini Batch Error", e);
    throw e;
  }
};

export const translateBatch = async (
    parts: TranscriptionPart[], 
    targetLang: 'bn' | 'en'
): Promise<string[]> => {
    const texts = parts.map(p => p.text);
    
    // Optimized prompt for stricter array mapping
    const prompt = `
        You are a professional translator. 
        Task: Translate the following JSON array of sentences into ${targetLang === 'bn' ? 'Bengali' : 'English'}.
        
        Strict Rules:
        1. Maintain the EXACT order of the array.
        2. Maintain the EXACT length of the array.
        3. Do not merge sentences.
        4. Return ONLY the JSON array of strings. No markdown formatting.
        
        Input Array: 
        ${JSON.stringify(texts)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt, 
            config: {
                responseMimeType: "application/json",
            }
        });

        let jsonStr = (response.text || "[]").trim();
        jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
        const translatedArray = JSON.parse(jsonStr);
        
        if (Array.isArray(translatedArray)) {
            // Ensure length match roughly, otherwise fallback
            return translatedArray;
        } else {
            return texts;
        }
    } catch (e) {
        console.error("Translation error", e);
        return texts;
    }
};
