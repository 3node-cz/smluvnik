interface LogoProps {
  size?: number
  className?: string
}

export function DMSLogo({ size = 40, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="shield-grad" x1="20" y1="2" x2="20" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e4a7a" />
          <stop offset="60%" stopColor="#2a6496" />
          <stop offset="100%" stopColor="#2d9e7a" />
        </linearGradient>
      </defs>
      <path
        d="M20 2L4 8.5V21C4 30.5 11.2 38.2 20 40C28.8 38.2 36 30.5 36 21V8.5L20 2Z"
        fill="url(#shield-grad)"
      />
      <path
        d="M20 6L8 11.5V21C8 28.8 13.4 35.2 20 37C26.6 35.2 32 28.8 32 21V11.5L20 6Z"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
        opacity="0.6"
      />
      <text
        x="20"
        y="21"
        fontFamily="Arial, sans-serif"
        fontWeight="900"
        fontSize="17"
        fill="white"
        textAnchor="middle"
        dominantBaseline="middle"
      >S</text>
    </svg>
  )
}
