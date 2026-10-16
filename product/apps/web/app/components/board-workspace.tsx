"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import type { BoardItem, LocalGarment } from "./board-types";
import { categoryLabels, categoryLayers } from "./board-types";
import { GarmentUploader } from "./garment-uploader";

const CanvasStage = dynamic(() => import("./canvas-stage").then((module) => module.CanvasStage), { ssr: false });

export function BoardWorkspace() {
  const [garments, setGarments] = useState<LocalGarment[]>([]);
  const [items, setItems] = useState<BoardItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [message, setMessage] = useState("先选择衣物，再点卡片放入画板。拖动、缩放和旋转都不会扣积分。");
  const [adviceReport, setAdviceReport] = useState<{ issue: string; reason: string; suggestion: string }>();

  const selectedItem = items.find((item) => item.id === selectedId);
  const selectedGarment = selectedItem ? garments.find((garment) => garment.id === selectedItem.garmentId) : undefined;

  function replaceOrAddGarment(garment: LocalGarment, position = { x: 260, y: 290 }) {
    // 已知品类（上衣/下装/外套/鞋）互斥；无法判断的“其他”允许同时放入。
    const categoryIsExclusive = garment.category !== "other";
    const sameCategory = categoryIsExclusive ? items.find((item) => item.category === garment.category && !item.locked) : undefined;
    if (categoryIsExclusive && items.some((item) => item.category === garment.category && item.locked)) {
      setMessage(`${categoryLabels[garment.category]}已锁定，请先解锁或删除后再替换。`);
      return;
    }
    const next: BoardItem = {
      id: `${garment.id}-${Date.now()}`,
      garmentId: garment.id,
      ...position,
      scale: 1,
      rotation: 0,
      layer: categoryLayers[garment.category],
      locked: false,
      category: garment.category
    };
    setItems((current) => [...current.filter((item) => item.id !== sameCategory?.id), next]);
    setSelectedId(next.id);
    setMessage(`${categoryLabels[garment.category]}已放入画板。`);
  }

  function updateItem(itemId: string, update: Partial<BoardItem>) {
    setItems((current) => current.map((item) => item.id === itemId ? { ...item, ...update } : item));
    setAdviceReport(undefined);
  }

  function generateLocalAdvice() {
    if (items.length < 2) return;
    const unlockedAlternative = garments.find((garment) =>
      !items.some((item) => item.garmentId === garment.id) && !items.some((item) => item.category === garment.category && item.locked)
    );
    const focus = items.find((item) => !item.locked) ?? items[items.length - 1];
    const focusGarment = garments.find((garment) => garment.id === focus?.garmentId);
    setAdviceReport({
      issue: `${focusGarment?.name ?? "当前单品"} 可以再试一个替换方案`,
      reason: "先从颜色和上下比例入手，减少同一视觉区域的重量感。",
      suggestion: unlockedAlternative ? `试试衣物栏中的「${unlockedAlternative.name}」` : "衣物栏暂时没有未上板的替换项，可以继续拖动调整。"
    });
    setMessage("建议已生成；画板不会被 AI 自动修改，你可以自己决定是否替换。");
  }

  const adviceEnabled = items.length >= 2;
  const itemCountLabel = useMemo(() => `${garments.length} 件`, [garments.length]);

  return (
    <section className="workspace" id="workspace" aria-label="换装画板工作区">
      <aside className="panel wardrobe-panel" aria-labelledby="wardrobe-heading">
        <div className="panel-heading">
          <div><p className="section-kicker">第一步</p><h2 id="wardrobe-heading">衣物栏</h2></div>
          <span className="count">{itemCountLabel}</span>
        </div>
        <GarmentUploader onGarmentsChange={setGarments} />
        {garments.length > 0 ? (
          <div className="wardrobe-list" aria-label="已选择的衣物卡">
            {garments.map((garment) => (
              <div className="wardrobe-card" key={garment.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/garment-id", garment.id)}>
                <img src={garment.url} alt="" />
                <div><strong>{garment.name}</strong><span>{categoryLabels[garment.category]}</span></div>
                <button className="card-action" type="button" onClick={() => replaceOrAddGarment(garment, { x: 220 + (items.length % 3) * 75, y: 230 + (items.length % 2) * 95 })}>放入</button>
              </div>
            ))}
          </div>
        ) : null}
      </aside>

      <section className="canvas-panel" aria-labelledby="canvas-heading">
        <div className="panel-heading">
          <div><p className="section-kicker">第二步</p><h2 id="canvas-heading">搭配画板</h2></div>
          <span className="canvas-note">固定模特 · {items.length} 件上板</span>
        </div>
        <div
          className="canvas canvas-konva"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const garmentId = event.dataTransfer.getData("text/garment-id");
            const garment = garments.find((candidate) => candidate.id === garmentId);
            if (!garment) return;
            replaceOrAddGarment(garment, { x: 220 + (items.length % 3) * 75, y: 230 + (items.length % 2) * 95 });
          }}
        >
          <CanvasStage
            garments={garments}
            items={items}
            width={520}
            height={560}
            {...(selectedId ? { selectedId } : {})}
            onSelect={setSelectedId}
            onMove={(itemId, x, y) => updateItem(itemId, { x, y })}
            onTransform={(itemId, scale, rotation) => updateItem(itemId, { scale, rotation })}
          />
        </div>
        <div className="canvas-controls" aria-label="选中单品控制">
          <span className="selection-label">{selectedGarment ? `已选：${selectedGarment.name}` : "点击画板中的单品进行编辑"}</span>
          {selectedItem ? <>
            <button className="card-action" type="button" onClick={() => updateItem(selectedItem.id, { locked: !selectedItem.locked })}>{selectedItem.locked ? "解锁" : "锁定"}</button>
            <button className="card-action" type="button" onClick={() => updateItem(selectedItem.id, { rotation: selectedItem.rotation + 15 })}>旋转</button>
            <button className="card-action card-action-danger" type="button" onClick={() => { setItems((current) => current.filter((item) => item.id !== selectedItem.id)); setSelectedId(undefined); }}>删除</button>
          </> : null}
        </div>
        <p className="workspace-message" role="status">{message}</p>
      </section>

      <aside className="panel advice-panel" aria-labelledby="advice-heading">
        <div className="panel-heading"><div><p className="section-kicker">第三步</p><h2 id="advice-heading">搭配建议</h2></div></div>
        {adviceReport ? (
          <article className="advice-report" aria-live="polite">
            <p className="report-label">问题单品</p>
            <strong>{adviceReport.issue}</strong>
            <p className="report-label">理由</p>
            <p>{adviceReport.reason}</p>
            <p className="report-label">可以试试</p>
            <p>{adviceReport.suggestion}</p>
          </article>
        ) : (
          <div className="empty-state">
            <strong>{adviceEnabled ? "可以开始检查这套搭配" : "先搭一套，再来问 AI"}</strong>
            <p>{adviceEnabled ? "建议会点名问题单品，并只推荐衣物栏中未锁定的具体替换项。" : "画板上至少放两件衣物后，建议按钮会启用。"}</p>
          </div>
        )}
        <button className="button button-primary" type="button" disabled={!adviceEnabled} onClick={generateLocalAdvice}>生成建议{adviceReport ? "（再试一次）" : ""}</button>
      </aside>
    </section>
  );
}
