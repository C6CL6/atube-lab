export function LearningMark({ size = 64 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="AI学习专区"
    >
      <rect x="1" y="1" width="62" height="62" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M13 17h14c4 0 7 3 7 7v25c-2-3-5-5-9-5H13V17Z" stroke="currentColor" strokeWidth="2" />
      <path d="M51 17H38c-2 0-4 1-5 3" stroke="currentColor" strokeWidth="2" />
      <path d="M42 24v8l-7 11c-2 4 0 8 5 8h8c5 0 7-4 5-8l-7-11v-8" stroke="#913f30" strokeWidth="2" />
      <path d="M39 42h11" stroke="#913f30" strokeWidth="2" />
      <circle cx="44" cy="37" r="2" fill="#913f30" />
    </svg>
  );
}
