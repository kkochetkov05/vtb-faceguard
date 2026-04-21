import { useState } from "react";
import {
  AlertTriangle,
  CreditCard,
  Landmark,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserX,
} from "lucide-react";
import CameraViewport from "@/components/atm/CameraViewport";
import EventLog from "@/components/atm/EventLog";
import StatusPanel from "@/components/atm/StatusPanel";
import CardBlock from "@/components/ui/CardBlock";
import AlertPanel from "@/components/ui/AlertPanel";
import { useProtection } from "@/context/ProtectionContext";
import {
  checkFace,
  createEvent,
  type ATMEvent,
  type ATMPhase,
  type VerifyResult,
} from "@/services/atmService";

type CaptureWindow = Window & {
  __vtb_getFrame?: () => Blob | null;
};

type DemoPreset = "live" | "happy" | "fraud" | "review";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const presetMeta: Record<
  DemoPreset,
  { label: string; badge: string; tone: string; description: string }
> = {
  live: {
    label: "Реальная проверка",
    badge: "LIVE",
    tone: "text-vtb-primary border-vtb-primary/30 bg-vtb-primary/10",
    description: "Проверка через текущую камеру, backend и эталонный профиль.",
  },
  happy: {
    label: "Успешная операция",
    badge: "SUCCESS",
    tone: "text-vtb-success border-vtb-success/30 bg-vtb-success/10",
    description: "Стабильный зелёный сценарий для показа успешной проверки.",
  },
  fraud: {
    label: "Подозрительная операция",
    badge: "ALERT",
    tone: "text-vtb-danger border-vtb-danger/30 bg-vtb-danger/10",
    description: "Стабильный красный сценарий для показа защитной задержки.",
  },
  review: {
    label: "Требуется подтверждение",
    badge: "REVIEW",
    tone: "text-vtb-warning border-vtb-warning/30 bg-vtb-warning/10",
    description: "Жёлтый сценарий с подтверждением владельца операции.",
  },
};

function mapDecisionToPhase(decision: VerifyResult["decision"]): ATMPhase {
  switch (decision) {
    case "allow":
      return "approved";
    case "ask_confirmation":
      return "uncertain";
    case "delay_and_alert":
      return "blocked";
  }
}

function metricTone(phase: ATMPhase): string {
  switch (phase) {
    case "approved":
      return "text-vtb-success";
    case "uncertain":
      return "text-vtb-warning";
    case "blocked":
      return "text-vtb-danger";
    default:
      return "text-vtb-primary";
  }
}

