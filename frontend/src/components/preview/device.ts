// Web layout reference, not a native simulator or physical-pixel measurement.
export const PREVIEW_DEVICE = {
  name: 'iPhone 18 Pro Max',
  width: 440,
  height: 956,
  topInset: 62,
  bottomInset: 34,
  bezel: 8,
} as const;

export function fitPreviewScale(width: number, height: number, sideBySide: boolean) {
  const availableWidth = width - (sideBySide ? 380 : 32);
  const availableHeight = Math.max(480, height - 112);
  return Math.max(0.1, Math.min(1, availableWidth / (PREVIEW_DEVICE.width + PREVIEW_DEVICE.bezel * 2), availableHeight / (PREVIEW_DEVICE.height + PREVIEW_DEVICE.bezel * 2)));
}
