"use client";

import { useState } from "react";

/**
 * Computes up to 2 uppercase initials from a company name.
 * e.g., "Tech Nova" -> "TN", "Google" -> "GO", "IBM" -> "IB"
 */
export function getCompanyInitials(name = "") {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "C";
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

/**
 * Reusable CompanyLogo component.
 * Displays company logo image when available and valid.
 * Automatically falls back to company initials on missing/broken URLs,
 * preventing broken image icons and infinite error loops.
 */
export default function CompanyLogo({
  src,
  companyName = "Company",
  className = "w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0",
  fallbackClassName = "w-12 h-12 rounded-xl border border-slate-200 shrink-0 bg-teal-50 text-[#2b8a78] flex items-center justify-center font-bold text-sm tracking-wider select-none",
}) {
  const [imageError, setImageError] = useState(false);
  const initials = getCompanyInitials(companyName);

  const isValidSrc =
    Boolean(src) &&
    typeof src === "string" &&
    src.trim() !== "" &&
    src !== "null" &&
    src !== "undefined";

  if (!isValidSrc || imageError) {
    return (
      <div
        role="img"
        aria-label={`${companyName} logo fallback`}
        className={fallbackClassName}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`${companyName} logo`}
      onError={() => setImageError(true)}
      className={className}
    />
  );
}

