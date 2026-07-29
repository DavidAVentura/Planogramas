/* @ds-bundle: {"format":3,"namespace":"CemacoDesignSystem_fbefd1","components":[],"sourceHashes":{"artboards.jsx":"c19baabb9f21","campaigns/mundial_2026/artboards.jsx":"0815a8fb5069","campaigns/mundial_2026/design-canvas.jsx":"5d0e39003628","campaigns/mundial_2026/soccer-vectors.jsx":"b063078bf69a","design-canvas.jsx":"5d0e39003628","soccer-vectors.jsx":"694c81c8c05f","ui_kits/mobile/ios-frame.jsx":"d67eb3ffe562","ui_kits/web/Cart.jsx":"1c41b6ee65a0","ui_kits/web/Header.jsx":"4a0a5d926734","ui_kits/web/ProductCard.jsx":"d8dd8db3c723","ui_kits/web/Sections.jsx":"9d0291ce2243","ui_kits/web/data.js":"12a2fa619e56"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.CemacoDesignSystem_fbefd1 = window.CemacoDesignSystem_fbefd1 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// artboards.jsx
try { (() => {
// Artboards — Cemaco × Mundial 2026 key visuals
// Depends on globals from soccer-vectors.jsx

const INDIGO = '#101E8E';
const INDIGO_DEEP = '#0A1258';
const GREEN = '#94D500';
const GREEN_DARK = '#7FB800';

// Shared eyebrow
function Eyebrow({
  size = 18,
  color = GREEN,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12,
      fontFamily: '"Chalet NY", "Hanken Grotesk", sans-serif',
      fontSize: size,
      letterSpacing: '0.22em',
      color,
      fontWeight: 400
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 2,
      background: color,
      display: 'inline-block'
    }
  }), children);
}

// ============================================================
// KEY VISUAL — 1080 × 1350 (master / print portrait)
// The hero / master key visual — built on FOTO 1 vertical
// ============================================================
function KeyVisualMaster() {
  const W = 1080,
    H = 1350;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: W,
      height: H,
      background: INDIGO,
      position: 'relative',
      overflow: 'hidden',
      fontFamily: '"Hanken Grotesk", sans-serif',
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/foto-fans-vertical.png",
    alt: "",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '55%',
      background: `linear-gradient(180deg, ${INDIGO_DEEP} 0%, rgba(10,18,88,0.82) 30%, rgba(16,30,142,0.35) 65%, rgba(16,30,142,0) 100%)`,
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: W,
      height: 760,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement(ConfettiCloud, {
    count: 70,
    width: W,
    height: 760,
    seed: 7
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 180,
      left: -40,
      transform: 'rotate(18deg)'
    }
  }, /*#__PURE__*/React.createElement(Trumpet, {
    size: 340,
    rotate: 0,
    color: GREEN
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 30,
      left: 0,
      right: 0,
      height: 110,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: W,
    height: 110,
    viewBox: `0 0 ${W} 110`,
    style: {
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: `M0,20 Q${W / 2},80 ${W},20`,
    stroke: "#fff",
    strokeWidth: "2",
    fill: "none",
    opacity: "0.5"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      justifyContent: 'space-around',
      paddingTop: 6
    }
  }, [GREEN, '#fff', GREEN, '#fff', GREEN, '#fff', GREEN, '#fff', GREEN].map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      transform: `translateY(${Math.sin(i * 0.7) * 20 + 18}px) rotate(${i % 2 ? 8 : -8}deg)`
    }
  }, /*#__PURE__*/React.createElement(Pennant, {
    fill: c,
    size: 48
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 120,
      right: 80,
      opacity: 0.9
    }
  }, /*#__PURE__*/React.createElement(StarBurst, {
    size: 140,
    color: GREEN,
    rays: 12,
    rotate: 10
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 240,
      right: 70,
      zIndex: 3
    }
  }, /*#__PURE__*/React.createElement(SoccerBall, {
    size: 190,
    rotate: -22
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 310,
      right: 30,
      opacity: 0.7
    }
  }, /*#__PURE__*/React.createElement(MotionArc, {
    width: 260,
    height: 70,
    color: GREEN,
    rotate: -24
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 180,
      left: 64,
      right: 320,
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    size: 18
  }, "Cemaco \xD7 Mundial 2026"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: '"Chalet NY", "Hanken Grotesk", sans-serif',
      fontSize: 88,
      lineHeight: 0.92,
      letterSpacing: '-0.015em',
      margin: '24px 0 0',
      fontWeight: 400,
      color: '#fff',
      textShadow: '0 6px 24px rgba(6,10,61,0.35)'
    }
  }, "Toda la", /*#__PURE__*/React.createElement("br", null), "pasi\xF3n del", /*#__PURE__*/React.createElement("br", null), "f\xFAtbol"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: '"Chalet NY", "Hanken Grotesk", sans-serif',
      fontSize: 54,
      lineHeight: 1.0,
      letterSpacing: '-0.01em',
      margin: '14px 0 0',
      fontWeight: 400,
      color: GREEN
    }
  }, "a precios que", /*#__PURE__*/React.createElement("br", null), "te encantan.")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 520,
      right: 60,
      zIndex: 6
    }
  }, /*#__PURE__*/React.createElement(GoalBadge, {
    size: 190,
    text: "\xA1GOL!",
    sub: "de ofertas",
    rotate: -14
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 820,
      left: 0,
      width: W,
      height: 220,
      pointerEvents: 'none',
      zIndex: 4
    }
  }, /*#__PURE__*/React.createElement(ConfettiCloud, {
    count: 40,
    width: W,
    height: 220,
    seed: 42
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 8,
      background: GREEN,
      color: INDIGO,
      padding: '26px 60px 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/logo-cemaco-isotipo.png",
    alt: "",
    style: {
      height: 56,
      width: 'auto'
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '"Chalet NY", "Hanken Grotesk", sans-serif',
      fontSize: 26,
      lineHeight: 1,
      letterSpacing: '-0.01em'
    }
  }, "Viv\xED el Mundial en casa"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'DM Mono, monospace',
      fontSize: 13,
      letterSpacing: '0.14em',
      marginTop: 6,
      opacity: 0.85
    }
  }, "11 JUN \u2014 19 JUL 2026 \xB7 CEMACO.COM"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: INDIGO,
      color: '#fff',
      padding: '14px 22px',
      borderRadius: 999,
      fontWeight: 700,
      fontSize: 16,
      letterSpacing: '0.02em'
    }
  }, "Ver ofertas", /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14M13 5l7 7-7 7"
  })))));
}

// ============================================================
// HERO — 1920 × 1080 (landscape desktop)
// Uses FOTO 2 — wide group shot
// ============================================================
function HeroLandscape() {
  const W = 1920,
    H = 1080;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: W,
      height: H,
      background: INDIGO,
      position: 'relative',
      overflow: 'hidden',
      fontFamily: '"Hanken Grotesk", sans-serif',
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: '62%',
      height: '100%',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/foto-fans-group.png",
    alt: "",
    style: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '115%',
      height: 'auto',
      minHeight: '100%',
      objectFit: 'cover'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: `linear-gradient(90deg, ${INDIGO} 0%, rgba(16,30,142,0.4) 18%, rgba(16,30,142,0) 35%)`
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '50%',
      height: '100%',
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      opacity: 0.9
    }
  }, /*#__PURE__*/React.createElement(ConfettiCloud, {
    count: 60,
    width: 960,
    height: H,
    seed: 15
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 380,
      right: -110,
      zIndex: 4
    }
  }, /*#__PURE__*/React.createElement(SoccerBall, {
    size: 240,
    rotate: -18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 430,
      right: -180,
      opacity: 0.7,
      zIndex: 3
    }
  }, /*#__PURE__*/React.createElement(MotionArc, {
    width: 360,
    height: 80,
    color: GREEN,
    rotate: -12
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 60,
      left: -50
    }
  }, /*#__PURE__*/React.createElement(Trumpet, {
    size: 300,
    rotate: -14,
    color: GREEN
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 60,
      left: 70,
      display: 'flex',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement(Pennant, {
    fill: GREEN,
    rotate: -8,
    size: 70
  }), /*#__PURE__*/React.createElement(Pennant, {
    fill: "#fff",
    rotate: 6,
    size: 70
  }), /*#__PURE__*/React.createElement(Pennant, {
    fill: GREEN,
    rotate: -4,
    size: 70
  }), /*#__PURE__*/React.createElement(Pennant, {
    fill: "#fff",
    rotate: 10,
    size: 70
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 72,
      right: 80
    }
  }, /*#__PURE__*/React.createElement(CemacoLockup, {
    variant: "white",
    height: 52
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 260,
      left: 80,
      right: 20,
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    size: 20
  }, "Cemaco \xD7 Mundial 2026"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: '"Chalet NY", "Hanken Grotesk", sans-serif',
      fontSize: 110,
      lineHeight: 0.92,
      letterSpacing: '-0.015em',
      margin: '28px 0 0',
      fontWeight: 400,
      color: '#fff'
    }
  }, "Toda la pasi\xF3n", /*#__PURE__*/React.createElement("br", null), "del f\xFAtbol"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: '"Chalet NY", "Hanken Grotesk", sans-serif',
      fontSize: 72,
      lineHeight: 0.98,
      letterSpacing: '-0.01em',
      margin: '16px 0 0',
      fontWeight: 400,
      color: GREEN
    }
  }, "a precios que", /*#__PURE__*/React.createElement("br", null), "te encantan."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 28,
      marginTop: 52
    }
  }, /*#__PURE__*/React.createElement("a", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12,
      background: GREEN,
      color: INDIGO,
      fontWeight: 700,
      fontSize: 20,
      padding: '18px 30px',
      borderRadius: 999,
      textDecoration: 'none',
      letterSpacing: '0.01em',
      boxShadow: '0 10px 28px rgba(148,213,0,0.4)'
    }
  }, "Viv\xED el Mundial en casa", /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14M13 5l7 7-7 7"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'DM Mono, monospace',
      fontSize: 14,
      letterSpacing: '0.14em',
      opacity: 0.75
    }
  }, "11 JUN \u2014 19 JUL 2026", /*#__PURE__*/React.createElement("br", null), "cemaco.com")))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 60,
      right: 60,
      zIndex: 7
    }
  }, /*#__PURE__*/React.createElement(GoalBadge, {
    size: 180,
    text: "\xA1GOL!",
    sub: "de ofertas",
    rotate: 12
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 40,
      right: 40,
      zIndex: 6,
      display: 'flex',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Pennant, {
    fill: GREEN,
    rotate: 8,
    size: 60
  }), /*#__PURE__*/React.createElement(Pennant, {
    fill: "#fff",
    rotate: -4,
    size: 60
  })));
}

// ============================================================
// IG SQUARE — 1080 × 1080
// Uses FOTO 2 square
// ============================================================
function IgSquare() {
  const W = 1080,
    H = 1080;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: W,
      height: H,
      background: INDIGO,
      position: 'relative',
      overflow: 'hidden',
      fontFamily: '"Hanken Grotesk", sans-serif',
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/foto-fans-group.png",
    alt: "",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '52%',
      background: `linear-gradient(180deg, ${INDIGO_DEEP} 0%, rgba(10,18,88,0.85) 30%, rgba(16,30,142,0) 100%)`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '20%',
      background: `linear-gradient(0deg, ${INDIGO_DEEP} 0%, rgba(16,30,142,0) 100%)`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement(ConfettiCloud, {
    count: 50,
    width: W,
    height: 600,
    seed: 3
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 30,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'space-around'
    }
  }, [GREEN, '#fff', GREEN, '#fff', GREEN, '#fff', GREEN].map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      transform: `translateY(${Math.sin(i * 0.9) * 14 + 10}px) rotate(${i % 2 ? 8 : -8}deg)`
    }
  }, /*#__PURE__*/React.createElement(Pennant, {
    fill: c,
    size: 42
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 60,
      left: -40,
      zIndex: 4
    }
  }, /*#__PURE__*/React.createElement(Trumpet, {
    size: 220,
    rotate: -18,
    color: GREEN
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 120,
      right: 40,
      zIndex: 4
    }
  }, /*#__PURE__*/React.createElement(SoccerBall, {
    size: 150,
    rotate: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 180,
      right: 20,
      opacity: 0.6,
      zIndex: 3
    }
  }, /*#__PURE__*/React.createElement(MotionArc, {
    width: 200,
    height: 50,
    color: GREEN,
    rotate: 24
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 44,
      left: 44,
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement(CemacoLockup, {
    variant: "white",
    height: 44
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 180,
      left: 64,
      right: 64,
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    size: 15
  }, "Cemaco \xD7 Mundial 2026"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: '"Chalet NY", "Hanken Grotesk", sans-serif',
      fontSize: 74,
      lineHeight: 0.94,
      letterSpacing: '-0.015em',
      margin: '18px 0 0',
      fontWeight: 400,
      color: '#fff'
    }
  }, "Toda la pasi\xF3n del f\xFAtbol"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: '"Chalet NY", "Hanken Grotesk", sans-serif',
      fontSize: 48,
      lineHeight: 1.0,
      letterSpacing: '-0.01em',
      margin: '10px 0 0',
      fontWeight: 400,
      color: GREEN
    }
  }, "a precios que te encantan.")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 60,
      left: 64,
      right: 64,
      zIndex: 5,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12,
      background: GREEN,
      color: INDIGO,
      fontWeight: 700,
      fontSize: 18,
      padding: '16px 26px',
      borderRadius: 999
    }
  }, "Viv\xED el Mundial en casa", /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14M13 5l7 7-7 7"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'DM Mono, monospace',
      fontSize: 13,
      letterSpacing: '0.14em',
      opacity: 0.8
    }
  }, "CEMACO.COM")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 140,
      left: 40,
      zIndex: 6
    }
  }, /*#__PURE__*/React.createElement(GoalBadge, {
    size: 160,
    text: "\xA1GOL!",
    sub: "de ofertas",
    rotate: -10
  })));
}

// ============================================================
// IG STORY — 1080 × 1920
// Uses FOTO 1 vertical (perfect fit)
// ============================================================
function IgStory() {
  const W = 1080,
    H = 1920;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: W,
      height: H,
      background: INDIGO,
      position: 'relative',
      overflow: 'hidden',
      fontFamily: '"Hanken Grotesk", sans-serif',
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/foto-fans-vertical.png",
    alt: "",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '50%',
      background: `linear-gradient(180deg, ${INDIGO_DEEP} 0%, rgba(10,18,88,0.82) 25%, rgba(16,30,142,0.25) 60%, rgba(16,30,142,0) 100%)`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: W,
      height: 1100,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement(ConfettiCloud, {
    count: 85,
    width: W,
    height: 1100,
    seed: 11
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 90,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'space-around'
    }
  }, [GREEN, '#fff', GREEN, '#fff', GREEN, '#fff', GREEN].map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      transform: `translateY(${Math.sin(i * 0.8) * 20 + 10}px) rotate(${i % 2 ? 10 : -10}deg)`
    }
  }, /*#__PURE__*/React.createElement(Pennant, {
    fill: c,
    size: 60
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 76,
      right: 60,
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement(CemacoLockup, {
    variant: "white",
    height: 48
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 220,
      left: -40,
      zIndex: 4
    }
  }, /*#__PURE__*/React.createElement(Trumpet, {
    size: 280,
    rotate: 14,
    color: GREEN
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 280,
      right: 60,
      zIndex: 4
    }
  }, /*#__PURE__*/React.createElement(SoccerBall, {
    size: 170,
    rotate: -24
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 340,
      right: 20,
      opacity: 0.6,
      zIndex: 3
    }
  }, /*#__PURE__*/React.createElement(MotionArc, {
    width: 240,
    height: 60,
    color: GREEN,
    rotate: -18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 480,
      left: 64,
      right: 64,
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    size: 20
  }, "Cemaco \xD7 Mundial 2026"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: '"Chalet NY", "Hanken Grotesk", sans-serif',
      fontSize: 108,
      lineHeight: 0.92,
      letterSpacing: '-0.015em',
      margin: '28px 0 0',
      fontWeight: 400,
      color: '#fff',
      textShadow: '0 6px 30px rgba(6,10,61,0.3)'
    }
  }, "Toda la", /*#__PURE__*/React.createElement("br", null), "pasi\xF3n del", /*#__PURE__*/React.createElement("br", null), "f\xFAtbol"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: '"Chalet NY", "Hanken Grotesk", sans-serif',
      fontSize: 68,
      lineHeight: 0.98,
      letterSpacing: '-0.01em',
      margin: '18px 0 0',
      fontWeight: 400,
      color: GREEN
    }
  }, "a precios que", /*#__PURE__*/React.createElement("br", null), "te encantan.")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 980,
      right: 70,
      zIndex: 7
    }
  }, /*#__PURE__*/React.createElement(GoalBadge, {
    size: 200,
    text: "\xA1GOL!",
    sub: "de ofertas",
    rotate: -12
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 120,
      left: 64,
      right: 64,
      zIndex: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '28px 36px',
      background: GREEN,
      color: INDIGO,
      borderRadius: 999,
      fontWeight: 700,
      fontSize: 28,
      boxShadow: '0 12px 32px rgba(148,213,0,0.4)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "Viv\xED el Mundial en casa"), /*#__PURE__*/React.createElement("svg", {
    width: "32",
    height: "32",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14M13 5l7 7-7 7"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24,
      textAlign: 'center',
      fontFamily: 'DM Mono, monospace',
      fontSize: 20,
      letterSpacing: '0.14em',
      opacity: 0.9
    }
  }, "11 JUN \u2014 19 JUL 2026 \xB7 CEMACO.COM")));
}

