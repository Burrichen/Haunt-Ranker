import { useState } from "react";
import type { DragEvent } from "react";
import type { RankingRow as RankingRowData } from "../../utils/rankings";
import { RankingRow } from "./RankingRow";
import "./RankingList.css";

export interface RankingListProps {
  rows: RankingRowData[];
  /** Enables drag-and-drop and the keyboard reorder buttons. */
  isManual: boolean;
  onReorder?: (from: number, to: number) => void;
}

/**
 * The ranking itself.
 *
 * Reordering is offered two ways on purpose: dragging for the obvious
 * gesture, and per-row up/down buttons so the list is still reorderable
 * from the keyboard. Both funnel into the same `onReorder(from, to)`.
 */
export function RankingList({ rows, isManual, onReorder }: RankingListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const reset = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleDrop = (index: number) => (event: DragEvent) => {
    event.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      onReorder?.(dragIndex, index);
    }
    reset();
  };

  return (
    <ol className="ranking-list">
      {rows.map((row, index) => (
        <RankingRow
          key={row.attraction.id}
          row={row}
          position={index + 1}
          reorder={
            isManual
              ? {
                  onMoveUp: () => onReorder?.(index, index - 1),
                  onMoveDown: () => onReorder?.(index, index + 1),
                  canMoveUp: index > 0,
                  canMoveDown: index < rows.length - 1,
                }
              : undefined
          }
          drag={
            isManual
              ? {
                  isDragging: dragIndex === index,
                  isDropTarget: overIndex === index && dragIndex !== index,
                  onDragStart: () => setDragIndex(index),
                  onDragOver: (event: DragEvent) => {
                    event.preventDefault();
                    setOverIndex(index);
                  },
                  onDrop: handleDrop(index),
                  onDragEnd: reset,
                }
              : undefined
          }
        />
      ))}
    </ol>
  );
}
