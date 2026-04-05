import { useNavigate } from "react-router-dom";
import {
  Shield,
  ShieldCheck,
  ScanFace,
  AlertTriangle,
  Lock,
  ChevronRight,
  Loader2,
  RotateCcw,
  CheckCircle2,
  ImageIcon,
} from "lucide-react";
import CardBlock from "@/components/ui/CardBlock";
import StatusChip from "@/components/ui/StatusChip";
import Toggle from "@/components/ui/Toggle";
import FeatureRow from "@/components/ui/FeatureRow";
import { useProtection } from "@/context/ProtectionContext";

const features = [
  {
    icon: <ScanFace size={20} />,
    title: "Распознавание лица",
    subtitle: "Камера банкомата сверяет ваше лицо с эталоном",
  },
  {
    icon: <AlertTriangle size={20} />,
    title: "Защита от подмены",
    subtitle: "Дополнительная проверка в спорных ситуациях",
  },
  {
    icon: <Lock size={20} />,
    title: "Мгновенная блокировка",
    subtitle: "Подозрительная операция сразу приостанавливается",
  },
];

export default function ProtectionPage() {
  const navigate = useNavigate();
  const {
    status,
    toggleStatus,
    referencePhoto,
    activatedAt,
    toggle,
    reset,
  } = useProtection();

  const isOn = status !== "inactive";
  const isLoading = toggleStatus === "loading";

  const handleToggle = async () => {
    if (isLoading) return;

    if (!isOn) {
      // Включаем → после успеха сразу переходим к сохранению фото
      await toggle();
      navigate("/protection/capture");
    } else {
      await toggle();
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-xl font-bold text-vtb-navy">ВТБ Защита</h1>
        <p className="mt-1 text-sm text-vtb-secondary">
          Биометрическая защита снятия наличных
        </p>
      </div>

      {/* Hero-баннер */}
      <div className="relative overflow-hidden rounded-vtb bg-gradient-to-br from-[#001A4D] to-vtb-dark p-6 text-white">
        <div className="relative z-10 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h2 className="text-lg font-bold">Дополнительная защита</h2>
            <p className="mt-1 text-sm opacity-70">
              При снятии наличных система сверяет лицо с сохранённым фото.
              Если проверка вызывает сомнение, операция приостанавливается.
            </p>
          </div>
        </div>
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
      </div>

      {/* Переключатель */}
      <CardBlock>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-vtb-primary" />
            <div>
              <p className="text-sm font-semibold text-vtb-navy">Защита снятия наличных</p>
              <p className="text-xs text-vtb-secondary">
                {status === "active"
                  ? "Услуга подключена"
                  : status === "pending"
                  ? "Ожидает загрузки фото"
                  : "Услуга отключена"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isLoading && (
              <Loader2 size={16} className="animate-spin text-vtb-primary" />
            )}
            <StatusChip
              variant={status === "active" ? "success" : status === "pending" ? "warning" : "neutral"}
              dot
            >
              {status === "active" ? "Активна" : status === "pending" ? "Настройка" : "Выкл"}
            </StatusChip>
            <Toggle checked={isOn} onChange={handleToggle} disabled={isLoading} />
          </div>
        </div>
      </CardBlock>

      {/* Активная защита — инфо */}
      {status === "active" && referencePhoto && (
        <CardBlock>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-vtb-success/30">
              <img
                src={referencePhoto}
                alt="Эталонное фото"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-vtb-success" />
                <p className="text-sm font-semibold text-vtb-navy">Защита подключена</p>
              </div>
              <p className="mt-0.5 text-xs text-vtb-secondary">
                Эталонное фото загружено{" "}
                {activatedAt
                  ? new Date(activatedAt).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : ""}
              </p>
            </div>
            <button
              onClick={() => navigate("/protection/capture")}
              className="vtb-btn-outline text-xs"
            >
              <ImageIcon size={14} />
              Обновить фото
            </button>
          </div>
        </CardBlock>
      )}

      {/* Pending — ещё не загружено фото */}
      {status === "pending" && (
        <CardBlock>
          <div className="space-y-3">
            <p className="text-sm text-vtb-secondary">
              Чтобы включить защиту, сохраните фото лица. Оно будет использоваться при проверке у банкомата.
            </p>
            <button
              onClick={() => navigate("/protection/capture")}
              className="vtb-btn-primary w-full"
            >
              <ScanFace size={18} />
              Настроить защиту
              <ChevronRight size={16} />
            </button>
          </div>
        </CardBlock>
      )}

      {/* Как это работает */}
      <CardBlock title="Как это работает">
        <div className="space-y-1">
          {features.map((f, i) => (
            <FeatureRow key={i} icon={f.icon} title={f.title} subtitle={f.subtitle} />
          ))}
        </div>
      </CardBlock>

      {/* Reset для demo — маленькая кнопка внизу */}
      {status !== "inactive" && (
        <div className="flex justify-center pt-2">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-xs text-vtb-secondary hover:text-vtb-primary transition-colors"
          >
            <RotateCcw size={12} />
            Сбросить состояние
          </button>
        </div>
      )}
    </div>
  );
}
