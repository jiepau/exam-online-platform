import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import MathText from "./MathText";

interface MatchingQuestionProps {
  /** options = ["left|right", "left|right", ...] */
  options: string[];
  /** Current answer: array of right-side indices in student's order */
  selectedAnswer?: number[];
  onAnswer: (value: number[]) => void;
}

/** Parse "left|right" format */
const parsePair = (opt: string) => {
  const idx = opt.indexOf("|");
  if (idx === -1) return { left: opt, right: opt };
  return { left: opt.substring(0, idx), right: opt.substring(idx + 1) };
};

/** Generate a deterministic shuffle from options length */
const getInitialShuffle = (length: number): number[] => {
  const arr = Array.from({ length }, (_, i) => i);
  // Simple shuffle: reverse to make it non-trivial
  return arr.reverse();
};

interface SortableItemProps {
  id: string;
  text: string;
  index: number;
}

const SortableItem = ({ id, text, index }: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm transition-colors ${
        isDragging ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-card hover:border-primary/30"
      }`}
    >
      <span
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing touch-none p-1"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </span>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
        {index + 1}
      </span>
      <span className="flex-1"><MathText text={text} /></span>
    </div>
  );
};

const MatchingQuestion = ({ options, selectedAnswer, onAnswer }: MatchingQuestionProps) => {
  const pairs = options.map(parsePair);
  const rights = pairs.map((p) => p.right);

  // Initialize right-side order
  const [rightOrder, setRightOrder] = useState<number[]>(() => {
    if (selectedAnswer && selectedAnswer.length === pairs.length) return selectedAnswer;
    return getInitialShuffle(pairs.length);
  });

  // Sync when selectedAnswer changes externally (e.g. draft restore)
  useEffect(() => {
    if (selectedAnswer && selectedAnswer.length === pairs.length) {
      setRightOrder(selectedAnswer);
    }
  }, [selectedAnswer, pairs.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rightOrder.indexOf(Number(active.id));
    const newIndex = rightOrder.indexOf(Number(over.id));
    const newOrder = arrayMove(rightOrder, oldIndex, newIndex);
    setRightOrder(newOrder);
    onAnswer(newOrder);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground italic">Seret jawaban di kolom kanan agar sesuai dengan kolom kiri</p>
      <div className="grid grid-cols-2 gap-3">
        {/* Left column - fixed */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Pernyataan</p>
          {pairs.map((pair, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border-2 border-primary/20 bg-primary/5 px-3 py-2.5 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="flex-1"><MathText text={pair.left} /></span>
            </div>
          ))}
        </div>

        {/* Right column - draggable */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Jawaban</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={rightOrder.map(String)} strategy={verticalListSortingStrategy}>
              {rightOrder.map((ri, displayIdx) => (
                <SortableItem
                  key={ri}
                  id={String(ri)}
                  text={rights[ri]}
                  index={displayIdx}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
};

export default MatchingQuestion;