// ============================================================
// WEB BANNER — 1920 × 720 homepage hero
// ============================================================
function WebBanner() {
  const W = 1920,
    H = 720;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: W,
      height: H,
      background: INDIGO,
      position: 'relative',
      overflow: 'hidden',
      fontFamily: '"Hanken Grotesk", sans-serif',
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: '60%',
      height: '100%',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/foto-fans-group.png",
    alt: "",
    style: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '120%',
      height: 'auto',
      minHeight: '100%',
      objectFit: 'cover'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: `linear-gradient(90deg, ${INDIGO} 0%, rgba(16,30,142,0.5) 20%, rgba(16,30,142,0) 40%)`
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: W,
      height: 320,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement(ConfettiCloud, {
    count: 65,
    width: W,
    height: 320,
    seed: 21
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 32,
      left: 80,
      display: 'flex',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(Pennant, {
    fill: GREEN,
    rotate: -8,
    size: 56
  }), /*#__PURE__*/React.createElement(Pennant, {
    fill: "#fff",
    rotate: 6,
    size: 56
  }), /*#__PURE__*/React.createElement(Pennant, {
    fill: GREEN,
    rotate: -4,
    size: 56
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: -30,
      left: -40,
      zIndex: 3
    }
  }, /*#__PURE__*/React.createElement(Trumpet, {
    size: 240,
    rotate: -12,
    color: GREEN
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 380,
      left: 720,
      zIndex: 4
    }
  }, /*#__PURE__*/React.createElement(SoccerBall, {
    size: 200,
    rotate: -18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 420,
      left: 630,
      opacity: 0.6,
      zIndex: 3
    }
  }, /*#__PURE__*/React.createElement(MotionArc, {
    width: 300,
    height: 70,
    color: GREEN,
    rotate: -10
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 48,
      left: 80,
      zIndex: 6
    }
  }, /*#__PURE__*/React.createElement(CemacoLockup, {
    variant: "white",
    height: 46
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 150,
      left: 80,
      width: 820,
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    size: 16
  }, "Cemaco \xD7 Mundial 2026"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: '"Chalet NY", "Hanken Grotesk", sans-serif',
      fontSize: 80,
      lineHeight: 0.94,
      letterSpacing: '-0.015em',
      margin: '20px 0 0',
      fontWeight: 400,
      color: '#fff'
    }
  }, "Toda la pasi\xF3n del f\xFAtbol"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: '"Chalet NY", "Hanken Grotesk", sans-serif',
      fontSize: 54,
      lineHeight: 1.0,
      letterSpacing: '-0.01em',
      margin: '10px 0 0',
      fontWeight: 400,
      color: GREEN
    }
  }, "a precios que te encantan."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 24,
      marginTop: 36
    }
  }, /*#__PURE__*/React.createElement("a", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      background: GREEN,
      color: INDIGO,
      fontWeight: 700,
      fontSize: 18,
      padding: '16px 28px',
      borderRadius: 999,
      textDecoration: 'none',
      boxShadow: '0 10px 24px rgba(148,213,0,0.35)'
    }
  }, "Viv\xED el Mundial en casa", /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14M13 5l7 7-7 7"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'DM Mono, monospace',
      fontSize: 13,
      letterSpacing: '0.14em',
      opacity: 0.8,
      lineHeight: 1.4
    }
  }, "11 JUN \u2014 19 JUL 2026", /*#__PURE__*/React.createElement("br", null), "cemaco.com"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 40,
      right: 60,
      zIndex: 7
    }
  }, /*#__PURE__*/React.createElement(GoalBadge, {
    size: 150,
    text: "\xA1GOL!",
    sub: "de ofertas",
    rotate: 12
  })));
}
Object.assign(window, {
  KeyVisualMaster,
  HeroLandscape,
  IgSquare,
  IgStory,
  WebBanner
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "artboards.jsx", error: String((e && e.message) || e) }); }

// campaigns/mundial_2026/artboards.jsx
try { (() => {
// Artboards — Mundial 2026 key visuals
// All depend on globals exported by soccer-vectors.jsx

// ============================================================
// HERO — 1920×720 web homepage banner
// ============================================================
function HeroBanner() {
  const W = 1920,
    H = 720;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: W,
      height: H,
      background: '#101E8E',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: '"Hanken Grotesk", sans-serif',
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: -60,
      right: -60,
      width: 520,
      height: 520,
      opacity: 0.7
    }
  }, /*#__PURE__*/React.createElement(GoalNet, {
    size: 520,
    opacity: 0.09
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 48,
      left: 48,
      width: 960,
      height: 624,
      borderRadius: 24,
      overflow: 'hidden',
      boxShadow: '0 30px 80px rgba(0,0,0,0.35)'
    }
  }, /*#__PURE__*/React.createElement(FansPhotoPlaceholder, null), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(90deg, rgba(16,30,142,0) 55%, rgba(16,30,142,0.95) 100%)',
      pointerEvents: 'none'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: W,
      height: 320,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement(ConfettiCloud, {
    count: 60,
    width: W,
    height: 320,
    seed: 7
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 28,
      left: 100,
      display: 'flex',
      gap: 36
    }
  }, /*#__PURE__*/React.createElement(Pennant, {
    fill: "#94D500",
    rotate: -8,
    size: 64
  }), /*#__PURE__*/React.createElement(Pennant, {
    fill: "#fff",
    rotate: 4,
    size: 64
  }), /*#__PURE__*/React.createElement(Pennant, {
    fill: "#94D500",
    rotate: -12,
    size: 64
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 80,
      right: 780
    }
  }, /*#__PURE__*/React.createElement(Trumpet, {
    size: 200,
    rotate: -22,
    color: "#94D500"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 380,
      left: 820,
      zIndex: 4
    }
  }, /*#__PURE__*/React.createElement(SoccerBall, {
    size: 220,
    rotate: -14
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 120,
      right: 72,
      width: 800,
      zIndex: 3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '"Chalet NY", "Hanken Grotesk", sans-serif',
      fontSize: 18,
      letterSpacing: '0.18em',
      color: '#94D500',
      marginBottom: 18
    }
  }, "Cemaco \xB7 Mundial 2026"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: '"Chalet NY", "Hanken Grotesk", sans-serif',
      fontSize: 96,
      lineHeight: 0.94,
      letterSpacing: '-0.015em',
      margin: 0,
      fontWeight: 400,
      textWrap: 'balance'
    }
  }, "Toda la pasi\xF3n", /*#__PURE__*/React.createElement("br", null), "del f\xFAtbol a", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#94D500'
    }
  }, "precios que te", /*#__PURE__*/React.createElement("br", null), "encantar\xE1n.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 24,
      marginTop: 36
    }
  }, /*#__PURE__*/React.createElement("a", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      background: '#94D500',
      color: '#101E8E',
      fontWeight: 800,
      fontSize: 18,
      padding: '16px 28px',
      borderRadius: 999,
      textDecoration: 'none',
      letterSpacing: '0.01em'
    }
  }, "Viv\xED el Mundial en casa", /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14M13 5l7 7-7 7"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      opacity: 0.75,
      lineHeight: 1.4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'DM Mono, monospace',
      letterSpacing: '0.08em'
    }
  }, "11 JUN \u2014 19 JUL 2026"), /*#__PURE__*/React.createElement("div", null, "Env\xEDo gratis en compras >Q250")))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 44,
      left: 88,
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement(CemacoLockup, {
    variant: "white",
    height: 64
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 420,
      left: 700,
      width: 260,
      height: 220,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement(ConfettiCloud, {
    count: 18,
    width: 260,
    height: 220,
    seed: 42
  })));
}

// ============================================================
// IG SQUARE — 1080×1080
// ============================================================
function IgSquare() {
  const W = 1080;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: W,
      height: W,
      background: '#101E8E',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: '"Hanken Grotesk", sans-serif',
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement(ConfettiCloud, {
    count: 55,
    width: W,
    height: W,
    seed: 3
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 80,
      left: 80,
      width: 920,
      height: 520,
      borderRadius: 28,
      overflow: 'hidden',
      boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement(FansPhotoPlaceholder, {
    label: false
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(180deg, rgba(16,30,142,0) 60%, rgba(16,30,142,0.85) 100%)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 30,
      right: 40,
      zIndex: 3
    }
  }, /*#__PURE__*/React.createElement(SoccerBall, {
    size: 180,
    rotate: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 520,
      left: 30,
      zIndex: 3
    }
  }, /*#__PURE__*/React.createElement(Trumpet, {
    size: 220,
    rotate: -28,
    color: "#94D500"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 560,
      right: 60,
      display: 'flex',
      gap: 10,
      zIndex: 3
    }
  }, /*#__PURE__*/React.createElement(Pennant, {
    fill: "#94D500",
    rotate: -6,
    size: 70
  }), /*#__PURE__*/React.createElement(Pennant, {
    fill: "#fff",
    rotate: 8,
    size: 70
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 640,
      left: 80,
      right: 80,
      textAlign: 'center',
      zIndex: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '"Chalet NY", "Hanken Grotesk", sans-serif',
      fontSize: 16,
      letterSpacing: '0.2em',
      color: '#94D500',
      marginBottom: 12
    }
  }, "Cemaco \xB7 Mundial 2026")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 680,
      left: 80,
      right: 80,
      textAlign: 'center',
      zIndex: 4
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: '"Chalet NY", "Hanken Grotesk", sans-serif',
      fontSize: 74,
      lineHeight: 0.95,
      letterSpacing: '-0.015em',
      margin: 0,
      fontWeight: 400
    }
  }, "Toda la pasi\xF3n del f\xFAtbol ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#94D500'
    }
  }, "a precios que te encantar\xE1n."))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 52,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      zIndex: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      background: '#94D500',
      color: '#101E8E',
      fontWeight: 800,
      fontSize: 18,
      padding: '16px 32px',
      borderRadius: 999,
      letterSpacing: '0.01em'
    }
  }, "Viv\xED el Mundial en casa \xB7 cemaco.com")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 28,
      left: 36,
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement(CemacoLockup, {
    variant: "white",
    height: 42
  })));
}

// ============================================================
// IG STORY — 1080×1920
// ============================================================
function IgStory() {
  const W = 1080,
    H = 1920;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: W,
      height: H,
      background: '#101E8E',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: '"Hanken Grotesk", sans-serif',
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: W,
      height: 1100
    }
  }, /*#__PURE__*/React.createElement(FansPhotoPlaceholder, {
    label: false
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(180deg, rgba(16,30,142,0) 60%, #101E8E 100%)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: W,
      height: 1200,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement(ConfettiCloud, {
    count: 70,
    width: W,
    height: 1200,
    seed: 11
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 120,
      left: 60,
      display: 'flex',
      gap: 34
    }
  }, /*#__PURE__*/React.createElement(Pennant, {
    fill: "#94D500",
    rotate: -12,
    size: 78
  }), /*#__PURE__*/React.createElement(Pennant, {
    fill: "#fff",
    rotate: 6,
    size: 78
  }), /*#__PURE__*/React.createElement(Pennant, {
    fill: "#94D500",
    rotate: -4,
    size: 78
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 72,
      right: 60
    }
  }, /*#__PURE__*/React.createElement(CemacoLockup, {
    variant: "white",
    height: 52
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 1000,
      left: 80,
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement(SoccerBall, {
    size: 260,
    rotate: -22
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 1080,
      right: 20,
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement(Trumpet, {
    size: 300,
    rotate: 28,
    color: "#94D500"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 1280,
      left: 60,
      right: 60,
      textAlign: 'left',
      zIndex: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '"Chalet NY", "Hanken Grotesk", sans-serif',
      fontSize: 22,
      letterSpacing: '0.22em',
      color: '#94D500',
      marginBottom: 24
    }
  }, "Cemaco \xB7 Mundial 2026"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: '"Chalet NY", "Hanken Grotesk", sans-serif',
      fontSize: 104,
      lineHeight: 0.94,
      letterSpacing: '-0.015em',
      margin: 0,
      fontWeight: 400
    }
  }, "Toda la pasi\xF3n", /*#__PURE__*/React.createElement("br", null), "del f\xFAtbol a", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#94D500'
    }
  }, "precios que te", /*#__PURE__*/React.createElement("br", null), "encantar\xE1n."))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 120,
      left: 60,
      right: 60,
      zIndex: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '26px 32px',
      background: '#94D500',
      color: '#101E8E',
      borderRadius: 999,
      fontWeight: 800,
      fontSize: 26
    }
  }, /*#__PURE__*/React.createElement("span", null, "Viv\xED el Mundial en casa"), /*#__PURE__*/React.createElement("svg", {
    width: "28",
    height: "28",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14M13 5l7 7-7 7"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      textAlign: 'center',
      fontFamily: 'DM Mono, monospace',
      fontSize: 18,
      letterSpacing: '0.12em',
      opacity: 0.85
    }
  }, "11 JUN \u2014 19 JUL 2026 \xB7 CEMACO.COM")));
}
Object.assign(window, {
  HeroBanner,
  IgSquare,
  IgStory
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "campaigns/mundial_2026/artboards.jsx", error: String((e && e.message) || e) }); }

