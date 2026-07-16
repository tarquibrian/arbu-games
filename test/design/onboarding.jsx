// onboarding.jsx — 3-state onboarding, matches login visual language
const O = {
  bright: '#2fe06a',
  brightDeep: '#19c455',
  text: '#eaf6ee',
  muted: 'rgba(205, 225, 212, 0.62)',
  border: 'rgba(120, 230, 150, 0.32)',
};

const SLIDES = [
  {
    Scene: () => null, key: 'one',
    title: 'Plant your first tree',
    body: 'Start small. Every habit you build grows into something rooted and real.',
  },
  {
    Scene: () => null, key: 'two',
    title: 'Watch your forest grow',
    body: 'Each day you show up, your forest gets a little fuller and a little greener.',
  },
  {
    Scene: () => null, key: 'three',
    title: 'Track every step',
    body: 'See your streaks, your progress and your whole journey unfold over time.',
  },
];

function Dots({ count, index, onPick }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: count }).map((_, i) => (
        <button key={i} onClick={() => onPick(i)} aria-label={`Go to slide ${i + 1}`} style={{
          height: 7, borderRadius: 100, border: 'none', cursor: 'pointer', padding: 0,
          width: i === index ? 26 : 7,
          background: i === index ? O.bright : 'rgba(255,255,255,0.2)',
          boxShadow: i === index ? '0 0 12px rgba(48,224,106,0.6)' : 'none',
          transition: 'all .3s cubic-bezier(.2,.9,.25,1)',
        }} />
      ))}
    </div>
  );
}

function Onboarding() {
  const [index, setIndex] = React.useState(0);
  const last = index === SLIDES.length - 1;
  const Scenes = [window.Trees.SceneOne, window.Trees.SceneTwo, window.Trees.SceneThree];

  const next = () => {
    if (last) { window.location.href = 'Sign In.html'; return; }
    setIndex(i => Math.min(i + 1, SLIDES.length - 1));
  };
  const skip = () => { window.location.href = 'Sign In.html'; };

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: `
        radial-gradient(120% 80% at 50% 118%, rgba(48,224,106,0.40) 0%, rgba(24,90,55,0.0) 55%),
        radial-gradient(90% 60% at 85% 8%, rgba(60,160,100,0.22) 0%, rgba(0,0,0,0) 50%),
        linear-gradient(170deg, #14342310 0%, #0d2419 38%, #07140d 100%)`,
      backgroundColor: '#08160e',
      fontFamily: '"Plus Jakarta Sans", -apple-system, system-ui, sans-serif',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* bottom glow blob */}
      <div style={{
        position: 'absolute', left: '50%', bottom: -90, transform: 'translateX(-50%)',
        width: 360, height: 240, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(48,224,106,0.40) 0%, rgba(48,224,106,0) 70%)',
        filter: 'blur(20px)',
      }} />

      {/* skip */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '64px 26px 0' }}>
        <button onClick={skip} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '8px 4px',
          color: O.muted, fontSize: 14.5, fontWeight: 600, fontFamily: 'inherit',
          opacity: last ? 0 : 1, pointerEvents: last ? 'none' : 'auto', transition: 'opacity .3s',
        }}>Skip</button>
      </div>

      {/* sliding track: illustration + text per panel */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          display: 'flex', height: '100%',
          width: `${SLIDES.length * 100}%`,
          transform: `translateX(-${index * (100 / SLIDES.length)}%)`,
          transition: 'transform .55s cubic-bezier(.45,.05,.2,1)',
        }}>
          {SLIDES.map((s, i) => {
            const Scene = Scenes[i];
            return (
              <div key={s.key} style={{
                width: `${100 / SLIDES.length}%`, height: '100%', flexShrink: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '0 38px', boxSizing: 'border-box',
              }}>
                <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Scene key={index === i ? 'on' : 'off'} active={index === i} />
                </div>
                <h1 style={{
                  color: O.text, fontSize: 28, fontWeight: 800, letterSpacing: -0.6,
                  textAlign: 'center', marginTop: 22, lineHeight: 1.15,
                }}>{s.title}</h1>
                <p style={{
                  color: O.muted, fontSize: 15.5, fontWeight: 400, textAlign: 'center',
                  marginTop: 14, lineHeight: 1.55, maxWidth: 300, textWrap: 'pretty',
                }}>{s.body}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* controls */}
      <div style={{ padding: '0 26px 30px' }}>
        <div style={{ marginBottom: 28 }}>
          <Dots count={SLIDES.length} index={index} onPick={setIndex} />
        </div>
        <button onClick={next} style={{
          height: 64, borderRadius: 18, border: 'none', cursor: 'pointer', width: '100%',
          background: `linear-gradient(180deg, ${O.bright} 0%, ${O.brightDeep} 100%)`,
          boxShadow: '0 0 34px rgba(48,224,106,0.55), 0 14px 30px rgba(20,160,70,0.45), inset 0 1px 0 rgba(255,255,255,0.45)',
          color: '#04230f', fontSize: 17, fontWeight: 800, letterSpacing: 0.3, fontFamily: 'inherit',
          transition: 'transform .12s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
        }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.985)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {last ? 'Get Started' : 'Next'}
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#04230f" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

window.Onboarding = Onboarding;
