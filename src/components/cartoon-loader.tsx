import React from "react";

export function CartoonCarLoader({
  title = "Tamim's World",
  subtitle = "Ka-Chow! جاري تجهيز أجمل الذكريات... 🏎️",
  compact = false,
}: {
  title?: string;
  subtitle?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center select-none ${
        compact ? "py-4" : "p-6"
      }`}
    >
      {/* Car + Track Canvas */}
      <div className="relative flex flex-col items-center">
        {/* Floating Cartoon Car */}
        <div
          className="relative z-10"
          style={{ animation: "car-vroom 0.75s ease-in-out infinite" }}
        >
          {/* Animated Exhaust Puffs */}
          <div className="absolute -left-6 bottom-3 pointer-events-none">
            <span
              className="absolute size-2.5 rounded-full bg-muted-foreground/30"
              style={{ animation: "smoke-float 1.2s ease-out infinite" }}
            />
            <span
              className="absolute size-3.5 rounded-full bg-muted-foreground/25"
              style={{
                animation: "smoke-float 1.2s ease-out infinite",
                animationDelay: "0.4s",
              }}
            />
            <span
              className="absolute size-2 rounded-full bg-muted-foreground/20"
              style={{
                animation: "smoke-float 1.2s ease-out infinite",
                animationDelay: "0.8s",
              }}
            />
          </div>

          {/* SVG Cartoon Race Car (Cars / Lightning McQueen inspired) */}
          <svg
            viewBox="0 0 160 90"
            className={`${compact ? "w-28 h-16" : "w-44 h-24"} drop-shadow-md`}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="carBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EF4444" />
                <stop offset="60%" stopColor="#DC2626" />
                <stop offset="100%" stopColor="#991B1B" />
              </linearGradient>
              <linearGradient id="glassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#E2E8F0" />
              </linearGradient>
              <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FACC15" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>

            {/* Rear spoiler */}
            <path d="M18 42 L24 28 L38 28 L32 42 Z" fill="#991B1B" />
            <rect x="14" y="25" width="26" height="5" rx="2.5" fill="#EF4444" />

            {/* Main Aerodynamic Car Body */}
            <path
              d="M20 62 C16 54, 22 46, 36 44 L54 32 C60 26, 88 26, 102 32 L120 44 C134 46, 148 50, 146 62 C145 66, 138 68, 128 68 L32 68 C24 68, 20 66, 20 62 Z"
              fill="url(#carBodyGrad)"
            />

            {/* Cabin Top */}
            <path d="M56 32 C62 26, 86 26, 96 32 L112 43 L44 43 Z" fill="#B91C1C" />

            {/* Windshield / Eyes Screen */}
            <path
              d="M60 33 C64 28, 86 28, 92 33 L106 43 L50 43 Z"
              fill="url(#glassGrad)"
              stroke="#DC2626"
              strokeWidth="1"
            />

            {/* Expressive Cartoon Eyes (Animated glance) */}
            <g style={{ animation: "eye-glance 3s ease-in-out infinite" }}>
              {/* Left Eye */}
              <ellipse cx="68" cy="36" rx="4" ry="4.5" fill="#2563EB" />
              <circle cx="68.5" cy="36" r="2.2" fill="#0F172A" />
              <circle cx="67" cy="34.5" r="1.2" fill="#FFFFFF" />

              {/* Right Eye */}
              <ellipse cx="80" cy="36" rx="4" ry="4.5" fill="#2563EB" />
              <circle cx="80.5" cy="36" r="2.2" fill="#0F172A" />
              <circle cx="79" cy="34.5" r="1.2" fill="#FFFFFF" />
            </g>

            {/* Friendly Eyebrows */}
            <path
              d="M63 31 Q68 29 73 31"
              stroke="#991B1B"
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M75 31 Q80 29 85 31"
              stroke="#991B1B"
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
            />

            {/* Lightning Bolt Decal with #95 */}
            <g transform="translate(62, 47) scale(0.85)">
              <polygon
                points="12,18 28,6 22,18 36,18 16,30 20,22"
                fill="url(#boltGrad)"
                stroke="#D97706"
                strokeWidth="1"
              />
              <text
                x="32"
                y="26"
                fill="#FEF08A"
                fontSize="11"
                fontWeight="900"
                fontFamily="sans-serif"
                fontStyle="italic"
              >
                95
              </text>
            </g>

            {/* Front Smile Grille */}
            <path
              d="M130 57 Q138 61 142 56"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />

            {/* Smiling Teeth / Tongue accent */}
            <path d="M132 58 Q137 60 140 57" stroke="#B91C1C" strokeWidth="1.2" fill="none" />

            {/* Headlights */}
            <ellipse cx="136" cy="51" rx="3.5" ry="2.5" fill="#FEF08A" opacity="0.9" />

            {/* Rear Wheel */}
            <g transform="translate(38, 66)">
              <circle cx="0" cy="0" r="11" fill="#1E293B" />
              <circle cx="0" cy="0" r="7" fill="#94A3B8" />
              <circle cx="0" cy="0" r="3" fill="#DC2626" />
              {/* Wheel Spokes */}
              <line x1="-6" y1="0" x2="6" y2="0" stroke="#475569" strokeWidth="1.5" />
              <line x1="0" y1="-6" x2="0" y2="6" stroke="#475569" strokeWidth="1.5" />
            </g>

            {/* Front Wheel */}
            <g transform="translate(114, 66)">
              <circle cx="0" cy="0" r="11" fill="#1E293B" />
              <circle cx="0" cy="0" r="7" fill="#94A3B8" />
              <circle cx="0" cy="0" r="3" fill="#DC2626" />
              {/* Wheel Spokes */}
              <line x1="-6" y1="0" x2="6" y2="0" stroke="#475569" strokeWidth="1.5" />
              <line x1="0" y1="-6" x2="0" y2="6" stroke="#475569" strokeWidth="1.5" />
            </g>
          </svg>
        </div>

        {/* Animated Racetrack Road */}
        <div className="w-48 sm:w-56 mt-[-4px] overflow-hidden">
          <svg viewBox="0 0 200 12" className="w-full h-3">
            {/* Road Base */}
            <line x1="0" y1="6" x2="200" y2="6" stroke="#CBD5E1" strokeWidth="3" />
            {/* Moving Dashed Road Line */}
            <line
              x1="0"
              y1="6"
              x2="200"
              y2="6"
              stroke="#F59E0B"
              strokeWidth="3.5"
              strokeDasharray="14 10"
              style={{ animation: "road-slide 0.5s linear infinite" }}
            />
          </svg>
        </div>
      </div>

      {/* Text Info */}
      <div className="mt-4 space-y-1">
        <p className="font-display text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
          {title}
        </p>
        <p className="text-xs sm:text-sm font-medium text-muted-foreground animate-pulse">
          {subtitle}
        </p>
      </div>

      {/* Progress Dots */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        <span className="size-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
        <span className="size-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
        <span className="size-2 rounded-full bg-primary animate-bounce" />
      </div>
    </div>
  );
}
