import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const normalizeEmail = (email?: string | null) => email?.trim().toLowerCase() ?? "";

const initials = (fullname: string) => {
  if (!fullname) return "US";
  return (
    fullname
      .trim()
      .split(/\s+/)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "US"
  );
};

export { initials, normalizeEmail };
