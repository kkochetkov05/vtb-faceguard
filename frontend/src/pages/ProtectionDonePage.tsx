import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Landmark,
} from "lucide-react";
import CardBlock from "@/components/ui/CardBlock";
import { useProtection } from "@/context/ProtectionContext";

export default function ProtectionDonePage() {
  const navigate = useNavigate();
  const { referencePhoto, activatedAt } = useProtection();

  return (
    <div className="space-y-6">
      {/* Success hero */}
      <div className="relative overflow-hidden rounded-vtb bg-gradient-to-br from-vtb-success/90 to-emerald-600 p-8 text-white text-center">
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
            <ShieldCheck size={40} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Защита подключена</h1>
            <p className="mt-2 text-sm opacity-80">
              Проверка личности для снятия наличных включена.
              <br />
              Фото сохранено и готово к использованию.
            </p>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/5" />
      </div>

      {/* Reference photo preview */}
      {referencePhoto && (
        <CardBlock>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 border-vtb-success/30">
              <img
                src={referencePhoto}
                alt="Эталонное фото"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-vtb-success" />
                <p className="text-sm font-semibold text-vtb-navy">Эталон загружен</p>
              </div>
              <p className="mt-0.5 text-xs text-vtb-secondary">
                {activatedAt
                  ? new Date(activatedAt).toLocaleString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </p>
            </div>
          </div>
        </CardBlock>
      )}

      {/* What's next */}
      <CardBlock title="Что дальше">
        <div className="space-y-3">
          <p className="text-sm text-vtb-secondary">
            При снятии наличных система сверит лицо с сохранённым фото.
            Если проверка вызовет сомнение, операция будет приостановлена.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => navigate("/protection")}
              className="vtb-btn-outline flex-1"
            >
              <ShieldCheck size={16} />
              К настройкам защиты
            </button>
            <button
              onClick={() => navigate("/atm")}
              className="vtb-btn-primary flex-1"
            >
              <Landmark size={16} />
              Попробовать в банкомате
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </CardBlock>
    </div>
  );
}