// campaigns/mundial_2026/design-canvas.jsx
try { (() => {
// DesignCanvas.jsx — Figma-ish design canvas wrapper
// Warm gray grid bg + Sections + Artboards + PostIt notes.
// Artboards are reorderable (grip-drag), labels/titles are inline-editable,
// and any artboard can be opened in a fullscreen focus overlay (←/→/Esc).
// State persists to a .design-canvas.state.json sidecar via the host
// bridge. No assets, no deps.
//
// Usage:
//   <DesignCanvas>
//     <DCSection id="onboarding" title="Onboarding" subtitle="First-run variants">
//       <DCArtboard id="a" label="A · Dusk" width={260} height={480}>…</DCArtboard>
//       <DCArtboard id="b" label="B · Minimal" width={260} height={480}>…</DCArtboard>
//     </DCSection>
//   </DesignCanvas>

const DC = {
  bg: '#f0eee9',
  grid: 'rgba(0,0,0,0.06)',
  label: 'rgba(60,50,40,0.7)',
  title: 'rgba(40,30,20,0.85)',
  subtitle: 'rgba(60,50,40,0.6)',
  postitBg: '#fef4a8',
  postitText: '#5a4a2a',
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
};

// One-time CSS injection (classes are dc-prefixed so they don't collide with
// the hosted design's own styles).
if (typeof document !== 'undefined' && !document.getElementById('dc-styles')) {
  const s = document.createElement('style');
  s.id = 'dc-styles';
  s.textContent = ['.dc-editable{cursor:text;outline:none;white-space:nowrap;border-radius:3px;padding:0 2px;margin:0 -2px}', '.dc-editable:focus{background:#fff;box-shadow:0 0 0 1.5px #c96442}', '[data-dc-slot]{transition:transform .18s cubic-bezier(.2,.7,.3,1)}', '[data-dc-slot].dc-dragging{transition:none;z-index:10;pointer-events:none}', '[data-dc-slot].dc-dragging .dc-card{box-shadow:0 12px 40px rgba(0,0,0,.25),0 0 0 2px #c96442;transform:scale(1.02)}', '.dc-card{transition:box-shadow .15s,transform .15s}', '.dc-card *{scrollbar-width:none}', '.dc-card *::-webkit-scrollbar{display:none}', '.dc-labelrow{display:flex;align-items:center;gap:4px;height:24px}', '.dc-grip{cursor:grab;display:flex;align-items:center;padding:5px 4px;border-radius:4px;transition:background .12s}', '.dc-grip:hover{background:rgba(0,0,0,.08)}', '.dc-grip:active{cursor:grabbing}', '.dc-labeltext{cursor:pointer;border-radius:4px;padding:3px 6px;display:flex;align-items:center;transition:background .12s}', '.dc-labeltext:hover{background:rgba(0,0,0,.05)}', '.dc-expand{position:absolute;bottom:100%;right:0;margin-bottom:5px;z-index:2;opacity:0;transition:opacity .12s,background .12s;', '  width:22px;height:22px;border-radius:5px;border:none;cursor:pointer;padding:0;', '  background:transparent;color:rgba(60,50,40,.7);display:flex;align-items:center;justify-content:center}', '.dc-expand:hover{background:rgba(0,0,0,.06);color:#2a251f}', '[data-dc-slot]:hover .dc-expand{opacity:1}'].join('\n');
  document.head.appendChild(s);
}
const DCCtx = React.createContext(null);

// ─────────────────────────────────────────────────────────────
// DesignCanvas — stateful wrapper around the pan/zoom viewport.
// Owns runtime state (per-section order, renamed titles/labels, focused
// artboard). Order/titles/labels persist to a .design-canvas.state.json
// sidecar next to the HTML. Reads go via plain fetch() so the saved
// arrangement is visible anywhere the HTML + sidecar are served together
// (omelette preview, direct link, downloaded zip). Writes go through the
// host's window.omelette bridge — editing requires the omelette runtime.
// Focus is ephemeral.
// ─────────────────────────────────────────────────────────────
const DC_STATE_FILE = '.design-canvas.state.json';
function DesignCanvas({
  children,
  minScale,
  maxScale,
  style
}) {
  const [state, setState] = React.useState({
    sections: {},
    focus: null
  });
  // Hold rendering until the sidecar read settles so the saved order/titles
  // appear on first paint (no source-order flash). didRead gates writes until
  // the read settles so the empty initial state can't clobber a slow read;
  // skipNextWrite suppresses the one echo-write that would otherwise follow
  // hydration.
  const [ready, setReady] = React.useState(false);
  const didRead = React.useRef(false);
  const skipNextWrite = React.useRef(false);
  React.useEffect(() => {
    let off = false;
    fetch('./' + DC_STATE_FILE).then(r => r.ok ? r.json() : null).then(saved => {
      if (off || !saved || !saved.sections) return;
      skipNextWrite.current = true;
      setState(s => ({
        ...s,
        sections: saved.sections
      }));
    }).catch(() => {}).finally(() => {
      didRead.current = true;
      if (!off) setReady(true);
    });
    const t = setTimeout(() => {
      if (!off) setReady(true);
    }, 150);
    return () => {
      off = true;
      clearTimeout(t);
    };
  }, []);
  React.useEffect(() => {
    if (!didRead.current) return;
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }
    const t = setTimeout(() => {
      window.omelette?.writeFile(DC_STATE_FILE, JSON.stringify({
        sections: state.sections
      })).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [state.sections]);

  // Build registries synchronously from children so FocusOverlay can read
  // them in the same render. Only direct DCSection > DCArtboard children are
  // walked — wrapping them in other elements opts out of focus/reorder.
  const registry = {}; // slotId -> { sectionId, artboard }
  const sectionMeta = {}; // sectionId -> { title, subtitle, slotIds[] }
  const sectionOrder = [];
  React.Children.forEach(children, sec => {
    if (!sec || sec.type !== DCSection) return;
    const sid = sec.props.id ?? sec.props.title;
    if (!sid) return;
    sectionOrder.push(sid);
    const persisted = state.sections[sid] || {};
    const srcIds = [];
    React.Children.forEach(sec.props.children, ab => {
      if (!ab || ab.type !== DCArtboard) return;
      const aid = ab.props.id ?? ab.props.label;
      if (!aid) return;
      registry[`${sid}/${aid}`] = {
        sectionId: sid,
        artboard: ab
      };
      srcIds.push(aid);
    });
    const kept = (persisted.order || []).filter(k => srcIds.includes(k));
    sectionMeta[sid] = {
      title: persisted.title ?? sec.props.title,
      subtitle: sec.props.subtitle,
      slotIds: [...kept, ...srcIds.filter(k => !kept.includes(k))]
    };
  });
  const api = React.useMemo(() => ({
    state,
    section: id => state.sections[id] || {},
    patchSection: (id, p) => setState(s => ({
      ...s,
      sections: {
        ...s.sections,
        [id]: {
          ...s.sections[id],
          ...(typeof p === 'function' ? p(s.sections[id] || {}) : p)
        }
      }
    })),
    setFocus: slotId => setState(s => ({
      ...s,
      focus: slotId
    }))
  }), [state]);

  // Esc exits focus; any outside pointerdown commits an in-progress rename.
  React.useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') api.setFocus(null);
    };
    const onPd = e => {
      const ae = document.activeElement;
      if (ae && ae.isContentEditable && !ae.contains(e.target)) ae.blur();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPd, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPd, true);
    };
  }, [api]);
  return /*#__PURE__*/React.createElement(DCCtx.Provider, {
    value: api
  }, /*#__PURE__*/React.createElement(DCViewport, {
    minScale: minScale,
    maxScale: maxScale,
    style: style
  }, ready && children), state.focus && registry[state.focus] && /*#__PURE__*/React.createElement(DCFocusOverlay, {
    entry: registry[state.focus],
    sectionMeta: sectionMeta,
    sectionOrder: sectionOrder
  }));
}

// ─────────────────────────────────────────────────────────────
// DCViewport — transform-based pan/zoom (internal)
//
// Input mapping (Figma-style):
//   • trackpad pinch  → zoom   (ctrlKey wheel; Safari gesture* events)
//   • trackpad scroll → pan    (two-finger)
//   • mouse wheel     → zoom   (notched; distinguished from trackpad scroll)
//   • middle-drag / primary-drag-on-bg → pan
//
// Transform state lives in a ref and is written straight to the DOM
// (translate3d + will-change) so wheel ticks don't go through React —
// keeps pans at 60fps on dense canvases.
// ─────────────────────────────────────────────────────────────
function DCViewport({
  children,
  minScale = 0.1,
  maxScale = 8,
  style = {}
}) {
  const vpRef = React.useRef(null);
  const worldRef = React.useRef(null);
  const tf = React.useRef({
    x: 0,
    y: 0,
    scale: 1
  });
  const apply = React.useCallback(() => {
    const {
      x,
      y,
      scale
    } = tf.current;
    const el = worldRef.current;
    if (el) el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  }, []);
  React.useEffect(() => {
    const vp = vpRef.current;
    if (!vp) return;
    const zoomAt = (cx, cy, factor) => {
      const r = vp.getBoundingClientRect();
      const px = cx - r.left,
        py = cy - r.top;
      const t = tf.current;
      const next = Math.min(maxScale, Math.max(minScale, t.scale * factor));
      const k = next / t.scale;
      // keep the world point under the cursor fixed
      t.x = px - (px - t.x) * k;
      t.y = py - (py - t.y) * k;
      t.scale = next;
      apply();
    };

    // Mouse-wheel vs trackpad-scroll heuristic. A physical wheel sends
    // line-mode deltas (Firefox) or large integer pixel deltas with no X
    // component (Chrome/Safari, typically multiples of 100/120). Trackpad
    // two-finger scroll sends small/fractional pixel deltas, often with
    // non-zero deltaX. ctrlKey is set by the browser for trackpad pinch.
    const isMouseWheel = e => e.deltaMode !== 0 || e.deltaX === 0 && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 40;
    const onWheel = e => {
      e.preventDefault();
      if (isGesturing) return; // Safari: gesture* owns the pinch — discard concurrent wheels
      if (e.ctrlKey) {
        // trackpad pinch (or explicit ctrl+wheel)
        zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
      } else if (isMouseWheel(e)) {
        // notched mouse wheel — fixed-ratio step per click
        zoomAt(e.clientX, e.clientY, Math.exp(-Math.sign(e.deltaY) * 0.18));
      } else {
        // trackpad two-finger scroll — pan
        tf.current.x -= e.deltaX;
        tf.current.y -= e.deltaY;
        apply();
      }
    };

    // Safari sends native gesture* events for trackpad pinch with a smooth
    // e.scale; preferring these over the ctrl+wheel fallback gives a much
    // better feel there. No-ops on other browsers. Safari also fires
    // ctrlKey wheel events during the same pinch — isGesturing makes
    // onWheel drop those entirely so they neither zoom nor pan.
    let gsBase = 1;
    let isGesturing = false;
    const onGestureStart = e => {
      e.preventDefault();
      isGesturing = true;
      gsBase = tf.current.scale;
    };
    const onGestureChange = e => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, gsBase * e.scale / tf.current.scale);
    };
    const onGestureEnd = e => {
      e.preventDefault();
      isGesturing = false;
    };

    // Drag-pan: middle button anywhere, or primary button on canvas
    // background (anything that isn't an artboard or an inline editor).
    let drag = null;
    const onPointerDown = e => {
      const onBg = !e.target.closest('[data-dc-slot], .dc-editable');
      if (!(e.button === 1 || e.button === 0 && onBg)) return;
      e.preventDefault();
      vp.setPointerCapture(e.pointerId);
      drag = {
        id: e.pointerId,
        lx: e.clientX,
        ly: e.clientY
      };
      vp.style.cursor = 'grabbing';
    };
    const onPointerMove = e => {
      if (!drag || e.pointerId !== drag.id) return;
      tf.current.x += e.clientX - drag.lx;
      tf.current.y += e.clientY - drag.ly;
      drag.lx = e.clientX;
      drag.ly = e.clientY;
      apply();
    };
    const onPointerUp = e => {
      if (!drag || e.pointerId !== drag.id) return;
      vp.releasePointerCapture(e.pointerId);
      drag = null;
      vp.style.cursor = '';
    };
    vp.addEventListener('wheel', onWheel, {
      passive: false
    });
    vp.addEventListener('gesturestart', onGestureStart, {
      passive: false
    });
    vp.addEventListener('gesturechange', onGestureChange, {
      passive: false
    });
    vp.addEventListener('gestureend', onGestureEnd, {
      passive: false
    });
    vp.addEventListener('pointerdown', onPointerDown);
    vp.addEventListener('pointermove', onPointerMove);
    vp.addEventListener('pointerup', onPointerUp);
    vp.addEventListener('pointercancel', onPointerUp);
    return () => {
      vp.removeEventListener('wheel', onWheel);
      vp.removeEventListener('gesturestart', onGestureStart);
      vp.removeEventListener('gesturechange', onGestureChange);
      vp.removeEventListener('gestureend', onGestureEnd);
      vp.removeEventListener('pointerdown', onPointerDown);
      vp.removeEventListener('pointermove', onPointerMove);
      vp.removeEventListener('pointerup', onPointerUp);
      vp.removeEventListener('pointercancel', onPointerUp);
    };
  }, [apply, minScale, maxScale]);
  const gridSvg = `url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M120 0H0v120' fill='none' stroke='${encodeURIComponent(DC.grid)}' stroke-width='1'/%3E%3C/svg%3E")`;
  return /*#__PURE__*/React.createElement("div", {
    ref: vpRef,
    className: "design-canvas",
    style: {
      height: '100vh',
      width: '100vw',
      background: DC.bg,
      overflow: 'hidden',
      overscrollBehavior: 'none',
      touchAction: 'none',
      position: 'relative',
      fontFamily: DC.font,
      boxSizing: 'border-box',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: worldRef,
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      transformOrigin: '0 0',
      willChange: 'transform',
      width: 'max-content',
      minWidth: '100%',
      minHeight: '100%',
      padding: '60px 0 80px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: -6000,
      backgroundImage: gridSvg,
      backgroundSize: '120px 120px',
      pointerEvents: 'none',
      zIndex: -1
    }
  }), children));
}

// ─────────────────────────────────────────────────────────────
// DCSection — editable title + h-row of artboards in persisted order
// ─────────────────────────────────────────────────────────────
function DCSection({
  id,
  title,
  subtitle,
  children,
  gap = 48
}) {
  const ctx = React.useContext(DCCtx);
  const sid = id ?? title;
  const all = React.Children.toArray(children);
  const artboards = all.filter(c => c && c.type === DCArtboard);
  const rest = all.filter(c => !(c && c.type === DCArtboard));
  const srcOrder = artboards.map(a => a.props.id ?? a.props.label);
  const sec = ctx && sid && ctx.section(sid) || {};
  const order = React.useMemo(() => {
    const kept = (sec.order || []).filter(k => srcOrder.includes(k));
    return [...kept, ...srcOrder.filter(k => !kept.includes(k))];
  }, [sec.order, srcOrder.join('|')]);
  const byId = Object.fromEntries(artboards.map(a => [a.props.id ?? a.props.label, a]));
  return /*#__PURE__*/React.createElement("div", {
    "data-dc-section": sid,
    style: {
      marginBottom: 80,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 60px 56px'
    }
  }, /*#__PURE__*/React.createElement(DCEditable, {
    tag: "div",
    value: sec.title ?? title,
    onChange: v => ctx && sid && ctx.patchSection(sid, {
      title: v
    }),
    style: {
      fontSize: 28,
      fontWeight: 600,
      color: DC.title,
      letterSpacing: -0.4,
      marginBottom: 6,
      display: 'inline-block'
    }
  }), subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      color: DC.subtitle
    }
  }, subtitle)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap,
      padding: '0 60px',
      alignItems: 'flex-start',
      width: 'max-content'
    }
  }, order.map(k => /*#__PURE__*/React.createElement(DCArtboardFrame, {
    key: k,
    sectionId: sid,
    artboard: byId[k],
    order: order,
    label: (sec.labels || {})[k] ?? byId[k].props.label,
    onRename: v => ctx && ctx.patchSection(sid, x => ({
      labels: {
        ...x.labels,
        [k]: v
      }
    })),
    onReorder: next => ctx && ctx.patchSection(sid, {
      order: next
    }),
    onFocus: () => ctx && ctx.setFocus(`${sid}/${k}`)
  }))), rest);
}

// DCArtboard — marker; rendered by DCArtboardFrame via DCSection.
function DCArtboard() {
  return null;
}
function DCArtboardFrame({
  sectionId,
  artboard,
  label,
  order,
  onRename,
  onReorder,
  onFocus
}) {
  const {
    id: rawId,
    label: rawLabel,
    width = 260,
    height = 480,
    children,
    style = {}
  } = artboard.props;
  const id = rawId ?? rawLabel;
  const ref = React.useRef(null);

  // Live drag-reorder: dragged card sticks to cursor; siblings slide into
  // their would-be slots in real time via transforms. DOM order only
  // changes on drop.
  const onGripDown = e => {
    e.preventDefault();
    e.stopPropagation();
    const me = ref.current;
    // translateX is applied in local (pre-scale) space but pointer deltas and
    // getBoundingClientRect().left are screen-space — divide by the viewport's
    // current scale so the dragged card tracks the cursor at any zoom level.
    const scale = me.getBoundingClientRect().width / me.offsetWidth || 1;
    const peers = Array.from(document.querySelectorAll(`[data-dc-section="${sectionId}"] [data-dc-slot]`));
    const homes = peers.map(el => ({
      el,
      id: el.dataset.dcSlot,
      x: el.getBoundingClientRect().left
    }));
    const slotXs = homes.map(h => h.x);
    const startIdx = order.indexOf(id);
    const startX = e.clientX;
    let liveOrder = order.slice();
    me.classList.add('dc-dragging');
    const layout = () => {
      for (const h of homes) {
        if (h.id === id) continue;
        const slot = liveOrder.indexOf(h.id);
        h.el.style.transform = `translateX(${(slotXs[slot] - h.x) / scale}px)`;
      }
    };
    const move = ev => {
      const dx = ev.clientX - startX;
      me.style.transform = `translateX(${dx / scale}px)`;
      const cur = homes[startIdx].x + dx;
      let nearest = 0,
        best = Infinity;
      for (let i = 0; i < slotXs.length; i++) {
        const d = Math.abs(slotXs[i] - cur);
        if (d < best) {
          best = d;
          nearest = i;
        }
      }
      if (liveOrder.indexOf(id) !== nearest) {
        liveOrder = order.filter(k => k !== id);
        liveOrder.splice(nearest, 0, id);
        layout();
      }
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      const finalSlot = liveOrder.indexOf(id);
      me.classList.remove('dc-dragging');
      me.style.transform = `translateX(${(slotXs[finalSlot] - homes[startIdx].x) / scale}px)`;
      // After the settle transition, kill transitions + clear transforms +
      // commit the reorder in the same frame so there's no visual snap-back.
      setTimeout(() => {
        for (const h of homes) {
          h.el.style.transition = 'none';
          h.el.style.transform = '';
        }
        if (liveOrder.join('|') !== order.join('|')) onReorder(liveOrder);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          for (const h of homes) h.el.style.transition = '';
        }));
      }, 180);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    "data-dc-slot": id,
    style: {
      position: 'relative',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-labelrow",
    style: {
      position: 'absolute',
      bottom: '100%',
      left: -4,
      marginBottom: 4,
      color: DC.label
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-grip",
    onPointerDown: onGripDown,
    title: "Drag to reorder"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "9",
    height: "13",
    viewBox: "0 0 9 13",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "2",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "2",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "6.5",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "6.5",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "11",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "11",
    r: "1.1"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dc-labeltext",
    onClick: onFocus,
    title: "Click to focus"
  }, /*#__PURE__*/React.createElement(DCEditable, {
    value: label,
    onChange: onRename,
    onClick: e => e.stopPropagation(),
    style: {
      fontSize: 15,
      fontWeight: 500,
      color: DC.label,
      lineHeight: 1
    }
  }))), /*#__PURE__*/React.createElement("button", {
    className: "dc-expand",
    onClick: onFocus,
    onPointerDown: e => e.stopPropagation(),
    title: "Focus"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 12 12",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M7 1h4v4M5 11H1V7M11 1L7.5 4.5M1 11l3.5-3.5"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dc-card",
    style: {
      borderRadius: 2,
      boxShadow: '0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(0,0,0,.06)',
      overflow: 'hidden',
      width,
      height,
      background: '#fff',
      ...style
    }
  }, children || /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#bbb',
      fontSize: 13,
      fontFamily: DC.font
    }
  }, id)));
}

// Inline rename — commits on blur or Enter.
function DCEditable({
  value,
  onChange,
  style,
  tag = 'span',
  onClick
}) {
  const T = tag;
  return /*#__PURE__*/React.createElement(T, {
    className: "dc-editable",
    contentEditable: true,
    suppressContentEditableWarning: true,
    onClick: onClick,
    onPointerDown: e => e.stopPropagation(),
    onBlur: e => onChange && onChange(e.currentTarget.textContent),
    onKeyDown: e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.currentTarget.blur();
      }
    },
    style: style
  }, value);
}

