/**
 * Панель последних событий (демо-лог).
 *
 * Показывает хронологию действий банкомата с цветовой индикацией.
 */

import { Activity } from "lucide-react";
import type { ATMEvent } from "@/services/atmService";

interface Props {
  events: ATMEvent[];
}

const typeColors: Record<ATMEvent["type"], string> = {
  info: "bg-vtb-primary",
  success: "bg-vtb-success",
  warning: "bg-vtb-warning",
  danger: "bg-vtb-danger",
};

export default function EventLog({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-vtb-border bg-white p-4">
        <div className="flex items-center gap-2 text-vtb-secondary">
          <Activity size={16} />
          <span className="text-xs font-semibold">Журнал событий</span>
        </div>
        <p className="mt-3 text-center text-xs text-vtb-secondary/60">
          События появятся после начала операции
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-vtb-border bg-white p-4">
      <div className="mb-3 flex items-center gap-2 text-vtb-secondary">
        <Activity size={16} />
        <span className="text-xs font-semibold">Журнал событий</span>
        <span className="ml-auto rounded-full bg-vtb-bg px-2 py-0.5 text-[10px] font-bold text-vtb-secondary">
          {events.length}
        </span>
      </div>

      <div className="max-h-64 space-y-2 overflow-y-auto sm:max-h-72">
        {[...events].reverse().map((ev) => (
          <div
            key={ev.id}
            className="animate-fade-in flex items-start gap-2 rounded-lg bg-vtb-bg/50 px-3 py-2 sm:gap-3"
          >
            <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${typeColors[ev.type]}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-vtb-text">{ev.text}</p>
            </div>
            <span className="shrink-0 pt-0.5 text-[10px] font-mono text-vtb-secondary/60">
              {ev.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
