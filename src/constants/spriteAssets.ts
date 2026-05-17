export const ASTROLOGER_SPRITE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120">
  <defs>
    <linearGradient id="robeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <!-- Staff -->
  <rect x="75" y="20" width="4" height="90" fill="#78350f" rx="2" />
  <polygon points="77,5 88,25 77,40 66,25" fill="#22d3ee" filter="url(#glow)" />
  <polygon points="77,15 82,25 77,32 72,25" fill="#cffafe" />
  <!-- Cape/Robe Back -->
  <path d="M 25 40 Q 10 80 15 110 L 65 110 Q 70 80 55 40 Z" fill="url(#robeGrad)" />
  <!-- Body/Dress -->
  <path d="M 35 45 Q 25 80 30 110 L 50 110 Q 55 80 45 45 Z" fill="#3b82f6" />
  <!-- Gold Trims -->
  <path d="M 15 110 Q 40 100 65 110 L 65 115 Q 40 105 15 115 Z" fill="url(#goldGrad)" />
  <path d="M 30 110 L 50 110 L 50 115 L 30 115 Z" fill="#fef08a" />
  <!-- Head / Hood -->
  <path d="M 40 15 Q 20 25 25 50 Q 40 60 55 50 Q 60 25 40 15 Z" fill="#1e3a8a" />
  <path d="M 40 10 Q 15 20 20 45 L 30 45 Q 30 30 40 25 Q 50 30 50 45 L 60 45 Q 65 20 40 10 Z" fill="url(#goldGrad)" />
  <!-- Face Area -->
  <path d="M 28 40 Q 40 55 52 40 Q 40 30 28 40 Z" fill="#020617" />
  <!-- Glowing Eyes -->
  <circle cx="36" cy="42" r="1.5" fill="#38bdf8" filter="url(#glow)" />
  <circle cx="44" cy="42" r="1.5" fill="#38bdf8" filter="url(#glow)" />
  <!-- Magic Orbs -->
  <circle cx="20" cy="70" r="3" fill="#fde047" filter="url(#glow)" />
  <circle cx="15" cy="50" r="2" fill="#38bdf8" filter="url(#glow)" />
</svg>`.trim())}`;

export const OCCULTIST_SPRITE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120">
  <defs>
    <linearGradient id="occultGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#701a75" />
      <stop offset="100%" stop-color="#4a044e" />
    </linearGradient>
    <linearGradient id="crimsonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#be123c" />
      <stop offset="100%" stop-color="#881337" />
    </linearGradient>
    <filter id="glowPurple" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <!-- Floating Book -->
  <path d="M 75 40 L 95 35 L 90 55 L 70 60 Z" fill="#1f2937" stroke="#9ca3af" stroke-width="1"/>
  <path d="M 72 38 L 92 33 L 87 53 L 67 58 Z" fill="#e5e7eb" />
  <polygon points="80,42 88,40 85,50 77,52" fill="#d8b4fe" filter="url(#glowPurple)" />
  <!-- Floating Runes -->
  <text x="70" y="25" fill="#d8b4fe" font-size="18" font-family="sans-serif" font-weight="bold" filter="url(#glowPurple)">✦</text>
  <text x="85" y="75" fill="#d8b4fe" font-size="20" font-family="sans-serif" font-weight="bold" filter="url(#glowPurple)">✧</text>
  
  <!-- Cape/Robe Back -->
  <path d="M 30 40 Q 15 80 20 110 L 70 110 Q 75 80 60 40 Z" fill="url(#occultGrad)" />
  <!-- Body/Dress -->
  <path d="M 45 45 Q 30 80 35 110 L 55 110 Q 60 80 45 45 Z" fill="url(#crimsonGrad)" />
  <!-- Collar/Scarf -->
  <path d="M 35 45 Q 45 65 55 45 L 65 50 Q 45 75 25 50 Z" fill="#0f172a" />
  <!-- Head / Hood -->
  <path d="M 45 10 Q 20 20 25 50 Q 45 65 65 50 Q 70 20 45 10 Z" fill="url(#occultGrad)" />
  <path d="M 45 15 Q 30 25 32 45 L 58 45 Q 60 25 45 15 Z" fill="#020617" />
  <!-- Glowing Eyes -->
  <circle cx="40" cy="38" r="1.5" fill="#c084fc" filter="url(#glowPurple)" />
  <circle cx="50" cy="38" r="1.5" fill="#c084fc" filter="url(#glowPurple)" />
</svg>`.trim())}`;

export const THORN_SPRITE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="vineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#166534" />
      <stop offset="100%" stop-color="#064e3b" />
    </linearGradient>
    <linearGradient id="vineLight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22c55e" />
      <stop offset="100%" stop-color="#14532d" />
    </linearGradient>
    <filter id="thornShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="5" stdDeviation="3" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
  </defs>
  <g filter="url(#thornShadow)">
    <!-- Main thick vine -->
    <path d="M 15 90 Q 40 40 25 15 Q 55 35 45 80 Q 75 50 65 10 Q 90 45 75 90 Z" fill="url(#vineGrad)" stroke="#022c22" stroke-width="2"/>
    <!-- Secondary crossing vine -->
    <path d="M 5 70 Q 55 85 90 60 Q 65 35 45 60 Q 25 35 5 70 Z" fill="url(#vineLight)" stroke="#022c22" stroke-width="2"/>
    <!-- Thorns -->
    <polygon points="25,35 12,22 30,28" fill="#fcd34d" stroke="#b45309" stroke-width="1"/>
    <polygon points="55,25 68,12 62,30" fill="#fcd34d" stroke="#b45309" stroke-width="1"/>
    <polygon points="45,65 58,48 50,65" fill="#fcd34d" stroke="#b45309" stroke-width="1"/>
    <polygon points="35,80 18,72 30,85" fill="#fcd34d" stroke="#b45309" stroke-width="1"/>
    <!-- Creepy Eyes -->
    <circle cx="42" cy="72" r="6" fill="#000" />
    <circle cx="42" cy="72" r="2.5" fill="#ef4444" />
    <circle cx="58" cy="68" r="5" fill="#000" />
    <circle cx="57" cy="68" r="2" fill="#ef4444" />
  </g>
</svg>`.trim())}`;
