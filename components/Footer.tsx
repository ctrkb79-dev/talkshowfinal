
import React, { useState } from 'react';
import InfoModal from './InfoModal';

interface FooterProps {
  language: 'bn' | 'en';
}

const Footer: React.FC<FooterProps> = ({ language }) => {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const renderModalContent = () => {
    switch (activeModal) {
      case 'Privacy':
        return (
          <div className="space-y-3">
            <p>{language === 'bn' ? 'আপনার গোপনীয়তা আমাদের কাছে অত্যন্ত গুরুত্বপূর্ণ।' : 'Your privacy is critically important to us.'}</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>{language === 'bn' ? 'আমরা আপনার কোনো অডিও বা টেক্সট ডেটা আমাদের সার্ভারে সংরক্ষণ করি না।' : 'We do not store your audio or text data on our servers.'}</li>
              <li>{language === 'bn' ? 'সমস্ত প্রসেসিং Google Gemini API এর মাধ্যমে সুরক্ষিতভাবে সম্পন্ন হয়।' : 'All processing is securely done via Google Gemini API.'}</li>
              <li>{language === 'bn' ? 'ব্রাউজার রিফ্রেশ করলে বা হিস্টোরি ক্লিয়ার করলে আপনার লোকাল ডেটা মুছে যায়।' : 'Clearing browser history or refreshing wipes your local data.'}</li>
              <li>{language === 'bn' ? 'আপনার আপলোড করা ফাইল সম্পূর্ণ এনক্রিপ্টেড অবস্থায় প্রসেস করা হয়।' : 'Your uploaded files are processed in a fully encrypted state.'}</li>
            </ul>
          </div>
        );
      case 'API':
        return (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-2 animate-pulse">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h4 className="text-lg font-bold text-emerald-400">{language === 'bn' ? 'সিস্টেম সচল আছে' : 'System Operational'}</h4>
            <p className="text-slate-400">
                {language === 'bn' 
                    ? 'Google Gemini AI সার্ভারের সাথে সংযোগ স্থাপিত হয়েছে। আপনি নির্ভয়ে ট্রান্সক্রিপশন করতে পারেন।' 
                    : 'Connected to Google Gemini AI servers. You can transcribe with confidence.'}
            </p>
            <div className="text-xs font-mono bg-black/30 p-2 rounded-lg mt-2">v1.35.0 (Stable)</div>
          </div>
        );
      case 'Shortcuts':
        return (
          <div className="grid grid-cols-1 gap-2">
            {[
              { key: 'Alt + F', action: language === 'bn' ? 'অডিও যোগ করুন (Add Audio)' : 'Add Audio File' },
              { key: 'Alt + R', action: language === 'bn' ? 'রেকর্ড চালু/বন্ধ (Recorder)' : 'Toggle Recorder' },
              { key: 'Alt + K', action: language === 'bn' ? 'স্পটলাইট লিখুন (Spotlight)' : 'Focus Spotlight Input' },
              { key: 'Alt + /', action: language === 'bn' ? 'সার্চ করুন (Search)' : 'Focus Search Bar' },
              { key: 'Alt + D', action: language === 'bn' ? 'ডাউনলোড মেনু (Download)' : 'Toggle Download Menu' },
              { key: 'Alt + H', action: language === 'bn' ? 'হিস্টোরি সেকশন (History)' : 'Scroll to History' },
              { key: 'Alt + ↑', action: language === 'bn' ? 'পেজের উপরে (Page Top)' : 'Scroll to Top' },
              { key: 'Alt + ↓', action: language === 'bn' ? 'পেজের নিচে (Page Bottom)' : 'Scroll to Bottom' },
              { key: 'F1', action: language === 'bn' ? 'প্লে / পজ (Play/Pause)' : 'Play / Pause' },
              { key: 'F2', action: language === 'bn' ? '৫ সেকেন্ড পিছনে (Rewind)' : 'Rewind 5s' },
              { key: 'F3', action: language === 'bn' ? '৫ সেকেন্ড সামনে (Forward)' : 'Forward 5s' },
              { key: 'Alt + S', action: language === 'bn' ? 'ওয়ার্ড ফাইল সেভ (Save Doc)' : 'Save Word Doc' },
            ].map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                <span className="font-mono font-bold text-yellow-400 bg-white/10 px-2 py-1 rounded-lg text-xs min-w-[60px] text-center">{item.key}</span>
                <span className="text-xs font-medium text-slate-300">{item.action}</span>
              </div>
            ))}
          </div>
        );
      case 'About':
        return (
          <div className="text-center space-y-4">
             {/* Profile Image - Circular & Chest Up Crop */}
             <div className="w-32 h-32 mx-auto rounded-full border-[3px] border-white/20 shadow-2xl overflow-hidden relative bg-slate-800 group">
                {/* 
                   IMPORTANT: Replace the src below with your actual image path.
                   Example: src="/your-photo.jpg" (Put file in public folder)
                */}
                <img 
                  src="https://placehold.co/400x400/1e293b/ffffff?text=PHOTO" 
                  alt="LNK CT RAKIB"
                  className="w-full h-full object-cover object-top transform group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 ring-inset ring-2 ring-black/10 rounded-full"></div>
             </div>
             
             <div>
               <h4 className="text-2xl font-black text-white uppercase tracking-wider font-mono bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                 LNK CT RAKIB
               </h4>
               <p className="text-slate-400 text-xs font-bold mt-1 tracking-widest uppercase">
                 {language === 'bn' ? 'বিজিবি এল আই সেল, পিলখানা, ঢাকা' : 'BGB LI Cell, Pilkhana, Dhaka'}
               </p>
             </div>

             <div className="bg-white/5 p-5 rounded-2xl border border-white/10 mt-6 space-y-4 text-left shadow-inner">
                {/* Mobile - Click to Call */}
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <span className="text-green-400 text-xs">📞</span>
                      </div>
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{language === 'bn' ? 'মোবাইল' : 'Mobile'}</span>
                    </div>
                    <a href="tel:01829300000" className="font-mono font-bold text-slate-200 tracking-wide hover:text-green-400 transition-colors">01829300000</a>
                </div>

                {/* WhatsApp - Click to Chat */}
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <span className="text-emerald-400 text-xs">💬</span>
                      </div>
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{language === 'bn' ? 'হোয়াটসঅ্যাপ' : 'WhatsApp'}</span>
                    </div>
                    <a href="https://wa.me/8801829300000" target="_blank" rel="noreferrer" className="font-mono font-bold text-slate-200 tracking-wide hover:text-emerald-400 transition-colors">01829300000</a>
                </div>
                
                {/* Email - Click to Mail */}
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/10 rounded-lg">
                        <span className="text-red-400 text-xs">✉️</span>
                      </div>
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{language === 'bn' ? 'ইমেইল' : 'Email'}</span>
                    </div>
                    <a href="mailto:biduth79@gmail.com" className="font-mono font-bold text-slate-200 text-xs sm:text-sm hover:text-red-400 transition-colors">biduth79@gmail.com</a>
                </div>

                {/* Facebook - Click to Profile */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-600/10 rounded-lg">
                        <span className="text-blue-400 text-xs font-bold">f</span>
                      </div>
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{language === 'bn' ? 'ফেসবুক' : 'Facebook'}</span>
                    </div>
                    <a href="https://www.facebook.com/bidduth79034" target="_blank" rel="noreferrer" className="font-bold text-blue-400 text-xs sm:text-sm hover:underline hover:text-blue-300 transition-colors">bidduth79034</a>
                </div>
             </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (activeModal) {
      case 'Privacy': return language === 'bn' ? 'গোপনীয়তা নীতি' : 'Privacy Policy';
      case 'API': return language === 'bn' ? 'এপিআই স্ট্যাটাস' : 'API Status';
      case 'Shortcuts': return language === 'bn' ? 'কি-বোর্ড শর্টকাট' : 'Keyboard Shortcuts';
      case 'About': return language === 'bn' ? 'ডেভেলপার পরিচিতি' : 'About Developer';
      default: return '';
    }
  };

  return (
    <>
      <footer className="mt-12 pb-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000 relative z-10 w-full clear-both">
        <div className="inline-block p-6 glass-card rounded-3xl transition-all hover:scale-105 hover:rotate-1 group cursor-default shadow-2xl shadow-blue-500/5">
          <p className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-blue-500 transition-colors">
            {language === 'bn' ? 'তৈরি করেছেন' : 'Created by'} <span className="font-black text-slate-800 dark:text-slate-100 border-b-2 border-blue-500/30">Rakib @ Li Cell</span> — 
            <span className="italic ml-2 font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">Powered by Gemini</span>
          </p>
        </div>
        
        <div className="mt-8 flex flex-wrap justify-center gap-6 md:gap-10 text-slate-400 dark:text-slate-500">
          <button onClick={() => setActiveModal('Privacy')} className="text-xs font-bold hover:text-blue-500 cursor-pointer transition-all hover:-translate-y-1 bg-transparent border-none">
            {language === 'bn' ? 'গোপনীয়তা নীতি' : 'Privacy Policy'}
          </button>
          <button onClick={() => setActiveModal('API')} className="text-xs font-bold hover:text-emerald-500 cursor-pointer transition-all hover:-translate-y-1 bg-transparent border-none">
            {language === 'bn' ? 'এপিআই স্ট্যাটাস' : 'API Status'}
          </button>
          <button onClick={() => setActiveModal('Shortcuts')} className="text-xs font-bold hover:text-yellow-500 cursor-pointer transition-all hover:-translate-y-1 bg-transparent border-none">
            {language === 'bn' ? 'কি-বোর্ড শর্টকাট' : 'Key Shortcuts'}
          </button>
          <button onClick={() => setActiveModal('About')} className="text-xs font-bold hover:text-purple-500 cursor-pointer transition-all hover:-translate-y-1 bg-transparent border-none">
            {language === 'bn' ? 'আমার সম্পর্কে' : 'About Me'}
          </button>
        </div>

        <p className="mt-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 dark:text-slate-700 select-none">
          {language === 'bn' ? 'সর্বস্বত্ব সংরক্ষিত' : 'All Rights Reserved'} &copy; 2026
        </p>
      </footer>

      {/* Floating Modal */}
      <InfoModal 
        isOpen={!!activeModal} 
        onClose={() => setActiveModal(null)} 
        title={getTitle()} 
        content={renderModalContent()} 
      />
    </>
  );
};

export default Footer;
