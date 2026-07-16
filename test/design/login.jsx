// LoginScreen — dark glassy green sign-in, matches reference
const G = {
  bright: '#2fe06a',          // glowing accent green
  brightDeep: '#19c455',
  label: '#3fe874',
  border: 'rgba(120, 230, 150, 0.32)',
  borderFocus: 'rgba(90, 245, 140, 0.85)',
  placeholder: 'rgba(190, 220, 200, 0.45)',
  text: '#eaf6ee',
  muted: 'rgba(205, 225, 212, 0.6)',
};

function FloatField({ label, type = 'text', placeholder, value, onChange, trailing }) {
  const [focus, setFocus] = React.useState(false);
  const active = focus || value.length > 0;
  return (
    <div style={{ position: 'relative', marginTop: 18 }}>
      {/* floating label sitting on the border */}
      <div style={{
        position: 'absolute', top: -8, left: 18, zIndex: 2,
        padding: '0 7px', background: 'linear-gradient(180deg, #0d2419 40%, #0d2419 60%)',
        fontSize: 12.5, fontWeight: 700, letterSpacing: 0.3,
        color: G.label, textTransform: 'capitalize',
        opacity: active ? 1 : 0.85, transition: 'opacity .2s',
      }}>{label}</div>
      <div style={{
        display: 'flex', alignItems: 'center',
        borderRadius: 16,
        border: `1.5px solid ${focus ? G.borderFocus : G.border}`,
        background: 'rgba(255,255,255,0.015)',
        boxShadow: focus ? `0 0 0 4px rgba(70,230,130,0.10)` : 'none',
        transition: 'border-color .2s, box-shadow .2s',
        padding: '0 16px',
      }}>
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            color: G.text, fontSize: 15.5, fontWeight: 400,
            padding: '17px 0', letterSpacing: 0.1,
            fontFamily: 'inherit',
          }}
        />
        {trailing}
      </div>
    </div>
  );
}

function Toggle({ on, onClick }) {
  return (
    <button onClick={onClick} aria-label="Remember me" style={{
      width: 46, height: 27, borderRadius: 100, border: 'none', cursor: 'pointer',
      padding: 3, flexShrink: 0,
      background: on ? G.bright : 'rgba(255,255,255,0.12)',
      boxShadow: on ? `0 0 14px rgba(60,230,120,0.6)` : 'inset 0 0 0 1px rgba(255,255,255,0.15)',
      transition: 'background .25s, box-shadow .25s',
      display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start',
    }}>
      <div style={{
        width: 21, height: 21, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)', transition: 'all .25s',
      }} />
    </button>
  );
}

function SocialBtn({ children }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: 52, height: 52, borderRadius: '50%', cursor: 'pointer',
        border: `1.5px solid ${hover ? G.borderFocus : G.border}`,
        background: hover ? 'rgba(70,230,130,0.10)' : 'rgba(255,255,255,0.02)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .2s', color: G.text,
      }}>{children}</button>
  );
}

