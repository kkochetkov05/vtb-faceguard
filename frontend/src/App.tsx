import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectionProvider } from "./context/ProtectionContext";
import VTBLayout from "./components/VTBLayout";
import DashboardPage from "./pages/DashboardPage";
import ProtectionPage from "./pages/ProtectionPage";
import SetupPage from "./pages/SetupPage";
import CapturePage from "./pages/CapturePage";
import ProtectionDonePage from "./pages/ProtectionDonePage";
import ATMPage from "./pages/ATMPage";
import ATMSuccessPage from "./pages/ATMSuccessPage";
import ATMUncertainPage from "./pages/ATMUncertainPage";
import ATMBlockedPage from "./pages/ATMBlockedPage";
import NotFoundPage from "./pages/NotFoundPage";

/**
 * Карта экранов:
 *
 *  /                      → Главная (мои карты, баланс)
 *  /protection            → ВТБ Защита (описание + toggle)
 *  /protection/setup      → Подключение защиты (шаги)
 *  /protection/capture    → Загрузка эталонного фото (drag & drop)
 *  /protection/done       → Защита подключена (success)
 *  /atm                   → Симулятор банкомата
 *  /atm/success           → Верификация пройдена
 *  /atm/uncertain         → «Это вы?» (слабое подозрение)
 *  /atm/blocked           → Операция задержана (несовпадение/spoof)
 */
export default function App() {
  return (
    <ProtectionProvider>
      <VTBLayout>
        <Routes>
          {/* Банк */}
          <Route path="/" element={<DashboardPage />} />
          <Route path="/protection" element={<ProtectionPage />} />
          <Route path="/protection/setup" element={<Navigate to="/protection/capture" replace />} />
          <Route path="/protection/capture" element={<CapturePage />} />
          <Route path="/protection/done" element={<ProtectionDonePage />} />

          {/* Банкомат */}
          <Route path="/atm" element={<ATMPage />} />
          <Route path="/atm/success" element={<ATMSuccessPage />} />
          <Route path="/atm/uncertain" element={<ATMUncertainPage />} />
          <Route path="/atm/blocked" element={<ATMBlockedPage />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </VTBLayout>
    </ProtectionProvider>
  );
}
