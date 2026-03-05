import { Flag } from "lucide-react";
import MathText from "./MathText";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

type QuestionType = "multiple_choice" | "true_false" | "multiple_select" | "short_answer";

interface QuestionCardProps {
  questionNumber: number;
  totalQuestions: number;
  text: string;
  imageUrl?: string;
  options: string[];
  questionType?: QuestionType;
  selectedAnswer?: number | number[] | string;
  isFlagged: boolean;
  onAnswer: (value: number | number[] | string) => void;
  onToggleFlag: () => void;
}

const QuestionCard = ({
  questionNumber,
  totalQuestions,
  text,
  imageUrl,
  options,
  questionType = "multiple_choice",
  selectedAnswer,
  isFlagged,
  onAnswer,
  onToggleFlag,
}: QuestionCardProps) => {
  const renderMultipleChoice = () => {
    const selected = typeof selectedAnswer === "number" ? selectedAnswer : undefined;
    return (
      <div className="space-y-3">
        {options.map((option, index) => {
          const letter = questionType === "true_false"
            ? (index === 0 ? "B" : "S")
            : String.fromCharCode(65 + index);
          const isSelected = selected === index;
          return (
            <button
              key={index}
              onClick={() => onAnswer(index)}
              className={`flex w-full items-start gap-2 sm:gap-3 rounded-xl border-2 p-3 sm:p-4 text-left transition-all duration-200 ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/30 hover:bg-exam-surface"
              }`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {letter}
              </span>
              <span className="pt-1 text-sm leading-relaxed"><MathText text={option} /></span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderMultipleSelect = () => {
    const selected: number[] = Array.isArray(selectedAnswer) ? selectedAnswer : [];
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground italic">Pilih semua jawaban yang benar</p>
        {options.map((option, index) => {
          const letter = String.fromCharCode(65 + index);
          const isSelected = selected.includes(index);
          return (
            <button
              key={index}
              onClick={() => {
                const newSelected = isSelected
                  ? selected.filter((i) => i !== index)
                  : [...selected, index].sort();
                onAnswer(newSelected);
              }}
              className={`flex w-full items-start gap-2 sm:gap-3 rounded-xl border-2 p-3 sm:p-4 text-left transition-all duration-200 ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/30 hover:bg-exam-surface"
              }`}
            >
              <div className="flex items-center gap-2 shrink-0 mt-0.5">
                <Checkbox checked={isSelected} className="pointer-events-none" />
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {letter}
                </span>
              </div>
              <span className="pt-1 text-sm leading-relaxed"><MathText text={option} /></span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderShortAnswer = () => {
    const value = typeof selectedAnswer === "string" ? selectedAnswer : "";
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground italic">Ketik jawaban singkat Anda</p>
        <Input
          value={value}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder="Ketik jawaban di sini..."
          className="text-base h-12"
          autoComplete="off"
        />
      </div>
    );
  };

  return (
    <div className="rounded-xl bg-card p-4 sm:p-6 shadow-md border border-border">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            Soal {questionNumber} / {totalQuestions}
          </span>
          {questionType !== "multiple_choice" && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {questionType === "true_false" ? "B/S" :
               questionType === "multiple_select" ? "PG Kompleks" :
               questionType === "short_answer" ? "Isian" : ""}
            </span>
          )}
        </div>
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

      <div className="mb-4 sm:mb-6 whitespace-pre-line text-sm sm:text-base leading-relaxed text-foreground">
        <MathText text={text} />
        {imageUrl && (
          <img src={imageUrl} alt="Gambar soal" className="mt-3 max-h-64 rounded-lg border border-border object-contain" />
        )}
      </div>

      {(questionType === "multiple_choice" || questionType === "true_false") && renderMultipleChoice()}
      {questionType === "multiple_select" && renderMultipleSelect()}
      {questionType === "short_answer" && renderShortAnswer()}
    </div>
  );
};

export default QuestionCard;
