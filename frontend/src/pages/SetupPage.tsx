import { useNavigate } from "react-router-dom";
import {
  Camera,
  CheckCircle2,
  ArrowLeft,
  Upload,
} from "lucide-react";
import CardBlock from "@/components/ui/CardBlock";
import AlertPanel from "@/components/ui/AlertPanel";
import { useProtection } from "@/context/ProtectionContext";

export default function SetupPage() {
  const navigate = useNavigate();
  const { status } = useProtection();

  /* Stepper динамически зависит от состояния */
  const steps = [
    { num: 1, label: "Включите услугу", done: status !== "inactive" },
    {
      num: 2,
      label: "Загрузите эталонное фото",
      done: status === "active",
      active: status === "pending",
    },
    { num: 3, label: "Готово", done: status === "active" },
  ];

  return (
    <div className="space-y-6">
      {/* Back + Title */}
      <div>
        <button
          onClick={() => navigate("/protection")}
          className="mb-3 flex items-center gap-1 text-sm font-medium text-vtb-primary hover:underline"
        >
          <ArrowLeft size={16} />
          ВТБ Защита
        </button>
        <h1 className="text-xl font-bold text-vtb-navy">Настройка защиты</h1>
        <p className="mt-1 text-sm text-vtb-secondary">
          Сохраните фото для проверки личности
        </p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-8 bg-vtb-border" />}
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold
                ${s.done
                  ? "bg-vtb-success text-white"
                  : s.active
                  ? "bg-vtb-primary text-white"
                  : "bg-vtb-bg text-vtb-secondary"
                }`}
            >
              {s.done ? <CheckCircle2 size={14} /> : s.num}
            </div>
            <span
              className={`text-xs font-medium ${
                s.active ? "text-vtb-navy" : "text-vtb-secondary"
              }`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      <AlertPanel variant="info" title="Рекомендации для фото">
        Смотрите прямо в камеру. Лицо должно быть хорошо освещено.
        Снимите очки и головной убор.
      </AlertPanel>

      {/* Upload area */}
      <CardBlock title="Эталонное фото">
        <button
          onClick={() => navigate("/protection/capture")}
          className="flex w-full flex-col items-center gap-4 rounded-vtb-sm border-2 border-dashed
                     border-vtb-border bg-vtb-bg/50 py-12 transition-colors
                     hover:border-vtb-primary/40 hover:bg-vtb-primary/5"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-vtb-light text-vtb-primary">
            <Camera size={28} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-vtb-navy">
              Загрузить фото
            </p>
            <p className="mt-1 text-xs text-vtb-secondary">
              Перетащите фото или выберите файл
            </p>
          </div>
        </button>

        <div className="relative my-4 flex items-center">
          <div className="flex-1 border-t border-vtb-border" />
          <span className="px-3 text-xs text-vtb-secondary">или</span>
          <div className="flex-1 border-t border-vtb-border" />
        </div>

        <button
          onClick={() => navigate("/protection/capture")}
          className="vtb-btn-outline w-full"
        >
          <Upload size={16} />
          Выбрать файл вручную
        </button>
      </CardBlock>
    </div>
  );
}
