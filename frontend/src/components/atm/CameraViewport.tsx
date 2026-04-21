/**
 * Зона камеры банкомата — live preview + capture + upload fallback.
 *
 * Два режима ввода:
 *   "camera"  — live <video> с getUserMedia, capture через canvas
 *   "upload"  — drag-and-drop / file input (fallback если камера недоступна)
 *
 * Props:
 *   phase        — текущая фаза ATM state machine
 *   onCapture    — callback: передаёт Blob кадра родителю
 *   disabled     — блокировать переключение/capture
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  Camera,
  Scan,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Upload,
  AlertTriangle,
  MonitorOff,
  ChevronDown,
} from "lucide-react";
import type { ATMPhase } from "@/services/atmService";

/* ─── Types ─── */

type InputMode = "camera" | "upload";

type CameraStatus =
  | "initializing"
  | "active"
  | "error_permission"
  | "error_not_found"
  | "error_other"
  | "stopped";

interface CameraDevice {
  deviceId: string;
  label: string;
}

interface Props {
  phase: ATMPhase;
  onCapture?: (blob: Blob) => void;
  disabled?: boolean;
}

/* ─── Helpers ─── */

function friendlyDeviceLabel(d: MediaDeviceInfo, idx: number): string {
  if (d.label) return d.label;
  return `Камера ${idx + 1}`;
}

function cameraErrorMessage(status: CameraStatus): string {
  switch (status) {
    case "error_permission":
      return "Доступ к камере запрещён. Разрешите в настройках браузера.";
    case "error_not_found":
      return "Камера не найдена. Подключите устройство или используйте загрузку фото.";
    case "error_other":
      return "Не удалось запустить камеру. Попробуйте обновить страницу.";
    default:
      return "";
  }
}

/* ─── Component ─── */

