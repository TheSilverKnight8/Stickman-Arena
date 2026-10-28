// Illustrations for the two game buttons on Home.

/** Two stick figures trading blows on a platform: a red brawler and a blue swordfighter. */
export function FighterArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 150" className={className} aria-hidden>
      {/* Platform */}
      <rect x="18" y="122" width="204" height="10" rx="2" fill="#002657" />
      <rect x="40" y="132" width="160" height="6" rx="2" fill="#002657" opacity="0.35" />
      {/* Red brawler, punching */}
      <g fill="none" stroke="#e8352f" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="70" cy="46" r="11" />
        <path d="M70 58 L74 88" />
        <path d="M71 66 L90 64 L106 58" />
        <path d="M71 66 L56 76 L62 86" />
        <path d="M74 88 L60 120" />
        <path d="M74 88 L90 104 L86 120" />
      </g>
      {/* Impact */}
      <path d="M118 52 l4 9 10 1 -7 7 2 10 -9 -5 -9 5 2 -10 -7 -7 10 -1z" fill="#fc3f3f" />
      {/* Blue swordfighter, knocked back, with a comically large sword */}
      <g fill="none" stroke="#2c5fd6" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="160" cy="50" r="11" />
        <path d="M157 61 L164 92" />
        <path d="M159 70 L176 62 L190 46" />
        <path d="M159 70 L146 80" />
        <path d="M164 92 L154 120" />
        <path d="M164 92 L178 106 L182 120" />
      </g>
      <g transform="rotate(-38 190 46)">
        <rect x="186" y="-14" width="10" height="64" rx="2" fill="#dfe6f2" stroke="#002657" strokeWidth="3" />
        <rect x="178" y="48" width="26" height="7" rx="2" fill="#002657" />
        <rect x="188" y="55" width="6" height="12" rx="2" fill="#002657" />
      </g>
    </svg>
  );
}

/** A fan of Pazaak hand cards. */
export function PazaakArt({ className }: { className?: string }) {
  const cardShape = (fill: string) => ({ width: 58, height: 82, rx: 7, fill, stroke: '#002657', strokeWidth: 3 });
  const text = { fontFamily: 'Norwester, sans-serif', fontSize: 28, textAnchor: 'middle' as const };
  return (
    <svg viewBox="0 0 240 150" className={className} aria-hidden>
      <g transform="rotate(-16 92 120)">
        <rect x="56" y="36" {...cardShape('#002657')} />
        <text x="85" y="87" fill="#faeeda" {...text}>
          +3
        </text>
      </g>
      <g transform="rotate(16 148 120)">
        <rect x="126" y="36" {...cardShape('#fc3f3f')} />
        <text x="155" y="87" fill="#faeeda" {...text}>
          −2
        </text>
      </g>
      <g>
        <clipPath id="pazaak-art-split">
          <rect x="91" y="24" width="58" height="82" rx="7" />
        </clipPath>
        <g clipPath="url(#pazaak-art-split)">
          <rect x="91" y="24" width="58" height="82" fill="#fc3f3f" />
          <path d="M91 24 h58 l-58 82z" fill="#002657" />
        </g>
        <rect x="91" y="24" width="58" height="82" rx="7" fill="none" stroke="#002657" strokeWidth="3" />
        <text x="120" y="76" fill="#faeeda" {...text}>
          ±1
        </text>
      </g>
      <rect x="84" y="118" width="72" height="26" rx="5" fill="#002657" />
      <text x="120" y="139" fill="#faeeda" fontFamily="Norwester, sans-serif" fontSize="22" textAnchor="middle">
        = 20
      </text>
    </svg>
  );
}
