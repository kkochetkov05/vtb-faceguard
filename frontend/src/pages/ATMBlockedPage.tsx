import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Phone, Lock } from "lucide-react";

export default function ATMBlockedPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/atm")}
        className="flex items-center gap-1 text-sm font-medium text-vtb-primary hover:underline"
      >
        <ArrowLeft size={16} />
        Банкомат
      </button>

      <div className="overflow-hidden rounded-vtb bg-[#0A0E1A] shadow-vtb-md">
        {/* Red top bar */}
        <div className="bg-vtb-danger px-6 py-3">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-white">
            <ShieldAlert size={16} />
            Операция приостановлена
          </div>
        </div>

        <div className="flex flex-col items-center px-6 py-10">
          {/* Danger icon */}
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-vtb-danger/20">
            <Lock size={44} className="text-vtb-danger" />
          </div>

          <div className="mt-5 text-center">
            <p className="text-lg font-bold text-white">Подозрение на мошенничество</p>
            <p className="mt-2 text-sm text-white/50 leading-relaxed">
              Лицо перед камерой не совпадает с зарегистрированным эталоном.<br />
              Совпадение: 12% — операция заблокирована.
            </p>
          </div>

          {/* Details */}
          <div className="mt-6 w-full max-w-sm space-y-2">
            <div className="flex items-center justify-between rounded-vtb-xs bg-white/5 px-4 py-2.5">
              <span className="text-xs text-white/40">Карта</span>
              <span className="text-xs font-medium text-white/70">Мультикарта •4567</span>
            </div>
            <div className="flex items-center justify-between rounded-vtb-xs bg-white/5 px-4 py-2.5">
              <span className="text-xs text-white/40">Запрос</span>
              <span className="text-xs font-medium text-white/70">Снятие 20 000 ₽</span>
            </div>
            <div className="flex items-center justify-between rounded-vtb-xs bg-vtb-danger/10 px-4 py-2.5">
              <span className="text-xs text-vtb-danger/60">Статус</span>
              <span className="text-xs font-semibold text-vtb-danger">Заблокировано</span>
            </div>
          </div>

          {/* Alert message */}
          <div className="mt-6 w-full max-w-sm rounded-vtb-sm border border-vtb-danger/20 bg-vtb-danger/5 p-4">
            <p className="text-center text-sm text-vtb-danger">
              Карта временно заблокирована. Для разблокировки обратитесь в банк
              или подтвердите личность через ВТБ Онлайн.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col items-center gap-3">
            <button className="vtb-btn flex items-center gap-2 bg-vtb-danger text-white hover:bg-vtb-danger/90">
              <Phone size={16} />
              Позвонить в банк
            </button>
            <button
              onClick={() => navigate("/atm")}
              className="text-xs text-white/30 hover:text-white/50 underline"
            >
              Вернуться к банкомату
            </button>
          </div>
        </div>

        <div className="border-t border-white/5 px-6 py-3 text-center">
          <p className="text-[11px] text-white/20">
            Инцидент зафиксирован — 01.04.2026, 09:37 MSK
          </p>
        </div>
      </div>
    </div>
  );
}
