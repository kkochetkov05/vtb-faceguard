import { useNavigate } from "react-router-dom";
import { CheckCircle2, Banknote, ArrowLeft } from "lucide-react";

const amounts = ["5 000 ₽", "10 000 ₽", "20 000 ₽", "50 000 ₽"];

export default function ATMSuccessPage() {
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
          {/* Success icon */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-vtb-success/20">
            <CheckCircle2 size={40} className="text-vtb-success" />
          </div>

          <div className="mt-5 text-center">
            <p className="text-lg font-bold text-white">Верификация пройдена</p>
            <p className="mt-1 text-sm text-white/50">
              Личность подтверждена. Совпадение: 87%
            </p>
          </div>

          {/* Amount selection */}
          <div className="mt-8 w-full max-w-sm">
            <p className="mb-3 text-center text-sm text-white/60">Выберите сумму снятия</p>
            <div className="grid grid-cols-2 gap-2">
              {amounts.map((amount) => (
                <button
                  key={amount}
                  className="rounded-vtb-sm border border-white/10 bg-white/5 py-3
                             text-sm font-semibold text-white transition-colors
                             hover:border-vtb-success/40 hover:bg-vtb-success/10"
                >
                  {amount}
                </button>
              ))}
            </div>
          </div>

          {/* Mock action */}
          <button
            onClick={() => navigate("/atm")}
            className="mt-6 flex items-center gap-2 rounded-vtb-sm bg-vtb-success px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-vtb-success/90"
          >
            <Banknote size={18} />
            Выдать наличные
          </button>
        </div>

        <div className="border-t border-white/5 px-6 py-3 text-center">
          <p className="text-[11px] text-white/20">Мультикарта •4567 — основной профиль</p>
        </div>
      </div>
    </div>
  );
}
