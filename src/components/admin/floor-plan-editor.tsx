"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, Square, Circle as CircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { FloorPlan, FloorPlanTable } from "@/lib/types";

const GRID_COLS = 16;
const GRID_ROWS = 10;
const CELL = 40;

type Props = {
  value: FloorPlan;
  onChange: (next: FloorPlan) => void;
};

type DragState = {
  id: string;
  startX: number;
  startY: number;
  startTableX: number;
  startTableY: number;
};

export function FloorPlanEditor({ value, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const tables = value.tables ?? [];
  const selected = selectedId ? tables.find((t) => t.id === selectedId) : null;

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      e.preventDefault();
      const dx = Math.round((e.clientX - drag.startX) / CELL);
      const dy = Math.round((e.clientY - drag.startY) / CELL);
      const nextX = clamp(drag.startTableX + dx, 0, GRID_COLS - 1);
      const nextY = clamp(drag.startTableY + dy, 0, GRID_ROWS - 1);
      const id = drag.id;
      onChange({
        ...value,
        tables: (value.tables ?? []).map((t) =>
          t.id === id ? { ...t, x: nextX, y: nextY } : t,
        ),
      });
    };

    const handleUp = () => {
      dragRef.current = null;
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [value, onChange]);

  const addTable = (shape: "rect" | "circle") => {
    const newTable: FloorPlanTable = {
      id: crypto.randomUUID(),
      label: String(tables.length + 1),
      x: 1,
      y: 1,
      width: shape === "circle" ? 2 : 2,
      height: shape === "circle" ? 2 : 1,
      shape,
      seats: 4,
    };
    onChange({ ...value, tables: [...tables, newTable] });
    setSelectedId(newTable.id);
  };

  const removeTable = (id: string) => {
    onChange({ ...value, tables: tables.filter((t) => t.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };

  const updateTable = (id: string, patch: Partial<FloorPlanTable>) => {
    onChange({
      ...value,
      tables: tables.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    });
  };

  const onTableMouseDown = (e: React.MouseEvent, t: FloorPlanTable) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(t.id);
    dragRef.current = {
      id: t.id,
      startX: e.clientX,
      startY: e.clientY,
      startTableX: t.x,
      startTableY: t.y,
    };
  };

  return (
    <div className="space-y-3">
      <Card size="sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm">Plan de salle</CardTitle>
              <CardDescription className="text-xs">
                Glissez les tables pour les positionner. Cliquez pour les éditer.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => addTable("rect")}>
                <Square className="h-3.5 w-3.5" /> Carrée
              </Button>
              <Button variant="outline" size="sm" onClick={() => addTable("circle")}>
                <CircleIcon className="h-3.5 w-3.5" /> Ronde
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            ref={containerRef}
            className="relative overflow-auto rounded-md border border-border bg-muted/30"
            style={{
              width: GRID_COLS * CELL,
              height: GRID_ROWS * CELL,
              maxWidth: "100%",
              backgroundImage:
                "linear-gradient(rgba(0,0,0,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.05) 1px, transparent 1px)",
              backgroundSize: `${CELL}px ${CELL}px`,
            }}
            onClick={() => setSelectedId(null)}
          >
            {tables.map((t) => (
              <div
                key={t.id}
                onMouseDown={(e) => onTableMouseDown(e, t)}
                className={`absolute flex select-none items-center justify-center text-xs font-bold transition-shadow ${
                  selectedId === t.id
                    ? "ring-2 ring-primary"
                    : "ring-1 ring-border"
                }`}
                style={{
                  left: t.x * CELL,
                  top: t.y * CELL,
                  width: t.width * CELL - 4,
                  height: t.height * CELL - 4,
                  margin: 2,
                  background: t.shape === "circle" ? "#f4ecdb" : "#ebdfc4",
                  borderRadius: t.shape === "circle" ? "50%" : 6,
                  cursor: "grab",
                  color: "#1a1410",
                }}
              >
                <div className="text-center">
                  <div className="text-base leading-none">T{t.label}</div>
                  <div className="text-[9px] font-medium opacity-60">{t.seats} couv.</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selected && (
        <Card size="sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Table T{selected.label}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeTable(selected.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Étiquette">
                <input
                  type="text"
                  value={selected.label}
                  onChange={(e) => updateTable(selected.id, { label: e.target.value })}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                />
              </Field>
              <Field label="Couverts">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={selected.seats}
                  onChange={(e) =>
                    updateTable(selected.id, { seats: Math.max(1, Number(e.target.value) || 1) })
                  }
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                />
              </Field>
              <Field label="Largeur (cases)">
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={selected.width}
                  onChange={(e) =>
                    updateTable(selected.id, { width: clamp(Number(e.target.value) || 1, 1, 6) })
                  }
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                />
              </Field>
              <Field label="Hauteur (cases)">
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={selected.height}
                  onChange={(e) =>
                    updateTable(selected.id, { height: clamp(Number(e.target.value) || 1, 1, 4) })
                  }
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                />
              </Field>
            </div>
          </CardContent>
        </Card>
      )}

      {tables.length === 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Aucune table. Cliquez sur <strong>Carrée</strong> ou <strong>Ronde</strong> pour ajouter.
        </p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