export default function CameraViewport({ phase, onCapture, disabled }: Props) {
  /* --- State --- */
  const [mode, setMode] = useState<InputMode>("camera");
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("stopped");
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadBlob, setUploadBlob] = useState<Blob | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  /* --- Refs --- */
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* --- Derived state --- */
  const isActive = phase !== "idle";
  const isScanning = phase === "verifying";
  const showResult =
    phase === "approved" || phase === "uncertain" || phase === "blocked";
  const cameraReady = cameraStatus === "active";
  const cameraError =
    cameraStatus === "error_permission" ||
    cameraStatus === "error_not_found" ||
    cameraStatus === "error_other";

  /* ─── Enumerate devices ─── */

  const enumerateDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const cams = all
        .filter((d) => d.kind === "videoinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: friendlyDeviceLabel(d, i),
        }));
      setDevices(cams);
      // Preserve selection; if current selection gone, pick first
      if (cams.length > 0) {
        setSelectedDeviceId((prev) => {
          if (cams.find((c) => c.deviceId === prev)) return prev;
          return cams[0].deviceId;
        });
      }
    } catch {
      setDevices([]);
    }
  }, []);

  /* ─── Start / stop camera ─── */

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus("stopped");
  }, []);

  const startCamera = useCallback(
    async (deviceId?: string) => {
      // Stop existing stream first
      stopCamera();
      setCameraStatus("initializing");

      try {
        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
            : { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        };

        const stream =
          await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setCameraStatus("active");

        // Re-enumerate to get labels (browser shows labels after permission granted)
        await enumerateDevices();
      } catch (err: unknown) {
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setCameraStatus("error_permission");
        } else if (
          name === "NotFoundError" ||
          name === "OverconstrainedError" ||
          name === "DevicesNotFoundError"
        ) {
          setCameraStatus("error_not_found");
        } else {
          setCameraStatus("error_other");
        }
      }
    },
    [stopCamera, enumerateDevices],
  );

  /* ─── Effects ─── */

  // Start camera when mode = "camera" on mount
  useEffect(() => {
    if (mode === "camera") {
      enumerateDevices();
      startCamera(selectedDeviceId || undefined);
    }
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Switch device
  useEffect(() => {
    if (mode === "camera" && selectedDeviceId && cameraStatus !== "initializing") {
      startCamera(selectedDeviceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId]);

  // Auto-switch to upload on camera error
  useEffect(() => {
    if (cameraError) {
      // Don't auto-switch immediately — show error first
    }
  }, [cameraError]);

  /* ─── Capture frame from video ─── */

  const captureFrame = useCallback((): Blob | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraReady) return null;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Sync conversion to blob via toBlob callback
    let blob: Blob | null = null;
    canvas.toBlob(
      (b) => {
        blob = b;
      },
      "image/jpeg",
      0.92,
    );

    // toBlob is async — use dataURL as fallback
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const byteString = atob(dataUrl.split(",")[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: "image/jpeg" });
  }, [cameraReady]);

  /** Expose capture: returns blob from camera or upload */
  const doCapture = useCallback((): Blob | null => {
    if (mode === "camera") {
      return captureFrame();
    }
    // Upload mode — return uploaded blob
    return uploadBlob;
  }, [mode, captureFrame, uploadBlob]);

  // Expose doCapture via onCapture callback when ATMDemoPage requests it
  // We'll use an imperative pattern: parent sets a "capture requested" flag,
  // but simpler approach: parent calls onCapture on button click,
  // and we provide the blob via a ref or direct call.
  // Actually, let's expose via a different pattern —
  // Parent passes onCapture, and we call it. But parent needs to trigger it.
  // Simplest: expose a getCapturedFrame function via ref.

  // For simplicity, let's use a different approach:
  // CameraViewport exposes its current "capturable blob" via a callback
  // when the parent requests it. We'll use useImperativeHandle.

  /* ─── Upload handlers ─── */

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploadBlob(file);
    const url = URL.createObjectURL(file);
    setUploadPreview(url);
  }, []);

  const handleFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const clearUpload = useCallback(() => {
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    setUploadPreview(null);
    setUploadBlob(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [uploadPreview]);

  /* ─── Expose capture to parent ─── */
  // Parent calls onCapture when user clicks "Приложить карту".
  // We need a way for parent to GET the frame at click time.
  // Let's use a pattern where CameraViewport has a getFrame() method
  // exposed via a global or ref. For MVP simplicity, we'll put
  // the capture logic in the parent and pass videoRef up... no.
  //
  // Cleanest MVP: CameraViewport stores the capture method in a ref
  // passed by parent. Let's change approach — parent will call
  // a function we attach to window for simplicity. Actually no.
  //
  // Best approach: CameraViewport renders a hidden canvas,
  // and exports a getFrame() via useImperativeHandle.
  // But that requires forwardRef. Let's do it.

  // Actually, simplest approach for MVP:
  // CameraViewport is responsible for capture + upload.
  // It exposes the blob via a callback that the parent can call.
  // We'll attach getFrame to a ref that parent passes in.

  // Let me restructure: the parent will own the capture trigger.
  // CameraViewport just provides the video element and upload state.
  // Parent grabs frame via a ref to getFrame().

  // For maximum simplicity, let's use a global store approach:
  // CameraViewport registers a window.__vtb_capture function.

  useEffect(() => {
    (window as any).__vtb_getFrame = doCapture;
    return () => {
      delete (window as any).__vtb_getFrame;
    };
  }, [doCapture]);

  /* ─── Mode switching ─── */

  const switchToCamera = useCallback(() => {
    clearUpload();
    setMode("camera");
  }, [clearUpload]);

  const switchToUpload = useCallback(() => {
    stopCamera();
    setMode("upload");
  }, [stopCamera]);

  /* ─── Render ─── */

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-gray-900">
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileInput}
      />

      {/* Mode tabs + device selector */}
      <div className="flex flex-col gap-3 border-b border-white/10 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-1">
          <button
            onClick={switchToCamera}
            disabled={disabled}
            className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors
              ${mode === "camera"
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/60"
              } disabled:opacity-30`}
          >
            <Camera size={14} />
            Камера
          </button>
          <button
            onClick={switchToUpload}
            disabled={disabled}
            className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors
              ${mode === "upload"
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/60"
              } disabled:opacity-30`}
          >
            <Upload size={14} />
            Загрузить фото
          </button>
        </div>

        {/* Device selector */}
        {mode === "camera" && (
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              disabled={disabled || cameraStatus === "initializing"}
              className="w-full appearance-none rounded-md border border-white/10 bg-white/5 py-2 pl-3 pr-7 text-[11px] text-white/70 focus:border-vtb-primary focus:outline-none disabled:opacity-30 sm:w-auto sm:py-1.5"
            >
              {devices.length === 0 && (
                <option value="">Поиск камер...</option>
              )}
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/40"
            />
          </div>
        )}
      </div>

      {/* Viewport area */}
      <div className="relative aspect-[3/4] w-full sm:aspect-[4/3] lg:aspect-[16/10]">
        {/* ── Camera mode ── */}
        {mode === "camera" && (
          <>
            {/* Video element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 h-full w-full object-cover ${
                showResult ? "brightness-50" : ""
              }`}
              style={{
                display:
                  cameraReady ? "block" : "none",
                transform: "scaleX(-1)",
              }}
            />

            {/* Initializing state */}
            {cameraStatus === "initializing" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-vtb-primary border-t-transparent" />
                  <p className="text-sm text-white/50">Запуск камеры...</p>
                </div>
              </div>
            )}

            {/* Camera error state */}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="flex max-w-xs flex-col items-center gap-3 px-4 text-center">
                  {cameraStatus === "error_permission" ? (
                    <MonitorOff size={40} className="text-vtb-warning/60" />
                  ) : (
                    <AlertTriangle size={40} className="text-vtb-warning/60" />
                  )}
                  <p className="text-sm text-white/50">
                    {cameraErrorMessage(cameraStatus)}
                  </p>
                  <button
                    onClick={switchToUpload}
                    className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 sm:w-auto"
                  >
                    Загрузить фото вместо камеры
                  </button>
                </div>
              </div>
            )}

            {/* Camera stopped (idle with no errors) */}
            {cameraStatus === "stopped" && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-gray-600">
                  <Camera size={48} className="opacity-30" />
                  <p className="text-sm opacity-40">Камера неактивна</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Upload mode ── */}
        {mode === "upload" && (
          <>
            {uploadPreview ? (
              /* Uploaded image preview */
              <div className="absolute inset-0">
                <img
                  src={uploadPreview}
                  alt="Загруженное фото"
                  className={`h-full w-full object-cover ${
                    showResult ? "brightness-50" : ""
                  }`}
                />
                {!isActive && (
                  <button
                    onClick={clearUpload}
                    className="absolute right-3 top-3 rounded-md bg-black/60 px-2.5 py-1 text-xs text-white/70 hover:bg-black/80 transition-colors"
                  >
                    Удалить
                  </button>
                )}
              </div>
            ) : (
              /* Drop zone */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`absolute inset-0 flex cursor-pointer items-center justify-center p-4 transition-colors
                  ${isDragOver ? "bg-vtb-primary/10" : ""}`}
              >
                <div className="flex max-w-xs flex-col items-center gap-3 text-center">
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed transition-colors
                    ${isDragOver ? "border-vtb-primary" : "border-white/20"}`}
                  >
                    <Upload
                      size={28}
                      className={`transition-colors ${isDragOver ? "text-vtb-primary" : "text-white/30"}`}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-white/50">
                      Перетащите фото или нажмите для выбора
                    </p>
                    <p className="mt-1 text-xs text-white/30">
                      JPEG, PNG — до 10 МБ
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Overlays (shared for both modes) ── */}

        {/* Scanning overlay — face oval + animation */}
        {isActive && !showResult && (cameraReady || uploadPreview) && (
          <>
            {/* Scan animation */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-vtb-primary/5 to-transparent animate-pulse" />

            {/* Face oval */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className={`h-[58%] w-[42%] max-w-[11rem] rounded-[50%] border-2 border-dashed transition-all duration-500 sm:h-48 sm:w-36
                  ${isScanning
                    ? "border-vtb-primary animate-pulse scale-105"
                    : "border-white/30"
                  }`}
              />
            </div>

            {/* Scanning indicator */}
            {isScanning && (
              <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/60 px-4 py-2">
                <Scan size={16} className="text-vtb-primary animate-spin" />
                <span className="text-xs font-medium text-white">
                  Анализ лица...
                </span>
              </div>
            )}

            {/* Corner markers */}
            <div className="pointer-events-none absolute left-3 top-3 h-6 w-6 border-l-2 border-t-2 border-white/30 rounded-tl" />
            <div className="pointer-events-none absolute right-3 top-3 h-6 w-6 border-r-2 border-t-2 border-white/30 rounded-tr" />
            <div className="pointer-events-none absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2 border-white/30 rounded-bl" />
            <div className="pointer-events-none absolute bottom-3 right-3 h-6 w-6 border-b-2 border-r-2 border-white/30 rounded-br" />
          </>
        )}

        {/* Result overlays */}
        {phase === "approved" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
            <div className="animate-fade-in flex flex-col items-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-vtb-success/20 sm:h-20 sm:w-20">
                <ShieldCheck size={40} className="text-vtb-success" />
              </div>
              <p className="text-base font-bold text-vtb-success sm:text-lg">
                Верифицировано
              </p>
            </div>
          </div>
        )}

        {phase === "uncertain" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
            <div className="animate-fade-in flex flex-col items-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-vtb-warning/20 sm:h-20 sm:w-20">
                <ShieldAlert size={40} className="text-vtb-warning" />
              </div>
              <p className="text-base font-bold text-vtb-warning sm:text-lg">
                Подозрительно
              </p>
            </div>
          </div>
        )}

        {phase === "blocked" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
            <div className="animate-fade-in flex flex-col items-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-vtb-danger/20 sm:h-20 sm:w-20">
                <ShieldX size={40} className="text-vtb-danger" />
              </div>
              <p className="text-base font-bold text-vtb-danger sm:text-lg">
                Заблокировано
              </p>
            </div>
          </div>
        )}

        {/* ATM label */}
        <div className="pointer-events-none absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded bg-black/40 px-2 py-1">
          <div
            className={`h-2 w-2 rounded-full ${
              cameraReady || uploadPreview
                ? "bg-vtb-success"
                : "bg-vtb-primary"
            }`}
          />
          <span className="text-[10px] font-bold text-white/70">
            {mode === "camera" ? "CAM ATM-00247" : "ФОТО ATM-00247"}
          </span>
        </div>

        {/* Ready indicator (camera active + idle) */}
        {mode === "camera" && cameraReady && phase === "idle" && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-black/40 px-3 py-1.5">
            <div className="h-2 w-2 rounded-full bg-vtb-success animate-pulse" />
            <span className="text-[11px] text-white/60">Камера готова</span>
          </div>
        )}

        {/* Upload ready indicator */}
        {mode === "upload" && uploadPreview && phase === "idle" && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-black/40 px-3 py-1.5">
            <div className="h-2 w-2 rounded-full bg-vtb-success" />
            <span className="text-[11px] text-white/60">
              Фото загружено
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
