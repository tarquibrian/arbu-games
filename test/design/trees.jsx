// trees.jsx — SOFT, rounded minimal tree illustrations (no sharp points)
// Cloud/blob canopies + circles, two-tone greens, soft accent glow behind.

const T = {
  bright: '#2fe06a',
  mid: '#1f9d52',
  deep: '#15663a',
  dark: '#0d3f24',
  trunk: '#0a2c1a',
  ground: 'rgba(120,230,150,0.16)',
};

// Bushy rounded tree — a trunk topped by a cluster of overlapping circles
// (same fill, so they merge into one soft blobby crown).
function CloudTree({ cx, base, r, fill = T.mid, trunk = T.trunk }) {
  const trunkW = r * 0.42, trunkH = r * 1.05;
  const cyB = base - trunkH;            // crown sits above the trunk
  return (
    <g>
      <rect x={cx - trunkW / 2} y={base - trunkH - 2} width={trunkW} height={trunkH + 3}
        rx={trunkW * 0.5} fill={trunk} />
      <circle cx={cx} cy={cyB - r * 1.05} r={r * 0.92} fill={fill} />
      <circle cx={cx - r * 0.78} cy={cyB - r * 0.45} r={r * 0.72} fill={fill} />
      <circle cx={cx + r * 0.78} cy={cyB - r * 0.45} r={r * 0.72} fill={fill} />
      <circle cx={cx} cy={cyB - r * 0.25} r={r * 0.8} fill={fill} />
    </g>
  );
}

// Simple lollipop tree — single round canopy on a slim trunk.
function RoundTree({ cx, base, r, fill = T.deep, trunk = T.trunk }) {
  const trunkW = r * 0.42, trunkH = r * 1.0;
  return (
    <g>
      <rect x={cx - trunkW / 2} y={base - trunkH - 2} width={trunkW} height={trunkH + 3}
        rx={trunkW * 0.5} fill={trunk} />
      <circle cx={cx} cy={base - trunkH - r * 0.9} r={r} fill={fill} />
    </g>
  );
}

// Tall rounded "drop" tree — a soft pill shape, gives height without points.
function DropTree({ cx, base, w, h, fill = T.mid, trunk = T.trunk }) {
  const trunkW = w * 0.3, trunkH = h * 0.16;
  const ch = h - trunkH;                  // canopy height
  const top = base - trunkH - ch;
  return (
    <g>
      <rect x={cx - trunkW / 2} y={base - trunkH - 2} width={trunkW} height={trunkH + 3}
        rx={trunkW * 0.5} fill={trunk} />
      {/* rounded pill canopy */}
      <rect x={cx - w / 2} y={top} width={w} height={ch} rx={w / 2} fill={fill} />
      <circle cx={cx} cy={top + w / 2} r={w / 2} fill={fill} />
    </g>
  );
}

function GroundLine({ y, w, cx }) {
  return <line x1={cx - w / 2} y1={y} x2={cx + w / 2} y2={y} stroke={T.ground} strokeWidth="3" strokeLinecap="round" />;
}

function Glow({ cx, cy, r }) {
  return <circle cx={cx} cy={cy} r={r} fill="url(#treeGlow)" />;
}

const defs = (
  <defs>
    <radialGradient id="treeGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="rgba(48,224,106,0.45)" />
      <stop offset="60%" stopColor="rgba(48,224,106,0.08)" />
      <stop offset="100%" stopColor="rgba(48,224,106,0)" />
    </radialGradient>
  </defs>
);

function sceneWrap(children, active) {
  return (
    <svg viewBox="0 0 300 260" width="300" height="260" style={{ overflow: 'visible' }}>
      {defs}
      {React.Children.map(children, (child, i) => (
        <g style={{
          transformOrigin: 'center bottom',
          transformBox: 'fill-box',
          animation: active ? `growUp .6s cubic-bezier(.2,.9,.25,1) ${0.08 * i}s` : 'none',
        }}>{child}</g>
      ))}
    </svg>
  );
}

// SCENE 1 — a single soft hero tree
function SceneOne({ active }) {
  return sceneWrap([
    <Glow key="g" cx={150} cy={120} r={120} />,
    <g key="t">
      <CloudTree cx={150} base={224} r={64} fill={T.mid} />
      <GroundLine y={226} w={150} cx={150} />
    </g>,
  ], active);
}

// SCENE 2 — a small soft forest, varied heights
function SceneTwo({ active }) {
  return sceneWrap([
    <Glow key="g" cx={150} cy={130} r={132} />,
    <RoundTree key="r1" cx={64} base={224} r={28} fill={T.dark} />,
    <CloudTree key="c1" cx={152} base={226} r={56} fill={T.mid} />,
    <DropTree key="d1" cx={240} base={224} w={52} h={104} fill={T.deep} />,
    <g key="gl"><GroundLine y={226} w={214} cx={150} /></g>,
  ], active);
}

// SCENE 3 — rolling hills + soft trees + sun
function SceneThree({ active }) {
  return sceneWrap([
    <Glow key="g" cx={150} cy={120} r={135} />,
    <circle key="sun" cx={234} cy={62} r={22} fill={T.bright} opacity="0.9" />,
    <CloudTree key="c1" cx={98} base={210} r={50} fill={T.mid} />,
    <DropTree key="d1" cx={184} base={216} w={46} h={92} fill={T.deep} />,
    <RoundTree key="r1" cx={238} base={216} r={22} fill={T.dark} />,
    <g key="hills">
      <path d="M0 226 Q 80 198 160 224 T 320 220" fill="none" stroke={T.ground} strokeWidth="3" strokeLinecap="round" />
    </g>,
  ], active);
}

window.Trees = { SceneOne, SceneTwo, SceneThree };
