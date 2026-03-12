import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 合併 className，支援條件式 class 和 Tailwind 衝突解決
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
