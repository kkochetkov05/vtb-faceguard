import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, UserCheck, XCircle } from "lucide-react";

export default function ATMUncertainPage() {
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
        <div className="flex flex-col items-center px-6 py-10">
          {/* Warning icon */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-vtb-warning/20">
            <AlertTriangle size={40} className="text-vtb-warning" />
          </div>

          <div className="mt-5 text-center">
            <p className="text-lg font-bold text-white">Это вы?</p>
            <p className="mt-1 text-sm text-white/50">
              Система обнаружила слабое расхождение. Совпадение: 54%
            </p>
          </div>

          {/* Comparison mockup */}
          <div className="mt-6 flex items-center gap-4">
            <div className="text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
                <span className="text-2xl">📷</span>
              </div>
              <p className="mt-2 text-xs text-white/40">Камера</p>
            </div>
            <div className="text-lg font-bold text-vtb-warning">≈</div>
            <div className="text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
                <span className="text-2xl">🪪</span>
              </div>
              <p className="mt-2 text-xs text-white/40">Эталон</p>
            </div>
          </div>

          {/* Notification text */}
          <div className="mt-6 w-full max-w-sm rounded-vtb-sm bg-vtb-warning/10 p-4">
            <p className="text-center text-sm text-vtb-warning">
              Подтвердите, что операцию совершаете именно вы.
              В противном случае операция будет отменена.
            </p>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => navigate("/atm")}
              className="vtb-btn flex items-center gap-2 border border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <XCircle size={16} />
              Нет, отменить
            </button>
            <button
              onClick={() => navigate("/atm/success")}
              className="vtb-btn flex items-center gap-2 bg-vtb-warning text-white hover:bg-vtb-warning/90"
            >
              <UserCheck size={16} />
              Да, это я
            </button>
          </div>
        </div>

        <div className="border-t border-white/5 px-6 py-3 text-center">
          <p className="text-[11px] text-white/20">
            Уведомление отправлено в ВТБ Онлайн
          </p>
        </div>
      </div>
    </div>
  );
}
