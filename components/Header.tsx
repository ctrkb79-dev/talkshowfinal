
import React from 'react';
import { ThemeMode } from '../hooks/useTheme';

interface HeaderProps {
  theme: ThemeMode;
  toggleTheme: () => void;
  language: 'bn' | 'en';
  setLanguage: (l: 'bn' | 'en') => void;
  beepEnabled: boolean;
  setBeepEnabled: (v: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ 
  theme, toggleTheme,
  language, setLanguage, 
  beepEnabled, setBeepEnabled 
}) => {
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const getThemeIcon = () => {
    switch(theme) {
      case 'dark': return '🌙';
      case 'office': return '💼';
      default: return '🌞'; // light
    }
  };

  const getThemeTitle = () => {
    switch(theme) {
      case 'dark': return 'Dark Mode';
      case 'office': return 'Office Mode';
      default: return 'Light Mode';
    }
  };

  return (
    <header className="glass-card rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-4 transition-all duration-300">
      <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
        {language === 'bn' ? 'ট্রান্সক্রাইব' : 'Transcribe'}
      </h1>

      <div className="flex flex-wrap justify-center items-center gap-3">
        <button 
          onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
          className="px-4 py-2 glass-card rounded-lg text-sm font-medium hover:bg-white/20 transition-all active:scale-95"
        >
          {language === 'bn' ? 'EN' : 'বাংলা'}
        </button>

        <button 
          onClick={toggleTheme}
          className="p-2 glass-card rounded-lg hover:bg-white/20 transition-all active:scale-95 flex items-center gap-2"
          title={`Switch Theme (${getThemeTitle()})`}
        >
          <span>{getThemeIcon()}</span>
        </button>

        <button 
          onClick={toggleFullscreen}
          className="p-2 glass-card rounded-lg hover:bg-white/20 transition-all active:scale-95"
          title="Fullscreen"
        >
          ⛶
        </button>

        <button 
          onClick={() => setBeepEnabled(!beepEnabled)}
          className={`p-2 glass-card rounded-lg transition-all active:scale-95 ${beepEnabled ? 'text-blue-500' : 'text-slate-400 opacity-50'}`}
          title="Beep Notification"
        >
          🔔
        </button>
      </div>
    </header>
  );
};

export default Header;