// ─────────────────────────────────────────────────────────────
// Focus mode — overlay one artboard; ←/→ within section, ↑/↓ across
// sections, Esc or backdrop click to exit.
// ─────────────────────────────────────────────────────────────
function DCFocusOverlay({
  entry,
  sectionMeta,
  sectionOrder
}) {
  const ctx = React.useContext(DCCtx);
  const {
    sectionId,
    artboard
  } = entry;
  const sec = ctx.section(sectionId);
  const meta = sectionMeta[sectionId];
  const peers = meta.slotIds;
  const aid = artboard.props.id ?? artboard.props.label;
  const idx = peers.indexOf(aid);
  const secIdx = sectionOrder.indexOf(sectionId);
  const go = d => {
    const n = peers[(idx + d + peers.length) % peers.length];
    if (n) ctx.setFocus(`${sectionId}/${n}`);
  };
  const goSection = d => {
    const ns = sectionOrder[(secIdx + d + sectionOrder.length) % sectionOrder.length];
    const first = sectionMeta[ns] && sectionMeta[ns].slotIds[0];
    if (first) ctx.setFocus(`${ns}/${first}`);
  };
  React.useEffect(() => {
    const k = e => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        goSection(-1);
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        goSection(1);
      }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  });
  const {
    width = 260,
    height = 480,
    children
  } = artboard.props;
  const [vp, setVp] = React.useState({
    w: window.innerWidth,
    h: window.innerHeight
  });
  React.useEffect(() => {
    const r = () => setVp({
      w: window.innerWidth,
      h: window.innerHeight
    });
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);
  const scale = Math.max(0.1, Math.min((vp.w - 200) / width, (vp.h - 260) / height, 2));
  const [ddOpen, setDd] = React.useState(false);
  const Arrow = ({
    dir,
    onClick
  }) => /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      onClick();
    },
    style: {
      position: 'absolute',
      top: '50%',
      [dir]: 28,
      transform: 'translateY(-50%)',
      border: 'none',
      background: 'rgba(255,255,255,.08)',
      color: 'rgba(255,255,255,.9)',
      width: 44,
      height: 44,
      borderRadius: 22,
      fontSize: 18,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background .15s'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'rgba(255,255,255,.18)',
    onMouseLeave: e => e.currentTarget.style.background = 'rgba(255,255,255,.08)'
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 18 18",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: dir === 'left' ? 'M11 3L5 9l6 6' : 'M7 3l6 6-6 6'
  })));

  // Portal to body so position:fixed is the real viewport regardless of any
  // transform on DesignCanvas's ancestors (including the canvas zoom itself).
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    onClick: () => ctx.setFocus(null),
    onWheel: e => e.preventDefault(),
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'rgba(24,20,16,.6)',
      backdropFilter: 'blur(14px)',
      fontFamily: DC.font,
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 72,
      display: 'flex',
      alignItems: 'flex-start',
      padding: '16px 20px 0',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setDd(o => !o),
    style: {
      border: 'none',
      background: 'transparent',
      color: '#fff',
      cursor: 'pointer',
      padding: '6px 8px',
      borderRadius: 6,
      textAlign: 'left',
      fontFamily: 'inherit'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      letterSpacing: -0.3
    }
  }, meta.title), /*#__PURE__*/React.createElement("svg", {
    width: "11",
    height: "11",
    viewBox: "0 0 11 11",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    style: {
      opacity: .7
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2 4l3.5 3.5L9 4"
  }))), meta.subtitle && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 13,
      opacity: .6,
      fontWeight: 400,
      marginTop: 2
    }
  }, meta.subtitle)), ddOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '100%',
      left: 0,
      marginTop: 4,
      background: '#2a251f',
      borderRadius: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,.4)',
      padding: 4,
      minWidth: 200,
      zIndex: 10
    }
  }, sectionOrder.map(sid => /*#__PURE__*/React.createElement("button", {
    key: sid,
    onClick: () => {
      setDd(false);
      const f = sectionMeta[sid].slotIds[0];
      if (f) ctx.setFocus(`${sid}/${f}`);
    },
    style: {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      border: 'none',
      cursor: 'pointer',
      background: sid === sectionId ? 'rgba(255,255,255,.1)' : 'transparent',
      color: '#fff',
      padding: '8px 12px',
      borderRadius: 5,
      fontSize: 14,
      fontWeight: sid === sectionId ? 600 : 400,
      fontFamily: 'inherit'
    }
  }, sectionMeta[sid].title)))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => ctx.setFocus(null),
    onMouseEnter: e => e.currentTarget.style.background = 'rgba(255,255,255,.12)',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent',
    style: {
      border: 'none',
      background: 'transparent',
      color: 'rgba(255,255,255,.7)',
      width: 32,
      height: 32,
      borderRadius: 16,
      fontSize: 20,
      cursor: 'pointer',
      lineHeight: 1,
      transition: 'background .12s'
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 64,
      bottom: 56,
      left: 100,
      right: 100,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: width * scale,
      height: height * scale,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      background: '#fff',
      borderRadius: 2,
      overflow: 'hidden',
      boxShadow: '0 20px 80px rgba(0,0,0,.4)'
    }
  }, children || /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#bbb'
    }
  }, aid))), /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      fontSize: 14,
      fontWeight: 500,
      opacity: .85,
      textAlign: 'center'
    }
  }, (sec.labels || {})[aid] ?? artboard.props.label, /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: .5,
      marginLeft: 10,
      fontVariantNumeric: 'tabular-nums'
    }
  }, idx + 1, " / ", peers.length))), /*#__PURE__*/React.createElement(Arrow, {
    dir: "left",
    onClick: () => go(-1)
  }), /*#__PURE__*/React.createElement(Arrow, {
    dir: "right",
    onClick: () => go(1)
  }), /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: 8
    }
  }, peers.map((p, i) => /*#__PURE__*/React.createElement("button", {
    key: p,
    onClick: () => ctx.setFocus(`${sectionId}/${p}`),
    style: {
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      width: 6,
      height: 6,
      borderRadius: 3,
      background: i === idx ? '#fff' : 'rgba(255,255,255,.3)'
    }
  })))), document.body);
}

// ─────────────────────────────────────────────────────────────
// Post-it — absolute-positioned sticky note
// ─────────────────────────────────────────────────────────────
function DCPostIt({
  children,
  top,
  left,
  right,
  bottom,
  rotate = -2,
  width = 180
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top,
      left,
      right,
      bottom,
      width,
      background: DC.postitBg,
      padding: '14px 16px',
      fontFamily: '"Comic Sans MS", "Marker Felt", "Segoe Print", cursive',
      fontSize: 14,
      lineHeight: 1.4,
      color: DC.postitText,
      boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
      transform: `rotate(${rotate}deg)`,
      zIndex: 5
    }
  }, children);
}
Object.assign(window, {
  DesignCanvas,
  DCSection,
  DCArtboard,
  DCPostIt
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "campaigns/mundial_2026/design-canvas.jsx", error: String((e && e.message) || e) }); }

// campaigns/mundial_2026/soccer-vectors.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Soccer vector library — Cemaco × Mundial 2026
// All vectors designed to layer on indigo #101E8E with green #94D500 + white accents.

// --- Soccer ball (classic black/white truncated icosahedron) ---
function SoccerBall({
  size = 120,
  rotate = 0,
  shadow = true
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "-60 -60 120 120",
    style: {
      transform: `rotate(${rotate}deg)`,
      filter: shadow ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.25))' : 'none',
      overflow: 'visible'
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "0",
    cy: "0",
    r: "54",
    fill: "#fff"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "0,-22 21,-7 13,18 -13,18 -21,-7",
    fill: "#0b0f0b"
  }), /*#__PURE__*/React.createElement("g", {
    fill: "#0b0f0b"
  }, /*#__PURE__*/React.createElement("polygon", {
    points: "-34,-36 -24,-48 -10,-40 -13,-26 -27,-24"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "10,-40 24,-48 34,-36 27,-24 13,-26"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "38,-6 50,2 48,18 34,20 28,6"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "-28,6 -34,20 -48,18 -50,2 -38,-6"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "-18,28 0,36 18,28 12,46 -12,46"
  })), /*#__PURE__*/React.createElement("g", {
    stroke: "#0b0f0b",
    strokeWidth: "1.5",
    fill: "none",
    opacity: "0.9"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M0,-22 L0,-40"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M21,-7 L34,-6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M13,18 L18,28"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M-13,18 L-18,28"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M-21,-7 L-34,-6"
  })), /*#__PURE__*/React.createElement("circle", {
    cx: "0",
    cy: "0",
    r: "54",
    fill: "none",
    stroke: "#0b0f0b",
    strokeWidth: "1"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "-18",
    cy: "-24",
    rx: "18",
    ry: "9",
    fill: "rgba(255,255,255,0.22)"
  }));
}

// --- Vuvuzela / trumpet ---
function Trumpet({
  size = 160,
  rotate = -18,
  color = '#94D500'
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size * 0.5,
    viewBox: "0 0 320 160",
    style: {
      transform: `rotate(${rotate}deg)`,
      filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.22))',
      overflow: 'visible'
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "trumpetGrad",
    x1: "0",
    x2: "1",
    y1: "0",
    y2: "0"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: color,
    stopOpacity: "1"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: color,
    stopOpacity: "0.75"
  }))), /*#__PURE__*/React.createElement("path", {
    d: "M20,70 L20,90 Q20,100 30,100 L160,100 Q190,100 220,85 L300,50 Q315,44 315,60 L315,100 Q315,116 300,110 L220,75 Q190,60 160,60 L30,60 Q20,60 20,70 Z",
    fill: "url(#trumpetGrad)",
    stroke: "#0b0f0b",
    strokeWidth: "3",
    strokeLinejoin: "round"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "10",
    y: "72",
    width: "16",
    height: "16",
    rx: "3",
    fill: "#0b0f0b"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M240,66 Q275,54 305,52",
    stroke: "rgba(255,255,255,0.5)",
    strokeWidth: "3",
    fill: "none",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("g", {
    stroke: color,
    strokeWidth: "3",
    strokeLinecap: "round",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M320,40 L334,30"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M326,60 L346,56"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M326,90 L346,94"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M320,110 L334,120"
  })));
}

// --- Triangular pennant flag on a pole ---
function Pennant({
  size = 90,
  rotate = 0,
  fill = '#94D500',
  text = ''
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size * 1.3,
    viewBox: "0 0 90 120",
    style: {
      transform: `rotate(${rotate}deg)`,
      filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
      overflow: 'visible'
    }
  }, /*#__PURE__*/React.createElement("rect", {
    x: "8",
    y: "0",
    width: "3",
    height: "120",
    fill: "#D9C199"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9.5",
    cy: "2",
    r: "3.5",
    fill: "#E8D9B9",
    stroke: "#0b0f0b",
    strokeWidth: "1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M11,6 Q50,14 85,10 Q70,30 85,50 Q50,46 11,54 Z",
    fill: fill,
    stroke: "#0b0f0b",
    strokeWidth: "2",
    strokeLinejoin: "round"
  }), text && /*#__PURE__*/React.createElement("text", {
    x: "35",
    y: "36",
    fontFamily: "Hanken Grotesk, sans-serif",
    fontSize: "14",
    fontWeight: "800",
    fill: "#101E8E"
  }, text));
}

// --- Generic confetti piece (rect, circle, squiggle, star) ---
function ConfettiPiece({
  kind = 'rect',
  size = 14,
  color = '#94D500',
  rotate = 0,
  x = 0,
  y = 0
}) {
  const common = {
    position: 'absolute',
    left: x,
    top: y,
    transform: `rotate(${rotate}deg)`,
    overflow: 'visible'
  };
  if (kind === 'rect') return /*#__PURE__*/React.createElement("svg", {
    style: common,
    width: size,
    height: size * 0.35,
    viewBox: "0 0 20 7"
  }, /*#__PURE__*/React.createElement("rect", {
    width: "20",
    height: "7",
    rx: "1.5",
    fill: color
  }));
  if (kind === 'circle') return /*#__PURE__*/React.createElement("svg", {
    style: common,
    width: size,
    height: size,
    viewBox: "0 0 20 20"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "10",
    cy: "10",
    r: "8",
    fill: color
  }));
  if (kind === 'ring') return /*#__PURE__*/React.createElement("svg", {
    style: common,
    width: size,
    height: size,
    viewBox: "0 0 20 20"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "10",
    cy: "10",
    r: "7",
    fill: "none",
    stroke: color,
    strokeWidth: "2.5"
  }));
  if (kind === 'squiggle') return /*#__PURE__*/React.createElement("svg", {
    style: common,
    width: size * 1.4,
    height: size * 0.5,
    viewBox: "0 0 30 10"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2,5 Q7,0 12,5 T22,5 T30,5",
    stroke: color,
    strokeWidth: "2.5",
    fill: "none",
    strokeLinecap: "round"
  }));
  if (kind === 'star') return /*#__PURE__*/React.createElement("svg", {
    style: common,
    width: size,
    height: size,
    viewBox: "-12 -12 24 24"
  }, /*#__PURE__*/React.createElement("polygon", {
    points: "0,-10 2.5,-3 10,-3 4,2 6,10 0,5 -6,10 -4,2 -10,-3 -2.5,-3",
    fill: color
  }));
  if (kind === 'tri') return /*#__PURE__*/React.createElement("svg", {
    style: common,
    width: size,
    height: size,
    viewBox: "0 0 20 20"
  }, /*#__PURE__*/React.createElement("polygon", {
    points: "10,2 18,18 2,18",
    fill: color
  }));
  return null;
}

// --- Goal net pattern (for backgrounds) ---
function GoalNet({
  size = 400,
  opacity = 0.08
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 100 100",
    style: {
      position: 'absolute',
      opacity,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("pattern", {
    id: "net",
    x: "0",
    y: "0",
    width: "8",
    height: "8",
    patternUnits: "userSpaceOnUse"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M0,4 L8,4 M4,0 L4,8",
    stroke: "#fff",
    strokeWidth: "0.4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M0,0 L8,8 M8,0 L0,8",
    stroke: "#fff",
    strokeWidth: "0.3"
  }))), /*#__PURE__*/React.createElement("rect", {
    width: "100",
    height: "100",
    fill: "url(#net)"
  }));
}

// --- Random confetti cloud — deterministic based on seed for stable renders ---
function ConfettiCloud({
  count = 40,
  width = 800,
  height = 400,
  seed = 1
}) {
  // simple LCG for determinism
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const kinds = ['rect', 'rect', 'circle', 'ring', 'squiggle', 'star', 'tri'];
  const colors = ['#94D500', '#94D500', '#FFFFFF', '#F5B324', '#94D500', '#FFFFFF'];
  const pieces = [];
  for (let i = 0; i < count; i++) {
    pieces.push({
      kind: kinds[Math.floor(rand() * kinds.length)],
      color: colors[Math.floor(rand() * colors.length)],
      size: 10 + Math.floor(rand() * 22),
      rotate: Math.floor(rand() * 360),
      x: Math.floor(rand() * width),
      y: Math.floor(rand() * height)
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      width,
      height,
      pointerEvents: 'none'
    }
  }, pieces.map((p, i) => /*#__PURE__*/React.createElement(ConfettiPiece, _extends({
    key: i
  }, p))));
}

// --- Living-room fans photo PLACEHOLDER
//     Produces a color-graded indigo/green gradient with silhouetted figures.
//     Clearly marked as a placeholder so client can swap. ---
function FansPhotoPlaceholder({
  width = '100%',
  height = '100%',
  label = true,
  tint = 'duo'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      position: 'relative',
      overflow: 'hidden',
      background: tint === 'duo' ? 'linear-gradient(135deg, #2B3A6D 0%, #101E8E 50%, #0A1258 100%)' : '#1a1a1a',
      borderRadius: 'inherit'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 800 500",
    preserveAspectRatio: "xMidYMid slice",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("radialGradient", {
    id: "lampWash",
    cx: "0.75",
    cy: "0.15",
    r: "0.6"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#F5B324",
    stopOpacity: "0.45"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#F5B324",
    stopOpacity: "0"
  })), /*#__PURE__*/React.createElement("radialGradient", {
    id: "tvGlow",
    cx: "0.5",
    cy: "0.85",
    r: "0.4"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#94D500",
    stopOpacity: "0.35"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#94D500",
    stopOpacity: "0"
  }))), /*#__PURE__*/React.createElement("rect", {
    width: "800",
    height: "500",
    fill: "url(#lampWash)"
  }), /*#__PURE__*/React.createElement("rect", {
    width: "800",
    height: "500",
    fill: "url(#tvGlow)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "560",
    y: "80",
    width: "180",
    height: "140",
    fill: "#0A1258",
    stroke: "#2B3A6D",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "650",
    y1: "80",
    x2: "650",
    y2: "220",
    stroke: "#2B3A6D",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M50,380 Q50,320 110,320 L690,320 Q750,320 750,380 L750,460 L50,460 Z",
    fill: "#050830"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M50,380 Q50,330 110,330 L690,330 Q750,330 750,380 L750,400 Q400,380 50,400 Z",
    fill: "#0A1258"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M130,335 Q130,305 170,305 L270,305 Q310,305 310,335 L310,390 L130,390 Z",
    fill: "#050830",
    opacity: "0.8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M340,335 Q340,305 380,305 L480,305 Q520,305 520,335 L520,390 L340,390 Z",
    fill: "#050830",
    opacity: "0.8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M550,335 Q550,305 590,305 L660,305 Q700,305 700,335 L700,390 L550,390 Z",
    fill: "#050830",
    opacity: "0.8"
  }), /*#__PURE__*/React.createElement("g", {
    fill: "#000"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "230",
    cy: "210",
    r: "34"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M190,240 Q230,220 270,240 L285,320 L175,320 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M192,238 Q170,200 158,150 Q152,130 162,128 Q172,126 178,148 Q188,188 205,218 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M268,238 Q290,200 302,150 Q308,130 298,128 Q288,126 282,148 Q272,188 255,218 Z"
  })), /*#__PURE__*/React.createElement("g", {
    fill: "#000"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "410",
    cy: "195",
    r: "36"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M370,230 Q410,210 450,230 L468,320 L352,320 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M372,228 Q340,180 320,120 Q312,98 324,94 Q336,90 344,114 Q360,168 386,210 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M448,228 Q480,180 500,120 Q508,98 496,94 Q484,90 476,114 Q460,168 434,210 Z"
  })), /*#__PURE__*/React.createElement("g", {
    fill: "#000"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "580",
    cy: "215",
    r: "32"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M544,244 Q580,226 616,244 L628,320 L532,320 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M546,242 Q528,210 520,170 Q516,152 526,150 Q536,148 542,168 Q550,200 560,222 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M614,242 Q632,210 640,170 Q644,152 634,150 Q624,148 618,168 Q610,200 600,222 Z"
  })), /*#__PURE__*/React.createElement("rect", {
    x: "340",
    y: "410",
    width: "160",
    height: "12",
    fill: "#0A1258"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "360",
    y: "395",
    width: "14",
    height: "18",
    fill: "#2B3A6D"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "420",
    y: "390",
    width: "16",
    height: "22",
    fill: "#2B3A6D"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "470",
    y: "395",
    width: "12",
    height: "16",
    fill: "#2B3A6D"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "460",
    width: "800",
    height: "40",
    fill: "#03051E"
  })), label && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 12,
      right: 12,
      background: 'rgba(255,255,255,0.08)',
      border: '1px dashed rgba(255,255,255,0.35)',
      color: 'rgba(255,255,255,0.75)',
      fontFamily: 'DM Mono, monospace',
      fontSize: 10,
      padding: '4px 8px',
      borderRadius: 4,
      letterSpacing: '0.04em'
    }
  }, "foto \xB7 fans en living \xB7 duotone indigo"));
}

