"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { createClient } from "@/lib/supabase/client";
import type { Modality } from "@/lib/decide/types";
import { cn } from "@/lib/utils";

import {
  DEFAULT_LAYOUT,
  TileBody,
  createDecideTiles,
  type Tile,
} from "./decide-tiles";

const LOCAL_STORAGE_KEY = "decide:dashboard-layout";

function readLocalLayout(): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : null;
  } catch {
    return null;
  }
}

function writeLocalLayout(layout: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // quota / privacy-mode — ignore
  }
}

function reconcileLayout(savedOrder: string[] | null, tiles: Tile[]): string[] {
  const tileIds: string[] = tiles.map((t) => t.id);
  const idSet = new Set<string>(tileIds);
  const order = (savedOrder ?? []).filter((id) => idSet.has(id));
  for (const id of tileIds) {
    if (!order.includes(id)) order.push(id);
  }
  return order;
}

function SortableTile({ tile }: { tile: Tile }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tile.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${tile.span.col}`,
    gridRow: `span ${tile.span.row}`,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl border bg-card p-5 transition-colors",
        "border-[var(--decide-border)] hover:border-[var(--decide-accent)]",
        "min-h-[120px] touch-none",
        isDragging && "shadow-lg"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 cursor-grab rounded-xl active:cursor-grabbing"
        aria-label={`Reorder ${tile.id}`}
      />
      <div className="relative h-full">
        <TileBody tile={tile} />
      </div>
    </div>
  );
}

export interface BentoDashboardProps {
  user: User | null;
  streak?: { current: number; best: number } | null;
  onPickCategory?: (modality: Modality) => void;
}

export function BentoDashboard({ user, streak, onPickCategory }: BentoDashboardProps) {
  const tiles = useMemo(
    () => createDecideTiles({ user, streak, onPickCategory }),
    [user, streak, onPickCategory]
  );

  const [order, setOrder] = useState<string[]>(() =>
    reconcileLayout(DEFAULT_LAYOUT, tiles)
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const local = readLocalLayout();
      if (local && !cancelled) setOrder(reconcileLayout(local, tiles));

      if (!user?.id) return;
      const supabase = createClient();
      const { data, error } = await supabase
        .from("user_dashboard_layout")
        .select("layout")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled && !error && data?.layout) {
        setOrder(reconcileLayout(data.layout as string[], tiles));
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [user?.id, tiles]);

  const persist = useCallback(
    (nextOrder: string[]) => {
      writeLocalLayout(nextOrder);
      if (!user?.id) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const supabase = createClient();
        await supabase.from("user_dashboard_layout").upsert(
          {
            user_id: user.id,
            layout: nextOrder,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      }, 400);
    },
    [user?.id]
  );

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    []
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setOrder((current) => {
        const oldIndex = current.indexOf(active.id as string);
        const newIndex = current.indexOf(over.id as string);
        if (oldIndex < 0 || newIndex < 0) return current;
        const next = arrayMove(current, oldIndex, newIndex);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const tilesById = useMemo(
    () => Object.fromEntries(tiles.map((t) => [t.id, t])) as Record<string, Tile>,
    [tiles]
  );
  const orderedTiles = order.map((id) => tilesById[id]).filter(Boolean);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={order} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {orderedTiles.map((tile) => (
            <SortableTile key={tile.id} tile={tile} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
