/** The app's icon: a stick figure mid-kick with a red impact star. Same drawing as public/favicon.svg. */
export function AppMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <rect width="64" height="64" rx="12" fill="#002657" />
      <path d="M52 13 l2.6 5.6 6 .9 -4.4 4.1 1.1 6 -5.3 -2.9 -5.3 2.9 1.1 -6 -4.4 -4.1 6 -.9z" fill="#fc3f3f" />
      <g fill="none" stroke="#faeeda" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="25" cy="15" r="5.6" />
        <path d="M24 21.5 L21 37" />
        <path d="M23 26 L33 22 L41 24" />
        <path d="M23 26 L14 31" />
        <path d="M21 37 L13 51" />
        <path d="M21 37 L33 41 L45 34" />
      </g>
    </svg>
  );
}
