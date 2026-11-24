import { getEspBoardById } from '../engine/BoardCatalog';
import { formatResistance, getResistorColorBands, LED_SPECS } from '../engine/ComponentRegistry';
import type { CircuitParameters, SimulationResult, ThemeMode } from '../engine/types';

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function wire(points: Array<[number, number]>, color: string, dashed = false): string {
  const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
  const dots =
    points.length >= 2
      ? `<circle cx="${points[0][0]}" cy="${points[0][1]}" r="3.6" fill="${color}" />
         <circle cx="${points[points.length - 1][0]}" cy="${points[points.length - 1][1]}" r="3.6" fill="${color}" />`
      : '';
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" ${
    dashed ? 'stroke-dasharray="6 5" opacity="0.6"' : ''
  } />${dots}`;
}

function removedOverlay(x: number, y: number, w: number, h: number): string {
  return `
    <g>
      <rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" rx="8"
            fill="rgba(239,68,68,0.14)" stroke="#ef4444" stroke-width="2" stroke-dasharray="5 4" />
      <rect x="${x + w / 2 - 40}" y="${y - 16}" width="80" height="16" rx="4" fill="#dc2626" />
      <text x="${x + w / 2}" y="${y - 5}" text-anchor="middle" font-family="JetBrains Mono, monospace"
            font-size="9.5" font-weight="700" fill="#ffffff">✕ ENTFERNT</text>
    </g>
  `;
}

function svgResistor(
  x: number,
  y: number,
  ohms: number,
  label: string,
  removed: boolean,
  textColor: string,
): string {
  const bands = getResistorColorBands(ohms);
  const w = 96;
  const h = 24;
  return `
    <g opacity="${removed ? 0.42 : 1}">
      <line x1="${x - 16}" y1="${y}" x2="${x + w + 16}" y2="${y}" stroke="#94a3b8" stroke-width="3.5" />
      <rect x="${x}" y="${y - h / 2}" width="${w}" height="${h}" rx="9" fill="#e2be8d" stroke="#8c683d" stroke-width="2" />
      <rect x="${x + 16}" y="${y - h / 2 + 1}" width="8" height="${h - 2}" fill="${bands[0].hex}" />
      <rect x="${x + 32}" y="${y - h / 2 + 1}" width="8" height="${h - 2}" fill="${bands[1].hex}" />
      <rect x="${x + 48}" y="${y - h / 2 + 1}" width="8" height="${h - 2}" fill="${bands[2].hex}" />
      <rect x="${x + 70}" y="${y - h / 2 + 1}" width="7" height="${h - 2}" fill="${bands[3].hex}" />
      <text x="${x + w / 2}" y="${y - 18}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="${textColor}">${esc(label)} (${esc(formatResistance(ohms))})</text>
    </g>
    ${removed ? removedOverlay(x, y - h / 2, w, h) : ''}
  `;
}

function svgLed(
  x: number,
  y: number,
  hex: string,
  lit: boolean,
  label: string,
  removed: boolean,
  textColor: string,
): string {
  return `
    <g opacity="${removed ? 0.42 : 1}">
      <line x1="${x - 14}" y1="${y + 22}" x2="${x - 14}" y2="${y + 44}" stroke="#cbd5e1" stroke-width="3.5" />
      <line x1="${x + 14}" y1="${y + 22}" x2="${x + 14}" y2="${y + 44}" stroke="#cbd5e1" stroke-width="3.5" />
      ${lit && !removed ? `<circle cx="${x}" cy="${y}" r="34" fill="${hex}" opacity="0.28" />` : ''}
      <circle cx="${x}" cy="${y}" r="22" fill="${lit && !removed ? hex : '#334155'}" stroke="${hex}" stroke-width="2.5" />
      <circle cx="${x - 6}" cy="${y - 6}" r="5" fill="#ffffff" opacity="0.45" />
      <text x="${x - 18}" y="${y + 38}" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#ef4444">+</text>
      <text x="${x + 20}" y="${y + 38}" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#94a3b8">−</text>
      <text x="${x}" y="${y - 30}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="${textColor}">${esc(label)}</text>
    </g>
    ${removed ? removedOverlay(x - 24, y - 24, 48, 66) : ''}
  `;
}

function svgCapacitor(
  x: number,
  y: number,
  label: string,
  removed: boolean,
  textColor: string,
): string {
  return `
    <g opacity="${removed ? 0.42 : 1}">
      <line x1="${x - 12}" y1="${y + 24}" x2="${x - 12}" y2="${y + 44}" stroke="#cbd5e1" stroke-width="3.5" />
      <line x1="${x + 12}" y1="${y + 24}" x2="${x + 12}" y2="${y + 44}" stroke="#cbd5e1" stroke-width="3.5" />
      <rect x="${x - 22}" y="${y - 26}" width="44" height="52" rx="8" fill="#1e3a8a" stroke="#60a5fa" stroke-width="2" />
      <rect x="${x + 8}" y="${y - 25}" width="12" height="50" rx="3" fill="#cbd5e1" />
      <text x="${x + 14}" y="${y + 4}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="14" font-weight="700" fill="#0f172a">−</text>
      <text x="${x - 6}" y="${y + 4}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="#f8fafc">+</text>
      <text x="${x}" y="${y - 34}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="${textColor}">${esc(label)}</text>
    </g>
    ${removed ? removedOverlay(x - 24, y - 28, 48, 70) : ''}
  `;
}

function svgWagoClamp(x: number, y: number, label: string, accent: string, textColor: string): string {
  return `
    <g>
      <rect x="${x}" y="${y}" width="88" height="34" rx="5" fill="rgba(148,163,184,0.22)" stroke="#64748b" stroke-width="1.8" />
      <rect x="${x + 4}" y="${y + 24}" width="80" height="6" rx="2" fill="${accent}" />
      ${[0, 1, 2, 3, 4]
        .map(
          (i) =>
            `<rect x="${x + 8 + i * 15}" y="${y + 4}" width="11" height="16" rx="2" fill="#f97316" stroke="#c2410c" stroke-width="1" />`,
        )
        .join('')}
      <text x="${x + 44}" y="${y - 6}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="${textColor}">${esc(label)}</text>
    </g>
  `;
}

function svgEspBoard(
  boardName: string,
  chipLabel: string,
  isMini: boolean,
  pcbColor: string,
  accent: string,
  pins: Array<{ y: number; label: string; color: string }>,
): string {
  const x = 34;
  const y = 52;
  const w = 152;
  const h = 276;
  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${pcbColor}" stroke="${accent}" stroke-width="2.2" />
      <!-- RF Shield / Chip (shifted slightly left so right pin labels never overlap) -->
      <rect x="${x + 14}" y="${y + 22}" width="78" height="${isMini ? 52 : 68}" rx="5" fill="${isMini ? '#1e293b' : '#cbd5e1'}" stroke="#64748b" stroke-width="1.5" />
      ${
        isMini
          ? `<rect x="${x + 32}" y="${y + 8}" width="42" height="10" rx="2" fill="#dc2626" />`
          : `<path d="M${x + 26} ${y + 20} L${x + 26} ${y + 9} L${x + 42} ${y + 9} L${x + 42} ${y + 18} L${x + 58} ${y + 18} L${x + 58} ${y + 9} L${x + 74} ${y + 9} L${x + 74} ${y + 18}" fill="none" stroke="#eab308" stroke-width="2.5" />`
      }
      <text x="${x + 53}" y="${y + (isMini ? 52 : 60)}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" font-weight="700" fill="${isMini ? '#f8fafc' : '#0f172a'}">${esc(chipLabel)}</text>
      <text x="${x + 56}" y="${y + 114}" text-anchor="middle" font-family="Inter, sans-serif" font-size="10.5" font-weight="700" fill="#f8fafc">${esc(boardName)}</text>
      <text x="${x + 56}" y="${y + 129}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" fill="${accent}">${isMini ? 'MINI · 3,3V' : '3,3V LOGIC'}</text>
      <!-- USB-C Port -->
      <rect x="${x + w / 2 - 20}" y="${y + h - 18}" width="40" height="22" rx="4" fill="#94a3b8" stroke="#475569" stroke-width="1.5" />
      <!-- Active Pin Pads on right edge -->
      ${pins
        .map(
          (p) => `
          <rect x="${x + w - 12}" y="${p.y - 6}" width="16" height="12" rx="2" fill="#eab308" stroke="#713f12" stroke-width="1" />
          <text x="${x + w - 18}" y="${p.y + 3.5}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="${p.color}">${esc(p.label)}</text>
        `,
        )
        .join('')}
    </g>
  `;
}

