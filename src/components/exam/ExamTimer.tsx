import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface ExamTimerProps {
  duration: number; // in minutes
  onTimeUp: () => void;
}

const ExamTimer = ({ duration, onTimeUp }: ExamTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(duration * 60);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, onTimeUp]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isWarning = timeLeft <= 300; // 5 minutes warning
  const isCritical = timeLeft <= 60;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-lg font-bold transition-colors ${
        isCritical
          ? "bg-destructive/10 text-destructive animate-pulse"
          : isWarning
          ? "bg-warning/10 text-warning"
          : "bg-exam-surface text-foreground"
      }`}
    >
      <Clock className="h-5 w-5" />
      <span>
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
};

export default ExamTimer;
