import { StyleSheet, View } from 'react-native'
import { useWindowDimensions } from 'react-native'
import Svg, {
  Defs,
  RadialGradient as RG,
  LinearGradient as LG,
  Stop,
  Rect,
} from 'react-native-svg'

export function ScreenBackground() {
  const { width, height } = useWindowDimensions()

  // CSS reference uses two bottom layers:
  //   1. radial-gradient(120% 80% at 50% 118%, rgba(48,224,106,0.40) 0%, transparent 55%) — wide glow
  //   2. A blurred blob div (360×240, bottom:-90, filter:blur(20px)) — concentrated glow
  // Since SVG feGaussianBlur is unreliable on iOS, sbg-blob simulates the blur via a tighter
  // gradient with slightly higher opacity.

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#08160e' }]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          {/* 170deg linear — base layer */}
          <LG id="sbg-linear" x1="0.42" y1="0" x2="0.58" y2="1">
            <Stop offset="0%"   stopColor="#143423" stopOpacity={0.06} />
            <Stop offset="38%"  stopColor="#0d2419" stopOpacity={1} />
            <Stop offset="100%" stopColor="#07140d" stopOpacity={1} />
          </LG>

          {/* Top-right glow: 90% × 60% at 85% 8% — +5% brightness */}
          <RG
            id="sbg-top"
            cx={0}
            cy={0}
            r={1}
            gradientTransform={`translate(${width * 0.85} ${height * 0.08}) scale(${width * 0.9} ${height * 0.6})`}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%"  stopColor="#38c46a" stopOpacity={0.23} />
            <Stop offset="50%" stopColor="#38c46a" stopOpacity={0} />
          </RG>

          {/* Bottom center wide glow — area +20% */}
          <RG
            id="sbg-bottom"
            cx={0}
            cy={0}
            r={1}
            gradientTransform={`translate(${width * 0.5} ${height * 1.18}) scale(${width * 1.44} ${height * 0.96})`}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%"  stopColor="#30e06a" stopOpacity={0.40} />
            <Stop offset="55%" stopColor="#30e06a" stopOpacity={0} />
          </RG>

          {/* Bottom blob: concentrated glow — area +20% */}
          <RG
            id="sbg-blob"
            cx={0}
            cy={0}
            r={1}
            gradientTransform={`translate(${width * 0.5} ${height + 30}) scale(${width * 0.744} ${height * 0.288})`}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%"  stopColor="#30e06a" stopOpacity={0.44} />
            <Stop offset="70%" stopColor="#30e06a" stopOpacity={0} />
          </RG>
        </Defs>

        <Rect x={0} y={0} width={width} height={height} fill="url(#sbg-linear)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#sbg-top)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#sbg-bottom)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#sbg-blob)" />
      </Svg>
    </View>
  )
}
