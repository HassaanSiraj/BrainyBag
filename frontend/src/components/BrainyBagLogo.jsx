export default function BrainyBagLogo({ size = 44 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="bb-body" x1="40" y1="75" x2="160" y2="175" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.10)" />
        </linearGradient>
        <linearGradient id="bb-band" x1="40" y1="72" x2="160" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0.20)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
        </linearGradient>
      </defs>

      {/* Handle */}
      <path
        d="M76 74 C76 50 88 38 100 38 C112 38 124 50 124 74"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* Handle highlight */}
      <path
        d="M76 74 C76 50 88 38 100 38 C112 38 124 50 124 74"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.4"
      />

      {/* Bag body */}
      <path
        d="M42 88 Q40 82 46 80 L154 80 Q160 82 158 88 L150 166 Q149 172 143 172 L57 172 Q51 172 50 166 Z"
        fill="url(#bb-body)"
      />

      {/* Top band */}
      <rect x="40" y="72" width="120" height="14" rx="6" fill="url(#bb-band)" />
      {/* Band sheen */}
      <rect x="40" y="72" width="120" height="6" rx="4" fill="white" opacity="0.07" />

      {/* Neural connections */}
      <g stroke="white" strokeLinecap="round" opacity="0.3" strokeWidth="1.5">
        <line x1="100" y1="103" x2="74"  y2="118" />
        <line x1="100" y1="103" x2="126" y2="118" />
        <line x1="74"  y1="118" x2="82"  y2="144" />
        <line x1="126" y1="118" x2="118" y2="144" />
        <line x1="82"  y1="144" x2="100" y2="157" />
        <line x1="118" y1="144" x2="100" y2="157" />
        <line x1="74"  y1="118" x2="126" y2="118" strokeWidth="1" opacity="0.15" />
        <line x1="82"  y1="144" x2="118" y2="144" strokeWidth="1" opacity="0.15" />
      </g>
      <g stroke="white" strokeLinecap="round" opacity="0.6" strokeWidth="1.8">
        <line x1="100" y1="103" x2="74"  y2="118" />
        <line x1="100" y1="103" x2="126" y2="118" />
        <line x1="74"  y1="118" x2="82"  y2="144" />
        <line x1="126" y1="118" x2="118" y2="144" />
        <line x1="82"  y1="144" x2="100" y2="157" />
        <line x1="118" y1="144" x2="100" y2="157" />
      </g>

      {/* Nodes — outer ring (white) + inner dot (green) */}
      {[
        [100, 103],
        [74,  118],
        [126, 118],
        [82,  144],
        [118, 144],
        [100, 157],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="6"   fill="white" opacity="0.92" />
          <circle cx={cx} cy={cy} r="2.8" fill="var(--green, #2d6a4f)" />
        </g>
      ))}
    </svg>
  );
}
