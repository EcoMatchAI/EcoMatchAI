
// ============================================================================
// SIGN IN / SIGN UP LOGO & BRAND ICON
// ============================================================================
export const SignInLogo = ({ size = 44, color = "#4ADE80" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="brand-logo-container">
    <circle cx="50" cy="50" r="38" stroke={color} strokeWidth="5.5" strokeDasharray="3 3" opacity="0.3" />
    <path d="M50 12 C62 12 73 17 79 26" stroke={color} strokeWidth="6.5" strokeLinecap="round" />
    <path d="M88 50 C88 62 83 73 74 79" stroke={color} strokeWidth="6.5" strokeLinecap="round" />
    <path d="M50 88 C38 88 27 83 21 74" stroke={color} strokeWidth="6.5" strokeLinecap="round" />
    <path d="M12 50 C12 38 17 27 26 21" stroke={color} strokeWidth="6.5" strokeLinecap="round" />
    <path d="M50 12 C36 14 32 26 32 26 C32 26 44 26 50 12Z" fill={color} />
    <path d="M50 88 C64 86 68 74 68 74 C68 74 56 74 50 88Z" fill={color} />
    <path d="M88 50 C86 36 74 32 74 32 C74 32 74 44 88 50Z" fill={color} />
    <path d="M12 50 C14 64 26 68 26 68 C26 68 26 56 12 50Z" fill={color} />
  </svg>
);

export const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" className="social-icon">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.39-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className="social-icon">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" fill="#0077B5"/>
  </svg>
);

export const BackgroundWaves = () => (
  <div className="bg-decorations">
    <svg viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M-100,180 C250,90 550,350 950,220 C1150,150 1350,280 1550,180" stroke="rgba(74, 222, 128, 0.08)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M-100,230 C250,140 550,400 950,270 C1150,200 1350,330 1550,230" stroke="rgba(74, 222, 128, 0.05)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M-50,620 C380,770 680,520 1080,720 C1280,800 1430,670 1580,720" stroke="rgba(74, 222, 128, 0.07)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M-50,670 C380,820 680,570 1080,770 C1280,850 1430,720 1580,770" stroke="rgba(74, 222, 128, 0.04)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="1370" cy="80" r="10" fill="#8B5CF6" opacity="0.45" />
    </svg>
  </div>
);

export const FactoryIllustration = () => (
  <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="illustration-svg">
    <path d="M10 200 C80 192 140 208 220 200 C260 195 290 203 310 200" stroke="rgba(74, 222, 128, 0.35)" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M45 200 V75 H65 V200" stroke="rgba(74, 222, 128, 0.35)" strokeWidth="1.5" />
    <line x1="42" y1="80" x2="68" y2="80" stroke="rgba(74, 222, 128, 0.35)" strokeWidth="1.5" />
    <line x1="42" y1="88" x2="68" y2="88" stroke="rgba(74, 222, 128, 0.35)" strokeWidth="1.5" />
    <path d="M55 75 C55 48 72 32 90 38 C80 58 70 63 55 75 Z" stroke="#4ADE80" strokeWidth="1.8" fill="none" />
    <path d="M55 75 C60 54 75 48 90 38" stroke="#4ADE80" strokeWidth="1.2" />
    <path d="M68 58 C73 53 80 50 83 47" stroke="#4ADE80" strokeWidth="1.2" />
    <path d="M65 200 V140 L95 115 V140 L125 115 V140 L155 115 V200 H65 Z" stroke="rgba(74, 222, 128, 0.35)" strokeWidth="1.5" strokeLinejoin="round" />
    <rect x="78" y="155" width="12" height="12" rx="1" stroke="rgba(74, 222, 128, 0.35)" strokeWidth="1.5" />
    <rect x="103" y="155" width="12" height="12" rx="1" stroke="rgba(74, 222, 128, 0.35)" strokeWidth="1.5" />
    <rect x="128" y="155" width="12" height="12" rx="1" stroke="rgba(74, 222, 128, 0.35)" strokeWidth="1.5" />
    <rect x="175" y="145" width="55" height="40" rx="4" stroke="rgba(74, 222, 128, 0.35)" strokeWidth="1.5" />
    <circle cx="202" cy="165" r="9" stroke="rgba(74, 222, 128, 0.2)" strokeWidth="1" strokeDasharray="3 3" />
    <path d="M202 159 C198 165 202 171 202 171 C202 171 206 165 202 159 Z" stroke="#4ADE80" strokeWidth="1.2" fill="none" />
    <path d="M202 162 C200 165 202 168 202 170" stroke="#4ADE80" strokeWidth="1" />
    <path d="M230 185 H255 V165 L245 152 H230 V185 Z" stroke="rgba(74, 222, 128, 0.35)" strokeWidth="1.5" strokeLinejoin="round" />
    <rect x="234" y="157" width="12" height="11" rx="1" stroke="rgba(74, 222, 128, 0.35)" strokeWidth="1.2" />
    <circle cx="192" cy="192" r="8" stroke="rgba(74, 222, 128, 0.35)" strokeWidth="1.5" fill="#012b21" />
    <circle cx="192" cy="192" r="3" fill="rgba(74, 222, 128, 0.35)" />
    <circle cx="242" cy="192" r="8" stroke="rgba(74, 222, 128, 0.35)" strokeWidth="1.5" fill="#012b21" />
    <circle cx="242" cy="192" r="3" fill="rgba(74, 222, 128, 0.35)" />
  </svg>
);

