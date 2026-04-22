interface CaptureVideoFrameOptions {
  mirrorOutput?: boolean;
  viewportWidth?: number;
  viewportHeight?: number;
}

export function captureVideoFrameToCanvas(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  options: CaptureVideoFrameOptions = {},
): boolean {
  const sourceWidth = video.videoWidth || 0;
  const sourceHeight = video.videoHeight || 0;
  if (!sourceWidth || !sourceHeight) return false;

  const targetAspect =
    options.viewportWidth && options.viewportHeight
      ? options.viewportWidth / options.viewportHeight
      : sourceWidth / sourceHeight;

  let targetWidth = sourceWidth;
  let targetHeight = Math.round(targetWidth / targetAspect);

  if (targetHeight > sourceHeight) {
    targetHeight = sourceHeight;
    targetWidth = Math.round(targetHeight * targetAspect);
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const dx = (targetWidth - drawWidth) / 2;
  const dy = (targetHeight - drawHeight) / 2;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, targetWidth, targetHeight);

  if (options.mirrorOutput) {
    ctx.translate(targetWidth, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, -dx - drawWidth, dy, drawWidth, drawHeight);
  } else {
    ctx.drawImage(video, dx, dy, drawWidth, drawHeight);
  }

  ctx.restore();
  return true;
}
