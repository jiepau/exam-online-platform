interface QuestionNavProps {
  total: number;
  current: number;
  answers: Record<number, number>;
  flagged: Set<number>;
  onNavigate: (index: number) => void;
}

const QuestionNav = ({ total, current, answers, flagged, onNavigate }: QuestionNavProps) => {
  return (
    <div className="rounded-xl bg-card p-4 shadow-md border border-border">
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Navigasi Soal
      </h3>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: total }, (_, i) => {
          const num = i + 1;
          const isActive = i === current;
          const isAnswered = answers[i] !== undefined;
          const isFlagged = flagged.has(i);

          return (
            <button
              key={i}
              onClick={() => onNavigate(i)}
              className={`relative flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md scale-105"
                  : isAnswered
                  ? "bg-success text-success-foreground"
                  : "bg-muted text-muted-foreground hover:bg-secondary"
              }`}
            >
              {num}
              {isFlagged && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-warning" />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-primary" /> Aktif
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-success" /> Terjawab
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-muted border border-border" /> Belum
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative h-3 w-3 rounded bg-muted border border-border">
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-warning" />
          </span>{" "}
          Ragu
        </div>
      </div>
    </div>
  );
};

export default QuestionNav;
