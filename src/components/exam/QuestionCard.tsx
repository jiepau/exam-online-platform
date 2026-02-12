import { Flag } from "lucide-react";
import MathText from "./MathText";

interface QuestionCardProps {
  questionNumber: number;
  totalQuestions: number;
  text: string;
  imageUrl?: string;
  options: string[];
  selectedAnswer?: number;
  isFlagged: boolean;
  onAnswer: (optionIndex: number) => void;
  onToggleFlag: () => void;
}

const QuestionCard = ({
  questionNumber,
  totalQuestions,
  text,
  imageUrl,
  options,
  selectedAnswer,
  isFlagged,
  onAnswer,
  onToggleFlag,
}: QuestionCardProps) => {
  return (
    <div className="rounded-xl bg-card p-6 shadow-md border border-border">
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
          Soal {questionNumber} / {totalQuestions}
        </span>
        <button
          onClick={onToggleFlag}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            isFlagged
              ? "bg-warning/10 text-warning"
              : "bg-muted text-muted-foreground hover:bg-secondary"
          }`}
        >
          <Flag className="h-4 w-4" />
          {isFlagged ? "Ditandai" : "Tandai Ragu"}
        </button>
      </div>

      <div className="mb-6 whitespace-pre-line text-base leading-relaxed text-foreground">
        <MathText text={text} />
        {imageUrl && (
          <img src={imageUrl} alt="Gambar soal" className="mt-3 max-h-64 rounded-lg border border-border object-contain" />
        )}
      </div>

      <div className="space-y-3">
        {options.map((option, index) => {
          const letter = String.fromCharCode(65 + index);
          const isSelected = selectedAnswer === index;
          return (
            <button
              key={index}
              onClick={() => onAnswer(index)}
              className={`flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/30 hover:bg-exam-surface"
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {letter}
              </span>
              <span className="pt-1 text-sm leading-relaxed"><MathText text={option} /></span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionCard;
