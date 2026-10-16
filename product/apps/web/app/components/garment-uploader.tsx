"use client";

import { useEffect, useState } from "react";

import { validateUploadBatch, type UploadRejection } from "@outfit/domain/upload";

import { inferGarmentCategory, type LocalGarment } from "./board-types";

type Preview = { id: string; name: string; url: string };

const rejectionCopy: Record<UploadRejection, string> = {
  "batch-size": "一次请选择 2–5 张图片。",
  "file-type": "仅支持 JPG 或 PNG 图片。",
  "file-size": "单张图片不能超过 10 MB。",
  "empty-image": "图片看起来是空白的，请换一张。",
  "multiple-garments": "请一件衣服拍一张，不要多件同框。"
};

export function GarmentUploader({ onGarmentsChange }: { onGarmentsChange: (garments: LocalGarment[]) => void }) {
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);

  function selectFiles(files: FileList | null) {
    setNotice(undefined);
    setError(undefined);
    previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    const selected = Array.from(files ?? []);
    const validation = validateUploadBatch({
      files: selected.map((file) => ({
        name: file.name,
        mimeType: file.type,
        byteSize: file.size,
        hasVisibleContent: true,
        detectedGarmentCount: 1
      }))
    });
    if (!validation.ok) {
      setPreviews([]);
      setError(validation.reasons.map((reason) => rejectionCopy[reason]).join(" "));
      return;
    }
    const nextPreviews = selected.map((file) => ({ id: `${file.name}-${file.lastModified}`, name: file.name, url: URL.createObjectURL(file) }));
    setPreviews(nextPreviews);
    onGarmentsChange(nextPreviews.map((preview) => ({ ...preview, category: inferGarmentCategory(preview.name) })));
    setNotice("照片已通过本地预检，下一步会在确认后扣积分并生成衣物卡。" );
  }

  return (
    <div className="uploader">
      <label className="upload-dropzone" htmlFor="garment-files">
        <span className="upload-title">选择 2–5 张衣物照片</span>
        <span className="upload-help">一件一拍，平铺或挂拍，背景尽量干净。</span>
        <span className="button button-secondary">选择照片</span>
      </label>
      <input
        id="garment-files"
        className="visually-hidden"
        type="file"
        accept="image/jpeg,image/png"
        multiple
        onChange={(event) => selectFiles(event.target.files)}
      />
      {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
      {notice ? <p className="form-message form-success" role="status">{notice}</p> : null}
      {previews.length > 0 ? (
        <div className="preview-grid" aria-label="已选择的衣物照片">
          {previews.map((preview) => (
            <figure key={preview.id} className="preview-card">
              <img src={preview.url} alt={preview.name} />
              <figcaption>{preview.name}</figcaption>
            </figure>
          ))}
        </div>
      ) : null}
      <button className="button button-primary" type="button" disabled={previews.length === 0} onClick={() => setNotice("上传接口已预留，配置 Supabase env 后即可开始处理。")}>确认生成衣物图</button>
    </div>
  );
}
