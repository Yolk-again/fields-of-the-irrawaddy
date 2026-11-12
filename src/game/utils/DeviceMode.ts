/**
 * Returns true for phones and tablets so on-screen instructions can stay
 * touch-focused without misclassifying Windows laptops with touch screens
 * or narrow desktop browser windows as mobile devices.
 */
export function isMobilePlatform(): boolean {
  const userAgent = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(userAgent)) return true;

  const isWindows = /Windows NT/i.test(userAgent);
  const isIPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (isIPadOS) return true;

  return !isWindows && navigator.maxTouchPoints > 1 && window.matchMedia("(pointer: coarse)").matches;
}