function buildPresetResult(preset: DemoPreset): VerifyResult {
  switch (preset) {
    case "happy":
      return {
        decision: "allow",
        title: "Операция разрешена",
        message: "Лицо совпало с эталоном, а проверка живого присутствия пройдена. Можно продолжать выдачу наличных.",
        severity: "green",
        recommended_ui_action: "proceed_cash_withdrawal",
        similarity_score: 0.812,
        normalized_confidence: 96,
        liveness_score: 0.71,
        liveness_status: "passed",
        event_log: [
          "Demo preset selected: happy path",
          "Match score: 0.812",
          "Liveness: passed (0.710)",
          "Green rule triggered: strong match + passed liveness",
        ],
        flags: {
          face_detected: true,
          challenge_face_detected: true,
          multiple_faces: false,
          low_quality: false,
          needs_confirmation: false,
          should_retry: false,
          matched_profile: true,
          spoof_suspected: false,
        },
      };
    case "fraud":
      return {
        decision: "delay_and_alert",
        title: "Операция задержана",
        message: "Проверка выявила высокий риск подмены. Банкомат задерживает операцию и показывает защитное предупреждение.",
        severity: "red",
        recommended_ui_action: "show_delay_alert",
        similarity_score: 0.238,
        normalized_confidence: 18,
        liveness_score: 0.09,
        liveness_status: "failed",
        event_log: [
          "Demo preset selected: fraud path",
          "Match score: 0.238",
          "Liveness: failed (0.090)",
          "Red rule triggered: liveness failed and match is low",
        ],
        flags: {
          face_detected: true,
          challenge_face_detected: true,
          multiple_faces: false,
          low_quality: false,
          needs_confirmation: false,
          should_retry: true,
          matched_profile: false,
          spoof_suspected: true,
        },
      };
    case "review":
      return {
        decision: "ask_confirmation",
        title: "Нужно подтверждение клиента",
        message: "Обнаружено частичное несоответствие. Попросите клиента подтвердить, что операцию выполняет именно он.",
        severity: "yellow",
        recommended_ui_action: "show_confirmation_prompt",
        similarity_score: 0.561,
        normalized_confidence: 67,
        liveness_score: 0.47,
        liveness_status: "passed",
        event_log: [
          "Demo preset selected: review path",
          "Match score: 0.561",
          "Liveness: passed (0.470)",
          "Yellow rule triggered: borderline match",
        ],
        flags: {
          face_detected: true,
          challenge_face_detected: true,
          multiple_faces: false,
          low_quality: false,
          needs_confirmation: true,
          should_retry: true,
          matched_profile: false,
          spoof_suspected: false,
        },
      };
    case "live":
      return {
        decision: "delay_and_alert",
        title: "Live mode",
        message: "Реальный режим должен вернуть ответ backend. Этот сценарий не используется напрямую.",
        severity: "red",
        recommended_ui_action: "show_delay_alert",
        similarity_score: null,
        normalized_confidence: 0,
        liveness_score: null,
        liveness_status: "not_checked",
        event_log: ["Live preset placeholder"],
        flags: {
          face_detected: false,
          challenge_face_detected: false,
          multiple_faces: false,
          low_quality: false,
          needs_confirmation: false,
          should_retry: false,
          matched_profile: false,
          spoof_suspected: false,
        },
      };
  }
}