export const WindTurbineIllustration = () => (
  <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="illustration-svg">
    <path d="M10 200 C80 203 140 187 220 200 C260 206 290 197 310 200" stroke="rgba(74, 222, 128, 0.35)" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M250 200 C250 172 265 152 280 157 C270 177 265 187 250 200 Z" stroke="#4ADE80" strokeWidth="1.5" fill="none" />
    <path d="M250 200 C256 182 266 172 280 157" stroke="#4ADE80" strokeWidth="1" />
    <path d="M280 200 C280 177 292 162 305 165 C295 182 292 192 280 200 Z" stroke="#4ADE80" strokeWidth="1.5" fill="none" />
    <path d="M280 200 C286 185 294 176 305 165" stroke="#4ADE80" strokeWidth="1" />
    <path d="M145 200 L147 120 H148 L150 200" stroke="rgba(74, 222, 128, 0.35)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <g className="turbine-blades">
      <circle cx="147.5" cy="119.5" r="4.5" fill="rgba(74, 222, 128, 0.6)" />
      <path d="M147.5 119.5 C149 100 155 80 155 80 C155 80 145 95 147.5 119.5Z" stroke="rgba(74, 222, 128, 0.35)" strokeWidth="1.5" fill="none" />
      <g transform="rotate(120 147.5 119.5)">
        <path d="M147.5 119.5 C149 100 155 80 155 80 C155 80 145 95 147.5 119.5Z" stroke="rgba(74, 222, 128, 0.35)" strokeWidth="1.5" fill="none" />
      </g>
      <g transform="rotate(240 147.5 119.5)">
        <path d="M147.5 119.5 C149 100 155 80 155 80 C155 80 145 95 147.5 119.5Z" stroke="rgba(74, 222, 128, 0.35)" strokeWidth="1.5" fill="none" />
      </g>
    </g>
  </svg>
);

export const DotGrid = ({ color = "#8B5CF6", style = {} }) => {
  return (
    <div className="dot-grid" style={style}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="dot" style={{ backgroundColor: color, opacity: 0.35 }} />
      ))}
    </div>
  );
};

// ============================================================================
// PROFILE / MARKETPLACE ICONS
// ============================================================================
export const GeneratorIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="10" fill="#DCFCE7" />
    <path d="M13 13 C13 10 15 10 15 7 M17 15 C17 12 19 12 19 9" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" />
    <rect x="10" y="19" width="28" height="20" rx="4" fill="#22C55E" stroke="#092C25" strokeWidth="1.5" />
    <line x1="14" y1="24" x2="22" y2="24" stroke="#092C25" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="14" y1="29" x2="22" y2="29" stroke="#092C25" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="14" y1="34" x2="22" y2="34" stroke="#092C25" strokeWidth="1.5" strokeLinecap="round" />
    <rect x="26" y="23" width="8" height="12" rx="2" fill="#EAB308" stroke="#092C25" strokeWidth="1.2" />
    <path d="M30 25 L28 29 H31 L29 33 L33 28 H30 L31 25 Z" fill="#FFFFFF" />
    <rect x="15" y="16" width="6" height="3" fill="#EAB308" stroke="#092C25" strokeWidth="1.2" />
  </svg>
);

