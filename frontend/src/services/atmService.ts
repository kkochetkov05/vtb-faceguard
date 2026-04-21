import { buildApiUrl } from "@/lib/api";

/**
 * ATM Demo — сервис верификации.
 *
 * checkFace()  — отправляет кадр на POST /api/atm/check
 */

/* ---------- types ---------- */

export type ATMPhase =
  | "idle"            // ожидание карты
  | "card_inserted"   // карта вставлена, камера активируется
  | "verifying"       // идёт проверка лица
  | "approved"        // совпадение ≥ threshold
  | "uncertain"       // слабое подозрение (40–65%)
  | "blocked";        // несовпадение / spoof

export type VerifyDecision = "allow" | "ask_confirmation" | "delay_and_alert";

export interface VerifyFlags {
  face_detected: boolean;
  challenge_face_detected: boolean;
  multiple_faces: boolean;
  low_quality: boolean;
  needs_confirmation: boolean;
  should_retry: boolean;
  matched_profile: boolean;
  spoof_suspected: boolean;
}

export interface VerifyResult {
  decision: VerifyDecision;
  title: string;
  message: string;
  severity: "green" | "yellow" | "red";
  recommended_ui_action: string;
  similarity_score: number | null;
  normalized_confidence: number;  // 0–100%
  liveness_score: number | null;
  liveness_status: "passed" | "suspicious" | "failed" | "not_checked";
  event_log: string[];
  flags: VerifyFlags;
}

export interface ATMEvent {
  id: number;
  time: string;              // HH:MM:SS
  text: string;
  type: "info" | "success" | "warning" | "danger";
}

/* ---------- helpers ---------- */

const fakeDelay = (ms: number) =>
  new Promise<void>((r) => setTimeout(r, ms));

function now(): string {
  return new Date().toLocaleTimeString("ru-RU", { hour12: false });
}

let eventCounter = 0;
export function createEvent(
  text: string,
  type: ATMEvent["type"] = "info",
): ATMEvent {
  return { id: ++eventCounter, time: now(), text, type };
}

/* ---------- Real API ---------- */

/**
 * Отправляет кадр на backend для верификации.
 *
 * POST /api/atm/check
 *   multipart: file=<jpeg blob>, profile_id=<id>
 *
 * Response: { decision, title, message, severity, recommended_ui_action, ... }
 */
export async function checkFace(
  frameBlob: Blob,
  profileId: string,
  challengeBlob?: Blob | null,
): Promise<VerifyResult> {
  const formData = new FormData();
  formData.append("file", frameBlob, "frame.jpg");
  if (challengeBlob) {
    formData.append("challenge_file", challengeBlob, "challenge.jpg");
  }
  formData.append("profile_id", profileId);

  const res = await fetch(buildApiUrl("/atm/check"), {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Ошибка сервера" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}