/**
 * Generiert einen vollständigen, dynamischen Fritzing-Style SVG-Schaltplan
 * für alle 16 Lektionen inkl. Board-Pins, Farbringen, Breadboard vs. WAGO-Direktaufbau,
 * Mean Well PSU/Akku und markierten entfernten Bauteilen.
 */
export function renderFritzingSvg(
  params: CircuitParameters,
  result: SimulationResult,
  theme: ThemeMode,
): string {
  const board = getEspBoardById(params.boardId);
  const p = board.pins;
  const isRem = (id: string) => params.removedParts.includes(id);

  const isLight = theme === 'light';
  const bg = isLight ? '#f8fafc' : '#060a12';
  const gridCol = isLight ? 'rgba(148,163,184,0.28)' : 'rgba(51,65,85,0.34)';
  const textCol = isLight ? '#0f172a' : '#e2e8f0';
  const mutedCol = isLight ? '#475569' : '#94a3b8';
  const gndWire = isLight ? '#1e293b' : '#94a3b8';

  const modeBadge = params.withoutBreadboard
    ? 'OHNE BREADBOARD · WAGO 221 DIREKTVERDRAHTUNG'
    : 'STECKBRETT-AUFBAU (FRITZING-ANSICHT)';

  let espPins: Array<{ y: number; label: string; color: string }> = [
    { y: 92, label: '3V3', color: '#f87171' },
    { y: 185, label: `G${p.outA.gpio}`, color: '#38bdf8' },
    { y: 292, label: 'GND', color: '#94a3b8' },
  ];

  let bodySvg = '';
  const mountVisual = params.withoutBreadboard
    ? `${svgWagoClamp(245, 52, 'WAGO +V', '#ef4444', textCol)}
       ${svgWagoClamp(245, 294, 'WAGO GND', '#334155', textCol)}`
    : `<rect x="235" y="42" width="548" height="296" rx="10" fill="${isLight ? '#ffffff' : 'rgba(30,41,59,0.38)'}" stroke="${isLight ? '#cbd5e1' : '#334155'}" stroke-width="1.6" stroke-dasharray="4 3" />
       <line x1="255" y1="62" x2="760" y2="62" stroke="#ef4444" stroke-width="2" opacity="0.65" />
       <text x="260" y="56" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#ef4444">+3,3V / +5V Schiene</text>
       <line x1="255" y1="316" x2="760" y2="316" stroke="#3b82f6" stroke-width="2" opacity="0.65" />
       <text x="260" y="330" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#60a5fa">GND Schiene (0 V)</text>`;

  switch (params.topology) {
    case 'led-resistor': {
      const ledSpec = LED_SPECS[params.ledColor];
      bodySvg = `
        ${wire([[190, 185], [334, 185]], '#38bdf8')}
        ${wire([[462, 185], [576, 185], [576, 224]], '#f59e0b')}
        ${wire([[604, 224], [604, 292], [190, 292]], gndWire)}
        ${svgResistor(350, 185, params.resistorOhms, 'R1', isRem('resistor'), textCol)}
        ${svgLed(590, 180, ledSpec.hex, result.ledBrightnessPercent > 2, `LED ${ledSpec.label.split(' ')[0]}`, isRem('led'), textCol)}
      `;
      break;
    }

    case 'button-pull': {
      espPins = [
        { y: 92, label: '3V3', color: '#f87171' },
        { y: 175, label: `IN G${p.inputA.gpio}`, color: '#38bdf8' },
        { y: 235, label: `LED G${p.outB.gpio}`, color: '#c084fc' },
        { y: 292, label: 'GND', color: '#94a3b8' },
      ];
      const pullRemoved = isRem('pull-resistor') || params.pullMode === 'floating';
      const isPullUp = params.pullMode === 'pull-up';
      bodySvg = `
        ${wire([[190, 92], [380, 92]], '#ef4444')}
        ${wire([[190, 292], [720, 292]], gndWire)}
        ${wire([[190, 175], [460, 175]], '#38bdf8')}
        ${wire([[380, isPullUp ? 292 : 92], [380, 152]], isPullUp ? gndWire : '#ef4444')}
        <!-- Tactile Button -->
        <g opacity="${isRem('button') ? 0.42 : 1}">
          <rect x="355" y="150" width="54" height="54" rx="8" fill="#1e293b" stroke="#64748b" stroke-width="2" />
          <circle cx="382" cy="177" r="15" fill="${params.buttonPressed ? '#38bdf8' : '#0284c7'}" stroke="#e0f2fe" stroke-width="2" />
          <text x="382" y="142" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="${textCol}">TASTER</text>
        </g>
        ${isRem('button') ? removedOverlay(355, 150, 54, 54) : ''}
        ${wire([[409, 175], [484, 175]], '#38bdf8')}
        ${svgResistor(500, 175, params.pullResistorOhms, isPullUp ? 'R_pullup' : 'R_pulldown', pullRemoved, textCol)}
        ${wire([[612, 175], [640, 175], [640, isPullUp ? 92 : 292], [isPullUp ? 380 : 640, isPullUp ? 92 : 292]], isPullUp ? '#ef4444' : gndWire, pullRemoved)}
        ${wire([[190, 235], [706, 235]], '#a855f7')}
        ${svgLed(720, 200, '#38bdf8', result.statusLedOn, 'Status-LED', false, textCol)}
      `;
      break;
    }

    case 'voltage-divider': {
      espPins = [
        { y: 92, label: '3V3', color: '#f87171' },
        { y: 185, label: `ADC G${p.adc.gpio}`, color: '#f59e0b' },
        { y: 292, label: 'GND', color: '#94a3b8' },
      ];
      bodySvg = `
        ${wire([[190, 92], [440, 92], [440, 125]], '#ef4444')}
        ${wire([[190, 185], [440, 185]], '#f59e0b')}
        ${wire([[440, 185], [560, 185]], '#f59e0b')}
        ${wire([[190, 292], [680, 292], [680, 185]], gndWire)}
        ${svgResistor(392, 130, params.r1Ohms, 'R1 (oben)', isRem('r1'), textCol)}
        ${wire([[376, 130], [340, 130], [340, 92]], '#ef4444')}
        ${wire([[504, 130], [520, 130], [520, 185]], '#f59e0b')}
        ${
          params.dividerMode === 'resistors'
            ? svgResistor(568, 185, params.r2Ohms, 'R2 (unten)', isRem('r2'), textCol)
            : `<g opacity="${isRem('r2') ? 0.42 : 1}">
                 <circle cx="615" cy="185" r="28" fill="#e7dfd3" stroke="#b93822" stroke-width="3" />
                 <path d="M598 174 H632 M598 185 H632 M598 196 H632" stroke="#b93822" stroke-width="3" stroke-linecap="round" />
                 <text x="615" y="148" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="${textCol}">LDR (${Math.round(params.lightLevelPercent)}%)</text>
               </g>${isRem('r2') ? removedOverlay(585, 155, 60, 60) : ''}`
        }
        <text x="452" y="212" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="#f59e0b">V_out = ${result.nodeVoltage.toFixed(2).replace('.', ',')} V</text>
      `;
      break;
    }

    case 'pwm-dimmer': {
      bodySvg = `
        ${wire([[190, 185], [334, 185]], '#38bdf8')}
        ${wire([[462, 185], [576, 185], [576, 224]], '#38bdf8')}
        ${wire([[604, 224], [604, 292], [190, 292]], gndWire)}
        ${svgResistor(350, 185, 220, 'R_PWM', isRem('resistor'), textCol)}
        ${svgLed(590, 180, '#3b82f6', result.ledBrightnessPercent > 2, `PWM ${Math.round(params.pwmDutyPercent)}%`, false, textCol)}
      `;
      break;
    }

    case 'rgb-led': {
      espPins = [
        { y: 112, label: `R G${p.outA.gpio}`, color: '#f87171' },
        { y: 175, label: `G G${p.outB.gpio}`, color: '#4ade80' },
        { y: 238, label: `B G${p.outC.gpio}`, color: '#60a5fa' },
        { y: 292, label: 'GND', color: '#94a3b8' },
      ];
      bodySvg = `
        ${wire([[190, 112], [324, 112]], '#ef4444')}
        ${wire([[190, 175], [324, 175]], '#22c55e')}
        ${wire([[190, 238], [324, 238]], '#3b82f6')}
        ${svgResistor(340, 112, 220, 'R_Rot', isRem('r-red'), textCol)}
        ${svgResistor(340, 175, 220, 'R_Grün', isRem('r-green'), textCol)}
        ${svgResistor(340, 238, 100, 'R_Blau', isRem('r-blue'), textCol)}
        ${wire([[452, 112], [585, 112], [585, 155]], '#ef4444')}
        ${wire([[452, 175], [585, 175]], '#22c55e')}
        ${wire([[452, 238], [585, 238], [585, 200]], '#3b82f6')}
        ${wire([[625, 220], [625, 292], [190, 292]], gndWire)}
        ${svgLed(605, 175, result.rgbHex, result.ledBrightnessPercent > 2, `RGB ${result.rgbHex.toUpperCase()}`, false, textCol)}
      `;
      break;
    }

    case 'rc-lowpass': {
      espPins = [
        { y: 145, label: `OUT G${p.outA.gpio}`, color: '#38bdf8' },
        { y: 215, label: `ADC G${p.adc.gpio}`, color: '#f59e0b' },
        { y: 292, label: 'GND', color: '#94a3b8' },
      ];
      bodySvg = `
        ${wire([[190, 145], [334, 145]], '#38bdf8')}
        ${wire([[462, 145], [565, 145], [565, 175]], '#f59e0b')}
        ${wire([[190, 215], [530, 215], [530, 145]], '#f59e0b')}
        ${wire([[589, 240], [589, 292], [190, 292]], gndWire)}
        ${svgResistor(350, 145, params.rcResistorOhms, 'R', isRem('resistor'), textCol)}
        ${svgCapacitor(577, 198, `C (${Math.round(params.rcCapacitorUf)} µF)`, isRem('capacitor'), textCol)}
      `;
      break;
    }

    case 'mosfet-driver': {
      espPins = [
        { y: 185, label: `GATE G${p.outA.gpio}`, color: '#38bdf8' },
        { y: 292, label: 'GND', color: '#94a3b8' },
      ];
      bodySvg = `
        ${wire([[190, 185], [470, 185]], '#38bdf8')}
        ${wire([[340, 185], [340, 232]], '#38bdf8')}
        ${svgResistor(292, 248, 10000, 'Gate-Pulldown', isRem('gate-pulldown'), textCol)}
        ${wire([[404, 248], [430, 248], [430, 292]], gndWire)}
        ${wire([[190, 292], [620, 292]], gndWire)}
        <!-- MOSFET TO-220 -->
        <g opacity="${isRem('mosfet') ? 0.42 : 1}">
          <rect x="495" y="130" width="84" height="72" rx="6" fill="#181c24" stroke="#94a3b8" stroke-width="2" />
          <rect x="502" y="106" width="70" height="24" rx="3" fill="#cbd5e1" />
          <circle cx="537" cy="118" r="6" fill="#0f172a" />
          <text x="537" y="164" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="#f8fafc">IRLZ44N</text>
          <text x="537" y="184" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="#38bdf8">G · D · S</text>
        </g>
        ${isRem('mosfet') ? removedOverlay(495, 106, 84, 96) : ''}
        ${wire([[556, 202], [556, 292]], gndWire)}
        ${wire([[537, 202], [537, 224], [690, 224]], '#f59e0b')}
        <rect x="655" y="92" width="104" height="44" rx="6" fill="#7c2d12" stroke="#f97316" stroke-width="2" />
        <text x="707" y="118" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="#ffedd5">+${params.mosfetLoadVoltage}V LAST</text>
        ${wire([[707, 136], [707, 165]], '#ef4444')}
        ${svgLed(707, 185, '#fef08a', result.ledBrightnessPercent > 2, 'Last', false, textCol)}
      `;
      break;
    }

    case 'i2c-bme280': {
      espPins = [
        { y: 92, label: '3V3', color: '#f87171' },
        { y: 165, label: `SDA G${p.sda.gpio}`, color: '#38bdf8' },
        { y: 225, label: `SCL G${p.scl.gpio}`, color: '#facc15' },
        { y: 292, label: 'GND', color: '#94a3b8' },
      ];
      const pullRemoved = !params.i2cPullupEnabled || isRem('i2c-pullups');
      bodySvg = `
        ${wire([[190, 92], [620, 92], [620, 145]], '#ef4444')}
        ${wire([[190, 165], [580, 165]], '#38bdf8')}
        ${wire([[190, 225], [580, 225]], '#eab308')}
        ${wire([[190, 292], [620, 292], [620, 245]], gndWire)}
        ${svgResistor(330, 118, 4700, 'Pull-Up SDA/SCL', pullRemoved, textCol)}
        ${wire([[314, 118], [295, 118], [295, 92]], '#ef4444', pullRemoved)}
        ${wire([[442, 118], [462, 118], [462, 165]], '#38bdf8', pullRemoved)}
        <!-- BME280 Purple Breakout -->
        <g opacity="${isRem('bme280') ? 0.42 : 1}">
          <rect x="580" y="138" width="142" height="114" rx="10" fill="#4c1d95" stroke="#a78bfa" stroke-width="2.2" />
          <rect x="634" y="160" width="34" height="34" rx="4" fill="#e2e8f0" stroke="#64748b" stroke-width="1.5" />
          <circle cx="656" cy="177" r="3" fill="#0f172a" />
          <text x="651" y="218" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="#f5f3ff">BME280 (0x76)</text>
          <text x="651" y="236" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="#ddd6fe">${params.bmeTempC.toFixed(1).replace('.', ',')}°C · ${Math.round(params.bmeHumidityPct)}%</text>
        </g>
        ${isRem('bme280') ? removedOverlay(580, 138, 142, 114) : ''}
      `;
      break;
    }

    case 'ultrasonic-hcsr04': {
      espPins = [
        { y: 92, label: '5V/3V3', color: '#f87171' },
        { y: 155, label: `TRIG G${p.outA.gpio}`, color: '#22c55e' },
        { y: 225, label: `ECHO G${p.inputA.gpio}`, color: '#38bdf8' },
        { y: 292, label: 'GND', color: '#94a3b8' },
      ];
      bodySvg = `
        ${wire([[190, 92], [600, 92], [600, 130]], '#ef4444')}
        ${wire([[190, 155], [570, 155]], '#22c55e')}
        ${wire([[190, 225], [450, 225]], '#38bdf8')}
        ${wire([[450, 225], [570, 225]], '#38bdf8')}
        ${wire([[190, 292], [600, 292], [600, 250]], gndWire)}
        ${svgResistor(468, 225, 1000, '1kΩ', false, textCol)}
        ${svgResistor(315, 258, 2000, '2kΩ Schutz', isRem('echo-divider'), textCol)}
        ${wire([[427, 258], [450, 258], [450, 225]], '#38bdf8', isRem('echo-divider'))}
        ${wire([[299, 258], [280, 258], [280, 292]], gndWire, isRem('echo-divider'))}
        <!-- HC-SR04 Blue Module -->
        <g opacity="${isRem('hcsr04') ? 0.42 : 1}">
          <rect x="572" y="128" width="180" height="122" rx="10" fill="#1d4ed8" stroke="#60a5fa" stroke-width="2.2" />
          <circle cx="622" cy="182" r="30" fill="#cbd5e1" stroke="#475569" stroke-width="3" />
          <circle cx="622" cy="182" r="20" fill="#1e293b" />
          <circle cx="702" cy="182" r="30" fill="#cbd5e1" stroke="#475569" stroke-width="3" />
          <circle cx="702" cy="182" r="20" fill="#1e293b" />
          <text x="662" y="236" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11.5" font-weight="700" fill="#ffffff">HC-SR04 · ${Math.round(params.ultrasonicDistanceCm)} cm</text>
        </g>
        ${isRem('hcsr04') ? removedOverlay(572, 128, 180, 122) : ''}
      `;
      break;
    }

    case 'ld2490-radar': {
      espPins = [
        { y: 88, label: '5V', color: '#f87171' },
        { y: 145, label: `RX G${p.uartRx.gpio}`, color: '#4ade80' },
        { y: 192, label: `TX G${p.uartTx.gpio}`, color: '#facc15' },
        { y: 240, label: `OUT G${p.inputA.gpio}`, color: '#38bdf8' },
        { y: 292, label: 'GND', color: '#94a3b8' },
      ];
      bodySvg = `
        ${wire([[190, 88], [520, 88], [520, 124]], '#ef4444')}
        ${wire([[190, 145], [520, 145]], '#22c55e')}
        ${wire([[190, 192], [520, 192]], '#eab308')}
        ${wire([[190, 240], [520, 240]], '#38bdf8', isRem('radar-out-wire'))}
        ${wire([[190, 292], [520, 292], [520, 260]], gndWire)}
        <text x="355" y="138" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="#22c55e">LD2490 TX → ESP RX</text>
        <text x="355" y="185" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="#eab308">ESP TX → LD2490 RX</text>
        <text x="355" y="233" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="#38bdf8">Präsenz OUT (3,3 V)${isRem('radar-out-wire') ? ' [OFFEN!]' : ''}</text>
        <!-- HLK-LD2490 24GHz mmWave Radar PCB -->
        <g opacity="${isRem('ld2490') ? 0.42 : 1}">
          <rect x="520" y="96" width="215" height="186" rx="10" fill="#0e3b2e" stroke="#eab308" stroke-width="2.2" />
          ${[555, 602, 650, 697]
            .map((cx) =>
              [120, 148, 176]
                .map((cy) => `<rect x="${cx - 12}" y="${cy - 8}" width="24" height="16" rx="2" fill="#eab308" />`)
                .join(''),
            )
            .join('')}
          <text x="628" y="224" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="#f8fafc">HLK-LD2490</text>
          <text x="628" y="244" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#5eead4">24 GHz mmWave RADAR</text>
          <text x="628" y="264" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="#fde047">5V · TX · RX · OUT · GND</text>
        </g>
        ${isRem('ld2490') ? removedOverlay(520, 96, 215, 186) : ''}
      `;
      break;
    }

    case 'relay-flyback': {
      const diodeRem = !params.relayFlybackDiode || isRem('flyback-diode');
      bodySvg = `
        ${wire([[190, 92], [540, 92], [540, 140]], '#ef4444')}
        ${wire([[190, 185], [320, 185]], '#38bdf8')}
        ${svgResistor(336, 185, 1000, 'R_Base', false, textCol)}
        ${wire([[448, 185], [515, 185]], '#38bdf8')}
        ${wire([[190, 292], [540, 292], [540, 240]], gndWire)}
        <!-- Blue Relay Cube -->
        <rect x="515" y="138" width="146" height="106" rx="8" fill="#0284c7" stroke="#38bdf8" stroke-width="2.2" />
        <text x="588" y="182" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="#ffffff">SRD-05VDC</text>
        <text x="588" y="204" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10.5" fill="#e0f2fe">5V SPULE (71 mA)</text>
        <!-- 1N4007 Flyback Diode -->
        <g opacity="${diodeRem ? 0.35 : 1}">
          ${wire([[661, 155], [724, 155], [724, 225], [661, 225]], '#94a3b8', diodeRem)}
          <rect x="708" y="168" width="32" height="44" rx="4" fill="#111827" stroke="#94a3b8" stroke-width="1.5" />
          <rect x="709" y="172" width="30" height="8" fill="#e2e8f0" />
          <text x="724" y="144" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="${textCol}">1N4007</text>
        </g>
        ${diodeRem ? removedOverlay(702, 162, 44, 56) : ''}
      `;
      break;
    }

    case 'servo-pwm': {
      espPins = [
        { y: 92, label: '5V', color: '#f87171' },
        { y: 185, label: `PWM G${p.outA.gpio}`, color: '#fb923c' },
        { y: 292, label: 'GND', color: '#94a3b8' },
      ];
      bodySvg = `
        ${wire([[190, 92], [530, 92], [530, 142]], '#ef4444')}
        ${wire([[190, 185], [530, 185]], '#f97316', isRem('servo-signal'))}
        ${wire([[190, 292], [530, 292], [530, 232]], '#78350f')}
        <!-- SG90 Servo -->
        <rect x="530" y="128" width="166" height="118" rx="10" fill="#0284c7" stroke="#38bdf8" stroke-width="2.2" />
        <circle cx="640" cy="187" r="24" fill="#0369a1" stroke="#bae6fd" stroke-width="2" />
        <g transform="translate(640, 187) rotate(${params.servoAngleDeg - 90})">
          <rect x="-10" y="-44" width="20" height="54" rx="8" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5" />
          <circle cx="0" cy="0" r="6" fill="#64748b" />
        </g>
        <text x="576" y="180" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="#ffffff">SG90</text>
        <text x="576" y="200" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="#e0f2fe">${Math.round(params.servoAngleDeg)}°</text>
      `;
      break;
    }

    case 'piezo-buzzer': {
      bodySvg = `
        ${wire([[190, 185], [334, 185]], '#38bdf8')}
        ${wire([[462, 185], [575, 185]], '#38bdf8')}
        ${wire([[610, 235], [610, 292], [190, 292]], gndWire)}
        ${svgResistor(350, 185, 100, 'R_Schutz', isRem('resistor'), textCol)}
        <circle cx="610" cy="185" r="46" fill="#111827" stroke="#64748b" stroke-width="2.5" />
        <circle cx="610" cy="185" r="14" fill="#d4af37" />
        <text x="610" y="126" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11.5" font-weight="700" fill="${textCol}">PIEZO (${Math.round(params.buzzerFrequencyHz)} Hz)</text>
      `;
      break;
    }

    case 'wled-compact':
    case 'wled-medium':
    case 'wled-long-injection': {
      const hasShifter = params.topology !== 'wled-compact';
      const hasInjection = params.topology === 'wled-long-injection';
      const injRemoved = !params.wledPowerInjection || isRem('power-injection');
      const isBat = params.wledPowerSource === 'meanwell-battery';
      const mwRemoved = isRem('meanwell-power');

      espPins = [
        { y: 120, label: '5V / VIN', color: '#f87171' },
        { y: 185, label: `DATA G${p.outA.gpio}`, color: '#4ade80' },
        { y: 292, label: 'GND', color: '#94a3b8' },
      ];

      bodySvg = `
        <!-- Mean Well 5V PSU / Akku Box -->
        <g opacity="${mwRemoved ? 0.38 : 1}">
          <rect x="242" y="70" width="144" height="76" rx="8" fill="#cbd5e1" stroke="#475569" stroke-width="2" />
          <rect x="242" y="70" width="144" height="24" rx="6" fill="#0f172a" />
          <text x="314" y="86" text-anchor="middle" font-family="Inter, sans-serif" font-size="10.5" font-weight="700" fill="#38bdf8">MEAN WELL 5V</text>
          <text x="314" y="114" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="#0f172a">${isBat ? `DC-UPS + ${Math.round(params.wledBatteryCapacityMah / 1000)}Ah AKKU` : 'LRS-50-5 (10 A)'}</text>
          <text x="314" y="132" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9.5" fill="${isBat ? '#1d4ed8' : '#334155'}">${isBat ? `SoC ${Math.round(params.wledBatterySocPct)}% · 5V OUT` : '+5V / GND OUT'}</text>
        </g>
        ${mwRemoved ? removedOverlay(242, 70, 144, 76) : ''}

        <!-- Power Wires from Mean Well to Strip & ESP -->
        ${wire([[386, 98], [585, 98], [585, 162]], '#ef4444', mwRemoved)}
        ${wire([[242, 120], [190, 120]], '#ef4444', mwRemoved)}
        ${wire([[386, 126], [420, 126], [420, 292], [190, 292]], gndWire, mwRemoved)}
        ${wire([[420, 292], [585, 292], [585, 212]], gndWire, mwRemoved)}

        <!-- 1000 uF Buffer Cap -->
        ${svgCapacitor(462, 248, '1000 µF', isRem('buffer-cap'), textCol)}
        ${wire([[450, 292], [450, 292]], gndWire)}

        <!-- Data path: ESP -> optional 74AHCT125 -> 330 Ohm -> WS2812B DIN -->
        ${wire([[190, 185], [hasShifter ? 260 : 418, 185]], '#22c55e')}
        ${
          hasShifter
            ? `<g opacity="${isRem('level-shifter') ? 0.38 : 1}">
                 <rect x="260" y="162" width="128" height="46" rx="6" fill="#181c24" stroke="#38bdf8" stroke-width="2" />
                 <text x="324" y="182" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#f8fafc">74AHCT125</text>
                 <text x="324" y="198" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#38bdf8">3,3V → 5,0V</text>
               </g>
               ${isRem('level-shifter') ? removedOverlay(260, 162, 128, 46) : ''}
               ${wire([[388, 185], [418, 185]], '#22c55e')}`
            : ''
        }
        ${svgResistor(434, 185, 330, 'R_Data', isRem('data-resistor'), textCol)}
        ${wire([[546, 185], [575, 185]], '#22c55e')}

        <!-- WS2812B WLED Strip -->
        <rect x="575" y="156" width="196" height="58" rx="8" fill="#f8fafc" stroke="#64748b" stroke-width="2" />
        ${[0, 1, 2, 3, 4, 5]
          .map((i) => {
            const ledX = 594 + i * 30;
            const dropCol =
              result.wledVoltageDropRatio > 0.35 && i >= 3
                ? i === 5
                  ? '#ea580c'
                  : '#f59e0b'
                : params.wledEffect === 'solid-white'
                  ? '#ffffff'
                  : ['#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7'][i];
            return `<rect x="${ledX - 8}" y="175" width="16" height="16" rx="2" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1" />
                    <circle cx="${ledX}" cy="183" r="5.5" fill="${mwRemoved ? '#475569' : dropCol}" />`;
          })
          .join('')}
        <text x="673" y="148" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="${textCol}">WS2812B (${params.wledLedCount} LEDs · ${(params.wledLedCount / 60).toFixed(1).replace('.', ',')} m)</text>
        <text x="673" y="230" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="${result.wledEndVoltage < 4 ? '#ef4444' : '#22c55e'}">Ende: ${result.wledEndVoltage.toFixed(2).replace('.', ',')} V</text>

        <!-- Power Injection at Tail End (Lesson 16) -->
        ${
          hasInjection
            ? `
              ${wire([[585, 98], [758, 98], [758, 156]], '#ef4444', injRemoved || mwRemoved)}
              ${wire([[585, 292], [758, 292], [758, 214]], gndWire, injRemoved || mwRemoved)}
              <text x="695" y="90" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" font-weight="700" fill="${injRemoved ? '#ef4444' : '#22c55e'}">
                ${injRemoved ? '✕ POWER INJECTION AUS' : '✓ 5V POWER INJECTION (ENDE)'}
              </text>
            `
            : ''
        }
      `;
      break;
    }

    case 'pi-traffic-light': {
      espPins = [
        { y: 112, label: `R G${p.outA.gpio}`, color: '#f87171' },
        { y: 175, label: `Y G${p.outB.gpio}`, color: '#fde047' },
        { y: 238, label: `G G${p.outC.gpio}`, color: '#4ade80' },
        { y: 292, label: 'GND', color: '#94a3b8' },
      ];
      bodySvg = `
        ${wire([[190, 112], [324, 112]], '#ef4444')}
        ${wire([[190, 175], [324, 175]], '#eab308')}
        ${wire([[190, 238], [324, 238]], '#22c55e')}
        ${svgResistor(340, 112, 220, 'R_Rot', isRem('r-red'), textCol)}
        ${svgResistor(340, 175, 220, 'R_Gelb', isRem('r-yellow'), textCol)}
        ${svgResistor(340, 238, 220, 'R_Grün', isRem('r-green'), textCol)}
        ${wire([[452, 112], [536, 112]], '#ef4444')}
        ${wire([[452, 175], [616, 175]], '#eab308')}
        ${wire([[452, 238], [696, 238]], '#22c55e')}
        ${svgLed(550, 112, '#ef4444', result.piTrafficLeds.red, 'Rot', false, textCol)}
        ${svgLed(630, 175, '#facc15', result.piTrafficLeds.yellow, 'Gelb', false, textCol)}
        ${svgLed(710, 238, '#22c55e', result.piTrafficLeds.green, 'Grün', false, textCol)}
        ${wire([[564, 156], [564, 292], [190, 292]], gndWire)}
        ${wire([[644, 219], [644, 292]], gndWire)}
        ${wire([[724, 282], [724, 292], [564, 292]], gndWire)}
      `;
      break;
    }

    case 'pi-fan-pwm': {
      espPins = [
        { y: 92, label: '5V', color: '#f87171' },
        { y: 185, label: `PWM G${p.outA.gpio}`, color: '#38bdf8' },
        { y: 292, label: 'GND', color: '#94a3b8' },
      ];
      bodySvg = `
        ${wire([[190, 92], [655, 92], [655, 130]], '#ef4444')}
        ${wire([[190, 185], [450, 185]], '#38bdf8')}
        ${wire([[190, 292], [520, 292]], gndWire)}
        <g opacity="${isRem('fan-mosfet') ? 0.4 : 1}">
          <rect x="450" y="140" width="84" height="72" rx="6" fill="#181c24" stroke="#94a3b8" stroke-width="2" />
          <text x="492" y="175" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="#f8fafc">MOSFET</text>
          <text x="492" y="194" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="#38bdf8">G · D · S</text>
        </g>
        ${isRem('fan-mosfet') ? removedOverlay(450, 140, 84, 72) : ''}
        ${wire([[510, 212], [510, 292]], gndWire)}
        ${wire([[492, 212], [492, 240], [655, 240], [655, 224]], '#f59e0b')}
        <g opacity="${isRem('pi-fan') ? 0.4 : 1}">
          <rect x="605" y="130" width="100" height="94" rx="10" fill="#161b26" stroke="#38bdf8" stroke-width="2" />
          <circle cx="655" cy="177" r="34" fill="#0f172a" stroke="#64748b" stroke-width="2" />
          <circle cx="655" cy="177" r="10" fill="#0ea5e9" />
          <text x="655" y="122" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="${textCol}">5V LÜFTER (${Math.round(result.piFanSpeedPct)}%)</text>
        </g>
        ${isRem('pi-fan') ? removedOverlay(605, 130, 100, 94) : ''}
      `;
      break;
    }

    case 'pi-oled-i2c': {
      espPins = [
        { y: 92, label: '3V3', color: '#f87171' },
        { y: 165, label: `SDA G${p.sda.gpio}`, color: '#38bdf8' },
        { y: 225, label: `SCL G${p.scl.gpio}`, color: '#facc15' },
        { y: 292, label: 'GND', color: '#94a3b8' },
      ];
      bodySvg = `
        ${wire([[190, 92], [510, 92], [510, 128]], '#ef4444')}
        ${wire([[190, 165], [510, 165]], '#38bdf8', isRem('i2c-sda'))}
        ${wire([[190, 225], [510, 225]], '#eab308')}
        ${wire([[190, 292], [510, 292], [510, 250]], gndWire)}
        <g opacity="${isRem('oled-display') ? 0.4 : 1}">
          <rect x="510" y="106" width="225" height="156" rx="10" fill="#1e3a8a" stroke="#60a5fa" stroke-width="2.2" />
          <rect x="526" y="128" width="193" height="104" rx="4" fill="#03060c" stroke="#334155" stroke-width="1.5" />
          <text x="536" y="148" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#fde047">${esc(result.piOledLines[0] ?? 'OFFLINE')}</text>
          <text x="536" y="172" font-family="JetBrains Mono, monospace" font-size="10" fill="#38bdf8">${esc(result.piOledLines[1] ?? '')}</text>
          <text x="536" y="194" font-family="JetBrains Mono, monospace" font-size="10" fill="#38bdf8">${esc(result.piOledLines[2] ?? '')}</text>
          <text x="536" y="216" font-family="JetBrains Mono, monospace" font-size="10" fill="#38bdf8">${esc(result.piOledLines[3] ?? '')}</text>
          <text x="622" y="252" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#dbeafe">SSD1306 OLED (0x3C)</text>
        </g>
        ${isRem('oled-display') ? removedOverlay(510, 106, 225, 156) : ''}
      `;
      break;
    }

    case 'power-supply-lab': {
      const isBat =
        params.psuMode === 'liion-18650' ||
        params.psuMode === 'lipo-pack' ||
        params.psuMode === 'solar-ups';
      const mwRem = isRem('meanwell-power');
      espPins = [
        { y: 112, label: '5V / VIN', color: '#f87171' },
        { y: 185, label: `SDA G${p.sda.gpio}`, color: '#38bdf8' },
        { y: 235, label: `SCL G${p.scl.gpio}`, color: '#facc15' },
        { y: 292, label: 'GND', color: '#94a3b8' },
      ];
      bodySvg = `
        <g opacity="${mwRem ? 0.38 : 1}">
          <rect x="242" y="66" width="160" height="82" rx="8" fill="#cbd5e1" stroke="#475569" stroke-width="2" />
          <rect x="242" y="66" width="160" height="24" rx="6" fill="#0f172a" />
          <text x="322" y="82" text-anchor="middle" font-family="Inter, sans-serif" font-size="10.5" font-weight="700" fill="#38bdf8">${isBat ? `${params.psuBatteryCells}S AKKU-PACK` : 'KONFIG. NETZTEIL'}</text>
          <text x="322" y="112" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#0f172a">${isBat ? `${params.psuBatteryCapacityMah} mAh · ${Math.round(params.psuBatterySocPct)}%` : `${params.psuVoltageV.toFixed(1)} V · max ${params.psuCurrentLimitA.toFixed(1)} A`}</text>
          <text x="322" y="132" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#1e40af">AWG ${params.psuCableAwg} · ${params.psuRegulatorType.toUpperCase()}</text>
        </g>
        ${mwRem ? removedOverlay(242, 66, 160, 82) : ''}
        ${wire([[402, 102], [472, 102]], '#ef4444', mwRem)}
        ${wire([[402, 132], [430, 132], [430, 292], [190, 292]], gndWire, mwRem)}
        ${wire([[242, 112], [190, 112]], '#ef4444', mwRem)}
        <rect x="472" y="76" width="118" height="58" rx="7" fill="#181c24" stroke="${params.psuRegulatorType === 'buck' ? '#10b981' : '#f59e0b'}" stroke-width="2" />
        <text x="531" y="100" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#f8fafc">${params.psuRegulatorType === 'buck' ? 'BUCK DC-DC' : 'LM7805 LIN'}</text>
        <text x="531" y="120" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#38bdf8">${result.nodeVoltage.toFixed(2)} V OUT</text>
        ${svgCapacitor(531, 218, '1000 µF', isRem('buffer-cap'), textCol)}
        ${wire([[590, 102], [650, 102], [650, 185]], '#ef4444', mwRem)}
        ${wire([[650, 240], [650, 292], [430, 292]], gndWire, mwRem)}
        <rect x="615" y="185" width="120" height="55" rx="8" fill="#0f172a" stroke="#22d3ee" stroke-width="2" />
        <text x="675" y="208" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="#e2e8f0">LAST ${Math.round(result.currentMa)} mA</text>
        <text x="675" y="226" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="#38bdf8">${(result.powerMw / 1000).toFixed(2)} W</text>
      `;
      break;
    }
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 365" class="w-full h-full select-none">
      <defs>
        <pattern id="fritzGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${gridCol}" stroke-width="0.9" />
        </pattern>
      </defs>
      <rect width="820" height="365" fill="${bg}" />
      <rect width="820" height="365" fill="url(#fritzGrid)" />

      <!-- Header caption inside schematic -->
      <text x="20" y="24" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="${mutedCol}">
        FRITZING-SCHALTPLAN · ${esc(modeBadge)}
      </text>
      <text x="800" y="24" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="10.5" fill="${mutedCol}">
        ${esc(board.shortName)} · ${esc(result.probePin)}
      </text>

      ${mountVisual}
      ${svgEspBoard(board.shortName, board.chipLabel, board.isMini, board.pcbColorHex, board.accentHex, espPins)}
      ${bodySvg}
    </svg>
  `;
}

/**
 * Interaktiver Fritzing-Schaltplan-Container (für Dock-Tab & Großansicht-Modal) mit SVG-Export.
 */
export class FritzingSchematicPanel {
  private readonly mountEl: HTMLElement;
  private lastSvg = '';

  constructor(mountEl: HTMLElement) {
    this.mountEl = mountEl;
  }

  public update(params: CircuitParameters, result: SimulationResult, theme: ThemeMode): void {
    const svg = renderFritzingSvg(params, result, theme);
    if (svg !== this.lastSvg) {
      this.lastSvg = svg;
      this.mountEl.innerHTML = svg;
    }
  }

  public getCurrentSvg(): string {
    return this.lastSvg;
  }
}
