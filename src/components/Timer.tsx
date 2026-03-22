import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  minutes: number;
  onExpire: () => void;
  label: string;
}

const Timer: React.FC<TimerProps> = ({ minutes, onExpire, label }) => {
  const [timeLeft, setTimeLeft] = useState(minutes * 60);

  useEffect(() => {
    if (timeLeft <= 0) {
      onExpire();
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onExpire]);

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  
  return (
    <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg font-medium border border-red-100">
      <Clock className="w-4 h-4" />
      <span>{label}:</span>
      <span className="font-mono text-lg">{m}:{s.toString().padStart(2, '0')}</span>
    </div>
  );
};

export default Timer;