// --- Cemaco logo lockup (indigo-on-white or white-on-indigo) ---
function CemacoLockup({
  variant = 'white',
  height = 56
}) {
  const color = variant === 'white' ? '#fff' : '#101E8E';
  const logoSrc = variant === 'white' ? '../../assets/logo-cemaco-isotipo-white.png' : '../../assets/logo-cemaco-isotipo.png';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: height * 0.25
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: logoSrc,
    alt: "Cemaco",
    style: {
      height,
      width: 'auto'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: '"Chalet NY", "Hanken Grotesk", sans-serif',
      fontSize: height * 0.65,
      color,
      letterSpacing: '-0.01em',
      fontWeight: 400
    }
  }, "Cemaco"));
}
Object.assign(window, {
  SoccerBall,
  Trumpet,
  Pennant,
  ConfettiPiece,
  ConfettiCloud,
  GoalNet,
  FansPhotoPlaceholder,
  CemacoLockup
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "campaigns/mundial_2026/soccer-vectors.jsx", error: String((e && e.message) || e) }); }

// design-canvas.jsx
try { (() => {
// DesignCanvas.jsx — Figma-ish design canvas wrapper
// Warm gray grid bg + Sections + Artboards + PostIt notes.
// Artboards are reorderable (grip-drag), labels/titles are inline-editable,
// and any artboard can be opened in a fullscreen focus overlay (←/→/Esc).
// State persists to a .design-canvas.state.json sidecar via the host
// bridge. No assets, no deps.
//
// Usage:
//   <DesignCanvas>
//     <DCSection id="onboarding" title="Onboarding" subtitle="First-run variants">
//       <DCArtboard id="a" label="A · Dusk" width={260} height={480}>…</DCArtboard>
//       <DCArtboard id="b" label="B · Minimal" width={260} height={480}>…</DCArtboard>
//     </DCSection>
//   </DesignCanvas>

const DC = {
  bg: '#f0eee9',
  grid: 'rgba(0,0,0,0.06)',
  label: 'rgba(60,50,40,0.7)',
  title: 'rgba(40,30,20,0.85)',
  subtitle: 'rgba(60,50,40,0.6)',
  postitBg: '#fef4a8',
  postitText: '#5a4a2a',
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
};

// One-time CSS injection (classes are dc-prefixed so they don't collide with
// the hosted design's own styles).
if (typeof document !== 'undefined' && !document.getElementById('dc-styles')) {
  const s = document.createElement('style');
  s.id = 'dc-styles';
  s.textContent = ['.dc-editable{cursor:text;outline:none;white-space:nowrap;border-radius:3px;padding:0 2px;margin:0 -2px}', '.dc-editable:focus{background:#fff;box-shadow:0 0 0 1.5px #c96442}', '[data-dc-slot]{transition:transform .18s cubic-bezier(.2,.7,.3,1)}', '[data-dc-slot].dc-dragging{transition:none;z-index:10;pointer-events:none}', '[data-dc-slot].dc-dragging .dc-card{box-shadow:0 12px 40px rgba(0,0,0,.25),0 0 0 2px #c96442;transform:scale(1.02)}', '.dc-card{transition:box-shadow .15s,transform .15s}', '.dc-card *{scrollbar-width:none}', '.dc-card *::-webkit-scrollbar{display:none}', '.dc-labelrow{display:flex;align-items:center;gap:4px;height:24px}', '.dc-grip{cursor:grab;display:flex;align-items:center;padding:5px 4px;border-radius:4px;transition:background .12s}', '.dc-grip:hover{background:rgba(0,0,0,.08)}', '.dc-grip:active{cursor:grabbing}', '.dc-labeltext{cursor:pointer;border-radius:4px;padding:3px 6px;display:flex;align-items:center;transition:background .12s}', '.dc-labeltext:hover{background:rgba(0,0,0,.05)}', '.dc-expand{position:absolute;bottom:100%;right:0;margin-bottom:5px;z-index:2;opacity:0;transition:opacity .12s,background .12s;', '  width:22px;height:22px;border-radius:5px;border:none;cursor:pointer;padding:0;', '  background:transparent;color:rgba(60,50,40,.7);display:flex;align-items:center;justify-content:center}', '.dc-expand:hover{background:rgba(0,0,0,.06);color:#2a251f}', '[data-dc-slot]:hover .dc-expand{opacity:1}'].join('\n');
  document.head.appendChild(s);
}
const DCCtx = React.createContext(null);

// ─────────────────────────────────────────────────────────────
// DesignCanvas — stateful wrapper around the pan/zoom viewport.
// Owns runtime state (per-section order, renamed titles/labels, focused
// artboard). Order/titles/labels persist to a .design-canvas.state.json
// sidecar next to the HTML. Reads go via plain fetch() so the saved
// arrangement is visible anywhere the HTML + sidecar are served together
// (omelette preview, direct link, downloaded zip). Writes go through the
// host's window.omelette bridge — editing requires the omelette runtime.
// Focus is ephemeral.
// ─────────────────────────────────────────────────────────────
const DC_STATE_FILE = '.design-canvas.state.json';
function DesignCanvas({
  children,
  minScale,
  maxScale,
  style
}) {
  const [state, setState] = React.useState({
    sections: {},
    focus: null
  });
  // Hold rendering until the sidecar read settles so the saved order/titles
  // appear on first paint (no source-order flash). didRead gates writes until
  // the read settles so the empty initial state can't clobber a slow read;
  // skipNextWrite suppresses the one echo-write that would otherwise follow
  // hydration.
  const [ready, setReady] = React.useState(false);
  const didRead = React.useRef(false);
  const skipNextWrite = React.useRef(false);
  React.useEffect(() => {
    let off = false;
    fetch('./' + DC_STATE_FILE).then(r => r.ok ? r.json() : null).then(saved => {
      if (off || !saved || !saved.sections) return;
      skipNextWrite.current = true;
      setState(s => ({
        ...s,
        sections: saved.sections
      }));
    }).catch(() => {}).finally(() => {
      didRead.current = true;
      if (!off) setReady(true);
    });
    const t = setTimeout(() => {
      if (!off) setReady(true);
    }, 150);
    return () => {
      off = true;
      clearTimeout(t);
    };
  }, []);
  React.useEffect(() => {
    if (!didRead.current) return;
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }
    const t = setTimeout(() => {
      window.omelette?.writeFile(DC_STATE_FILE, JSON.stringify({
        sections: state.sections
      })).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [state.sections]);

  // Build registries synchronously from children so FocusOverlay can read
  // them in the same render. Only direct DCSection > DCArtboard children are
  // walked — wrapping them in other elements opts out of focus/reorder.
  const registry = {}; // slotId -> { sectionId, artboard }
  const sectionMeta = {}; // sectionId -> { title, subtitle, slotIds[] }
  const sectionOrder = [];
  React.Children.forEach(children, sec => {
    if (!sec || sec.type !== DCSection) return;
    const sid = sec.props.id ?? sec.props.title;
    if (!sid) return;
    sectionOrder.push(sid);
    const persisted = state.sections[sid] || {};
    const srcIds = [];
    React.Children.forEach(sec.props.children, ab => {
      if (!ab || ab.type !== DCArtboard) return;
      const aid = ab.props.id ?? ab.props.label;
      if (!aid) return;
      registry[`${sid}/${aid}`] = {
        sectionId: sid,
        artboard: ab
      };
      srcIds.push(aid);
    });
    const kept = (persisted.order || []).filter(k => srcIds.includes(k));
    sectionMeta[sid] = {
      title: persisted.title ?? sec.props.title,
      subtitle: sec.props.subtitle,
      slotIds: [...kept, ...srcIds.filter(k => !kept.includes(k))]
    };
  });
  const api = React.useMemo(() => ({
    state,
    section: id => state.sections[id] || {},
    patchSection: (id, p) => setState(s => ({
      ...s,
      sections: {
        ...s.sections,
        [id]: {
          ...s.sections[id],
          ...(typeof p === 'function' ? p(s.sections[id] || {}) : p)
        }
      }
    })),
    setFocus: slotId => setState(s => ({
      ...s,
      focus: slotId
    }))
  }), [state]);

  // Esc exits focus; any outside pointerdown commits an in-progress rename.
  React.useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') api.setFocus(null);
    };
    const onPd = e => {
      const ae = document.activeElement;
      if (ae && ae.isContentEditable && !ae.contains(e.target)) ae.blur();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPd, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPd, true);
    };
  }, [api]);
  return /*#__PURE__*/React.createElement(DCCtx.Provider, {
    value: api
  }, /*#__PURE__*/React.createElement(DCViewport, {
    minScale: minScale,
    maxScale: maxScale,
    style: style
  }, ready && children), state.focus && registry[state.focus] && /*#__PURE__*/React.createElement(DCFocusOverlay, {
    entry: registry[state.focus],
    sectionMeta: sectionMeta,
    sectionOrder: sectionOrder
  }));
}

// ─────────────────────────────────────────────────────────────
// DCViewport — transform-based pan/zoom (internal)
//
// Input mapping (Figma-style):
//   • trackpad pinch  → zoom   (ctrlKey wheel; Safari gesture* events)
//   • trackpad scroll → pan    (two-finger)
//   • mouse wheel     → zoom   (notched; distinguished from trackpad scroll)
//   • middle-drag / primary-drag-on-bg → pan
//
// Transform state lives in a ref and is written straight to the DOM
// (translate3d + will-change) so wheel ticks don't go through React —
// keeps pans at 60fps on dense canvases.
// ─────────────────────────────────────────────────────────────
function DCViewport({
  children,
  minScale = 0.1,
  maxScale = 8,
  style = {}
}) {
  const vpRef = React.useRef(null);
  const worldRef = React.useRef(null);
  const tf = React.useRef({
    x: 0,
    y: 0,
    scale: 1
  });
  const apply = React.useCallback(() => {
    const {
      x,
      y,
      scale
    } = tf.current;
    const el = worldRef.current;
    if (el) el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  }, []);
  React.useEffect(() => {
    const vp = vpRef.current;
    if (!vp) return;
    const zoomAt = (cx, cy, factor) => {
      const r = vp.getBoundingClientRect();
      const px = cx - r.left,
        py = cy - r.top;
      const t = tf.current;
      const next = Math.min(maxScale, Math.max(minScale, t.scale * factor));
      const k = next / t.scale;
      // keep the world point under the cursor fixed
      t.x = px - (px - t.x) * k;
      t.y = py - (py - t.y) * k;
      t.scale = next;
      apply();
    };

    // Mouse-wheel vs trackpad-scroll heuristic. A physical wheel sends
    // line-mode deltas (Firefox) or large integer pixel deltas with no X
    // component (Chrome/Safari, typically multiples of 100/120). Trackpad
    // two-finger scroll sends small/fractional pixel deltas, often with
    // non-zero deltaX. ctrlKey is set by the browser for trackpad pinch.
    const isMouseWheel = e => e.deltaMode !== 0 || e.deltaX === 0 && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 40;
    const onWheel = e => {
      e.preventDefault();
      if (isGesturing) return; // Safari: gesture* owns the pinch — discard concurrent wheels
      if (e.ctrlKey) {
        // trackpad pinch (or explicit ctrl+wheel)
        zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
      } else if (isMouseWheel(e)) {
        // notched mouse wheel — fixed-ratio step per click
        zoomAt(e.clientX, e.clientY, Math.exp(-Math.sign(e.deltaY) * 0.18));
      } else {
        // trackpad two-finger scroll — pan
        tf.current.x -= e.deltaX;
        tf.current.y -= e.deltaY;
        apply();
      }
    };

    // Safari sends native gesture* events for trackpad pinch with a smooth
    // e.scale; preferring these over the ctrl+wheel fallback gives a much
    // better feel there. No-ops on other browsers. Safari also fires
    // ctrlKey wheel events during the same pinch — isGesturing makes
    // onWheel drop those entirely so they neither zoom nor pan.
    let gsBase = 1;
    let isGesturing = false;
    const onGestureStart = e => {
      e.preventDefault();
      isGesturing = true;
      gsBase = tf.current.scale;
    };
    const onGestureChange = e => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, gsBase * e.scale / tf.current.scale);
    };
    const onGestureEnd = e => {
      e.preventDefault();
      isGesturing = false;
    };

    // Drag-pan: middle button anywhere, or primary button on canvas
    // background (anything that isn't an artboard or an inline editor).
    let drag = null;
    const onPointerDown = e => {
      const onBg = !e.target.closest('[data-dc-slot], .dc-editable');
      if (!(e.button === 1 || e.button === 0 && onBg)) return;
      e.preventDefault();
      vp.setPointerCapture(e.pointerId);
      drag = {
        id: e.pointerId,
        lx: e.clientX,
        ly: e.clientY
      };
      vp.style.cursor = 'grabbing';
    };
    const onPointerMove = e => {
      if (!drag || e.pointerId !== drag.id) return;
      tf.current.x += e.clientX - drag.lx;
      tf.current.y += e.clientY - drag.ly;
      drag.lx = e.clientX;
      drag.ly = e.clientY;
      apply();
    };
    const onPointerUp = e => {
      if (!drag || e.pointerId !== drag.id) return;
      vp.releasePointerCapture(e.pointerId);
      drag = null;
      vp.style.cursor = '';
    };
    vp.addEventListener('wheel', onWheel, {
      passive: false
    });
    vp.addEventListener('gesturestart', onGestureStart, {
      passive: false
    });
    vp.addEventListener('gesturechange', onGestureChange, {
      passive: false
    });
    vp.addEventListener('gestureend', onGestureEnd, {
      passive: false
    });
    vp.addEventListener('pointerdown', onPointerDown);
    vp.addEventListener('pointermove', onPointerMove);
    vp.addEventListener('pointerup', onPointerUp);
    vp.addEventListener('pointercancel', onPointerUp);
    return () => {
      vp.removeEventListener('wheel', onWheel);
      vp.removeEventListener('gesturestart', onGestureStart);
      vp.removeEventListener('gesturechange', onGestureChange);
      vp.removeEventListener('gestureend', onGestureEnd);
      vp.removeEventListener('pointerdown', onPointerDown);
      vp.removeEventListener('pointermove', onPointerMove);
      vp.removeEventListener('pointerup', onPointerUp);
      vp.removeEventListener('pointercancel', onPointerUp);
    };
  }, [apply, minScale, maxScale]);
  const gridSvg = `url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M120 0H0v120' fill='none' stroke='${encodeURIComponent(DC.grid)}' stroke-width='1'/%3E%3C/svg%3E")`;
  return /*#__PURE__*/React.createElement("div", {
    ref: vpRef,
    className: "design-canvas",
    style: {
      height: '100vh',
      width: '100vw',
      background: DC.bg,
      overflow: 'hidden',
      overscrollBehavior: 'none',
      touchAction: 'none',
      position: 'relative',
      fontFamily: DC.font,
      boxSizing: 'border-box',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: worldRef,
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      transformOrigin: '0 0',
      willChange: 'transform',
      width: 'max-content',
      minWidth: '100%',
      minHeight: '100%',
      padding: '60px 0 80px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: -6000,
      backgroundImage: gridSvg,
      backgroundSize: '120px 120px',
      pointerEvents: 'none',
      zIndex: -1
    }
  }), children));
}

