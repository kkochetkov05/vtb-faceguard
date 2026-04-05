import { Link, useLocation } from "react-router-dom";
import {
  CreditCard,
  Shield,
  Landmark,
  Bell,
  User,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useProtection } from "@/context/ProtectionContext";

/* ───── Sidebar nav items ───── */
const mainNav = [
  { to: "/", label: "Главная", icon: CreditCard },
  { to: "/protection", label: "ВТБ Защита", icon: Shield },
];

const demoNav = [
  { to: "/atm", label: "Банкомат", icon: Landmark },
];

/* ───── Mocked accounts ───── */
const accounts = [
  { name: "Мастер счёт в рублях", number: "•3317", amount: "158 432,50 ₽" },
  { name: "Мультикарта", type: "Дебетовая", number: "•4567", amount: "12 890,00 ₽" },
];

/* ───── VTB Logo SVG ───── */
function VTBLogo() {
  return (
    <svg width="62" height="24" viewBox="0 0 62 24" fill="none" aria-label="ВТБ">
      <rect width="62" height="24" rx="4" fill="transparent" />
      {/* Simplified VTB mark — три полоски + буквы */}
      <line x1="2" y1="6" x2="10" y2="6" stroke="#0066FF" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="2" y1="12" x2="10" y2="12" stroke="#0066FF" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="2" y1="18" x2="7" y2="18" stroke="#0066FF" strokeWidth="2.5" strokeLinecap="round" />
      <text x="15" y="18" fill="#002882" fontSize="16" fontWeight="700" fontFamily="Inter, sans-serif">
        ВТБ
      </text>
    </svg>
  );
}

/* ───── Component ───── */
export default function VTBLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { status } = useProtection();

  return (
    <div className="flex h-screen overflow-hidden bg-vtb-bg">
      {/* ===== Sidebar ===== */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-vtb-border bg-white">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 px-5">
          <VTBLogo />
          <span className="rounded-full bg-vtb-light px-2 py-0.5 text-[10px] font-bold text-vtb-primary">
            ОНЛАЙН
          </span>
        </div>

        {/* Main nav */}
        <nav className="flex-1 space-y-1 px-3 pt-2">
          {mainNav.map(({ to, label, icon: Icon }) => {
            const isActive =
              to === "/"
                ? pathname === "/"
                : pathname === to || pathname.startsWith(to + "/");

            return (
              <Link
                key={to}
                to={to}
                className={isActive ? "vtb-nav-item-active" : "vtb-nav-item"}
              >
                <Icon size={18} />
                {label}
                {/* Protection status badge */}
                {to === "/protection" && status === "active" && (
                  <ShieldCheck size={14} className="ml-auto text-vtb-success" />
                )}
                {to === "/protection" && status === "pending" && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-vtb-warning" />
                )}
              </Link>
            );
          })}

          {/* Separator */}
          <div className="py-3">
            <div className="border-t border-vtb-border" />
          </div>
          <p className="mb-1 px-4 text-[11px] font-semibold uppercase tracking-wider text-vtb-secondary/60">
            Демо
          </p>
          {demoNav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={pathname === to || pathname.startsWith(to + "/")
                ? "vtb-nav-item-active"
                : "vtb-nav-item"}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Accounts (bottom of sidebar) */}
        <div className="border-t border-vtb-border p-4">
          <p className="mb-2 text-xs font-semibold text-vtb-secondary">Счета и карты</p>
          {accounts.map((acc) => (
            <div key={acc.number} className="flex items-center justify-between py-1.5">
              <div>
                <p className="text-xs font-medium text-vtb-text">{acc.name}</p>
                <p className="text-[11px] text-vtb-secondary">{acc.number}</p>
              </div>
              <p className="text-xs font-semibold text-vtb-navy">{acc.amount}</p>
            </div>
          ))}
          <button className="mt-2 flex w-full items-center gap-1.5 rounded-vtb-xs bg-vtb-light px-3 py-2 text-xs font-semibold text-vtb-primary hover:bg-[#D6E4FF] transition-colors">
            <Plus size={14} />
            Открыть новый продукт
          </button>
        </div>
      </aside>

      {/* ===== Main area ===== */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-vtb-border bg-white px-8">
          <div /> {/* Spacer */}
          <div className="flex items-center gap-4">
            <button className="relative rounded-full p-2 text-vtb-secondary hover:bg-vtb-bg transition-colors">
              <Bell size={20} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-vtb-danger" />
            </button>
            <div className="flex items-center gap-2 rounded-full bg-vtb-bg px-3 py-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-vtb-primary text-white">
                <User size={14} />
              </div>
              <span className="text-sm font-medium text-vtb-navy">Кирилл К.</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-3xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
