export const referenceCameraShellClass = "mx-auto w-full max-w-xl";

export const referenceViewportAspectClass = "aspect-[3/4] sm:aspect-[4/3]";
export const atmViewportAspectClass = "aspect-[3/4] sm:aspect-[4/3] lg:aspect-[16/10]";
export const referencePreviewAspectClass =
  "aspect-[3/4] max-h-[65dvh] min-h-[320px] sm:min-h-0 sm:aspect-[4/3]";

export const faceGuideWrapperClass =
  "pointer-events-none absolute inset-0 flex items-center justify-center";

export const faceGuideOvalClass =
  "w-[clamp(9rem,34vw,12rem)] aspect-[3/4] rounded-[50%] border-2 border-dashed";

export function faceGuideClass(borderClass: string): string {
  return `${faceGuideOvalClass} ${borderClass}`;
}

export function buildReferenceViewportStyle(aspectRatio: number): {
  aspectRatio: string;
  width: string;
  maxHeight: string;
} {
  const safeAspectRatio = Number.isFinite(aspectRatio) && aspectRatio > 0
    ? aspectRatio
    : 4 / 3;

  return {
    aspectRatio: `${safeAspectRatio}`,
    width:
      safeAspectRatio < 1
        ? `min(100%, calc(72dvh * ${safeAspectRatio}))`
        : "100%",
    maxHeight: "72dvh",
  };
}