// ─────────────────────────────────────────────────────────────
// DCSection — editable title + h-row of artboards in persisted order
// ─────────────────────────────────────────────────────────────
function DCSection({
  id,
  title,
  subtitle,
  children,
  gap = 48
}) {
  const ctx = React.useContext(DCCtx);
  const sid = id ?? title;
  const all = React.Children.toArray(children);
  const artboards = all.filter(c => c && c.type === DCArtboard);
  const rest = all.filter(c => !(c && c.type === DCArtboard));
  const srcOrder = artboards.map(a => a.props.id ?? a.props.label);
  const sec = ctx && sid && ctx.section(sid) || {};
  const order = React.useMemo(() => {
    const kept = (sec.order || []).filter(k => srcOrder.includes(k));
    return [...kept, ...srcOrder.filter(k => !kept.includes(k))];
  }, [sec.order, srcOrder.join('|')]);
  const byId = Object.fromEntries(artboards.map(a => [a.props.id ?? a.props.label, a]));
  return /*#__PURE__*/React.createElement("div", {
    "data-dc-section": sid,
    style: {
      marginBottom: 80,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 60px 56px'
    }
  }, /*#__PURE__*/React.createElement(DCEditable, {
    tag: "div",
    value: sec.title ?? title,
    onChange: v => ctx && sid && ctx.patchSection(sid, {
      title: v
    }),
    style: {
      fontSize: 28,
      fontWeight: 600,
      color: DC.title,
      letterSpacing: -0.4,
      marginBottom: 6,
      display: 'inline-block'
    }
  }), subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      color: DC.subtitle
    }
  }, subtitle)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap,
      padding: '0 60px',
      alignItems: 'flex-start',
      width: 'max-content'
    }
  }, order.map(k => /*#__PURE__*/React.createElement(DCArtboardFrame, {
    key: k,
    sectionId: sid,
    artboard: byId[k],
    order: order,
    label: (sec.labels || {})[k] ?? byId[k].props.label,
    onRename: v => ctx && ctx.patchSection(sid, x => ({
      labels: {
        ...x.labels,
        [k]: v
      }
    })),
    onReorder: next => ctx && ctx.patchSection(sid, {
      order: next
    }),
    onFocus: () => ctx && ctx.setFocus(`${sid}/${k}`)
  }))), rest);
}

// DCArtboard — marker; rendered by DCArtboardFrame via DCSection.
function DCArtboard() {
  return null;
}
function DCArtboardFrame({
  sectionId,
  artboard,
  label,
  order,
  onRename,
  onReorder,
  onFocus
}) {
  const {
    id: rawId,
    label: rawLabel,
    width = 260,
    height = 480,
    children,
    style = {}
  } = artboard.props;
  const id = rawId ?? rawLabel;
  const ref = React.useRef(null);

  // Live drag-reorder: dragged card sticks to cursor; siblings slide into
  // their would-be slots in real time via transforms. DOM order only
  // changes on drop.
  const onGripDown = e => {
    e.preventDefault();
    e.stopPropagation();
    const me = ref.current;
    // translateX is applied in local (pre-scale) space but pointer deltas and
    // getBoundingClientRect().left are screen-space — divide by the viewport's
    // current scale so the dragged card tracks the cursor at any zoom level.
    const scale = me.getBoundingClientRect().width / me.offsetWidth || 1;
    const peers = Array.from(document.querySelectorAll(`[data-dc-section="${sectionId}"] [data-dc-slot]`));
    const homes = peers.map(el => ({
      el,
      id: el.dataset.dcSlot,
      x: el.getBoundingClientRect().left
    }));
    const slotXs = homes.map(h => h.x);
    const startIdx = order.indexOf(id);
    const startX = e.clientX;
    let liveOrder = order.slice();
    me.classList.add('dc-dragging');
    const layout = () => {
      for (const h of homes) {
        if (h.id === id) continue;
        const slot = liveOrder.indexOf(h.id);
        h.el.style.transform = `translateX(${(slotXs[slot] - h.x) / scale}px)`;
      }
    };
    const move = ev => {
      const dx = ev.clientX - startX;
      me.style.transform = `translateX(${dx / scale}px)`;
      const cur = homes[startIdx].x + dx;
      let nearest = 0,
        best = Infinity;
      for (let i = 0; i < slotXs.length; i++) {
        const d = Math.abs(slotXs[i] - cur);
        if (d < best) {
          best = d;
          nearest = i;
        }
      }
      if (liveOrder.indexOf(id) !== nearest) {
        liveOrder = order.filter(k => k !== id);
        liveOrder.splice(nearest, 0, id);
        layout();
      }
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      const finalSlot = liveOrder.indexOf(id);
      me.classList.remove('dc-dragging');
      me.style.transform = `translateX(${(slotXs[finalSlot] - homes[startIdx].x) / scale}px)`;
      // After the settle transition, kill transitions + clear transforms +
      // commit the reorder in the same frame so there's no visual snap-back.
      setTimeout(() => {
        for (const h of homes) {
          h.el.style.transition = 'none';
          h.el.style.transform = '';
        }
        if (liveOrder.join('|') !== order.join('|')) onReorder(liveOrder);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          for (const h of homes) h.el.style.transition = '';
        }));
      }, 180);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    "data-dc-slot": id,
    style: {
      position: 'relative',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-labelrow",
    style: {
      position: 'absolute',
      bottom: '100%',
      left: -4,
      marginBottom: 4,
      color: DC.label
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-grip",
    onPointerDown: onGripDown,
    title: "Drag to reorder"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "9",
    height: "13",
    viewBox: "0 0 9 13",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "2",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "2",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "6.5",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "6.5",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "11",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "11",
    r: "1.1"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dc-labeltext",
    onClick: onFocus,
    title: "Click to focus"
  }, /*#__PURE__*/React.createElement(DCEditable, {
    value: label,
    onChange: onRename,
    onClick: e => e.stopPropagation(),
    style: {
      fontSize: 15,
      fontWeight: 500,
      color: DC.label,
      lineHeight: 1
    }
  }))), /*#__PURE__*/React.createElement("button", {
    className: "dc-expand",
    onClick: onFocus,
    onPointerDown: e => e.stopPropagation(),
    title: "Focus"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 12 12",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M7 1h4v4M5 11H1V7M11 1L7.5 4.5M1 11l3.5-3.5"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dc-card",
    style: {
      borderRadius: 2,
      boxShadow: '0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(0,0,0,.06)',
      overflow: 'hidden',
      width,
      height,
      background: '#fff',
      ...style
    }
  }, children || /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#bbb',
      fontSize: 13,
      fontFamily: DC.font
    }
  }, id)));
}

// Inline rename — commits on blur or Enter.
function DCEditable({
  value,
  onChange,
  style,
  tag = 'span',
  onClick
}) {
  const T = tag;
  return /*#__PURE__*/React.createElement(T, {
    className: "dc-editable",
    contentEditable: true,
    suppressContentEditableWarning: true,
    onClick: onClick,
    onPointerDown: e => e.stopPropagation(),
    onBlur: e => onChange && onChange(e.currentTarget.textContent),
    onKeyDown: e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.currentTarget.blur();
      }
    },
    style: style
  }, value);
}

// ─────────────────────────────────────────────────────────────
// Focus mode — overlay one artboard; ←/→ within section, ↑/↓ across
// sections, Esc or backdrop click to exit.
// ─────────────────────────────────────────────────────────────
function DCFocusOverlay({
  entry,
  sectionMeta,
  sectionOrder
}) {
  const ctx = React.useContext(DCCtx);
  const {
    sectionId,
    artboard
  } = entry;
  const sec = ctx.section(sectionId);
  const meta = sectionMeta[sectionId];
  const peers = meta.slotIds;
  const aid = artboard.props.id ?? artboard.props.label;
  const idx = peers.indexOf(aid);
  const secIdx = sectionOrder.indexOf(sectionId);
  const go = d => {
    const n = peers[(idx + d + peers.length) % peers.length];
    if (n) ctx.setFocus(`${sectionId}/${n}`);
  };
  const goSection = d => {
    const ns = sectionOrder[(secIdx + d + sectionOrder.length) % sectionOrder.length];
    const first = sectionMeta[ns] && sectionMeta[ns].slotIds[0];
    if (first) ctx.setFocus(`${ns}/${first}`);
  };
  React.useEffect(() => {
    const k = e => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        goSection(-1);
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        goSection(1);
      }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  });
  const {
    width = 260,
    height = 480,
    children
  } = artboard.props;
  const [vp, setVp] = React.useState({
    w: window.innerWidth,
    h: window.innerHeight
  });
  React.useEffect(() => {
    const r = () => setVp({
      w: window.innerWidth,
      h: window.innerHeight
    });
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);
  const scale = Math.max(0.1, Math.min((vp.w - 200) / width, (vp.h - 260) / height, 2));
  const [ddOpen, setDd] = React.useState(false);
  const Arrow = ({
    dir,
    onClick
  }) => /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      onClick();
    },
    style: {
      position: 'absolute',
      top: '50%',
      [dir]: 28,
      transform: 'translateY(-50%)',
      border: 'none',
      background: 'rgba(255,255,255,.08)',
      color: 'rgba(255,255,255,.9)',
      width: 44,
      height: 44,
      borderRadius: 22,
      fontSize: 18,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background .15s'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'rgba(255,255,255,.18)',
    onMouseLeave: e => e.currentTarget.style.background = 'rgba(255,255,255,.08)'
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 18 18",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: dir === 'left' ? 'M11 3L5 9l6 6' : 'M7 3l6 6-6 6'
  })));

  // Portal to body so position:fixed is the real viewport regardless of any
  // transform on DesignCanvas's ancestors (including the canvas zoom itself).
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    onClick: () => ctx.setFocus(null),
    onWheel: e => e.preventDefault(),
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'rgba(24,20,16,.6)',
      backdropFilter: 'blur(14px)',
      fontFamily: DC.font,
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 72,
      display: 'flex',
      alignItems: 'flex-start',
      padding: '16px 20px 0',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setDd(o => !o),
    style: {
      border: 'none',
      background: 'transparent',
      color: '#fff',
      cursor: 'pointer',
      padding: '6px 8px',
      borderRadius: 6,
      textAlign: 'left',
      fontFamily: 'inherit'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      letterSpacing: -0.3
    }
  }, meta.title), /*#__PURE__*/React.createElement("svg", {
    width: "11",
    height: "11",
    viewBox: "0 0 11 11",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    style: {
      opacity: .7
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2 4l3.5 3.5L9 4"
  }))), meta.subtitle && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 13,
      opacity: .6,
      fontWeight: 400,
      marginTop: 2
    }
  }, meta.subtitle)), ddOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '100%',
      left: 0,
      marginTop: 4,
      background: '#2a251f',
      borderRadius: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,.4)',
      padding: 4,
      minWidth: 200,
      zIndex: 10
    }
  }, sectionOrder.map(sid => /*#__PURE__*/React.createElement("button", {
    key: sid,
    onClick: () => {
      setDd(false);
      const f = sectionMeta[sid].slotIds[0];
      if (f) ctx.setFocus(`${sid}/${f}`);
    },
    style: {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      border: 'none',
      cursor: 'pointer',
      background: sid === sectionId ? 'rgba(255,255,255,.1)' : 'transparent',
      color: '#fff',
      padding: '8px 12px',
      borderRadius: 5,
      fontSize: 14,
      fontWeight: sid === sectionId ? 600 : 400,
      fontFamily: 'inherit'
    }
  }, sectionMeta[sid].title)))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => ctx.setFocus(null),
    onMouseEnter: e => e.currentTarget.style.background = 'rgba(255,255,255,.12)',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent',
    style: {
      border: 'none',
      background: 'transparent',
      color: 'rgba(255,255,255,.7)',
      width: 32,
      height: 32,
      borderRadius: 16,
      fontSize: 20,
      cursor: 'pointer',
      lineHeight: 1,
      transition: 'background .12s'
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 64,
      bottom: 56,
      left: 100,
      right: 100,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: width * scale,
      height: height * scale,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      background: '#fff',
      borderRadius: 2,
      overflow: 'hidden',
      boxShadow: '0 20px 80px rgba(0,0,0,.4)'
    }
  }, children || /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#bbb'
    }
  }, aid))), /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      fontSize: 14,
      fontWeight: 500,
      opacity: .85,
      textAlign: 'center'
    }
  }, (sec.labels || {})[aid] ?? artboard.props.label, /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: .5,
      marginLeft: 10,
      fontVariantNumeric: 'tabular-nums'
    }
  }, idx + 1, " / ", peers.length))), /*#__PURE__*/React.createElement(Arrow, {
    dir: "left",
    onClick: () => go(-1)
  }), /*#__PURE__*/React.createElement(Arrow, {
    dir: "right",
    onClick: () => go(1)
  }), /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: 8
    }
  }, peers.map((p, i) => /*#__PURE__*/React.createElement("button", {
    key: p,
    onClick: () => ctx.setFocus(`${sectionId}/${p}`),
    style: {
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      width: 6,
      height: 6,
      borderRadius: 3,
      background: i === idx ? '#fff' : 'rgba(255,255,255,.3)'
    }
  })))), document.body);
}

// ─────────────────────────────────────────────────────────────
// Post-it — absolute-positioned sticky note
// ─────────────────────────────────────────────────────────────
function DCPostIt({
  children,
  top,
  left,
  right,
  bottom,
  rotate = -2,
  width = 180
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top,
      left,
      right,
      bottom,
      width,
      background: DC.postitBg,
      padding: '14px 16px',
      fontFamily: '"Comic Sans MS", "Marker Felt", "Segoe Print", cursive',
      fontSize: 14,
      lineHeight: 1.4,
      color: DC.postitText,
      boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
      transform: `rotate(${rotate}deg)`,
      zIndex: 5
    }
  }, children);
}
Object.assign(window, {
  DesignCanvas,
  DCSection,
  DCArtboard,
  DCPostIt
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "design-canvas.jsx", error: String((e && e.message) || e) }); }

// soccer-vectors.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Soccer vector library — Cemaco × Mundial 2026
// Layered on indigo #101E8E with green #94D500 + white accents

// --- Soccer ball ---
function SoccerBall({
  size = 120,
  rotate = 0,
  shadow = true
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "-60 -60 120 120",
    style: {
      transform: `rotate(${rotate}deg)`,
      filter: shadow ? 'drop-shadow(0 10px 20px rgba(0,0,0,0.35))' : 'none',
      overflow: 'visible'
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "0",
    cy: "0",
    r: "54",
    fill: "#fff"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "0,-22 21,-7 13,18 -13,18 -21,-7",
    fill: "#0b0f0b"
  }), /*#__PURE__*/React.createElement("g", {
    fill: "#0b0f0b"
  }, /*#__PURE__*/React.createElement("polygon", {
    points: "-34,-36 -24,-48 -10,-40 -13,-26 -27,-24"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "10,-40 24,-48 34,-36 27,-24 13,-26"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "38,-6 50,2 48,18 34,20 28,6"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "-28,6 -34,20 -48,18 -50,2 -38,-6"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "-18,28 0,36 18,28 12,46 -12,46"
  })), /*#__PURE__*/React.createElement("g", {
    stroke: "#0b0f0b",
    strokeWidth: "1.5",
    fill: "none",
    opacity: "0.9"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M0,-22 L0,-40"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M21,-7 L34,-6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M13,18 L18,28"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M-13,18 L-18,28"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M-21,-7 L-34,-6"
  })), /*#__PURE__*/React.createElement("circle", {
    cx: "0",
    cy: "0",
    r: "54",
    fill: "none",
    stroke: "#0b0f0b",
    strokeWidth: "1"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "-18",
    cy: "-24",
    rx: "18",
    ry: "9",
    fill: "rgba(255,255,255,0.22)"
  }));
}

// --- Vuvuzela / trumpet ---
function Trumpet({
  size = 160,
  rotate = -18,
  color = '#94D500'
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size * 0.55,
    viewBox: "0 0 320 180",
    style: {
      transform: `rotate(${rotate}deg)`,
      filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.28))',
      overflow: 'visible'
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "trumpetGrad",
    x1: "0",
    x2: "1",
    y1: "0",
    y2: "0"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: color,
    stopOpacity: "1"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: color,
    stopOpacity: "0.78"
  }))), /*#__PURE__*/React.createElement("path", {
    d: "M20,80 L20,100 Q20,112 32,112 L168,112 Q198,112 228,96 L300,60 Q316,52 316,70 L316,110 Q316,128 300,120 L228,84 Q198,72 168,72 L32,72 Q20,72 20,80 Z",
    fill: "url(#trumpetGrad)",
    stroke: "#0b0f0b",
    strokeWidth: "3.5",
    strokeLinejoin: "round"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "8",
    y: "82",
    width: "18",
    height: "18",
    rx: "3",
    fill: "#0b0f0b"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M240,76 Q275,64 305,62",
    stroke: "rgba(255,255,255,0.55)",
    strokeWidth: "3",
    fill: "none",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("g", {
    stroke: color,
    strokeWidth: "4",
    strokeLinecap: "round",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M324,44 L342,34"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M330,66 L352,60"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M330,100 L352,104"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M324,124 L342,134"
  })));
}

// --- Triangular pennant ---
function Pennant({
  size = 90,
  rotate = 0,
  fill = '#94D500',
  stroke = '#0b0f0b'
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size * 1.35,
    viewBox: "0 0 90 122",
    style: {
      transform: `rotate(${rotate}deg)`,
      filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.22))',
      overflow: 'visible'
    }
  }, /*#__PURE__*/React.createElement("rect", {
    x: "8",
    y: "0",
    width: "3",
    height: "122",
    fill: "#E8D9B9"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9.5",
    cy: "2.5",
    r: "3.5",
    fill: "#fff",
    stroke: stroke,
    strokeWidth: "1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M11,6 Q50,14 85,10 Q70,30 85,50 Q50,46 11,54 Z",
    fill: fill,
    stroke: stroke,
    strokeWidth: "2",
    strokeLinejoin: "round"
  }));
}

