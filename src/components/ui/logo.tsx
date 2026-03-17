"use client";

export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id="ng" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#b5b2d9" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#b5b2d9" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill="url(#ng)" />
      <g stroke="#b5b2d9" strokeWidth="0.7" opacity="0.15">
        <line x1="45" y1="12" x2="28" y2="28" />
        <line x1="28" y1="28" x2="16" y2="48" />
        <line x1="16" y1="48" x2="14" y2="72" />
        <line x1="14" y1="72" x2="24" y2="92" />
        <line x1="24" y1="92" x2="42" y2="105" />
        <line x1="42" y1="105" x2="65" y2="108" />
        <line x1="65" y1="108" x2="85" y2="100" />
        <line x1="45" y1="12" x2="65" y2="14" />
        <line x1="65" y1="14" x2="85" y2="22" />
        <line x1="45" y1="12" x2="16" y2="48" />
        <line x1="28" y1="28" x2="14" y2="72" />
        <line x1="24" y1="92" x2="65" y2="108" />
      </g>
      <circle cx="45" cy="12" r="5" fill="#b5b2d9" />
      <circle cx="65" cy="14" r="4" fill="#b5b2d9" opacity="0.7" />
      <circle cx="85" cy="22" r="3.5" fill="#b5b2d9" opacity="0.5" />
      <circle cx="28" cy="28" r="4.5" fill="#b5b2d9" opacity="0.85" />
      <circle cx="16" cy="48" r="5" fill="#b5b2d9" />
      <circle cx="14" cy="72" r="5" fill="#b5b2d9" />
      <circle cx="24" cy="92" r="4.5" fill="#b5b2d9" opacity="0.85" />
      <circle cx="42" cy="105" r="5" fill="#b5b2d9" />
      <circle cx="65" cy="108" r="4" fill="#b5b2d9" opacity="0.7" />
      <circle cx="85" cy="100" r="3.5" fill="#b5b2d9" opacity="0.5" />
    </svg>
  );
}

export function LogoWordmark({ className = "" }: { className?: string }) {
  return (
    <svg
      width="160"
      height="28"
      viewBox="0 0 160 28"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="wg" x1="0" y1="0" x2="1" y2="0.2">
          <stop offset="0%" stopColor="#d9daed" />
          <stop offset="50%" stopColor="#b5b2d9" />
          <stop offset="100%" stopColor="#8a86b8" />
        </linearGradient>
      </defs>
      <text
        x="0"
        y="22"
        fontFamily="'BN Rigidly', var(--font-display), serif"
        fontSize="24"
        fill="url(#wg)"
        letterSpacing="3"
      >
        coefficient
      </text>
    </svg>
  );
}