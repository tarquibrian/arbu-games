import Svg, { Circle, Rect, G, Path, Line, Defs, RadialGradient, Stop } from 'react-native-svg'

const T = {
  bright: '#2fe06a',
  mid: '#1f9d52',
  deep: '#15663a',
  dark: '#0d3f24',
  trunk: '#0a2c1a',
}

const GROUND = 'rgba(120,230,150,0.16)'

type TreeProps = { cx: number; base: number; r: number; fill?: string; trunk?: string }
type DropTreeProps = { cx: number; base: number; w: number; h: number; fill?: string; trunk?: string }

function CloudTree({ cx, base, r, fill = T.mid, trunk = T.trunk }: TreeProps) {
  const trunkW = r * 0.42
  const trunkH = r * 1.05
  const cyB = base - trunkH
  return (
    <G>
      <Rect x={cx - trunkW / 2} y={base - trunkH - 2} width={trunkW} height={trunkH + 3} rx={trunkW * 0.5} fill={trunk} />
      <Circle cx={cx} cy={cyB - r * 1.05} r={r * 0.92} fill={fill} />
      <Circle cx={cx - r * 0.78} cy={cyB - r * 0.45} r={r * 0.72} fill={fill} />
      <Circle cx={cx + r * 0.78} cy={cyB - r * 0.45} r={r * 0.72} fill={fill} />
      <Circle cx={cx} cy={cyB - r * 0.25} r={r * 0.8} fill={fill} />
    </G>
  )
}

function RoundTree({ cx, base, r, fill = T.deep, trunk = T.trunk }: TreeProps) {
  const trunkW = r * 0.42
  const trunkH = r * 1.0
  return (
    <G>
      <Rect x={cx - trunkW / 2} y={base - trunkH - 2} width={trunkW} height={trunkH + 3} rx={trunkW * 0.5} fill={trunk} />
      <Circle cx={cx} cy={base - trunkH - r * 0.9} r={r} fill={fill} />
    </G>
  )
}

function DropTree({ cx, base, w, h, fill = T.mid, trunk = T.trunk }: DropTreeProps) {
  const trunkW = w * 0.3
  const trunkH = h * 0.16
  const ch = h - trunkH
  const top = base - trunkH - ch
  return (
    <G>
      <Rect x={cx - trunkW / 2} y={base - trunkH - 2} width={trunkW} height={trunkH + 3} rx={trunkW * 0.5} fill={trunk} />
      <Rect x={cx - w / 2} y={top} width={w} height={ch} rx={w / 2} fill={fill} />
      <Circle cx={cx} cy={top + w / 2} r={w / 2} fill={fill} />
    </G>
  )
}

function GlowDefs() {
  return (
    <Defs>
      <RadialGradient id="treeGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#30e06a" stopOpacity={0.45} />
        <Stop offset="60%" stopColor="#30e06a" stopOpacity={0.08} />
        <Stop offset="100%" stopColor="#30e06a" stopOpacity={0} />
      </RadialGradient>
    </Defs>
  )
}

export function SceneOne() {
  return (
    <Svg viewBox="0 0 300 260" width={300} height={260}>
      <GlowDefs />
      <Circle cx={150} cy={120} r={120} fill="url(#treeGlow)" />
      <CloudTree cx={150} base={224} r={64} fill={T.mid} />
      <Line x1={75} y1={226} x2={225} y2={226} stroke={GROUND} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  )
}

export function SceneTwo() {
  return (
    <Svg viewBox="0 0 300 260" width={300} height={260}>
      <GlowDefs />
      <Circle cx={150} cy={130} r={132} fill="url(#treeGlow)" />
      <RoundTree cx={64} base={224} r={28} fill={T.dark} />
      <CloudTree cx={152} base={226} r={56} fill={T.mid} />
      <DropTree cx={240} base={224} w={52} h={104} fill={T.deep} />
      <Line x1={43} y1={226} x2={257} y2={226} stroke={GROUND} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  )
}

export function SceneThree() {
  return (
    <Svg viewBox="0 0 300 260" width={300} height={260}>
      <GlowDefs />
      <Circle cx={150} cy={120} r={135} fill="url(#treeGlow)" />
      <Circle cx={234} cy={62} r={22} fill={T.bright} opacity={0.9} />
      <CloudTree cx={98} base={210} r={50} fill={T.mid} />
      <DropTree cx={184} base={216} w={46} h={92} fill={T.deep} />
      <RoundTree cx={238} base={216} r={22} fill={T.dark} />
      <Path d="M0 226 Q 80 198 160 224 T 320 220" fill="none" stroke={GROUND} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  )
}
