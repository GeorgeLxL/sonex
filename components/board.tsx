"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

export interface BoardColumn {
  key: string;
  title: string;
  hint?: string;
}

export interface MoveResult {
  ok: boolean;
  error?: string;
}

interface BoardProps<T> {
  columns: BoardColumn[];
  items: T[];
  getId: (t: T) => string;
  getCol: (t: T) => string;
  getSort: (t: T) => number;
  canDrag?: (t: T) => boolean;
  /** Returning false makes a column an invalid drop target for the item. */
  canDropTo?: (col: string, t: T) => boolean;
  onMove: (t: T, col: string, sortOrder: number) => Promise<MoveResult>;
  renderCard: (t: T) => ReactNode;
  onCardClick?: (t: T) => void;
  columnFooter?: (col: string) => ReactNode;
  /** "row" = horizontal kanban; "grid2" = 2x2 priority matrix. */
  layout?: "row" | "grid2";
}

interface ColumnState<T> {
  [col: string]: T[];
}

function buildState<T>(
  columns: BoardColumn[],
  items: T[],
  getCol: (t: T) => string,
  getSort: (t: T) => number,
): ColumnState<T> {
  const state: ColumnState<T> = {};
  for (const c of columns) state[c.key] = [];
  for (const item of [...items].sort((a, b) => getSort(a) - getSort(b))) {
    const col = getCol(item);
    (state[col] ?? (state[col] = [])).push(item);
  }
  return state;
}