// --- Confetti piece ---
function ConfettiPiece({
  kind = 'rect',
  size = 14,
  color = '#94D500',
  rotate = 0,
  x = 0,
  y = 0
}) {
  const common = {
    position: 'absolute',
    left: x,
    top: y,
    transform: `rotate(${rotate}deg)`,
    overflow: 'visible'
  };
  if (kind === 'rect') return /*#__PURE__*/React.createElement("svg", {
    style: common,
    width: size,
    height: size * 0.35,
    viewBox: "0 0 20 7"
  }, /*#__PURE__*/React.createElement("rect", {
    width: "20",
    height: "7",
    rx: "1.5",
    fill: color
  }));
  if (kind === 'circle') return /*#__PURE__*/React.createElement("svg", {
    style: common,
    width: size,
    height: size,
    viewBox: "0 0 20 20"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "10",
    cy: "10",
    r: "8",
    fill: color
  }));
  if (kind === 'ring') return /*#__PURE__*/React.createElement("svg", {
    style: common,
    width: size,
    height: size,
    viewBox: "0 0 20 20"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "10",
    cy: "10",
    r: "7",
    fill: "none",
    stroke: color,
    strokeWidth: "2.5"
  }));
  if (kind === 'squiggle') return /*#__PURE__*/React.createElement("svg", {
    style: common,
    width: size * 1.5,
    height: size * 0.55,
    viewBox: "0 0 30 10"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2,5 Q7,0 12,5 T22,5 T30,5",
    stroke: color,
    strokeWidth: "2.5",
    fill: "none",
    strokeLinecap: "round"
  }));
  if (kind === 'star') return /*#__PURE__*/React.createElement("svg", {
    style: common,
    width: size,
    height: size,
    viewBox: "-12 -12 24 24"
  }, /*#__PURE__*/React.createElement("polygon", {
    points: "0,-10 2.5,-3 10,-3 4,2 6,10 0,5 -6,10 -4,2 -10,-3 -2.5,-3",
    fill: color
  }));
  if (kind === 'tri') return /*#__PURE__*/React.createElement("svg", {
    style: common,
    width: size,
    height: size,
    viewBox: "0 0 20 20"
  }, /*#__PURE__*/React.createElement("polygon", {
    points: "10,2 18,18 2,18",
    fill: color
  }));
  return null;
}

// --- Deterministic confetti cloud ---
function ConfettiCloud({
  count = 40,
  width = 800,
  height = 400,
  seed = 1,
  palette
}) {
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const kinds = ['rect', 'rect', 'circle', 'ring', 'squiggle', 'star', 'tri'];
  const colors = palette || ['#94D500', '#94D500', '#FFFFFF', '#F5B324', '#94D500', '#FFFFFF', '#7FB800'];
  const pieces = [];
  for (let i = 0; i < count; i++) {
    pieces.push({
      kind: kinds[Math.floor(rand() * kinds.length)],
      color: colors[Math.floor(rand() * colors.length)],
      size: 10 + Math.floor(rand() * 24),
      rotate: Math.floor(rand() * 360),
      x: Math.floor(rand() * width),
      y: Math.floor(rand() * height)
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      width,
      height,
      pointerEvents: 'none'
    }
  }, pieces.map((p, i) => /*#__PURE__*/React.createElement(ConfettiPiece, _extends({
    key: i
  }, p))));
}

// --- Star burst ---
function StarBurst({
  size = 160,
  color = '#94D500',
  rays = 14,
  rotate = 0
}) {
  const els = [];
  for (let i = 0; i < rays; i++) {
    const a = i / rays * Math.PI * 2;
    const x1 = Math.cos(a) * 28,
      y1 = Math.sin(a) * 28;
    const x2 = Math.cos(a) * 64,
      y2 = Math.sin(a) * 64;
    els.push(/*#__PURE__*/React.createElement("line", {
      key: i,
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2,
      stroke: color,
      strokeWidth: "5",
      strokeLinecap: "round"
    }));
  }
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "-80 -80 160 160",
    style: {
      transform: `rotate(${rotate}deg)`,
      overflow: 'visible'
    }
  }, els, /*#__PURE__*/React.createElement("circle", {
    cx: "0",
    cy: "0",
    r: "18",
    fill: color
  }));
}

// --- Curved stadium arc / motion lines ---
function MotionArc({
  width = 400,
  height = 80,
  color = '#94D500',
  rotate = 0
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: width,
    height: height,
    viewBox: "0 0 400 80",
    style: {
      transform: `rotate(${rotate}deg)`,
      overflow: 'visible'
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10,70 Q200,-20 390,70",
    stroke: color,
    strokeWidth: "5",
    fill: "none",
    strokeLinecap: "round",
    opacity: "0.9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M30,72 Q200,0 370,72",
    stroke: color,
    strokeWidth: "3",
    fill: "none",
    strokeLinecap: "round",
    opacity: "0.6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M60,74 Q200,20 340,74",
    stroke: color,
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round",
    opacity: "0.4"
  }));
}

// --- Big circular ball/coin badge (for discount callout) ---
function GoalBadge({
  size = 220,
  text = '¡GOL!',
  sub = 'Ofertas',
  rotate = -12
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height: size,
      position: 'relative',
      transform: `rotate(${rotate}deg)`,
      filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.3))'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 220 220",
    style: {
      position: 'absolute',
      inset: 0
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "110",
    cy: "110",
    r: "104",
    fill: "#94D500"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "110",
    cy: "110",
    r: "104",
    fill: "none",
    stroke: "#fff",
    strokeWidth: "4",
    strokeDasharray: "6 6"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "110",
    cy: "110",
    r: "88",
    fill: "none",
    stroke: "#fff",
    strokeWidth: "2",
    opacity: "0.6"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#101E8E'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '"Chalet NY", "Hanken Grotesk", sans-serif',
      fontSize: size * 0.28,
      lineHeight: 1,
      fontWeight: 400,
      letterSpacing: '-0.01em'
    }
  }, text), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '"Chalet NY", "Hanken Grotesk", sans-serif',
      fontSize: size * 0.09,
      letterSpacing: '0.2em',
      marginTop: 6
    }
  }, sub)));
}

// --- Cemaco logo lockup ---
function CemacoLockup({
  variant = 'white',
  height = 56
}) {
  const color = variant === 'white' ? '#fff' : '#101E8E';
  const logoSrc = variant === 'white' ? 'assets/logo-cemaco-isotipo-white.png' : 'assets/logo-cemaco-isotipo.png';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: height * 0.28
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: logoSrc,
    alt: "Cemaco",
    style: {
      height,
      width: 'auto'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: '"Chalet NY", "Hanken Grotesk", sans-serif',
      fontSize: height * 0.7,
      color,
      letterSpacing: '-0.01em',
      fontWeight: 400,
      lineHeight: 1
    }
  }, "Cemaco"));
}
Object.assign(window, {
  SoccerBall,
  Trumpet,
  Pennant,
  ConfettiPiece,
  ConfettiCloud,
  StarBurst,
  MotionArc,
  GoalBadge,
  CemacoLockup
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "soccer-vectors.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/ios-frame.jsx
try { (() => {
// iOS.jsx — Simplified iOS 26 (Liquid Glass) device frame
// Based on the iOS 26 UI Kit + Figma status bar spec. No assets, no deps.
// Exports: IOSDevice, IOSStatusBar, IOSNavBar, IOSGlassPill, IOSList, IOSListRow, IOSKeyboard

// ─────────────────────────────────────────────────────────────
// Status bar
// ─────────────────────────────────────────────────────────────
function IOSStatusBar({
  dark = false,
  time = '9:41'
}) {
  const c = dark ? '#fff' : '#000';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 154,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '21px 24px 19px',
      boxSizing: 'border-box',
      position: 'relative',
      zIndex: 20,
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: '-apple-system, "SF Pro", system-ui',
      fontWeight: 590,
      fontSize: 17,
      lineHeight: '22px',
      color: c
    }
  }, time)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingTop: 1,
      paddingRight: 1
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "19",
    height: "12",
    viewBox: "0 0 19 12"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "7.5",
    width: "3.2",
    height: "4.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.8",
    y: "5",
    width: "3.2",
    height: "7",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.6",
    y: "2.5",
    width: "3.2",
    height: "9.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14.4",
    y: "0",
    width: "3.2",
    height: "12",
    rx: "0.7",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "17",
    height: "12",
    viewBox: "0 0 17 12"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z",
    fill: c
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8.5",
    cy: "10.5",
    r: "1.5",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "27",
    height: "13",
    viewBox: "0 0 27 13"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0.5",
    y: "0.5",
    width: "23",
    height: "12",
    rx: "3.5",
    stroke: c,
    strokeOpacity: "0.35",
    fill: "none"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "20",
    height: "9",
    rx: "2",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z",
    fill: c,
    fillOpacity: "0.4"
  }))));
}

// ─────────────────────────────────────────────────────────────
// Liquid glass pill — blur + tint + shine
// ─────────────────────────────────────────────────────────────
function IOSGlassPill({
  children,
  dark = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44,
      minWidth: 44,
      borderRadius: 9999,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: dark ? '0 2px 6px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.07), 0 3px 10px rgba(0,0,0,0.06)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.28)' : 'rgba(255,255,255,0.5)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15), inset -1px -1px 1px rgba(255,255,255,0.08)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      padding: '0 4px'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Navigation bar — glass pills + large title
// ─────────────────────────────────────────────────────────────
function IOSNavBar({
  title = 'Title',
  dark = false,
  trailingIcon = true
}) {
  const muted = dark ? 'rgba(255,255,255,0.6)' : '#404040';
  const text = dark ? '#fff' : '#000';
  const pillIcon = content => /*#__PURE__*/React.createElement(IOSGlassPill, {
    dark: dark
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, content));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      paddingTop: 62,
      paddingBottom: 10,
      position: 'relative',
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px'
    }
  }, pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "20",
    viewBox: "0 0 12 20",
    fill: "none",
    style: {
      marginLeft: -1
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10 2L2 10l8 8",
    stroke: muted,
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), trailingIcon && pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "6",
    viewBox: "0 0 22 6"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "3",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "3",
    r: "2.5",
    fill: muted
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px',
      fontFamily: '-apple-system, system-ui',
      fontSize: 34,
      fontWeight: 700,
      lineHeight: '41px',
      color: text,
      letterSpacing: 0.4
    }
  }, title));
}

// ─────────────────────────────────────────────────────────────
// Grouped list (inset card, r:26) + row (52px)
// ─────────────────────────────────────────────────────────────
function IOSListRow({
  title,
  detail,
  icon,
  chevron = true,
  isLast = false,
  dark = false
}) {
  const text = dark ? '#fff' : '#000';
  const sec = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const ter = dark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)';
  const sep = dark ? 'rgba(84,84,88,0.65)' : 'rgba(60,60,67,0.12)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      minHeight: 52,
      padding: '0 16px',
      position: 'relative',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      letterSpacing: -0.43
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 7,
      background: icon,
      marginRight: 12,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      color: text
    }
  }, title), detail && /*#__PURE__*/React.createElement("span", {
    style: {
      color: sec,
      marginRight: 6
    }
  }, detail), chevron && /*#__PURE__*/React.createElement("svg", {
    width: "8",
    height: "14",
    viewBox: "0 0 8 14",
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 1l6 6-6 6",
    stroke: ter,
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), !isLast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: icon ? 58 : 16,
      height: 0.5,
      background: sep
    }
  }));
}
function IOSList({
  header,
  children,
  dark = false
}) {
  const hc = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const bg = dark ? '#1C1C1E' : '#fff';
  return /*#__PURE__*/React.createElement("div", null, header && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '-apple-system, system-ui',
      fontSize: 13,
      color: hc,
      textTransform: 'uppercase',
      padding: '8px 36px 6px',
      letterSpacing: -0.08
    }
  }, header), /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      borderRadius: 26,
      margin: '0 16px',
      overflow: 'hidden'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Device frame
// ─────────────────────────────────────────────────────────────
function IOSDevice({
  children,
  width = 402,
  height = 874,
  dark = false,
  title,
  keyboard = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      borderRadius: 48,
      overflow: 'hidden',
      position: 'relative',
      background: dark ? '#000' : '#F2F2F7',
      boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
      fontFamily: '-apple-system, system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 11,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 126,
      height: 37,
      borderRadius: 24,
      background: '#000',
      zIndex: 50
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement(IOSStatusBar, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }
  }, title !== undefined && /*#__PURE__*/React.createElement(IOSNavBar, {
    title: title,
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto'
    }
  }, children), keyboard && /*#__PURE__*/React.createElement(IOSKeyboard, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 60,
      height: 34,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingBottom: 8,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 139,
      height: 5,
      borderRadius: 100,
      background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)'
    }
  })));
}

