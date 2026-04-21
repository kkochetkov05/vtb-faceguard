import { buildApiUrl } from "@/lib/api";

/**
 * Service layer для ВТБ Защиты.
 *
 * uploadReferencePhoto — реальный вызов POST /api/enroll.
 * enableProtection / disableProtection — пока mock (backend endpoint
 * для toggle будет добавлен позже).
 */

/* ---------- types ---------- */

export type ProtectionStatus = "inactive" | "pending" | "active";

export interface ProtectionState {
  status: ProtectionStatus;
  /** base64 data-url эталонного фото (null пока не загружено) */
  referencePhoto: string | null;
  /** дата подключения ISO */
  activatedAt: string | null;
}

export interface UploadResult {
  success: boolean;
  /** URL / data-url сохранённого фото (для preview) */
  photoUrl: string;
  /** id профиля с backend */
  profileId?: string;
}

/** Ответ backend POST /api/enroll */
interface EnrollApiResponse {
  success: boolean;
  profile_id: string;
  photo_path: string;
  message: string;
}

/* ---------- helpers ---------- */

/** Имитация сетевой задержки для mock-функций */
const fakeDelay = (ms = 1000) =>
  new Promise<void>((r) => setTimeout(r, ms + Math.random() * 500));

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ---------- API ---------- */

/**
 * «Включить» защиту — первый шаг (toggle).
 * TODO: заменить на POST /api/protection/enable
 */
export async function enableProtection(): Promise<{ success: boolean }> {
  await fakeDelay(800);
  return { success: true };
}

/**
 * «Выключить» защиту.
 * TODO: заменить на POST /api/protection/disable
 */
export async function disableProtection(): Promise<{ success: boolean }> {
  await fakeDelay(600);
  return { success: true };
}

/**
 * Загрузить эталонное фото.
 * Реальный вызов → POST /api/enroll (multipart/form-data).
 */
export async function uploadReferencePhoto(
  file: File,
): Promise<UploadResult> {
  // Параллельно готовим data-url для локального превью
  const previewPromise = fileToDataUrl(file);

  // Отправляем на backend
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(buildApiUrl("/enroll"), {
    method: "POST",
    body: form,
  });

  // Обработка ошибок
  if (!res.ok) {
    let message = "Ошибка загрузки фото.";
    try {
      const err = await res.json();
      message = err.detail || message;
    } catch {
      // тело ответа не JSON — используем дефолтное сообщение
    }
    throw new Error(message);
  }

  const data: EnrollApiResponse = await res.json();

  if (!data.success) {
    throw new Error("Сервер вернул ошибку при сохранении фото.");
  }

  // Используем локальный data-url для превью (быстрее, чем грузить обратно)
  const photoUrl = await previewPromise;

  return {
    success: true,
    photoUrl,
    profileId: data.profile_id,
  };
}

/**
 * Получить текущее состояние защиты.
 * TODO: заменить на GET /api/protection/status
 */
export async function fetchProtectionStatus(): Promise<ProtectionState> {
  await fakeDelay(400);
  return {
    status: "inactive",
    referencePhoto: null,
    activatedAt: null,
  };
}