export const UpcyclerIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="10" fill="#DCFCE7" />
    <g transform="translate(10, 10)">
      <path d="M14 2 L18 5 H12 L14 2 Z" fill="#22C55E" stroke="#092C25" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M14 5 V8 C9.58 8 6 11.58 6 16 C6 16.5 6.05 17 6.13 17.5" stroke="#092C25" strokeWidth="1.5" strokeLinecap="round" />
      <g transform="rotate(120 14 15)">
        <path d="M14 2 L18 5 H12 L14 2 Z" fill="#22C55E" stroke="#092C25" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M14 5 V8 C9.58 8 6 11.58 6 16 C6 16.5 6.05 17 6.13 17.5" stroke="#092C25" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      <g transform="rotate(240 14 15)">
        <path d="M14 2 L18 5 H12 L14 2 Z" fill="#22C55E" stroke="#092C25" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M14 5 V8 C9.58 8 6 11.58 6 16 C6 16.5 6.05 17 6.13 17.5" stroke="#092C25" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </g>
  </svg>
);

export const CoffeeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 5V2 M11 5V1 M15 5V2" stroke="#B45309" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M4 8 H16 V16 C16 19 13 21 9.5 21 C6 21 4 19 4 16 Z" fill="#B45309" stroke="#092C25" strokeWidth="1.5" />
    <path d="M16 10 H19 C20.5 10 21 11.5 20 13 C19 14.5 17.5 14 16 14" stroke="#092C25" strokeWidth="1.5" fill="none" />
  </svg>
);

export const TextilesIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 4 L12 6 L15 4 L21 6 L19 10 L17 9.5 V20 H7 V9.5 L5 10 L3 6 Z" fill="#93C5FD" stroke="#092C25" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

export const WoodIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="13" width="14" height="7" rx="2" fill="#B45309" stroke="#092C25" strokeWidth="1.5" />
    <circle cx="16" cy="16.5" r="3.5" fill="#D97706" stroke="#092C25" strokeWidth="1.5" />
    <rect x="7" y="4" width="14" height="7" rx="2" fill="#B45309" stroke="#092C25" strokeWidth="1.5" />
    <circle cx="21" cy="7.5" r="3.5" fill="#D97706" stroke="#092C25" strokeWidth="1.5" />
  </svg>
);

export const PlasticsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 3 H14 V5 H16 V7 H8 V5 H10 Z" fill="#E2E8F0" stroke="#092C25" strokeWidth="1.5" />
    <path d="M7 8 H17 L16 21 H8 Z" fill="#93C5FD" stroke="#092C25" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M8 13 Q12 14.5 16 13 V20 H8 Z" fill="#60A5FA" opacity="0.6" />
  </svg>
);

export const MetalsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 17 L6 11 H14 L10 17 Z" fill="#94A3B8" stroke="#092C25" strokeWidth="1.5" />
    <path d="M10 17 L14 11 H22 L18 17 Z" fill="#94A3B8" stroke="#092C25" strokeWidth="1.5" />
    <path d="M6 11 L10 5 H18 L14 11 Z" fill="#CBD5E1" stroke="#092C25" strokeWidth="1.5" />
  </svg>
);

export const GrainIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22 V2" stroke="#B45309" strokeWidth="1.5" />
    <path d="M12 5 C10 4 8 6 12 8 C14 6 16 4 12 5 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="0.8" />
    <path d="M12 9 C10 8 8 10 12 12 C14 10 16 8 12 9 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="0.8" />
    <path d="M12 13 C10 12 8 14 12 15 C14 14 16 12 12 13 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="0.8" />
    <path d="M12 17 C10 16 8 18 12 19 C14 18 16 16 12 17 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="0.8" />
  </svg>
);

export const BrainAIIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 8V40" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M24 14C20 12 16 14 16 18C16 20 18 21 20 22C17 23 15 26 15 29C15 33 19 35 24 34" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 22C21.5 22 23 23 24 24" stroke="#15803D" strokeWidth="2.0" />
    <path d="M24 14C28 12 32 14 32 18C32 20 30 21 28 22C31 23 33 26 33 29C33 33 29 35 24 34" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M28 22C26.5 22 25 23 24 24" stroke="#15803D" strokeWidth="2.0" />
  </svg>
);

export const PackagingIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

export const SkincareIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2h4" />
    <path d="M12 2v3" />
    <path d="M8 8h8v11a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3V8z" />
    <path d="M12 8v6" />
  </svg>
);

export const FurnitureIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" />
    <path d="M3 11v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z" />
    <path d="M6 18v2" />
    <path d="M18 18v2" />
  </svg>
);

export const FeedIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z" />
    <path d="M12 6c-1.5 2-3 3-5 3v1c2 0 3.5-1 5-3 1.5 2 3 3 5 3v-1c-2 0-3.5-1-5-3z" />
    <path d="M12 18V9" />
  </svg>
);
