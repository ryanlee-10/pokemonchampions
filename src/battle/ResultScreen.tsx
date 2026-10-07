import React from 'react';
import { Award, ArrowLeft } from 'lucide-react';

interface ResultScreenProps {
  winner: string;
  onExit: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ winner, onExit }) => {
  return (
    <div className="victory-card flex flex-col items-center justify-center p-6 h-full w-full">
      <Award size={48} className="text-yellow-400 mb-2" />
      <h2 className="text-3xl font-bold text-white mb-4">
        {winner === 'Player' ? 'Victory!' : winner === 'Draw' ? 'Draw!' : 'Defeat!'}
      </h2>
      <button className="btn-primary flex items-center gap-2" onClick={onExit}>
        <ArrowLeft size={16} /> Return to Lobby
      </button>
    </div>
  );
};
