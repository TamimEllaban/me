import { memo } from "react";

const HILL_BACK = "M0 620 Q 300 520 620 600 Q 900 660 1200 560 L 1200 900 L 0 900 Z";
const HILL_FRONT = "M0 700 Q 360 620 640 690 Q 940 740 1200 640 L 1200 900 L 0 900 Z";

/**
 * Layered backdrop: sky, far blurred hills, light rays, foreground grass.
 * Layers accept a parallax offset each so they drift at different speeds.
 */
export const SceneBackground = memo(function SceneBackground({
  night,
  par,
}: {
  night: boolean;
  par: { x: number; y: number };
}) {
  const sky = night ? "url(#nightSky)" : "url(#daySky)";
  const hillBack = night ? "#24335c" : "#cfe0c2";
  const hillFront = night ? "#1a2747" : "#dcebc9";
  const grass = night ? "#14213f" : "#b9d98f";
  const grassTop = night ? "#1b2b4f" : "#cfe9a3";

  return (
    <g>
      <defs>
        <linearGradient id="daySky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8ec7ee" />
          <stop offset="0.55" stopColor="#eef7ef" />
          <stop offset="1" stopColor="#fdf6e3" />
        </linearGradient>
        <linearGradient id="nightSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1030" />
          <stop offset="0.5" stopColor="#1a2b52" />
          <stop offset="1" stopColor="#2a2342" />
        </linearGradient>
        <radialGradient id="sunGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(255,220,120,0.55)" />
          <stop offset="1" stopColor="rgba(255,220,120,0)" />
        </radialGradient>
      </defs>

      {/* sky */}
      <rect x={0} y={0} width={1200} height={1650} fill={sky} />

      {/* light rays fanning from the crown */}
      <g
        transform={`translate(${par.x * 4} ${par.y * 4}) rotate(-8 600 150)`}
        opacity={night ? 0.5 : 0.55}
      >
        <path
          d="M600 150 L 60 0 L 340 0 Z M600 150 L 880 0 L 1140 0 Z"
          fill={night ? "rgba(255,230,170,0.10)" : "rgba(255,235,180,0.35)"}
        />
      </g>
      <circle cx={600} cy={150} r={260} fill="url(#sunGlow)" opacity={0.8} />

      {/* far hills */}
      <path
        d={HILL_BACK}
        fill={hillBack}
        opacity={0.55}
        transform={`translate(${par.x * 10} ${par.y * 8})`}
        filter="url(#softBlur)"
      />
      <path
        d={HILL_FRONT}
        fill={hillFront}
        opacity={0.8}
        transform={`translate(${par.x * 16} ${par.y * 12})`}
        filter="url(#softBlur)"
      />

      {/* foreground grass */}
      <g transform={`translate(${par.x * 5} 0)`}>
        <path
          d="M0 1420 Q 200 1400 600 1418 Q 900 1432 1200 1416 L 1200 1650 L 0 1650 Z"
          fill={night ? "#16203c" : "#a8cf80"}
        />
        <path
          d="M0 1430 Q 300 1414 600 1428 Q 940 1440 1200 1426 L 1200 1580 L 0 1580 Z"
          fill={grass}
          opacity={0.9}
        />
        <path d="M0 1450 L 1200 1450 L 1200 1462 L 0 1462 Z" fill={grassTop} opacity={0.9} />
      </g>

      {/* night stars */}
      {night && (
        <g opacity={0.8}>
          {STARS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#ffe9b8" opacity={s.o} />
          ))}
        </g>
      )}

      <filter id="softBlur">
        <feGaussianBlur stdDeviation="6" />
      </filter>
    </g>
  );
});

const STARS = [
  { x: 140, y: 120, r: 1.6, o: 0.9 },
  { x: 320, y: 260, r: 1.2, o: 0.6 },
  { x: 190, y: 420, r: 1.4, o: 0.8 },
  { x: 480, y: 90, r: 1.3, o: 0.7 },
  { x: 760, y: 70, r: 1.7, o: 0.9 },
  { x: 900, y: 240, r: 1.2, o: 0.6 },
  { x: 1010, y: 130, r: 1.5, o: 0.8 },
  { x: 1080, y: 360, r: 1.3, o: 0.7 },
  { x: 250, y: 620, r: 1.2, o: 0.5 },
  { x: 980, y: 540, r: 1.2, o: 0.6 },
];
