/**
 * Блок статуса верификации банкомата.
 *
 * Показывает текущее состояние с иконкой, цветом и описанием.
 * Для uncertain — кнопки подтверждения.
 */

import {
  CreditCard,
  Scan,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Loader2,
  UserCheck,
  UserX,
} from "lucide-react";
import type { ATMPhase } from "@/services/atmService";

interface Props {
  phase: ATMPhase;
  confidence: number | null;
  onConfirm?: () => void;      // "Да, это я" (uncertain)
  onDeny?: () => void;          // "Нет, отменить" (uncertain)
  showConfirmationActions?: boolean;
}

const phaseConfig: Record<
  ATMPhase,
  { icon: typeof CreditCard; color: string; bg: string; label: string; description: string }
> = {
  idle: {
    icon: CreditCard,
    color: "text-vtb-secondary",
    bg: "bg-vtb-bg",
    label: "Ожидание",
    description: "Приложите карту к банкомату для начала операции",
  },
  card_inserted: {
    icon: Scan,
    color: "text-vtb-primary",
    bg: "bg-vtb-primary/10",
    label: "Карта принята",
    description: "Посмотрите в камеру для верификации",
  },
  verifying: {
    icon: Loader2,
    color: "text-vtb-primary",
    bg: "bg-vtb-primary/10",
    label: "Проверка личности",
    description: "Анализ биометрических данных...",
  },
  approved: {
    icon: ShieldCheck,
    color: "text-vtb-success",
    bg: "bg-vtb-success/10",
    label: "Операция разрешена",
    description: "Личность подтверждена. Выберите сумму снятия.",
  },
  uncertain: {
    icon: ShieldAlert,
    color: "text-vtb-warning",
    bg: "bg-vtb-warning/10",
    label: "Требуется подтверждение",
    description: "Система не смогла однозначно подтвердить личность.",
  },
  blocked: {
    icon: ShieldX,
    color: "text-vtb-danger",
    bg: "bg-vtb-danger/10",
    label: "Операция задержана",
    description: "Проверка выявила риск. Операция временно приостановлена.",
  },
};

export default function StatusPanel({
  phase,
  confidence,
  onConfirm,
  onDeny,
  showConfirmationActions = true,
}: Props) {
  const cfg = phaseConfig[phase];
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl ${cfg.bg} p-5 transition-all duration-300`}>
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${cfg.bg} ${cfg.color}`}>
          <Icon
            size={24}
            className={phase === "verifying" ? "animate-spin" : ""}
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className={`text-base font-bold ${cfg.color}`}>{cfg.label}</h3>
            {confidence !== null && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cfg.bg} ${cfg.color}`}>
                {confidence.toFixed(0)}%
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-vtb-secondary">{cfg.description}</p>

          {/* Кнопки подтверждения для uncertain */}
          {phase === "uncertain" && showConfirmationActions && (
            <div className="mt-4 flex gap-3">
              <button
                onClick={onDeny}
                className="flex items-center gap-2 rounded-lg border border-vtb-border bg-white px-5 py-2.5 text-sm font-semibold text-vtb-text hover:bg-vtb-bg transition-colors"
              >
                <UserX size={16} />
                Нет, это не я
              </button>
              <button
                onClick={onConfirm}
                className="flex items-center gap-2 rounded-lg bg-vtb-warning px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
              >
                <UserCheck size={16} />
                Да, это я
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
