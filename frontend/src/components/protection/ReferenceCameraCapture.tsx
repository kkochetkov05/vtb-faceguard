import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  Camera,
  CameraOff,
  ChevronDown,
  RefreshCw,
  Check,
  AlertTriangle,
} from "lucide-react";

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
  disabled?: boolean;
  onCapture: (file: File, previewUrl: string) => void;
}

function friendlyDeviceLabel(d: MediaDeviceInfo, idx: number): string {
  if (d.label) return d.label;
  return `Камера ${idx + 1}`;
}

function cameraErrorMessage(status: CameraStatus): string {
  switch (status) {
    case "error_permission":
      return "Доступ к камере запрещён. Разрешите его в браузере.";
    case "error_not_found":
      return "Камера не найдена. Используйте загрузку файла.";
    case "error_other":
      return "Не удалось запустить камеру. Попробуйте ещё раз.";
    case "stopped":
      return "Камера остановлена.";
    default:
      return "";
  }
}

export default function ReferenceCameraCapture({ disabled, onCapture }: Props) {
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("stopped");
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cameraReady = cameraStatus === "active";
  const cameraError =
    cameraStatus === "error_permission" ||
    cameraStatus === "error_not_found" ||
    cameraStatus === "error_other";

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus("stopped");
  }, []);

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
      if (cams.length > 0) {
        setSelectedDeviceId((prev) => {
          if (cams.find((cam) => cam.deviceId === prev)) return prev;
          return cams[0].deviceId;
        });
      }
    } catch {
      setDevices([]);
    }
  }, []);

  const startCamera = useCallback(
    async (deviceId?: string) => {
      stopCamera();
      setCameraStatus("initializing");

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: deviceId
            ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
            : { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setCameraStatus("active");
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
    [enumerateDevices, stopCamera],
  );

  useEffect(() => {
    enumerateDevices();
    startCamera();
    return () => {
      stopCamera();
    };
  }, [enumerateDevices, startCamera, stopCamera]);

  useEffect(() => {
    if (!selectedDeviceId) return;
    startCamera(selectedDeviceId);
  }, [selectedDeviceId, startCamera]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !cameraReady) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `reference-photo-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        const previewUrl = URL.createObjectURL(blob);
        onCapture(file, previewUrl);
        stopCamera();
      },
      "image/jpeg",
      0.92,
    );
  }, [cameraReady, onCapture, stopCamera]);

  return (
    <div className="overflow-hidden rounded-vtb bg-[#0A0E1A] shadow-vtb-md">
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-white/80">
          <Camera size={16} className="text-vtb-primary" />
          <span className="text-sm font-semibold">Сделать фото</span>
        </div>

        <div className="relative">
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            disabled={disabled || cameraStatus === "initializing"}
            className="appearance-none rounded-md border border-white/10 bg-white/5 py-1.5 pl-3 pr-7 text-[11px] text-white/70 focus:border-vtb-primary focus:outline-none disabled:opacity-30"
          >
            {devices.length === 0 && <option value="">Поиск камер...</option>}
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/40"
          />
        </div>
      </div>

      <div className="relative aspect-[4/3] w-full bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            display: cameraReady ? "block" : "none",
            transform: "scaleX(-1)",
          }}
        />

        {cameraReady && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[68%] w-[36%] rounded-[50%] border-2 border-dashed border-white/50" />
          </div>
        )}

        {cameraStatus === "initializing" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-vtb-primary border-t-transparent" />
              <p className="text-sm text-white/60">Запуск камеры...</p>
            </div>
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="flex max-w-xs flex-col items-center gap-3 text-center">
              <AlertTriangle size={42} className="text-vtb-warning/70" />
              <p className="text-sm text-white/65">
                {cameraErrorMessage(cameraStatus)}
              </p>
            </div>
          </div>
        )}

        {cameraStatus === "stopped" && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-white/40">
              <CameraOff size={42} />
              <p className="text-sm">Камера остановлена</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 px-4 py-4">
        <p className="text-sm text-white/65">
          Смотрите прямо в камеру. Лицо должно целиком находиться внутри овала.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => startCamera(selectedDeviceId || undefined)}
            disabled={disabled || cameraStatus === "initializing"}
            className="vtb-btn-outline border-white/20 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40"
          >
            <RefreshCw size={16} />
            Обновить камеру
          </button>
          <button
            type="button"
            onClick={handleCapture}
            disabled={disabled || !cameraReady}
            className="vtb-btn-primary flex-1 disabled:opacity-40"
          >
            <Check size={16} />
            Использовать этот кадр
          </button>
        </div>
      </div>
    </div>
  );
}
