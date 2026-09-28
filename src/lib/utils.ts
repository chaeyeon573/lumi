import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** shadcn/ui 표준 cn — 뒤에 온 클래스가 앞의 같은 종류를 덮는다 (bg-* 끼리, h-* 끼리 …) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
