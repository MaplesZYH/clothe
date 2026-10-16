"use client";

import { useRef, useState, type PointerEvent, type WheelEvent } from "react";

import type { BoardItem, LocalGarment } from "./board-types";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function GarmentNode({ garment, item, selected, onSelect, onMove, onTransform }: {
  garment: LocalGarment;
  item: BoardItem;
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onTransform: (scale: number, rotation: number) => void;
}) {
  const dragStart = useRef<{ pointerX: number; pointerY: number; x: number; y: number } | undefined>(undefined);
  const [dragging, setDragging] = useState(false);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (item.locked) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { pointerX: event.clientX, pointerY: event.clientY, x: item.x, y: item.y };
    setDragging(true);
    onSelect();
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const start = dragStart.current;
    if (start) onMove(start.x + event.clientX - start.pointerX, start.y + event.clientY - start.pointerY);
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragStart.current = undefined;
    setDragging(false);
  }

  function resize(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    onSelect();
    onTransform(clamp(item.scale + (event.deltaY < 0 ? 0.08 : -0.08), 0.45, 2.25), item.rotation);
  }

  return (
    <div
      className={`garment-node${selected ? " garment-node-selected" : ""}${dragging ? " garment-node-dragging" : ""}`}
      style={{ left: item.x, top: item.y, transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${item.scale})`, opacity: item.locked ? 0.82 : 1 }}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={resize}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-label={`${garment.name}${item.locked ? "（已锁定）" : ""}`}
      aria-pressed={selected}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(); }}
    >
      <img src={garment.url} alt={garment.name} draggable={false} />
      {item.locked ? <span className="garment-lock" aria-hidden="true">锁</span> : null}
    </div>
  );
}

export function CanvasStage({ garments, items, width, height, selectedId, onSelect, onMove, onTransform }: {
  garments: LocalGarment[];
  items: BoardItem[];
  width: number;
  height: number;
  selectedId?: string;
  onSelect: (itemId: string) => void;
  onMove: (itemId: string, x: number, y: number) => void;
  onTransform: (itemId: string, scale: number, rotation: number) => void;
}) {
  const garmentMap = new Map(garments.map((garment) => [garment.id, garment]));
  const center = width / 2;

  return (
    <div className="stage" style={{ width, height }} role="application" aria-label="可编辑换装画板">
      <div className="stage-model" aria-hidden="true">
        <span className="stage-head" />
        <span className="stage-body" />
        <span className="stage-leg stage-leg-left" />
        <span className="stage-leg stage-leg-right" />
      </div>
      {items.slice().sort((a, b) => a.layer - b.layer).map((item) => {
        const garment = garmentMap.get(item.garmentId);
        return garment ? <GarmentNode key={item.id} garment={garment} item={item} selected={item.id === selectedId} onSelect={() => onSelect(item.id)} onMove={(x, y) => onMove(item.id, x, y)} onTransform={(scale, rotation) => onTransform(item.id, scale, rotation)} /> : null;
      })}
      {items.length === 0 ? <p className="stage-hint" style={{ left: center - 76, top: height - 55 }}>把衣物卡拖到这里</p> : null}
    </div>
  );
}