// ─────────────────────────────────────────────────────────────
// Keyboard — iOS 26 liquid glass
// ─────────────────────────────────────────────────────────────
function IOSKeyboard({
  dark = false
}) {
  const glyph = dark ? 'rgba(255,255,255,0.7)' : '#595959';
  const sugg = dark ? 'rgba(255,255,255,0.6)' : '#333';
  const keyBg = dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.85)';

  // special-key icons
  const icons = {
    shift: /*#__PURE__*/React.createElement("svg", {
      width: "19",
      height: "17",
      viewBox: "0 0 19 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M9.5 1L1 9.5h4.5V16h8V9.5H18L9.5 1z",
      fill: glyph
    })),
    del: /*#__PURE__*/React.createElement("svg", {
      width: "23",
      height: "17",
      viewBox: "0 0 23 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M7 1h13a2 2 0 012 2v11a2 2 0 01-2 2H7l-6-7.5L7 1z",
      fill: "none",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinejoin: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 5l7 7M17 5l-7 7",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinecap: "round"
    })),
    ret: /*#__PURE__*/React.createElement("svg", {
      width: "20",
      height: "14",
      viewBox: "0 0 20 14"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M18 1v6H4m0 0l4-4M4 7l4 4",
      fill: "none",
      stroke: "#fff",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }))
  };
  const key = (content, {
    w,
    flex,
    ret,
    fs = 25,
    k
  } = {}) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      height: 42,
      borderRadius: 8.5,
      flex: flex ? 1 : undefined,
      width: w,
      minWidth: 0,
      background: ret ? '#08f' : keyBg,
      boxShadow: '0 1px 0 rgba(0,0,0,0.075)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, "SF Compact", system-ui',
      fontSize: fs,
      fontWeight: 458,
      color: ret ? '#fff' : glyph
    }
  }, content);
  const row = (keys, pad = 0) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      justifyContent: 'center',
      padding: `0 ${pad}px`
    }
  }, keys.map(l => key(l, {
    flex: true,
    k: l
  })));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 15,
      borderRadius: 27,
      overflow: 'hidden',
      padding: '11px 0 2px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      boxShadow: dark ? '0 -2px 20px rgba(0,0,0,0.09)' : '0 -1px 6px rgba(0,0,0,0.018), 0 -3px 20px rgba(0,0,0,0.012)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.14)' : 'rgba(255,255,255,0.25)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      alignItems: 'center',
      padding: '8px 22px 13px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, ['"The"', 'the', 'to'].map((w, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 25,
      background: '#ccc',
      opacity: 0.3
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      textAlign: 'center',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      color: sugg,
      letterSpacing: -0.43,
      lineHeight: '22px'
    }
  }, w)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 13,
      padding: '0 6.5px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, row(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']), row(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], 20), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14.25,
      alignItems: 'center'
    }
  }, key(icons.shift, {
    w: 45,
    k: 'shift'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      flex: 1
    }
  }, ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(l => key(l, {
    flex: true,
    k: l
  }))), key(icons.del, {
    w: 45,
    k: 'del'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, key('ABC', {
    w: 92.25,
    fs: 18,
    k: 'abc'
  }), key('', {
    flex: true,
    k: 'space'
  }), key(icons.ret, {
    w: 92.25,
    ret: true,
    k: 'ret'
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      width: '100%',
      position: 'relative'
    }
  }));
}
Object.assign(window, {
  IOSDevice,
  IOSStatusBar,
  IOSNavBar,
  IOSGlassPill,
  IOSList,
  IOSListRow,
  IOSKeyboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/ios-frame.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/Cart.jsx
try { (() => {
// CartDrawer + ProductDetail
const {
  useState: useStateCart
} = React;
function CartDrawer({
  open,
  items,
  onClose,
  onRemove
}) {
  const subtotal = items.reduce((s, i) => s + i.now * (i.qty || 1), 0);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: 'cc-cart-backdrop' + (open ? ' open' : ''),
    onClick: onClose
  }), /*#__PURE__*/React.createElement("aside", {
    className: 'cc-cart' + (open ? ' open' : '')
  }, /*#__PURE__*/React.createElement("div", {
    className: "cc-cart-head"
  }, /*#__PURE__*/React.createElement("h3", null, "Tu carrito (", items.length, ")"), /*#__PURE__*/React.createElement("button", {
    className: "cc-cart-close",
    onClick: onClose
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "cc-cart-body"
  }, items.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '40px 0',
      color: 'var(--fg-3)'
    }
  }, /*#__PURE__*/React.createElement("p", null, "Tu carrito est\xE1 vac\xEDo."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13
    }
  }, "Empez\xE1 a agregar productos \uD83D\uDC9A")), items.map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "cc-cart-item"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cc-cart-item-img"
  }), /*#__PURE__*/React.createElement("div", {
    className: "cc-cart-item-info"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cc-cart-item-name"
  }, p.name), /*#__PURE__*/React.createElement("div", {
    className: "cc-cart-item-meta"
  }, p.cat, " \xB7 Cantidad ", p.qty || 1), /*#__PURE__*/React.createElement("div", {
    className: "cc-cart-item-price"
  }, fmtQ(p.now))), /*#__PURE__*/React.createElement("button", {
    className: "cc-cart-close",
    onClick: () => onRemove(i),
    style: {
      alignSelf: 'flex-start'
    }
  }, "\u2715")))), items.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "cc-cart-footer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cc-cart-subtotal"
  }, /*#__PURE__*/React.createElement("span", null, "Subtotal"), /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, fmtQ(subtotal))), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: 'var(--fg-3)',
      margin: '0 0 12px'
    }
  }, subtotal >= 250 ? '✓ Tu pedido tiene envío gratis' : `Agregá ${fmtQ(250 - subtotal)} más para envío gratis`), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary btn-lg",
    style: {
      width: '100%',
      justifyContent: 'center'
    }
  }, "Ir a pagar ", /*#__PURE__*/React.createElement("i", {
    "data-lucide": "arrow-right"
  })))));
}
function ProductDetail({
  product,
  onBack,
  onAdd
}) {
  const [qty, setQty] = useStateCart(1);
  const [activeThumb, setActiveThumb] = useStateCart(0);
  if (!product) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "cc-pdp"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cc-pdp-gallery"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cc-pdp-main-img"
  }, "[", product.cat, " \xB7 imagen principal]"), /*#__PURE__*/React.createElement("div", {
    className: "cc-pdp-thumbs"
  }, [0, 1, 2, 3, 4].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: 'cc-pdp-thumb' + (i === activeThumb ? ' active' : ''),
    onClick: () => setActiveThumb(i)
  })))), /*#__PURE__*/React.createElement("div", {
    className: "cc-pdp-info"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cc-pdp-breadcrumb"
  }, /*#__PURE__*/React.createElement("a", {
    onClick: onBack
  }, "Inicio"), /*#__PURE__*/React.createElement("span", null, "\u203A"), /*#__PURE__*/React.createElement("a", null, product.cat), /*#__PURE__*/React.createElement("span", null, "\u203A")), /*#__PURE__*/React.createElement("h1", null, product.name), /*#__PURE__*/React.createElement("div", {
    className: "cc-prod-stars"
  }, /*#__PURE__*/React.createElement("span", {
    className: "s"
  }, "\u2605\u2605\u2605\u2605\u2605"), /*#__PURE__*/React.createElement("span", null, product.stars, " \xB7 ", product.reviews, " rese\xF1as")), /*#__PURE__*/React.createElement("div", {
    className: "cc-pdp-price-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cc-pdp-now"
  }, fmtQ(product.now)), product.old && /*#__PURE__*/React.createElement("span", {
    className: "cc-pdp-old"
  }, fmtQ(product.old)), product.old && /*#__PURE__*/React.createElement("span", {
    className: "cc-pdp-save"
  }, "-", Math.round((1 - product.now / product.old) * 100), "%")), /*#__PURE__*/React.createElement("p", {
    className: "cc-pdp-desc"
  }, "Calidad garantizada y precio que te encantar\xE1. Disponible en tiendas f\xEDsicas y env\xEDo a toda Guatemala. Todos nuestros productos incluyen garant\xEDa del fabricante."), /*#__PURE__*/React.createElement("div", {
    className: "cc-pdp-qty"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 600
    }
  }, "Cantidad"), /*#__PURE__*/React.createElement("div", {
    className: "cc-qty-ctrl"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setQty(Math.max(1, qty - 1))
  }, "\u2212"), /*#__PURE__*/React.createElement("span", null, qty), /*#__PURE__*/React.createElement("button", {
    onClick: () => setQty(qty + 1)
  }, "+"))), /*#__PURE__*/React.createElement("div", {
    className: "cc-pdp-cta-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary btn-lg",
    onClick: () => onAdd({
      ...product,
      qty
    })
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "shopping-cart"
  }), " Agregar al carrito"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-dark btn-lg"
  }, "Comprar ahora")), /*#__PURE__*/React.createElement("div", {
    className: "cc-pdp-shipping-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cc-pdp-ship-row"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "truck"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Env\xEDo gratis"), /*#__PURE__*/React.createElement("span", null, "Llega ma\xF1ana a Ciudad de Guatemala si ped\xEDs antes de las 2pm"))), /*#__PURE__*/React.createElement("div", {
    className: "cc-pdp-ship-row"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "map-pin"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Retiro en tienda gratis"), /*#__PURE__*/React.createElement("span", null, "Disponible en 12 tiendas \xB7 Listo en 2 horas"))), /*#__PURE__*/React.createElement("div", {
    className: "cc-pdp-ship-row"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "shield-check"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Garant\xEDa Cemaco"), /*#__PURE__*/React.createElement("span", null, "Devoluci\xF3n f\xE1cil en los primeros 30 d\xEDas"))))));
}
Object.assign(window, {
  CartDrawer,
  ProductDetail
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/Cart.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/Header.jsx
try { (() => {
// Header.jsx — top banner + header + nav
const {
  useState
} = React;
function Header({
  cartCount,
  onOpenCart,
  onNav,
  active
}) {
  const [q, setQ] = useState('');
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "cc-top-banner"
  }, "\uD83D\uDE9A ", /*#__PURE__*/React.createElement("b", null, "Env\xEDo gratis"), " en compras mayores a Q250 \xB7 Todo bajo un mismo techo"), /*#__PURE__*/React.createElement("header", {
    className: "cc-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cc-header-inner"
  }, /*#__PURE__*/React.createElement("a", {
    className: "cc-logo",
    href: "#",
    onClick: e => {
      e.preventDefault();
      onNav('home');
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-cemaco-isotipo.png",
    alt: "Cemaco"
  }), /*#__PURE__*/React.createElement("span", {
    className: "cc-logo-word"
  }, "Cemaco")), /*#__PURE__*/React.createElement("div", {
    className: "cc-search"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "search"
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "\xBFQu\xE9 est\xE1s buscando hoy?",
    value: q,
    onChange: e => setQ(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    className: "cc-header-actions"
  }, /*#__PURE__*/React.createElement("a", {
    className: "cc-action"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "map-pin"
  }), /*#__PURE__*/React.createElement("span", null, "Tiendas")), /*#__PURE__*/React.createElement("a", {
    className: "cc-action"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "user"
  }), /*#__PURE__*/React.createElement("span", null, "Mi cuenta")), /*#__PURE__*/React.createElement("a", {
    className: "cc-action"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "heart"
  }), /*#__PURE__*/React.createElement("span", null, "Favoritos")), /*#__PURE__*/React.createElement("a", {
    className: "cc-action",
    onClick: onOpenCart
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "shopping-cart"
  }), /*#__PURE__*/React.createElement("span", null, "Carrito"), cartCount > 0 && /*#__PURE__*/React.createElement("span", {
    className: "cc-cart-count"
  }, cartCount))))), /*#__PURE__*/React.createElement("nav", {
    className: "cc-nav"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cc-nav-inner"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: active === 'home' ? 'active' : '',
    onClick: e => {
      e.preventDefault();
      onNav('home');
    }
  }, "Inicio"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onNav('cat');
    },
    className: active === 'cat' ? 'active' : ''
  }, "Hogar"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onNav('ferr');
    },
    className: active === 'ferr' ? 'active' : ''
  }, "Ferreter\xEDa"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Cocina"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Muebles"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "L\xEDnea blanca"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Mascotas"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Tecnolog\xEDa"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "promo"
  }, "Ofertas"))));
}
window.Header = Header;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/Header.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/ProductCard.jsx
try { (() => {
// ProductCard + grid
function ProductCard({
  p,
  onAdd,
  onOpen
}) {
  return /*#__PURE__*/React.createElement("a", {
    className: "cc-prod",
    onClick: e => {
      e.preventDefault();
      onOpen(p);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "cc-prod-img"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ph"
  }, "[", p.cat.toLowerCase(), "]"), p.badge && /*#__PURE__*/React.createElement("span", {
    className: 'cc-prod-badge' + (p.badge === 'Oferta' ? ' sale' : '')
  }, p.badge), /*#__PURE__*/React.createElement("button", {
    className: "cc-prod-fav",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "heart"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "cc-prod-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cc-prod-cat"
  }, p.cat), /*#__PURE__*/React.createElement("p", {
    className: "cc-prod-name"
  }, p.name), /*#__PURE__*/React.createElement("div", {
    className: "cc-prod-stars"
  }, /*#__PURE__*/React.createElement("span", {
    className: "s"
  }, "\u2605\u2605\u2605\u2605\u2605"), /*#__PURE__*/React.createElement("span", null, p.stars, " (", p.reviews, ")")), /*#__PURE__*/React.createElement("div", {
    className: "cc-prod-price"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cc-prod-now"
  }, /*#__PURE__*/React.createElement("span", {
    className: "c"
  }, "Q"), Math.floor(p.now).toLocaleString('es-GT'), /*#__PURE__*/React.createElement("span", {
    className: "c"
  }, ".", p.now % 1 === 0 ? '00' : Math.round(p.now % 1 * 100).toString().padStart(2, '0'))), p.old && /*#__PURE__*/React.createElement("span", {
    className: "cc-prod-old"
  }, fmtQ(p.old))), p.free && /*#__PURE__*/React.createElement("div", {
    className: "cc-prod-shipping"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "truck"
  }), " Env\xEDo gratis")));
}
function ProductGrid({
  products,
  onAdd,
  onOpen
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "cc-prod-grid"
  }, products.map(p => /*#__PURE__*/React.createElement(ProductCard, {
    key: p.id,
    p: p,
    onAdd: onAdd,
    onOpen: onOpen
  })));
}
window.ProductCard = ProductCard;
window.ProductGrid = ProductGrid;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/ProductCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/Sections.jsx
try { (() => {
// Hero, CategoryTiles, BannerStrip, Footer

function Hero({
  onShop
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: "cc-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cc-hero-inner"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "Semana del hogar"), /*#__PURE__*/React.createElement("h1", null, "Renov\xE1 tu casa sin gastar de m\xE1s"), /*#__PURE__*/React.createElement("p", null, "Hasta 40% de descuento en muebles, cocina y decoraci\xF3n. Todo bajo un mismo techo y con env\xEDo gratis a toda Guatemala."), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-dark btn-lg",
    onClick: onShop
  }, "Ver ofertas ", /*#__PURE__*/React.createElement("i", {
    "data-lucide": "arrow-right"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "cc-hero-img"
  }, "[hero editorial \xB7 hogar guatemalteco]")));
}
function CategoryTiles() {
  return /*#__PURE__*/React.createElement("section", {
    className: "cc-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cc-section-head"
  }, /*#__PURE__*/React.createElement("h2", null, "Categor\xEDas")), /*#__PURE__*/React.createElement("div", {
    className: "cc-cat-grid"
  }, CCD.categories.map(c => /*#__PURE__*/React.createElement("a", {
    key: c.key,
    className: "cc-cat",
    href: "#"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": c.icon
  }), /*#__PURE__*/React.createElement("span", null, c.name)))));
}
function BannerStrip({
  onNav
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "cc-banner-strip"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cc-banner home"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow"
  }, "Hogar"), /*#__PURE__*/React.createElement("h3", null, "Tu familia, tu refugio"), /*#__PURE__*/React.createElement("p", null, "Muebles, textiles y decoraci\xF3n que hacen de tu casa el lugar favorito de todos."), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-dark",
    onClick: () => onNav('cat')
  }, "Explorar Hogar"))), /*#__PURE__*/React.createElement("div", {
    className: "cc-banner ferr"
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow",
    style: {
      color: '#fff'
    }
  }, "Ferreter\xEDa"), /*#__PURE__*/React.createElement("h3", null, "Constru\xED con confianza"), /*#__PURE__*/React.createElement("p", null, "Herramientas y materiales con la mejor calidad y variedad. Para profesionales y proyectos de casa."), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => onNav('ferr')
  }, "Ver Ferreter\xEDa"))));
}
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    className: "cc-footer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cc-footer-inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cc-footer-logo"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-cemaco-isotipo-white.png",
    alt: "Cemaco"
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.7)',
      lineHeight: 1.5,
      margin: '8px 0 0',
      maxWidth: 260
    }
  }, "Todo bajo un mismo techo a precios que te encantar\xE1n. M\xE1s de 50 a\xF1os acompa\xF1ando a las familias guatemaltecas.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", null, "Ayuda"), /*#__PURE__*/React.createElement("ul", null, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Centro de ayuda")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Env\xEDos")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Devoluciones")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Garant\xEDa")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", null, "Cemaco"), /*#__PURE__*/React.createElement("ul", null, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Sobre nosotros")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Tiendas")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Trabaj\xE1 con nosotros")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Sostenibilidad")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", null, "Servicios"), /*#__PURE__*/React.createElement("ul", null, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Tarjeta Cemaco")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Cr\xE9dito directo")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Mesa de regalos")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Cotizaciones")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", null, "Contacto"), /*#__PURE__*/React.createElement("ul", null, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "WhatsApp")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Correo")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Instagram")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Facebook"))))), /*#__PURE__*/React.createElement("div", {
    className: "cc-footer-bottom"
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 Nuevos Almacenes, S.A. \xB7 Guatemala \uD83C\uDDEC\uD83C\uDDF9"), /*#__PURE__*/React.createElement("span", null, "Todo bajo un mismo techo")));
}
Object.assign(window, {
  Hero,
  CategoryTiles,
  BannerStrip,
  Footer
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/Sections.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/data.js
try { (() => {
/* Cemaco Web UI Kit — shared data + helpers
   Exposes window.CCD (catalog) and window.fmtQ (currency) */

const CCD = {
  categories: [{
    key: 'muebles',
    name: 'Muebles',
    icon: 'armchair'
  }, {
    key: 'cocina',
    name: 'Cocina',
    icon: 'utensils'
  }, {
    key: 'decoracion',
    name: 'Decoración',
    icon: 'lamp'
  }, {
    key: 'linea-blanca',
    name: 'Línea blanca',
    icon: 'refrigerator'
  }, {
    key: 'ferreteria',
    name: 'Ferretería',
    icon: 'wrench'
  }, {
    key: 'jardin',
    name: 'Jardín',
    icon: 'trees'
  }, {
    key: 'blancos',
    name: 'Blancos',
    icon: 'bed'
  }, {
    key: 'colchones',
    name: 'Colchones',
    icon: 'bed-double'
  }, {
    key: 'iluminacion',
    name: 'Iluminación',
    icon: 'lightbulb'
  }, {
    key: 'mascotas',
    name: 'Mascotas',
    icon: 'dog'
  }, {
    key: 'tecnologia',
    name: 'Tecnología',
    icon: 'laptop'
  }, {
    key: 'limpieza',
    name: 'Limpieza',
    icon: 'spray-can'
  }],
  products: [{
    id: 1,
    cat: 'Cocina',
    name: 'Juego de sartenes antiadherentes 3 piezas',
    now: 349,
    old: 499,
    badge: '-30%',
    stars: 4.5,
    reviews: 128,
    free: true
  }, {
    id: 2,
    cat: 'Ferretería',
    name: 'Taladro inalámbrico 20V con 2 baterías',
    now: 1299,
    old: null,
    badge: null,
    stars: 4.8,
    reviews: 87,
    free: true
  }, {
    id: 3,
    cat: 'Muebles',
    name: 'Sillón reclinable de cuero sintético',
    now: 2899,
    old: 3499,
    badge: '-17%',
    stars: 4.3,
    reviews: 42,
    free: true
  }, {
    id: 4,
    cat: 'Iluminación',
    name: 'Lámpara de pie LED moderna',
    now: 599,
    old: 749,
    badge: 'Oferta',
    stars: 4.6,
    reviews: 65,
    free: false
  }, {
    id: 5,
    cat: 'Línea blanca',
    name: 'Refrigeradora 14 pies French Door',
    now: 12499,
    old: 14999,
    badge: '-17%',
    stars: 4.7,
    reviews: 31,
    free: true
  }, {
    id: 6,
    cat: 'Ferretería',
    name: 'Juego de llaves mixtas 14 piezas',
    now: 229,
    old: null,
    badge: null,
    stars: 4.4,
    reviews: 92,
    free: false
  }, {
    id: 7,
    cat: 'Blancos',
    name: 'Juego de sábanas king size 100% algodón',
    now: 399,
    old: 549,
    badge: '-27%',
    stars: 4.5,
    reviews: 210,
    free: true
  }, {
    id: 8,
    cat: 'Cocina',
    name: 'Licuadora de 10 velocidades jarra de vidrio',
    now: 499,
    old: 699,
    badge: '-29%',
    stars: 4.2,
    reviews: 156,
    free: false
  }]
};
function fmtQ(n) {
  return 'Q' + n.toLocaleString('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
Object.assign(window, {
  CCD,
  fmtQ
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/data.js", error: String((e && e.message) || e) }); }

})();
