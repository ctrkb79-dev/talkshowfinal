
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onValue, remove, set } from 'firebase/database';
import { HistoryItem, Spotlight, ReportHistoryItem } from '../types';

// আপনার প্রদত্ত Firebase কনফিগারেশন এখানে বসানো হয়েছে
const firebaseConfig = {
  apiKey: "AIzaSyBDdQCYcJbzy9S7YmQJf5ZXk7lLHNhBrGw",
  authDomain: "rakib79-1e5e9.firebaseapp.com",
  databaseURL: "https://rakib79-1e5e9-default-rtdb.firebaseio.com", // Auto-generated based on Project ID
  projectId: "rakib79-1e5e9",
  storageBucket: "rakib79-1e5e9.firebasestorage.app",
  messagingSenderId: "87584401594",
  appId: "1:87584401594:web:843399db849acd0b1a3a83"
};

// Check if configured properly
const isConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" && 
                     !firebaseConfig.databaseURL.includes("YOUR_PROJECT_ID");

let db: any;

if (isConfigured) {
    try {
        const app = initializeApp(firebaseConfig);
        db = getDatabase(app);
        console.log("Firebase Connected Successfully!");
    } catch (error) {
        console.error("Firebase Initialization Error:", error);
    }
}

const HISTORY_REF = 'transcription_history';
const SPOTLIGHTS_REF = 'spotlights';
const REPORT_HISTORY_REF = 'report_history';

/**
 * Listen for real-time updates from Firebase (History)
 */
export const subscribeToHistory = (callback: (data: HistoryItem[]) => void) => {
    if (!isConfigured || !db) {
        return () => {}; // Do nothing if no DB
    }

    try {
        const historyRef = ref(db, HISTORY_REF);
        const unsubscribe = onValue(historyRef, (snapshot) => {
            const data = snapshot.val();
            // Handle empty data (null) by returning empty array
            const formattedList: HistoryItem[] = data ? Object.values(data) : [];
            // Sort by ID descending (Date.now() value) to ensure newest first
            formattedList.sort((a, b) => Number(b.id) - Number(a.id));
            callback(formattedList);
        });
        return unsubscribe;
    } catch (e) {
        console.warn("DB Connection Failed, using local storage fallback.");
        return () => {};
    }
};

/**
 * Listen for real-time updates from Firebase (Report History)
 */
export const subscribeToReportHistory = (callback: (data: ReportHistoryItem[]) => void) => {
    if (!isConfigured || !db) return () => {};

    try {
        const reportRef = ref(db, REPORT_HISTORY_REF);
        const unsubscribe = onValue(reportRef, (snapshot) => {
            const data = snapshot.val();
            const formattedList: ReportHistoryItem[] = data ? Object.values(data) : [];
            // Sort by ID descending (Newest first)
            formattedList.sort((a, b) => Number(b.id) - Number(a.id));
            callback(formattedList);
        });
        return unsubscribe;
    } catch (e) {
        console.error("Report History subscription error", e);
        return () => {};
    }
};

/**
 * Listen for real-time updates from Firebase (Spotlights)
 */
export const subscribeToSpotlights = (callback: (data: Spotlight[]) => void) => {
    if (!isConfigured || !db) return () => {};

    try {
        const spotRef = ref(db, SPOTLIGHTS_REF);
        const unsubscribe = onValue(spotRef, (snapshot) => {
            const data = snapshot.val();
            // Firebase stores arrays as objects if keys are indices, or normal arrays.
            // Ensure we return an array.
            const formattedList: Spotlight[] = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
            callback(formattedList);
        });
        return unsubscribe;
    } catch (e) {
        console.error("Spotlight subscription error", e);
        return () => {};
    }
};

/**
 * Save a new transcription
 */
export const addHistoryItemToFirebase = async (item: HistoryItem) => {
    // Fail silently if not configured, so App.tsx can handle local storage
    if (!isConfigured || !db) return;

    try {
        const newRef = ref(db, `${HISTORY_REF}/${item.id}`);
        await set(newRef, item);
    } catch (e: any) {
        console.error("Firebase Save Error", e);
    }
};

/**
 * Save a new Report History Item
 */
export const addReportHistoryToFirebase = async (item: ReportHistoryItem) => {
    if (!isConfigured || !db) return;
    try {
        const newRef = ref(db, `${REPORT_HISTORY_REF}/${item.id}`);
        await set(newRef, item);
    } catch (e) {
        console.error("Firebase Report Save Error", e);
    }
};

/**
 * Save all spotlights (Overwrites list to keep sync simple)
 */
export const saveSpotlightsToFirebase = async (spotlights: Spotlight[]) => {
    if (!isConfigured || !db) return;
    try {
        const spotRef = ref(db, SPOTLIGHTS_REF);
        await set(spotRef, spotlights);
    } catch (e) {
        console.error("Firebase Spotlight Save Error", e);
    }
};

/**
 * Delete a specific transcription history item
 */
export const deleteHistoryItemFromFirebase = async (id: string) => {
    if (!isConfigured || !db) return;
    try {
        const itemRef = ref(db, `${HISTORY_REF}/${id}`);
        await remove(itemRef);
    } catch (e) {
        console.error("Firebase Delete Error", e);
    }
};

/**
 * Delete a specific report history item
 */
export const deleteReportHistoryFromFirebase = async (id: string) => {
    if (!isConfigured || !db) return;
    try {
        const itemRef = ref(db, `${REPORT_HISTORY_REF}/${id}`);
        await remove(itemRef);
    } catch (e) {
        console.error("Firebase Report Delete Error", e);
    }
};
