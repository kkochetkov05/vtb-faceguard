import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { ProtectionStatus } from "../services/protectionService";
import {
  enableProtection,
  disableProtection,
  uploadReferencePhoto,
} from "../services/protectionService";

/* ---------- types ---------- */

/** async-операция */
export type AsyncStatus = "idle" | "loading" | "success" | "error";

interface ProtectionContextValue {
  /* состояние */
  status: ProtectionStatus;       // inactive | pending | active
  referencePhoto: string | null;  // data-url превью
  activatedAt: string | null;
  profileId: string | null;

  /* async statuses */
  toggleStatus: AsyncStatus;
  uploadStatus: AsyncStatus;
  uploadError: string | null;

  /* actions */
  toggle: () => Promise<void>;
  upload: (file: File) => Promise<boolean>;
  reset: () => void;
}

const ProtectionContext = createContext<ProtectionContextValue | null>(null);

/* ---------- provider ---------- */

export function ProtectionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ProtectionStatus>("inactive");
  const [referencePhoto, setReferencePhoto] = useState<string | null>(null);
  const [activatedAt, setActivatedAt] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [toggleStatus, setToggleStatus] = useState<AsyncStatus>("idle");
  const [uploadStatus, setUploadStatus] = useState<AsyncStatus>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);

  /* --- toggle protection --- */
  const toggle = useCallback(async () => {
    setToggleStatus("loading");
    try {
      if (status === "inactive") {
        await enableProtection();
        setStatus("pending");           // ждём фото
      } else {
        await disableProtection();
        setStatus("inactive");
        setReferencePhoto(null);
        setActivatedAt(null);
        setProfileId(null);
      }
      setToggleStatus("success");
    } catch {
      setToggleStatus("error");
    }
  }, [status]);

  /* --- upload reference photo --- */
  const upload = useCallback(async (file: File): Promise<boolean> => {
    setUploadStatus("loading");
    setUploadError(null);
    try {
      const result = await uploadReferencePhoto(file);
      setReferencePhoto(result.photoUrl);
      setActivatedAt(new Date().toISOString());
      setProfileId(result.profileId ?? null);
      setStatus("active");
      setUploadStatus("success");
      return true;
    } catch (err: any) {
      setUploadError(err?.message ?? "Ошибка загрузки");
      setUploadStatus("error");
      return false;
    }
  }, []);

  /* --- reset (для отладки / повторного прохождения demo) --- */
  const reset = useCallback(() => {
    setStatus("inactive");
    setReferencePhoto(null);
    setActivatedAt(null);
    setProfileId(null);
    setToggleStatus("idle");
    setUploadStatus("idle");
    setUploadError(null);
  }, []);

  return (
    <ProtectionContext.Provider
      value={{
        status,
        referencePhoto,
        activatedAt,
        profileId,
        toggleStatus,
        uploadStatus,
        uploadError,
        toggle,
        upload,
        reset,
      }}
    >
      {children}
    </ProtectionContext.Provider>
  );
}

/* ---------- hook ---------- */

export function useProtection() {
  const ctx = useContext(ProtectionContext);
  if (!ctx) throw new Error("useProtection must be used inside ProtectionProvider");
  return ctx;
}