export function Board<T>({
  columns,
  items,
  getId,
  getCol,
  getSort,
  canDrag,
  canDropTo,
  onMove,
  renderCard,
  onCardClick,
  columnFooter,
  layout = "row",
}: BoardProps<T>) {
  const router = useRouter();
  const [state, setState] = useState<ColumnState<T>>(() =>
    buildState(columns, items, getCol, getSort),
  );
  const [active, setActive] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Snapshot for reverting a rejected drop.
  const snapshot = useRef<ColumnState<T> | null>(null);
  // A drop fires a browser click on the card — swallow it.
  const suppressClick = useRef(false);

  useEffect(() => {
    setState(buildState(columns, items, getCol, getSort));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const idToCol = useMemo(() => {
    const map = new Map<string, string>();
    for (const [col, list] of Object.entries(state)) {
      for (const item of list) map.set(getId(item), col);
    }
    return map;
  }, [state, getId]);

  function findItem(id: string): T | null {
    for (const list of Object.values(state)) {
      const found = list.find((i) => getId(i) === id);
      if (found) return found;
    }
    return null;
  }

  function containerOf(overId: string): string | null {
    if (state[overId]) return overId; // column droppable
    return idToCol.get(overId) ?? null;
  }

  function handleDragStart(e: DragStartEvent) {
    const item = findItem(String(e.active.id));
    setActive(item);
    setError(null);
    snapshot.current = state;
  }

  function handleDragOver(e: DragOverEvent) {
    const { active: a, over } = e;
    if (!over) return;
    const activeId = String(a.id);
    const overId = String(over.id);
    const from = idToCol.get(activeId);
    const to = containerOf(overId);
    if (!from || !to || from === to) return;
    const item = findItem(activeId);
    if (!item) return;
    if (canDropTo && !canDropTo(to, item)) return;

    setState((prev) => {
      const fromList = prev[from].filter((i) => getId(i) !== activeId);
      const toList = [...prev[to]];
      const overIndex = toList.findIndex((i) => getId(i) === overId);
      const insertAt = overIndex >= 0 ? overIndex : toList.length;
      toList.splice(insertAt, 0, item);
      return { ...prev, [from]: fromList, [to]: toList };
    });
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active: a, over } = e;
    const item = active;
    setActive(null);
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 150);
    if (!item || !over) {
      if (snapshot.current) setState(snapshot.current);
      return;
    }
    const activeId = String(a.id);
    const overId = String(over.id);
    const col = containerOf(overId) ?? idToCol.get(activeId);
    if (!col) return;

    if (canDropTo && !canDropTo(col, item)) {
      if (snapshot.current) setState(snapshot.current);
      return;
    }

    // Reorder within the final column — computed synchronously from the
    // current state so the persisted sort order matches what is shown.
    const list = [...(state[col] ?? [])];
    const fromIndex = list.findIndex((i) => getId(i) === activeId);
    if (fromIndex >= 0) {
      const overIndex = list.findIndex((i) => getId(i) === overId);
      if (overIndex >= 0 && overIndex !== fromIndex) {
        const [moved] = list.splice(fromIndex, 1);
        const insertAt = list.findIndex((i) => getId(i) === overId);
        list.splice(insertAt >= 0 ? insertAt : list.length, 0, moved);
      }
    }
    const nextState = { ...state, [col]: list };
    setState(nextState);

    // New sort order = midpoint between neighbours in the final list.
    const index = list.findIndex((i) => getId(i) === activeId);
    const prevItem = list[index - 1];
    const nextItem = list[index + 1];
    let sortOrder: number;
    if (!prevItem && !nextItem) sortOrder = 1024;
    else if (!prevItem) sortOrder = getSort(nextItem) - 1;
    else if (!nextItem) sortOrder = getSort(prevItem) + 1;
    else sortOrder = (getSort(prevItem) + getSort(nextItem)) / 2;

    const fromCol = snapshot.current ? (Object.entries(snapshot.current).find(([, l]) => l.some((i) => getId(i) === activeId))?.[0] ?? col) : col;
    if (fromCol === col && snapshot.current) {
      const oldList = snapshot.current[col];
      const oldIndex = oldList.findIndex((i) => getId(i) === activeId);
      if (oldIndex === index) return; // nothing changed
    }

    const result = await onMove(item, col, sortOrder);
    if (!result.ok) {
      if (snapshot.current) setState(snapshot.current);
      setError(result.error ?? "Move failed");
    } else {
      router.refresh();
    }
  }

  const wrapClass =
    layout === "grid2"
      ? "grid gap-3 sm:grid-cols-2"
      : "board-scroll flex min-h-[calc(100vh-15rem)] w-full divide-x divide-line overflow-x-auto";

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {error && (
        <div className="mb-3 rounded border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}
      <div className={wrapClass}>
        {columns.map((col) => (
          <BoardColumnView
            key={col.key}
            column={col}
            items={state[col.key] ?? []}
            getId={getId}
            canDrag={canDrag}
            disabled={active != null && canDropTo ? !canDropTo(col.key, active) : false}
            renderCard={renderCard}
            onCardClick={
              onCardClick
                ? (t: T) => {
                    if (suppressClick.current) return;
                    onCardClick(t);
                  }
                : undefined
            }
            footer={columnFooter?.(col.key)}
            boxed={layout === "grid2"}
          />
        ))}
      </div>
      <DragOverlay>
        {active ? (
          <div className="rotate-2 opacity-90">{renderCard(active)}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function BoardColumnView<T>({
  column,
  items,
  getId,
  canDrag,
  disabled,
  renderCard,
  onCardClick,
  footer,
  boxed,
}: {
  column: BoardColumn;
  items: T[];
  getId: (t: T) => string;
  canDrag?: (t: T) => boolean;
  disabled: boolean;
  renderCard: (t: T) => ReactNode;
  onCardClick?: (t: T) => void;
  footer?: ReactNode;
  /** grid2 quadrants stay as boxes; row kanban columns divide one strip. */
  boxed: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });

  return (
    <div
      className={cn(
        "flex flex-col",
        boxed
          ? "rounded-lg border border-line bg-surface-2/50"
          : "min-w-52 flex-1",
        disabled && "opacity-40",
        isOver && !disabled && (boxed ? "border-accent" : "bg-accent/5"),
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="text-sm font-semibold">{column.title}</span>
        <span className="rounded bg-surface-2 px-1.5 text-xs text-muted">{items.length}</span>
      </div>
      {column.hint && <p className="px-3 pb-1 pt-1 text-[11px] text-muted">{column.hint}</p>}
      <SortableContext items={items.map(getId)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-16 flex-1 flex-col gap-2 p-2">
          {items.map((item) => (
            <SortableCard
              key={getId(item)}
              id={getId(item)}
              disabled={canDrag ? !canDrag(item) : false}
              onClick={onCardClick ? () => onCardClick(item) : undefined}
            >
              {renderCard(item)}
            </SortableCard>
          ))}
        </div>
      </SortableContext>
      {footer && <div className="p-2 pt-0">{footer}</div>}
    </div>
  );
}

function SortableCard({
  id,
  disabled,
  onClick,
  children,
}: {
  id: string;
  disabled: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-40", !disabled && "cursor-grab active:cursor-grabbing")}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}
