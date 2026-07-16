import React from 'react'
import Svg, { Path, Circle, Rect } from 'react-native-svg'

type IconProps = {
  size?: number
  color?: string
  className?: string
}

export const HomeIcon = ({ size = 24, color = '#9ca3af' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v6H4a1 1 0 0 1-1-1V9.5z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

export const TicketIcon = ({ size = 24, color = '#9ca3af' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 12a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3zM21 9V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v3a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

export const TrophyIcon = ({ size = 24, color = '#9ca3af' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 9H4.5A2.5 2.5 0 0 1 2 6.5v-1A2.5 2.5 0 0 1 4.5 3H6m12 6h1.5a2.5 2.5 0 0 0 2.5-2.5v-1A2.5 2.5 0 0 0 19.5 3H18M4 22h16M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34M12 3a6 6 0 0 1 6 6c0 3.31-2.69 5.66-6 5.66S6 12.31 6 9a6 6 0 0 1 6-6z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

export const UserIcon = ({ size = 24, color = '#9ca3af' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

export const LeafIcon = ({ size = 24, color = '#2fe06a' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M2 22c0-5.5 4.5-10 10-10h10V2C12 2 2 12 2 22z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 12L2 22"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

export const SearchIcon = ({ size = 24, color = '#2fe06a' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={11} cy={11} r={8} stroke={color} strokeWidth={2} />
    <Path d="M21 21l-4.35-4.35" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
)

export const WalletIcon = ({ size = 24, color = '#2fe06a' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 12V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4M22 12h-4c-1.1 0-2-.9-2-2s.9-2 2-2h4v4z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

export const CameraIcon = ({ size = 24, color = '#2fe06a' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx={12} cy={13} r={4} stroke={color} strokeWidth={2} />
  </Svg>
)

export const CalendarIcon = ({ size = 24, color = '#2fe06a' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={3} y={4} width={18} height={18} rx={2} stroke={color} strokeWidth={2} />
    <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth={2} />
  </Svg>
)

export const CO2Icon = ({ size = 24, color = '#2fe06a' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 4h16c1.1 0 2 .9 2 2s-.9 2-2 2H4c-1.1 0-2-.9-2-2s.9-2 2-2z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

export const BoltIcon = ({ size = 24, color = '#2fe06a' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

export const LockIcon = ({ size = 24, color = '#9ca3af' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={3} y={11} width={18} height={11} rx={2} stroke={color} strokeWidth={2} />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth={2} />
  </Svg>
)

export const CoffeeIcon = ({ size = 24, color = '#2fe06a' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

export const BikeIcon = ({ size = 24, color = '#2fe06a' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={5} cy={18} r={3} stroke={color} strokeWidth={2} />
    <Circle cx={19} cy={18} r={3} stroke={color} strokeWidth={2} />
    <Path
      d="M12 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 8h6l3-6M5 18l4-6M19 18l-4-6M12 4v8"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

export const CactusIcon = ({ size = 24, color = '#2fe06a' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2v20M12 7h5a2 2 0 0 1 2 2v5c0 1.1-.9 2-2 2h-5M12 11H7a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h5"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

export const FilmIcon = ({ size = 24, color = '#2fe06a' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={2} y={2} width={20} height={20} rx={2.18} stroke={color} strokeWidth={2} />
    <Path
      d="M7 2v20M17 2v20M2 7h5M2 17h5M17 17h5M17 7h5M7 12h10"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

export const CheckIcon = ({ size = 24, color = '#2fe06a' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
)

export const InfoIcon = ({ size = 24, color = '#2fe06a' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
    <Path d="M12 16v-4M12 8h.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
)

export const MapPinIcon = ({ size = 24, color = '#2fe06a' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx={12} cy={10} r={3} stroke={color} strokeWidth={2} />
  </Svg>
)

export const CloseIcon = ({ size = 24, color = '#eaf6ee' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
)
