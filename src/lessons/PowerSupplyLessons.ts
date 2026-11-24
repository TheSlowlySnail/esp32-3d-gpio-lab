import type { LessonDefinition } from './lessons';

const PSU_CAMERA: { position: [number, number, number]; target: [number, number, number] } = {
  position: [-1.0, 15.8, 22.8],
  target: [-1.2, 0.5, 0.25],
};

const PSU_REMOVABLES = [
  {
    id: 'meanwell-power',
    label: 'Netzteil / Akku-Pack',
    shortLabel: 'Stromquelle',
    role: 'Liefert die konfigurierbare Eingangsleistung',
    removedEffectHint: 'Ausgangsspannung fällt sofort auf 0 V',
  },
  {
    id: 'buffer-cap',
    label: '1000 µF Stützkondensator',
    shortLabel: '1000 µF Elko',
    role: 'Glättet Spannungswelligkeit (Ripple) bei Lastwechseln',
    removedEffectHint: 'Starke Welligkeit (Ripple) im Oszilloskop sichtbar!',
  },
];

/**
 * 6 voll konfigurierbare Labor-Beispiele rund um Netzteile, Akkus, BMS,
 * Buck- vs. Linearregler, Solar-USV und USB-C PD Kabelabfall!
 */
export const POWER_SUPPLY_LESSONS: LessonDefinition[] = [
  {
    id: 'power-lab-bench-psu',
    topology: 'power-supply-lab',
    number: '60',
    title: 'Labor-Netzteil (3,3–24 V) & CC/CV Strombegrenzung',
    shortTitle: 'Labor-Netzteil CC/CV',
    subtitle: 'Spannung, Stromlimit & Last frei konfigurieren — Kurzschluss-Schutz erleben',
    category: 'Netzteile & Akkus',
    recommendedBoardId: 'esp32-devkit-v1',
    difficulty: 'Einstieg',
    pinRole: 'Konfigurierbares Labornetzteil',
    getPrimaryPin: () => 'VOUT / CC-CV',
    summary:
      'Ein regelbares Labornetzteil schützt deine Schaltungen vor Rauchzeichen: Sobald der Laststrom dein eingestelltes Limit (CC) überschreitet, regelt es automatisch die Spannung herunter!',
    keyTakeaways: [
      'CV (Constant Voltage) hält deine Wunschspannung stabil, solange I_Last < I_Limit.',
      'Überschreitet die Last dein Stromlimit, greift CC (Constant Current) und rettet Bauteile!',
      'Konfiguriere Spannung (3,3–24 V), Limit (0,5–10 A), Laststrom & AWG-Kabel frei rechts!',
    ],
    formulas: [
      { label: 'Leistung', expression: 'P = U · I' },
      { label: 'Kabelverlust', expression: 'ΔU = I · R_Kabel(AWG)' },
    ],
    challenges: [
      {
        id: 'psu-cc-test',
        text: 'Stelle Strombegrenzung auf 1,0 A und ziehe den Laststrom auf 2000 mA!',
        hint: 'Beobachte, wie das Netzteil sofort in den gelben CC-Modus geht.',
      },
      {
        id: 'psu-cap-test',
        text: 'Entferne den 1000-µF-Elko in 3D und beobachte den Ripple im Oszilloskop.',
        hint: 'Klicke direkt auf den blauen Elko am Steckbrett.',
      },
    ],
    removableParts: PSU_REMOVABLES,
    defaultParams: {
      psuMode: 'bench-psu',
      psuVoltageV: 12.0,
      psuCurrentLimitA: 2.5,
      psuLoadMa: 900,
      psuRegulatorType: 'buck',
      psuCableAwg: 22,
    },
    cameraPreset: PSU_CAMERA,
  },
  {
    id: 'power-lab-liion-18650',
    topology: 'power-supply-lab',
    number: '61',
    title: '18650 Li-Ion Akku-Pack (1S–4S) & Laufzeitrechner',
    shortTitle: '18650 Akku (1S–4S)',
    subtitle: 'Zellenanzahl (1S–4S), mAh-Kapazität, SoC & Entladekurve live konfigurieren',
    category: 'Netzteile & Akkus',
    recommendedBoardId: 'esp32-s3-devkitc',
    difficulty: 'Grundlagen',
    pinRole: '18650 Li-Ion Pack + BMS',
    getPrimaryPin: () => '1S–4S BAT',
    summary:
      'Konfiguriere dein eigenes 18650-Li-Ion-Akkupack von 1S (3,7 V) bis 4S (14,8 V), stelle Kapazität (1–20 Ah) und Ladezustand (SoC) ein und berechne sofort die reale Laufzeit!',
    keyTakeaways: [
      'Eine Li-Ion-Zelle liegt zwischen 4,2 V (100 % voll) und 3,0 V (Entladeschluss / BMS-Cutoff).',
      'Reihenschaltung (2S, 3S, 4S) addiert die Spannung; Parallelschaltung (2P, 3P) addiert die Kapazität (mAh).',
      'Das 3D-OLED zeigt dir live die aktuelle Zellspannung und verbleibende Laufzeit in Stunden!',
    ],
    formulas: [
      { label: 'Pack-Energie', expression: 'E (Wh) = U_nenn · Kapazität (Ah)' },
      { label: 'Laufzeit', expression: 't (h) ≈ (mAh · SoC% · η) / I_Last' },
    ],
    challenges: [
      {
        id: 'bat-soc-drop',
        text: 'Ziehe den Ladezustand (SoC) auf 10 % herunter und beobachte die Unterspannungswarnung!',
        hint: 'Bei ~3,0 V pro Zelle schaltet ein echtes BMS zum Zellenschutz ab.',
      },
    ],
    removableParts: PSU_REMOVABLES,
    defaultParams: {
      psuMode: 'liion-18650',
      psuBatteryCells: 3,
      psuBatteryCapacityMah: 6000,
      psuBatterySocPct: 85,
      psuCurrentLimitA: 5.0,
      psuLoadMa: 650,
      psuRegulatorType: 'buck',
      psuCableAwg: 18,
    },
    cameraPreset: PSU_CAMERA,
  },
  {
    id: 'power-lab-lipo-esp',
    topology: 'power-supply-lab',
    number: '62',
    title: 'LiPo-Akku (3,7 V) für mobile ESP32-Sensoren',
    shortTitle: 'LiPo 3,7V Mobil',
    subtitle: '1S LiPo + LDO-Regler auf 3,3 V · Stromspar- & Laufzeit-Tuning',
    category: 'Netzteile & Akkus',
    recommendedBoardId: 'esp32-c3-supermini',
    difficulty: 'Grundlagen',
    pinRole: '1S LiPo → 3,3 V',
    getPrimaryPin: () => '3.7V LiPo',
    summary:
      'Wie lange hält ein ESP32-C3 an einem 2000-mAh-LiPo-Akku? Vergleiche Dauerbetrieb (WLAN aktiv, ~150 mA) mit stromsparendem Sensor-Betrieb!',
    keyTakeaways: [
      '1S LiPo liefert 3,0–4,2 V und passt mit einem Low-Dropout-Regler perfekt zum 3,3-V-ESP32.',
      'Schon ein kleiner Unterschied beim Laststrom (50 mA vs. 500 mA) verzehnfacht die Laufzeit!',
      'Nutze immer eine TP4056-Ladeplatine mit Tiefentladeschutz für LiPo-Zellen.',
    ],
    formulas: [
      { label: 'LiPo-Bereich', expression: '3,0 V (leer) · 3,7 V (nenn) · 4,2 V (voll)' },
      { label: 'Laufzeit', expression: 't = 2000 mAh / 150 mA ≈ 13,3 h' },
    ],
    challenges: [
      {
        id: 'lipo-tune',
        text: 'Senke den Laststrom von 250 mA auf 50 mA und lies die neue Laufzeit auf dem 3D-OLED ab!',
        hint: 'Deep-Sleep spart in echten ESP-Projekten sogar bis auf < 0,1 mA.',
      },
    ],
    removableParts: PSU_REMOVABLES,
    defaultParams: {
      psuMode: 'lipo-pack',
      psuBatteryCells: 1,
      psuBatteryCapacityMah: 2500,
      psuBatterySocPct: 90,
      psuCurrentLimitA: 2.0,
      psuLoadMa: 250,
      psuRegulatorType: 'buck',
      psuCableAwg: 22,
    },
    cameraPreset: PSU_CAMERA,
  },
  {
    id: 'power-lab-buck-converter',
    topology: 'power-supply-lab',
    number: '63',
    title: 'Buck-Schaltregler vs. Linearregler (LM7805 Hitze-Test!)',
    shortTitle: 'Buck vs. Linear',
    subtitle: 'Warum ein LM7805 bei 12 V → 5 V / 1 A glühend heiß wird (7 W Abwärme!)',
    category: 'Netzteile & Akkus',
    recommendedBoardId: 'arduino-uno-r4',
    difficulty: 'Fortgeschritten',
    pinRole: '12 V / 24 V → 5 V Wandlung',
    getPrimaryPin: () => 'DC-DC 5V',
    summary:
      'Der wichtigste Aha-Moment in der Leistungselektronik: Vergleiche per Klick einen Linearregler (LM7805) direkt mit einem Step-Down Buck-Wandler bei 12 V → 5 V!',
    keyTakeaways: [
      'Ein Linearregler verheizt P_Verlust = (U_ein − U_aus) · I komplett in Hitze (bei 12→5 V und 1 A ganze 7 Watt!).',
      'Ein Buck-Schaltregler nutzt Spule + PWM und erreicht ~90 % Wirkungsgrad → bleibt eiskalt!',
      'Wechsle rechts zwischen „⚡ Buck“ und „🔥 Linear“ und beobachte sofort Wärme & rote Warn-LED!',
    ],
    formulas: [
      { label: 'Linear-Verlust', expression: 'P_Wärme = (U_in − U_out) · I_Last' },
      { label: 'Wirkungsgrad', expression: 'η = P_out / (P_out + P_Wärme)' },
    ],
    challenges: [
      {
        id: 'buck-vs-lin',
        text: 'Schalte von „Linear (LM7805)“ auf „Buck (~90 % η)“ um und vergleiche die Abwärme!',
        hint: 'Beobachte den Sprung beim Wirkungsgrad von ~40 % auf ~90 %!',
      },
    ],
    removableParts: PSU_REMOVABLES,
    defaultParams: {
      psuMode: 'buck-12v-5v',
      psuVoltageV: 12.0,
      psuCurrentLimitA: 3.0,
      psuLoadMa: 1000,
      psuRegulatorType: 'linear',
      psuCableAwg: 18,
    },
    cameraPreset: PSU_CAMERA,
  },
  {
    id: 'power-lab-solar-ups',
    topology: 'power-supply-lab',
    number: '64',
    title: 'Autarke Solar-USV & Mean Well Akku-Puffer',
    shortTitle: 'Solar-USV Autark',
    subtitle: '2S/3S Akku-Puffer + 5-V-Buck für wetterfeste Garten- & Balkon-Projekte',
    category: 'Netzteile & Akkus',
    recommendedBoardId: 'esp32-c6-devkit',
    difficulty: 'Fortgeschritten',
    pinRole: 'Solar-USV → 5 V',
    getPrimaryPin: () => 'SOLAR UPS',
    summary:
      'Plane deine autarke Balkon-Wetterstation oder Kamera-Falle: Dimensioniere Akkukapazität (bis 20 Ah) und Laststrom so, dass dein System auch 3 Regentage überbrückt!',
    keyTakeaways: [
      'Für mehrtägigen Schlechtwetter-Puffer braucht man reichlich Akku-Reserve (z. B. 10–20 Ah).',
      'Ein effizienter Buck-Wandler holt fast doppelt so viel Laufzeit aus dem 2S/3S-Pack wie ein Linearregler.',
      'Teste 20.000 mAh bei 300 mA Last und lies die Tage auf dem 3D-OLED ab!',
    ],
    formulas: [
      { label: 'Autarkie-Tage', expression: 'Tage = Laufzeit (h) / 24' },
      { label: 'Energiebedarf/Tag', expression: 'Wh/Tag = P_Last (W) · 24 h' },
    ],
    challenges: [
      {
        id: 'solar-3days',
        text: 'Konfiguriere Kapazität & Laststrom so, dass dein System mindestens 3,0 Tage autark läuft!',
        hint: 'Erhöhe die Kapazität auf 15–20 Ah oder reduziere den Laststrom.',
      },
    ],
    removableParts: PSU_REMOVABLES,
    defaultParams: {
      psuMode: 'solar-ups',
      psuBatteryCells: 2,
      psuBatteryCapacityMah: 12000,
      psuBatterySocPct: 95,
      psuCurrentLimitA: 4.0,
      psuLoadMa: 350,
      psuRegulatorType: 'buck',
      psuCableAwg: 18,
    },
    cameraPreset: PSU_CAMERA,
  },
  {
    id: 'power-lab-usb-pd-pi5',
    topology: 'power-supply-lab',
    number: '65',
    title: 'USB-C PD Netzteil (5 V / 5 A) & Kabel-Spannungsabfall',
    shortTitle: 'USB-C PD & AWG',
    subtitle: 'Warum billige dünne USB-Kabel (AWG 26) beim Raspberry Pi 5 zu Abstürzen führen!',
    category: 'Netzteile & Akkus',
    recommendedBoardId: 'rpi-5',
    difficulty: 'Grundlagen',
    pinRole: 'USB-C 5 V / 5 A (Pi 5)',
    getPrimaryPin: () => 'USB-C 5V',
    summary:
      'Der Raspberry Pi 5 zieht unter Volllast bis zu 4–5 A! An einem dünnen Billig-Kabel (AWG 26) gehen über 1 Volt verloren — hier erlebst du den Unterschied zu AWG 18 live!',
    keyTakeaways: [
      'Je größer die AWG-Zahl, desto DÜNNER der Kupferdraht (AWG 26 = sehr dünn, AWG 18 = dick!).',
      'Bei 3 A über AWG 26 verlierst du über 1,5 V auf der Leitung → sofortiger Pi-Brownout!',
      'Klicke rechts von „AWG 26 (Dünn)“ auf „AWG 18 (Dick)“ und sieh, wie die Spannung sofort auf ~4,8 V springt!',
    ],
    formulas: [
      { label: 'Kabelabfall', expression: 'ΔU = I · (2 · L · ρ / A)' },
      { label: 'Pi-5-Minimum', expression: 'U_Pi ≥ 4,65 V (darunter Blitz-Symbol!)' },
    ],
    challenges: [
      {
        id: 'awg-compare',
        text: 'Wechsle bei 2500 mA Last zwischen AWG 26, AWG 22 und AWG 18!',
        hint: 'Achte auf die Ausgangsspannung auf dem 3D-OLED und im HUD.',
      },
    ],
    removableParts: PSU_REMOVABLES,
    defaultParams: {
      psuMode: 'usb-pd',
      psuVoltageV: 5.1,
      psuCurrentLimitA: 5.0,
      psuLoadMa: 2500,
      psuRegulatorType: 'buck',
      psuCableAwg: 26,
    },
    cameraPreset: PSU_CAMERA,
  },
];
