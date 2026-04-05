import { Link } from "react-router-dom";
import { Shield, ArrowUpRight, ArrowDownLeft, Repeat, Smartphone } from "lucide-react";
import CardBlock from "@/components/ui/CardBlock";
import StatusChip from "@/components/ui/StatusChip";

/* ───── Mock data ───── */
const card = {
  name: "Мультикарта",
  number: "**** 4567",
  balance: "158 432,50 ₽",
  cashback: "1 240 ₽",
  status: "active" as const,
};

const quickActions = [
  { icon: ArrowUpRight, label: "Перевод" },
  { icon: ArrowDownLeft, label: "Пополнить" },
  { icon: Repeat, label: "Обмен валют" },
  { icon: Smartphone, label: "Мой телефон" },
];

const recentOps = [
  { name: "Яндекс.Маркет", date: "Сегодня, 14:23", amount: "−2 490 ₽", type: "expense" },
  { name: "Перевод от Андрея", date: "Вчера, 19:05", amount: "+5 000 ₽", type: "income" },
  { name: "Пятёрочка", date: "Вчера, 11:32", amount: "−873 ₽", type: "expense" },
  { name: "ВТБ Кэшбэк", date: "31 мар, 00:00", amount: "+1 240 ₽", type: "income" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Приветствие */}
      <div>
        <h1 className="text-xl font-bold text-vtb-navy">Добрый день, Кирилл</h1>
        <p className="mt-1 text-sm text-vtb-secondary">Все основные операции под контролем</p>
      </div>

      {/* Карта */}
      <div className="relative overflow-hidden rounded-vtb bg-gradient-to-br from-vtb-dark to-[#0055DD] p-6 text-white">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-70">{card.name}</p>
              <p className="mt-1 font-mono text-base tracking-widest">{card.number}</p>
            </div>
            <StatusChip variant="success" dot>Активна</StatusChip>
          </div>
          <div className="mt-6">
            <p className="text-xs opacity-50">Баланс</p>
            <p className="text-3xl font-bold tracking-tight">{card.balance}</p>
          </div>
          <div className="mt-3 flex items-center gap-4 text-sm opacity-70">
            <span>Кэшбэк за месяц: {card.cashback}</span>
          </div>
        </div>
        {/* Decorative circle */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/5" />
      </div>

      {/* Быстрые действия */}
      <div className="grid grid-cols-4 gap-3">
        {quickActions.map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="flex flex-col items-center gap-2 rounded-vtb-sm bg-white p-4 shadow-vtb
                       transition-colors hover:bg-vtb-light"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-vtb-light text-vtb-primary">
              <Icon size={18} />
            </div>
            <span className="text-xs font-medium text-vtb-text">{label}</span>
          </button>
        ))}
      </div>

      {/* Баннер ВТБ Защита */}
      <Link to="/protection" className="block">
        <div className="flex items-center gap-4 rounded-vtb bg-vtb-primary/5 p-4 transition-colors hover:bg-vtb-primary/10">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-vtb-primary/10 text-vtb-primary">
            <Shield size={22} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-vtb-navy">ВТБ Защита снятия наличных</p>
            <p className="mt-0.5 text-xs text-vtb-secondary">
              Подключите дополнительную проверку для защиты средств
            </p>
          </div>
          <StatusChip variant="info">Новое</StatusChip>
        </div>
      </Link>

      {/* Последние операции */}
      <CardBlock title="Последние операции" subtitle="Мультикарта •4567">
        <div className="space-y-0">
          {recentOps.map((op, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-vtb-border/50 py-3 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-vtb-text">{op.name}</p>
                <p className="text-xs text-vtb-secondary">{op.date}</p>
              </div>
              <p className={`text-sm font-semibold ${
                op.type === "income" ? "text-vtb-success" : "text-vtb-text"
              }`}>
                {op.amount}
              </p>
            </div>
          ))}
        </div>
      </CardBlock>
    </div>
  );
}
