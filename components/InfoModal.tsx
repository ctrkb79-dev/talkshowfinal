
import React from 'react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, title, content }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="glass-card w-full max-w-md rounded-3xl p-6 relative z-10 animate-in zoom-in-95 duration-300 border border-white/20 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-400 hover:bg-red-500/20 hover:text-red-500 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="text-slate-300 leading-relaxed text-sm md:text-base max-h-[60vh] overflow-y-auto custom-scrollbar">
          {content}
        </div>

        {/* Footer (Optional visual element) */}
        <div className="mt-6 pt-4 border-t border-white/5 text-center">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-slate-400 transition-all"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
