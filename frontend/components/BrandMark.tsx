/**
 * The single visual mark for this app -- a rounded indigo tile with a shield silhouette
 * and a cyan "scan point," reading as security (shield) + AI/data (the point/pulse) at a
 * glance. Used both inline in the sidebar (this component) and as the browser favicon
 * (app/icon.svg carries the identical shape so the two stay in sync).
 */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="FraudShield AI logo"
      className="shrink-0"
    >
      <rect width="32" height="32" rx="8" fill="#4F46E5" />
      <path
        d="M16 6.5L23 9V15.2C23 20.4 20.2 24 16 25.8C11.8 24 9 20.4 9 15.2V9L16 6.5Z"
        stroke="#F1F5F9"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="16" cy="15.6" r="2.6" fill="#22D3EE" />
    </svg>
  );
}
