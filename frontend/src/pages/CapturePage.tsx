import { useState, useRef, useCallback, useEffect, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Upload,
  X,
  Loader2,
  AlertCircle,
  RotateCcw,
  ImageIcon,
} from "lucide-react";
import AlertPanel from "@/components/ui/AlertPanel";
import { useProtection } from "@/context/ProtectionContext";
import ReferenceCameraCapture from "@/components/protection/ReferenceCameraCapture";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 10;
type InputMode = "upload" | "camera";

export default function CapturePage() {
  const navigate = useNavigate();
  const { upload, uploadStatus, uploadError } = useProtection();

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---------- local state ---------- */
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("upload");

  const setPreviewFromFile = useCallback((file: File, previewUrl?: string) => {
    setSelectedFile(file);
    setLocalError(null);

    if (previewUrl) {
      setPreview((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return previewUrl;
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPreview((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return reader.result as string;
      });
    };
    reader.readAsDataURL(file);
  }, []);

  /* ---------- helpers ---------- */
  const validateAndSet = useCallback((file: File, previewUrl?: string) => {
    setLocalError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setLocalError("Допустимые форматы: JPEG, PNG, WebP");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setLocalError(`Максимальный размер файла: ${MAX_SIZE_MB} МБ`);
      return;
    }

    setPreviewFromFile(file, previewUrl);
  }, [setPreviewFromFile]);

  const clearSelection = () => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setSelectedFile(null);
    setPreview(null);
    setLocalError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCameraCapture = useCallback((file: File, previewUrl: string) => {
    validateAndSet(file, previewUrl);
  }, [validateAndSet]);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  /* ---------- drag & drop ---------- */
  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSet(file);
  };

  /* ---------- file picker ---------- */
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSet(file);
  };

  /* ---------- upload ---------- */
  const handleUpload = async () => {
    if (!selectedFile) return;
    const ok = await upload(selectedFile);
    if (ok) {
      navigate("/protection/done");
    }
  };

  const isUploading = uploadStatus === "loading";
  const hasError = localError || uploadError;

  return (
    <div className="space-y-5 pb-24 sm:space-y-6 sm:pb-0">
      {/* Back + Title */}
      <div>
        <button
          onClick={() => navigate("/protection")}
          className="mb-3 flex items-center gap-1 text-sm font-medium text-vtb-primary hover:underline"
        >
          <ArrowLeft size={16} />
          Назад
        </button>
        <h1 className="text-xl font-bold text-vtb-navy">Фото для верификации</h1>
        <p className="mt-1 text-sm text-vtb-secondary">
          Загрузите фото лица для защиты снятия наличных
        </p>
      </div>

      {/* Recommendations */}
      <AlertPanel variant="info" title="Рекомендации для фото">
        Смотрите прямо в камеру. Лицо должно быть хорошо освещено.
        Снимите очки и головной убор. Фон — однородный, без посторонних лиц.
      </AlertPanel>

      {!preview && (
        <div className="flex justify-center">
          <div className="inline-flex w-full max-w-xl flex-col rounded-3xl border border-vtb-border bg-white p-1 shadow-vtb-sm sm:w-auto sm:flex-row sm:rounded-full">
            <button
              type="button"
              onClick={() => setInputMode("upload")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                inputMode === "upload"
                  ? "bg-vtb-primary text-white"
                  : "text-vtb-secondary hover:text-vtb-navy"
              }`}
            >
              <Upload size={16} className="mr-2 inline" />
              Загрузить файл
            </button>
            <button
              type="button"
              onClick={() => setInputMode("camera")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                inputMode === "camera"
                  ? "bg-vtb-primary text-white"
                  : "text-vtb-secondary hover:text-vtb-navy"
              }`}
            >
              <Camera size={16} className="mr-2 inline" />
              Сделать фото
            </button>
          </div>
        </div>
      )}

      {/* ═══ Upload area ═══ */}
      {!preview ? (
        inputMode === "upload" ? (
          /* ---------- DROP ZONE ---------- */
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative flex min-h-[320px] cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-vtb
              border-2 border-dashed px-4 py-10 transition-all duration-200 sm:min-h-[420px] sm:py-16
              ${dragOver
                ? "border-vtb-primary bg-vtb-primary/5 scale-[1.01]"
                : "border-vtb-border bg-white hover:border-vtb-primary/40 hover:bg-vtb-bg/50"
              }
            `}
          >
            {/* Decorative background */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
              <Camera size={200} />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className={`
                flex h-16 w-16 items-center justify-center rounded-2xl transition-colors sm:h-20 sm:w-20
                ${dragOver ? "bg-vtb-primary text-white" : "bg-vtb-light text-vtb-primary"}
              `}>
                <Upload size={32} />
              </div>

              <div className="text-center">
                <p className="text-sm font-semibold text-vtb-navy">
                  {dragOver ? "Отпустите файл" : "Перетащите фото сюда"}
                </p>
                <p className="mt-1 text-xs text-vtb-secondary">
                  или нажмите для выбора файла
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full bg-vtb-bg px-2.5 py-1 text-[10px] font-medium text-vtb-secondary">
                  JPEG
                </span>
                <span className="rounded-full bg-vtb-bg px-2.5 py-1 text-[10px] font-medium text-vtb-secondary">
                  PNG
                </span>
                <span className="rounded-full bg-vtb-bg px-2.5 py-1 text-[10px] font-medium text-vtb-secondary">
                  WebP
                </span>
                <span className="text-[10px] text-vtb-secondary">до {MAX_SIZE_MB} МБ</span>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              onChange={onFileChange}
              className="hidden"
            />
          </div>
        ) : (
          <ReferenceCameraCapture
            disabled={isUploading}
            onCapture={handleCameraCapture}
          />
        )
      ) : (
        /* ---------- PREVIEW ---------- */
        <div className="space-y-4">
          <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-vtb bg-gray-900 shadow-vtb-md">
            <div className="relative aspect-[3/4] max-h-[65dvh] min-h-[320px] sm:min-h-0">
              <img
                src={preview}
                alt="Превью фото"
                className="h-full w-full object-cover"
              />

              {/* Face oval overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-[68%] w-[48%] max-w-[12rem] rounded-[50%] border-2 border-dashed border-white/40 sm:w-[46%]" />
              </div>

              {/* Uploading overlay */}
              {isUploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                  <Loader2 size={40} className="animate-spin text-white" />
                  <p className="mt-3 text-sm font-medium text-white">Загрузка...</p>
                </div>
              )}
            </div>

            {/* Remove button */}
            {!isUploading && (
              <button
                onClick={clearSelection}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* File info */}
          {selectedFile && (
            <div className="mx-auto flex max-w-md items-center gap-3 rounded-vtb-sm bg-vtb-bg p-3">
              <ImageIcon size={18} className="text-vtb-secondary" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium text-vtb-navy">{selectedFile.name}</p>
                <p className="text-[11px] text-vtb-secondary">
                  {(selectedFile.size / 1024 / 1024).toFixed(1)} МБ · {selectedFile.type.split("/")[1].toUpperCase()}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {hasError && (
        <div className="flex items-center gap-2 rounded-vtb-sm border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle size={16} className="shrink-0 text-vtb-danger" />
          <p className="text-sm text-vtb-danger">{localError || uploadError}</p>
        </div>
      )}

      {/* Controls */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-vtb-border/60 bg-vtb-bg/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
        {preview && !isUploading && (
          <>
            <button onClick={clearSelection} className="vtb-btn-outline w-full sm:w-auto">
              <RotateCcw size={16} />
              Выбрать другое
            </button>
            <button onClick={handleUpload} className="vtb-btn-primary w-full sm:w-auto">
              <Upload size={16} />
              Сохранить фото
            </button>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