export default function ATMPage() {
  const { status, profileId } = useProtection();
  const [phase, setPhase] = useState<ATMPhase>("idle");
  const [events, setEvents] = useState<ATMEvent[]>([]);
  const [verification, setVerification] = useState<VerifyResult | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [challengeHint, setChallengeHint] = useState<string | null>(null);
  const [livenessRetryCount, setLivenessRetryCount] = useState(0);
  const [awaitingLivenessRetry, setAwaitingLivenessRetry] = useState(false);
  const [confirmationOutcome, setConfirmationOutcome] = useState<"owner_confirmed" | "owner_denied" | null>(null);
  const [demoPreset, setDemoPreset] = useState<DemoPreset>("live");

  const pushEvent = (text: string, type: ATMEvent["type"] = "info") => {
    setEvents((prev) => [...prev, createEvent(text, type)]);
  };

  const applyVerificationResult = (result: VerifyResult) => {
    setVerification(result);

    const nextPhase = mapDecisionToPhase(result.decision);
    setPhase(nextPhase);

    if (result.decision === "allow") {
      setLivenessRetryCount(0);
      pushEvent(
        `Совпадение подтверждено. Confidence ${result.normalized_confidence.toFixed(0)}%, liveness ${Math.round((result.liveness_score ?? 0) * 100)}%.`,
        "success",
      );
      return;
    }

    if (result.decision === "ask_confirmation") {
      setLivenessRetryCount(0);
      pushEvent(`${result.message} Liveness status: ${result.liveness_status}.`, "warning");
      return;
    }

    setLivenessRetryCount(0);
    pushEvent(`${result.message} Liveness status: ${result.liveness_status}.`, "danger");
  };

  const resetFlow = () => {
    setPhase("idle");
    setVerification(null);
    setRequestError(null);
    setChallengeHint(null);
    setLivenessRetryCount(0);
    setAwaitingLivenessRetry(false);
    setConfirmationOutcome(null);
    setEvents([]);
  };

  const runVerification = async (retryMode = false) => {
    setRequestError(null);
    if (!retryMode) {
      setVerification(null);
      setConfirmationOutcome(null);
      setPhase("card_inserted");
      setChallengeHint("Поверните голову вправо или влево на 10-15°. Простого движения телефона недостаточно.");
      pushEvent("Карта приложена. Банкомат готовит биометрическую проверку.");
    } else {
      setChallengeHint("Поверните голову заметнее и держите лицо в овале. После этого повторите проверку.");
      pushEvent("Повторный liveness challenge: поверните голову заметнее, камера остаётся активной.");
    }

    if (demoPreset !== "live") {
      setAwaitingLivenessRetry(false);
      setChallengeHint(null);
      setPhase("verifying");
      pushEvent(`Активирован demo preset: ${presetMeta[demoPreset].label}.`, "info");
      await wait(650);
      applyVerificationResult(buildPresetResult(demoPreset));
      return;
    }

    if (!profileId || status !== "active") {
      setPhase("blocked");
      pushEvent("Биометрическая защита не подключена. Проверка недоступна.", "danger");
      setRequestError("Сначала подключите ВТБ Защиту и загрузите эталонное фото.");
      return;
    }

    const frameGetter = (window as CaptureWindow).__vtb_getFrame;
    const frame = frameGetter?.() ?? null;

    if (!frame) {
      setPhase("blocked");
      pushEvent("Кадр не получен. Нужна активная камера или загруженное фото.", "warning");
      setRequestError("Не удалось получить кадр. Проверьте камеру или выберите fallback image.");
      return;
    }

    pushEvent("Liveness challenge: поверните голову вправо или влево. Простого сдвига кадра недостаточно.");

    await wait(1100);
    const challengeFrame = frameGetter?.() ?? frame;

    setPhase("verifying");
    pushEvent("Кадры отправлены на backend. Идёт liveness check и сравнение с эталонным профилем.");

    try {
      const result = await checkFace(frame, profileId, challengeFrame);
      setVerification(result);

      const needsLivenessRetry =
        result.liveness_status !== "passed" &&
        result.flags.should_retry &&
        livenessRetryCount === 0;

      if (needsLivenessRetry) {
        setPhase("card_inserted");
        setAwaitingLivenessRetry(true);
        setLivenessRetryCount(1);
        setChallengeHint("Не удалось подтвердить живое присутствие. Поверните голову и повторите проверку, камера уже активна.");
        pushEvent("Первый liveness check не пройден. Просим пользователя повернуть голову и повторить попытку.", "warning");
        return;
      }

      setChallengeHint(null);
      setAwaitingLivenessRetry(false);
      applyVerificationResult(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Ошибка связи с backend.";
      setRequestError(message);
      setChallengeHint(null);
      setAwaitingLivenessRetry(false);
      setLivenessRetryCount(0);
      setPhase("blocked");
      pushEvent(`Проверка не выполнена: ${message}`, "danger");
    }
  };

  const handleInsertCard = async () => {
    await runVerification(false);
  };

  const handleRetryLiveness = async () => {
    await runVerification(true);
  };

  const handleConfirmIdentity = () => {
    setConfirmationOutcome("owner_confirmed");
    setPhase("approved");
    pushEvent("Клиент подтвердил, что операцию выполняет он сам. Банкомат продолжает выдачу наличных.", "success");
  };

  const handleDenyIdentity = () => {
    setConfirmationOutcome("owner_denied");
    setPhase("blocked");
    pushEvent("Клиент указал, что операцию выполняет не он. Запущен усиленный защитный сценарий.", "danger");
  };

  const similarity = verification?.similarity_score;
  const confidence = verification?.normalized_confidence ?? null;
  const livenessScore = verification?.liveness_score ?? null;
  const activePreset = presetMeta[demoPreset];

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-vtb-navy">ATM Demo</h1>
          <span className="rounded-full border border-vtb-primary/20 bg-vtb-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-vtb-primary">
            Демо
          </span>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${activePreset.tone}`}>
            {activePreset.badge}
          </span>
        </div>
        <p className="mt-1 text-sm text-vtb-secondary">
          Биометрическая проверка при снятии наличных
        </p>
      </div>

      <AlertPanel variant="info" title="Демонстрационный режим">
        На этом экране можно показать реальную проверку или заранее подготовленный сценарий.
      </AlertPanel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)]">
        <div className="space-y-4">
          {phase === "idle" && (
            <div className="relative overflow-hidden rounded-vtb border border-vtb-primary/15 bg-gradient-to-br from-white to-vtb-light/70 p-4 shadow-vtb sm:p-6">
              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-vtb-primary/10 text-vtb-primary">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-vtb-navy">Стартовый экран</p>
                    <p className="text-sm text-vtb-secondary">
                      Выберите сценарий и запустите проверку одной кнопкой.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-vtb-sm border border-vtb-border bg-white p-4">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${presetMeta.happy.tone}`}>
                        {presetMeta.happy.badge}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-5 text-vtb-text">
                      Проверка пройдена, операция продолжается.
                    </p>
                  </div>
                  <div className="rounded-vtb-sm border border-vtb-border bg-white p-4">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${presetMeta.review.tone}`}>
                        {presetMeta.review.badge}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-5 text-vtb-text">
                      Система просит владельца подтвердить операцию.
                    </p>
                  </div>
                  <div className="rounded-vtb-sm border border-vtb-border bg-white p-4">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${presetMeta.fraud.tone}`}>
                        {presetMeta.fraud.badge}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-5 text-vtb-text">
                      Проверка выявляет риск, операция задерживается.
                    </p>
                  </div>
                </div>
              </div>
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-vtb-primary/5" />
            </div>
          )}

          <div className="overflow-hidden rounded-vtb bg-[#0A0E1A] shadow-vtb-md">
            <div className="flex flex-col gap-2 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-2 text-white/80">
                <Landmark size={18} className="text-vtb-primary" />
                <span className="text-sm font-semibold">ВТБ ATM Demo</span>
              </div>
              <span className="text-xs text-white/30">ATM #00247</span>
            </div>

            <div className="space-y-5 px-4 py-4 sm:px-6 sm:py-6">
              <CameraViewport phase={phase} disabled={phase === "verifying"} />

              <div className="grid gap-4">
                <StatusPanel
                  phase={phase}
                  confidence={confidence}
                  onConfirm={handleConfirmIdentity}
                  onDeny={handleDenyIdentity}
                  showConfirmationActions={false}
                />

                {/* <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-white">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                    Active mode
                  </p>
                  <p className="mt-2 text-sm text-white/70">
                    {activePreset.description}
                  </p>
                  <div className="mt-4 rounded-lg bg-black/20 px-3 py-2">
                    <p className="text-[11px] text-white/40">Источник эталона</p>
                    <p className="mt-1 text-sm font-medium text-white/85">
                      {demoPreset === "live"
                        ? profileId
                          ? `profile_id: ${profileId}`
                          : "Эталонный профиль не выбран"
                        : `Preset: ${activePreset.label}`}
                    </p>
                  </div>
                </div> */}
              </div>

              {requestError && (
                <div className="rounded-xl border border-vtb-danger/30 bg-vtb-danger/10 px-4 py-3 text-sm text-vtb-danger">
                  {requestError}
                </div>
              )}

              {challengeHint && (
                <div className="rounded-xl border border-vtb-primary/30 bg-vtb-primary/10 px-4 py-3 text-sm text-vtb-primary">
                  <span className="font-semibold">Проверка живого присутствия:</span> {challengeHint}
                </div>
              )}

              {phase === "uncertain" && verification && (
                <div className="rounded-2xl border border-vtb-warning/30 bg-[#1A1408] p-5 text-white shadow-vtb-md">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-vtb-warning/15 text-vtb-warning">
                      <AlertTriangle size={22} />
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-bold text-white">
                        Есть расхождение. Это вы?
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-white/75">
                        Система не смогла однозначно подтвердить личность.
                        Если операцию выполняете вы, подтвердите это. Если нет,
                        банкомат сразу усилит защитный сценарий.
                      </p>
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                        <button
                          onClick={handleDenyIdentity}
                          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
                        >
                          <UserX size={16} />
                          Нет, это не я
                        </button>
                        <button
                          onClick={handleConfirmIdentity}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-vtb-warning px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600 sm:w-auto"
                        >
                          <UserCheck size={16} />
                          Да, это я
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {phase === "approved" && confirmationOutcome === "owner_confirmed" && (
                <div className="rounded-xl border border-vtb-success/30 bg-vtb-success/10 px-4 py-3 text-sm text-vtb-success">
                  Операция подтверждена владельцем карты. Банкомат продолжает выполнение операции в штатном режиме.
                </div>
              )}

              {phase === "blocked" && confirmationOutcome === "owner_denied" && (
                <div className="rounded-xl border border-vtb-danger/30 bg-vtb-danger/10 px-4 py-3 text-sm text-vtb-danger">
                  Клиент подтвердил, что это не он. Операция задержана, карта переводится в усиленный защитный сценарий.
                </div>
              )}

              <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-white/10 bg-[#0A0E1A]/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
                <button
                  onClick={awaitingLivenessRetry ? handleRetryLiveness : handleInsertCard}
                  disabled={phase === "verifying"}
                  className="vtb-btn-primary w-full"
                >
                  <CreditCard size={18} />
                  {phase === "verifying"
                    ? "Проверяем..."
                    : awaitingLivenessRetry
                    ? "Повторить проверку"
                    : "Приложить карту"}
                </button>

                <button onClick={resetFlow} className="vtb-btn-outline w-full">
                  <RefreshCw size={16} />
                  Сбросить сценарий
                </button>
              </div>
            </div>

            <div className="border-t border-white/5 px-4 py-3 text-center sm:px-6">
              <p className="text-[11px] text-white/20">
                Камера ноутбука используется как камера банкомата
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <CardBlock title="Сценарий показа" subtitle="Можно переключить перед запуском">
            <div className="grid gap-2">
              {(["live", "happy", "review", "fraud"] as const).map((preset) => {
                const meta = presetMeta[preset];
                const active = demoPreset === preset;

                return (
                  <button
                    key={preset}
                    onClick={() => {
                      setDemoPreset(preset);
                      pushEvent(`Выбран режим demo: ${meta.label}.`, "info");
                    }}
                    className={`rounded-vtb-sm border px-4 py-3 text-left transition-colors ${
                      active
                        ? "border-vtb-primary bg-vtb-primary/5"
                        : "border-vtb-border bg-white hover:bg-vtb-bg"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${meta.tone}`}>
                        {meta.badge}
                      </span>
                      <span className="text-sm font-semibold text-vtb-navy">{meta.label}</span>
                    </div>
                    <p className="mt-2 text-xs text-vtb-secondary">{meta.description}</p>
                  </button>
                );
              })}
            </div>
          </CardBlock>

          {/* <CardBlock title="Подсказки Ведущему" subtitle="Короткий сценарий показа">
            <div className="space-y-3 text-sm text-vtb-secondary">
              <p>
                <span className="font-semibold text-vtb-text">1.</span> Для надёжного показа выберите preset
                `Happy path` или `Fraud path`.
              </p>
              <p>
                <span className="font-semibold text-vtb-text">2.</span> Для live демонстрации оставьте
                `Live backend`, проверьте камеру и активный профиль.
              </p>
              <p>
                <span className="font-semibold text-vtb-text">3.</span> Если освещение или камера подводят,
                мгновенно переключитесь на preset и продолжайте рассказ без паузы.
              </p>
            </div>
          </CardBlock> */}

          <CardBlock title="Результат проверки" subtitle="Краткая сводка по операции">
            <div className="mb-4 rounded-vtb-sm border border-vtb-border bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-vtb-secondary">
                Решение системы
              </p>
              <p className="mt-1 text-sm font-semibold text-vtb-navy">
                {verification?.title ?? "После запуска здесь появится итог проверки"}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-vtb-sm bg-vtb-bg p-3">
                <p className="text-[11px] uppercase tracking-wide text-vtb-secondary">
                  Confidence
                </p>
                <p className={`mt-2 text-2xl font-bold ${metricTone(phase)}`}>
                  {confidence !== null ? `${confidence.toFixed(0)}%` : "—"}
                </p>
              </div>
              <div className="rounded-vtb-sm bg-vtb-bg p-3">
                <p className="text-[11px] uppercase tracking-wide text-vtb-secondary">
                  Similarity
                </p>
                <p className={`mt-2 text-2xl font-bold ${metricTone(phase)}`}>
                  {similarity !== null && similarity !== undefined
                    ? similarity.toFixed(3)
                    : "—"}
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-vtb-sm bg-vtb-bg p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-vtb-secondary">
                    Liveness
                  </p>
                  <p className={`mt-2 text-xl font-bold ${metricTone(phase)}`}>
                    {verification?.liveness_status ?? "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-vtb-secondary">
                    Score
                  </p>
                  <p className={`mt-2 text-xl font-bold ${metricTone(phase)}`}>
                    {livenessScore !== null ? `${Math.round(livenessScore * 100)}%` : "—"}
                  </p>
                </div>
              </div>
            </div>

            {verification?.event_log && verification.event_log.length > 0 && (
              <div className="mt-4 rounded-vtb-sm border border-vtb-border bg-white px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-vtb-secondary">
                  Журнал решения
                </p>
                <div className="mt-2 space-y-1">
                  {verification.event_log.map((item, index) => (
                    <p key={`${index}-${item}`} className="text-xs text-vtb-secondary">
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {verification?.flags && (
              <div className="mt-4 flex flex-wrap gap-2">
                {verification.flags.matched_profile && (
                  <span className="rounded-full bg-vtb-success/10 px-3 py-1 text-xs font-semibold text-vtb-success">
                    <ShieldCheck size={12} className="mr-1 inline" />
                    Эталон совпал
                  </span>
                )}
                {verification.flags.needs_confirmation && (
                  <span className="rounded-full bg-vtb-warning/10 px-3 py-1 text-xs font-semibold text-vtb-warning">
                    Нужна проверка пользователем
                  </span>
                )}
                {verification.flags.multiple_faces && (
                  <span className="rounded-full bg-vtb-danger/10 px-3 py-1 text-xs font-semibold text-vtb-danger">
                    Несколько лиц в кадре
                  </span>
                )}
                {verification.flags.low_quality && (
                  <span className="rounded-full bg-vtb-warning/10 px-3 py-1 text-xs font-semibold text-vtb-warning">
                    Низкое качество кадра
                  </span>
                )}
                {verification.flags.should_retry && (
                  <span className="rounded-full bg-vtb-primary/10 px-3 py-1 text-xs font-semibold text-vtb-primary">
                    Рекомендуется повтор
                  </span>
                )}
                {verification.flags.spoof_suspected && (
                  <span className="rounded-full bg-vtb-danger/10 px-3 py-1 text-xs font-semibold text-vtb-danger">
                    Подозрение на фото / replay
                  </span>
                )}
              </div>
            )}
          </CardBlock>

          {status !== "active" && (
            <AlertPanel variant="warning" title="Защита ещё не подключена">
              Для реальной проверки на этой странице нужен активный профиль из flow ВТБ Защиты.
            </AlertPanel>
          )}

          <EventLog events={events} />

          {/* <CardBlock title="Сценарии Demo" subtitle="Быстрый ориентир по показу">
            <div className="space-y-2 text-sm text-vtb-secondary">
              <p><span className="font-semibold text-vtb-text">Happy path:</span> `Happy path` preset или `Live backend` с эталоном и камерой.</p>
              <p><span className="font-semibold text-vtb-text">Fraud path:</span> `Fraud path` preset или живая демонстрация с фото/подменой.</p>
              <p><span className="font-semibold text-vtb-text">Fallback:</span> если камера нестабильна, используйте upload fallback или preset.</p>
            </div>
          </CardBlock> */}

          {phase === "blocked" && (
            <AlertPanel variant="danger" title="Операция задержана">
              Банкомат не выдаёт наличные до повторного кадра или дополнительного подтверждения личности.
            </AlertPanel>
          )}

          {awaitingLivenessRetry && phase === "card_inserted" && (
            <AlertPanel variant="warning" title="Нужен поворот головы">
              Камера продолжает работать. Поверните голову влево или вправо и нажмите
              «Повторить проверку». Если liveness снова не пройдёт, операция будет задержана.
            </AlertPanel>
          )}

          {phase === "uncertain" && (
            <AlertPanel variant="warning" title="Подтверждение владельца">
              Для продуктовой демонстрации это step-up сценарий: банкомат видит частичное несоответствие и запрашивает подтверждение у владельца карты.
            </AlertPanel>
          )}
        </div>
      </div>
    </div>
  );
}