function EyeIcon({ off }) {
  return off ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 10 8 10 8a18.5 18.5 0 01-2.16 3.19M6.61 6.61A18.5 18.5 0 002 12s3 8 10 8a9.12 9.12 0 005.39-1.61"/>
      <path d="M14.12 14.12A3 3 0 119.88 9.88M1 1l22 22"/>
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function LoginScreen() {
  const [tab, setTab] = React.useState('signin');
  const [email, setEmail] = React.useState('');
  const [pwd, setPwd] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [remember, setRemember] = React.useState(false);
  const [showPwd, setShowPwd] = React.useState(false);
  const [status, setStatus] = React.useState('idle'); // idle | loading | done
  const [err, setErr] = React.useState('');

  const isUp = tab === 'signup';

  const submit = () => {
    if (status === 'loading') return;
    if (!email.trim() || !pwd.trim() || (isUp && !confirm.trim())) {
      setErr('Please fill in all fields.'); return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setErr('Enter a valid email address.'); return;
    }
    if (isUp && pwd !== confirm) { setErr('Passwords do not match.'); return; }
    setErr(''); setStatus('loading');
    setTimeout(() => setStatus('done'), 1400);
    setTimeout(() => setStatus('idle'), 3200);
  };

  const switchTab = (t) => { setTab(t); setErr(''); setStatus('idle'); };

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: `
        radial-gradient(120% 80% at 50% 118%, rgba(48,224,106,0.40) 0%, rgba(24,90,55,0.0) 55%),
        radial-gradient(90% 60% at 85% 8%, rgba(60,160,100,0.22) 0%, rgba(0,0,0,0) 50%),
        linear-gradient(170deg, #14342310 0%, #0d2419 38%, #07140d 100%)`,
      backgroundColor: '#08160e',
      fontFamily: '"Plus Jakarta Sans", -apple-system, system-ui, sans-serif',
      display: 'flex', flexDirection: 'column',
      padding: '0 26px',
      overflow: 'hidden',
    }}>
      {/* soft animated glow blob bottom */}
      <div style={{
        position: 'absolute', left: '50%', bottom: -90, transform: 'translateX(-50%)',
        width: 360, height: 240, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(48,224,106,0.45) 0%, rgba(48,224,106,0) 70%)',
        filter: 'blur(20px)',
      }} />

      {/* back button */}
      <div style={{ marginTop: 70 }}>
        <button aria-label="Back" style={{
          width: 44, height: 44, borderRadius: '50%', cursor: 'pointer',
          border: `1.5px solid ${G.border}`, background: 'rgba(255,255,255,0.03)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.text} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
      </div>

      {/* tabs heading */}
      <div style={{ marginTop: 38, display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <button onClick={() => switchTab('signin')} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontFamily: 'inherit', fontWeight: 800, fontSize: 34, letterSpacing: -0.5,
          color: !isUp ? '#fff' : G.muted, transition: 'color .2s',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>Sign In</button>
        <span style={{ color: G.muted, fontSize: 26, fontWeight: 300 }}>/</span>
        <button onClick={() => switchTab('signup')} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontFamily: 'inherit', fontWeight: 800, fontSize: 26, letterSpacing: -0.4,
          color: isUp ? '#fff' : G.muted, transition: 'color .2s',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>Sign up</button>
      </div>
      <div style={{ color: G.muted, fontSize: 14.5, marginTop: 9, fontWeight: 400 }}>
        {isUp ? 'Fill the form to create your account' : 'Fill the form to sign into account'}
      </div>

      {/* form */}
      <div style={{ marginTop: 16 }}>
        <FloatField label="Email" type="email" placeholder="Enter your email address"
          value={email} onChange={setEmail} />
        <FloatField label="Password" type={showPwd ? 'text' : 'password'}
          placeholder="Enter your password" value={pwd} onChange={setPwd}
          trailing={
            <button onClick={() => setShowPwd(s => !s)} aria-label="Toggle password"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
              <EyeIcon off={!showPwd} />
            </button>
          } />
        {isUp && (
          <FloatField label="Confirm" type={showPwd ? 'text' : 'password'}
            placeholder="Re-enter your password" value={confirm} onChange={setConfirm} />
        )}
      </div>

      {/* remember + forgot */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 22,
      }}>
        <div onClick={() => setRemember(r => !r)} style={{
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
        }}>
          <Toggle on={remember} onClick={(e) => { e.stopPropagation(); setRemember(r => !r); }} />
          <span style={{ color: G.muted, fontSize: 12.5, fontWeight: 700, letterSpacing: 1 }}>REMEMBER</span>
        </div>
        {!isUp && (
          <button style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            color: G.bright, fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
          }}>Forgot password</button>
        )}
      </div>

      {/* error */}
      <div style={{
        minHeight: 18, marginTop: 12, color: '#ff8a8a', fontSize: 12.5,
        fontWeight: 500, textAlign: 'center', opacity: err ? 1 : 0, transition: 'opacity .2s',
      }}>{err || '\u00a0'}</div>

      {/* CTA */}
      <button onClick={submit} disabled={status === 'loading'} style={{
        marginTop: 4, height: 64, borderRadius: 18, border: 'none', cursor: 'pointer',
        width: '100%', position: 'relative', overflow: 'hidden',
        background: status === 'done'
          ? 'linear-gradient(180deg, #2fe06a, #14b34c)'
          : `linear-gradient(180deg, ${G.bright} 0%, ${G.brightDeep} 100%)`,
        boxShadow: '0 0 34px rgba(48,224,106,0.55), 0 14px 30px rgba(20,160,70,0.45), inset 0 1px 0 rgba(255,255,255,0.45)',
        color: '#04230f', fontSize: 17, fontWeight: 800, letterSpacing: 0.3,
        fontFamily: 'inherit', transition: 'transform .12s, filter .2s',
        filter: status === 'loading' ? 'brightness(0.92)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}
        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.985)'}
        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        {status === 'loading' && <Spinner />}
        {status === 'done'
          ? (isUp ? 'Account created \u2713' : 'Welcome back \u2713')
          : status === 'loading'
            ? 'Please wait\u2026'
            : (isUp ? 'Create account' : 'Sign In')}
      </button>

      {/* divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '26px 0 18px' }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        <span style={{ color: G.muted, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>or continue with</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
      </div>

      {/* socials */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 22 }}>
        <SocialBtn>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0022 12z"/></svg>
        </SocialBtn>
        <SocialBtn>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>
        </SocialBtn>
        <SocialBtn>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.7 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.95S8.78 6.5 12 6.5c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.7 3.9 14.6 3 12 3 6.99 3 2.95 7.03 2.95 12S6.99 21 12 21c5.2 0 8.65-3.65 8.65-8.8 0-.59-.06-1.04-.15-1.5z"/></svg>
        </SocialBtn>
      </div>

      {/* swap hint */}
      <div style={{ textAlign: 'center', marginTop: 'auto', paddingBottom: 26, color: G.muted, fontSize: 13.5, whiteSpace: 'nowrap' }}>
        {isUp ? 'Already have an account? ' : "Don't have an account? "}
        <button onClick={() => switchTab(isUp ? 'signin' : 'signup')} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          color: G.bright, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
        }}>{isUp ? 'Sign In' : 'Sign up'}</button>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(4,35,15,0.3)" strokeWidth="3"/>
      <path d="M12 3a9 9 0 019 9" fill="none" stroke="#04230f" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

window.LoginScreen = LoginScreen;
