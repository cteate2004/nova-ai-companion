import React from 'react';

export default function AvatarSVG({ emotion = 'neutral' }) {
  return (
    <svg
      viewBox="0 0 400 520"
      xmlns="http://www.w3.org/2000/svg"
      className={`avatar-svg avatar--${emotion}`}
    >
      <defs>
        {/* Skin gradients */}
        <radialGradient id="skinBase" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#C4956A" />
          <stop offset="60%" stopColor="#8B6914" />
          <stop offset="100%" stopColor="#6B4F2D" />
        </radialGradient>
        <radialGradient id="skinHighlight" cx="45%" cy="35%" r="40%">
          <stop offset="0%" stopColor="#C4956A" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#C4956A" stopOpacity="0" />
        </radialGradient>

        {/* Eye colors */}
        <radialGradient id="irisGradient" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#5C3318" />
          <stop offset="100%" stopColor="#3D1F0A" />
        </radialGradient>

        {/* Lip gradient */}
        <linearGradient id="lipGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#D4878C" />
          <stop offset="100%" stopColor="#B5656B" />
        </linearGradient>

        {/* Hair gradient */}
        <linearGradient id="hairGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2A1810" />
          <stop offset="100%" stopColor="#1A0F0A" />
        </linearGradient>

        {/* Glow filter */}
        <filter id="avatarGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="8" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Soft shadow */}
        <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
          <feOffset dx="0" dy="2" />
          <feComposite in2="SourceGraphic" operator="over" />
        </filter>

        {/* Blush gradient */}
        <radialGradient id="blushGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#D4878C" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#D4878C" stopOpacity="0" />
        </radialGradient>

        {/* Plumeria petals */}
        <radialGradient id="plumeriaCenter" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FFB300" />
        </radialGradient>
      </defs>

      {/* Ambient glow behind face */}
      <ellipse
        className="avatar-glow"
        cx="200" cy="230"
        rx="140" ry="170"
        fill="#00d4aa"
        opacity="0.06"
        filter="url(#avatarGlow)"
      />

      {/* ===== HAIR (back layer) ===== */}
      <g className="avatar-hair avatar-hair-back">
        {/* Main hair mass behind head */}
        <path
          d="M 100,160 C 80,180 60,260 70,360 C 75,400 90,440 110,470
             L 120,480 C 110,440 95,380 90,320 C 85,260 95,200 120,170 Z"
          fill="url(#hairGradient)" opacity="0.9"
        />
        <path
          d="M 300,160 C 320,180 340,260 330,360 C 325,400 310,440 290,470
             L 280,480 C 290,440 305,380 310,320 C 315,260 305,200 280,170 Z"
          fill="url(#hairGradient)" opacity="0.9"
        />
        {/* Center back hair */}
        <path
          d="M 140,130 C 160,120 240,120 260,130 C 270,200 280,300 275,400
             L 260,420 C 265,320 260,240 250,180
             C 240,160 160,160 150,180
             C 140,240 135,320 140,420
             L 125,400 C 120,300 130,200 140,130 Z"
          fill="#1A0F0A" opacity="0.8"
        />
      </g>

      {/* ===== NECK & SHOULDERS ===== */}
      <g className="avatar-body">
        {/* Neck */}
        <path
          d="M 175,370 L 175,410 C 175,420 170,435 140,450
             L 120,460 C 100,470 70,480 50,490 L 50,520 L 350,520
             L 350,490 C 330,480 300,470 280,460
             L 260,450 C 230,435 225,420 225,410 L 225,370 Z"
          fill="url(#skinBase)"
        />
        {/* Neck highlight */}
        <path
          d="M 185,370 L 185,405 C 185,415 195,400 200,395
             C 205,400 215,415 215,405 L 215,370 Z"
          fill="#C4956A" opacity="0.3"
        />
        {/* Shoulder fade */}
        <rect x="50" y="490" width="300" height="30" fill="#0a0a0f" opacity="0.7" />
      </g>

      {/* ===== FACE ===== */}
      <g className="avatar-face">
        {/* Face shape */}
        <ellipse
          cx="200" cy="260"
          rx="95" ry="115"
          fill="url(#skinBase)"
        />
        {/* Face highlight */}
        <ellipse
          cx="190" cy="240"
          rx="70" ry="80"
          fill="url(#skinHighlight)"
        />
        {/* Jaw definition */}
        <path
          d="M 130,300 C 140,340 165,365 200,375 C 235,365 260,340 270,300"
          fill="none" stroke="#6B4F2D" strokeWidth="1" opacity="0.3"
        />
      </g>

      {/* ===== EYEBROWS ===== */}
      <g className="avatar-eyebrows">
        {/* Left eyebrow */}
        <path
          className="avatar-brow-left"
          d="M 132,215 C 140,208 158,205 172,210"
          fill="none" stroke="#2A1810" strokeWidth="3.5" strokeLinecap="round"
        />
        {/* Right eyebrow */}
        <path
          className="avatar-brow-right"
          d="M 228,210 C 242,205 260,208 268,215"
          fill="none" stroke="#2A1810" strokeWidth="3.5" strokeLinecap="round"
        />
      </g>

      {/* ===== EYES ===== */}
      <g className="avatar-eyes">
        {/* Left eye */}
        <g className="avatar-eye-left">
          {/* Eye white */}
          <ellipse cx="152" cy="238" rx="22" ry="14" fill="#FEFEFE" />
          {/* Iris */}
          <ellipse cx="152" cy="238" rx="11" ry="12" fill="url(#irisGradient)" />
          {/* Pupil */}
          <ellipse cx="152" cy="237" rx="5" ry="5.5" fill="#0D0805" />
          {/* Eye highlight */}
          <ellipse cx="148" cy="234" rx="3" ry="2.5" fill="white" opacity="0.8" />
          {/* Upper lash line */}
          <path
            d="M 130,236 C 135,224 145,220 152,220 C 159,220 169,224 174,236"
            fill="none" stroke="#1A0F0A" strokeWidth="2.5" strokeLinecap="round"
          />
          {/* Lower lash hint */}
          <path
            d="M 134,242 C 140,250 164,250 170,242"
            fill="none" stroke="#2A1810" strokeWidth="1" opacity="0.5"
          />
          {/* Lashes */}
          <path d="M 130,236 L 126,231" stroke="#1A0F0A" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 134,229 L 131,224" stroke="#1A0F0A" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 140,224 L 138,219" stroke="#1A0F0A" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* Right eye */}
        <g className="avatar-eye-right">
          <ellipse cx="248" cy="238" rx="22" ry="14" fill="#FEFEFE" />
          <ellipse cx="248" cy="238" rx="11" ry="12" fill="url(#irisGradient)" />
          <ellipse cx="248" cy="237" rx="5" ry="5.5" fill="#0D0805" />
          <ellipse cx="244" cy="234" rx="3" ry="2.5" fill="white" opacity="0.8" />
          <path
            d="M 226,236 C 231,224 241,220 248,220 C 255,220 265,224 270,236"
            fill="none" stroke="#1A0F0A" strokeWidth="2.5" strokeLinecap="round"
          />
          <path
            d="M 230,242 C 236,250 260,250 266,242"
            fill="none" stroke="#2A1810" strokeWidth="1" opacity="0.5"
          />
          <path d="M 270,236 L 274,231" stroke="#1A0F0A" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 266,229 L 269,224" stroke="#1A0F0A" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 260,224 L 262,219" stroke="#1A0F0A" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* Eyelids for blink animation */}
        <rect className="avatar-eyelid-left" x="128" y="218" width="48" height="26" fill="url(#skinBase)" opacity="0" />
        <rect className="avatar-eyelid-right" x="224" y="218" width="48" height="26" fill="url(#skinBase)" opacity="0" />
      </g>

      {/* ===== NOSE ===== */}
      <path
        className="avatar-nose"
        d="M 196,255 C 194,265 190,275 186,282 C 190,285 196,287 200,287
           C 204,287 210,285 214,282 C 210,275 206,265 204,255"
        fill="#6B4F2D" opacity="0.25"
      />
      {/* Nose highlight */}
      <path
        d="M 198,258 C 197,265 196,272 196,278"
        fill="none" stroke="#C4956A" strokeWidth="1.5" opacity="0.4"
      />

      {/* ===== CHEEKS (blush) ===== */}
      <ellipse className="avatar-cheek-left" cx="140" cy="275" rx="22" ry="14" fill="url(#blushGradient)" opacity="0" />
      <ellipse className="avatar-cheek-right" cx="260" cy="275" rx="22" ry="14" fill="url(#blushGradient)" opacity="0" />

      {/* ===== MOUTH ===== */}
      <g className="avatar-mouth">
        {/* Base mouth — gentle smile */}
        <path
          className="avatar-lips-outer"
          d="M 172,310 C 178,306 190,304 200,304 C 210,304 222,306 228,310
             C 224,318 214,324 200,324 C 186,324 176,318 172,310 Z"
          fill="url(#lipGradient)"
        />
        {/* Upper lip definition */}
        <path
          className="avatar-lips-upper"
          d="M 172,310 C 180,307 190,305 196,307 C 198,308 200,308 200,308
             C 200,308 202,308 204,307 C 210,305 220,307 228,310"
          fill="none" stroke="#A0505A" strokeWidth="1" opacity="0.6"
        />
        {/* Lip highlight */}
        <ellipse cx="200" cy="312" rx="12" ry="3" fill="#D4878C" opacity="0.4" />
        {/* Teeth (hidden by default, shown on smile/laugh) */}
        <rect
          className="avatar-teeth"
          x="186" y="310" width="28" height="8" rx="2"
          fill="#FEFEFE" opacity="0"
        />
      </g>

      {/* ===== HAIR (front layer) ===== */}
      <g className="avatar-hair avatar-hair-front">
        {/* Left side bangs */}
        <path
          d="M 105,195 C 100,170 110,145 130,130 C 140,125 155,125 165,128
             C 150,135 135,150 125,175 C 118,195 115,210 112,225
             C 108,215 105,205 105,195 Z"
          fill="url(#hairGradient)"
        />
        {/* Right side bangs */}
        <path
          d="M 295,195 C 300,170 290,145 270,130 C 260,125 245,125 235,128
             C 250,135 265,150 275,175 C 282,195 285,210 288,225
             C 292,215 295,205 295,195 Z"
          fill="url(#hairGradient)"
        />
        {/* Top hair volume */}
        <path
          d="M 130,130 C 135,105 160,85 200,80 C 240,85 265,105 270,130
             C 265,120 245,110 200,107 C 155,110 135,120 130,130 Z"
          fill="#1A0F0A"
        />
        {/* Left flowing strand */}
        <path
          className="avatar-strand-left"
          d="M 112,225 C 108,250 100,290 95,330 C 92,355 90,380 92,410
             C 88,380 85,345 88,310 C 91,275 100,245 108,220 Z"
          fill="url(#hairGradient)" opacity="0.85"
        />
        {/* Right flowing strand */}
        <path
          className="avatar-strand-right"
          d="M 288,225 C 292,250 300,290 305,330 C 308,355 310,380 308,410
             C 312,380 315,345 312,310 C 309,275 300,245 292,220 Z"
          fill="url(#hairGradient)" opacity="0.85"
        />
      </g>

      {/* ===== PLUMERIA FLOWER ===== */}
      <g className="avatar-flower" transform="translate(295, 155) rotate(15)">
        {/* Petals */}
        <ellipse cx="0" cy="-12" rx="6" ry="12" fill="#FFF5E6" opacity="0.95" transform="rotate(0)" />
        <ellipse cx="0" cy="-12" rx="6" ry="12" fill="#FFF5E6" opacity="0.95" transform="rotate(72)" />
        <ellipse cx="0" cy="-12" rx="6" ry="12" fill="#FFF5E6" opacity="0.95" transform="rotate(144)" />
        <ellipse cx="0" cy="-12" rx="6" ry="12" fill="#FFF5E6" opacity="0.95" transform="rotate(216)" />
        <ellipse cx="0" cy="-12" rx="6" ry="12" fill="#FFF5E6" opacity="0.95" transform="rotate(288)" />
        {/* Center */}
        <circle cx="0" cy="0" r="5" fill="url(#plumeriaCenter)" />
      </g>

      {/* ===== THINKING SPARKLES (hidden by default) ===== */}
      <g className="avatar-sparkles" opacity="0">
        <circle cx="120" cy="195" r="2" fill="#00d4aa" />
        <circle cx="110" cy="210" r="1.5" fill="#00d4aa" />
        <circle cx="125" cy="220" r="1" fill="#d4a574" />
        <circle cx="115" cy="185" r="1.5" fill="#d4a574" />
      </g>
    </svg>
  );
}
