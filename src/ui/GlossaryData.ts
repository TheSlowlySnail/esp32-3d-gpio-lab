import type { AppMode } from '../sandbox/SandboxTypes';

export type GlossaryCategory =
  | 'Grundlagen (U/I/R/P)'
  | 'Pull-Up, Pull-Down & Logik'
  | 'Bauteile erklärt'
  | 'Busse & Signale'
  | 'Strom, Akkus & Sicherheit';

export interface GlossaryEntry {
  id: string;
  term: string;
  shortSubtitle: string;
  icon: string;
  category: GlossaryCategory;
  accentHex: string;
  /** Ein-Satz-Antwort für den schnellen Überblick */
  quickAnswer: string;
  /** Ausführliche, leicht verständliche Erklärung inkl. "Warum braucht man das?" */
  explanation: string;
  /** Anschaulicher Alltagsvergleich oder Praxis-Tipp */
  analogyOrTip: string;
  /** Optionale Formel oder typische Richtwerte */
  formulaOrValues?: string;
  /** Optionaler Direkt-Sprung in eine passende 3D-Lektion oder einen Modus */
  tryAction?: {
    label: string;
    mode: AppMode;
    lessonId?: string;
  };
}

export const GLOSSARY_CATEGORIES: GlossaryCategory[] = [
  'Grundlagen (U/I/R/P)',
  'Pull-Up, Pull-Down & Logik',
  'Bauteile erklärt',
  'Busse & Signale',
  'Strom, Akkus & Sicherheit',
];

export const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  // ===================== PULL-UP, PULL-DOWN & LOGIK =====================
  {
    id: 'pull-down',
    term: 'Pull-Down-Widerstand',
    shortSubtitle: 'Zieht einen offenen Eingang sicher auf LOW (0 V)',
    icon: '⬇️',
    category: 'Pull-Up, Pull-Down & Logik',
    accentHex: '#38bdf8',
    quickAnswer:
      'Ein Widerstand (meist 10 kΩ) zwischen GPIO-Pin und GND (Masse), damit der Pin im Ruhezustand garantiert 0 V (LOW) misst.',
    explanation:
      'Wenn ein Taster zwischen 3,3 V und einem GPIO-Pin nicht gedrückt ist, hängt der Pin elektrisch in der Luft („Floating“). Der Pull-Down-Widerstand verbindet den Pin dauerhaft über 10 kΩ mit GND, sodass er stabil auf 0 V liegt. Drückst du den Taster, fließen nur winzige 0,33 mA über den Widerstand ab — der Pin steigt sauber auf 3,3 V (HIGH).',
    analogyOrTip:
      'Alltagsbild: Wie eine schwache Feder an einer Tür, die sie sanft geschlossen hält, bis du sie mit der Hand aufdrückst.',
    formulaOrValues: 'Typisch: 10 kΩ (4,7 kΩ – 47 kΩ) · I = 3,3 V / 10 kΩ = 0,33 mA',
    tryAction: {
      label: 'Pull-Down live in 3D testen',
      mode: 'lessons',
      lessonId: 'button-pull',
    },
  },
  {
    id: 'pull-up',
    term: 'Pull-Up-Widerstand',
    shortSubtitle: 'Zieht einen Eingang im Ruhezustand sauber auf HIGH (3,3 V)',
    icon: '⬆️',
    category: 'Pull-Up, Pull-Down & Logik',
    accentHex: '#22c55e',
    quickAnswer:
      'Ein Widerstand (meist 10 kΩ, bei I²C 4,7 kΩ) zwischen Pin und +3,3 V, sodass der Pin im Ruhezustand sicher HIGH ist.',
    explanation:
      'Beim Pull-Up liegt der Taster zwischen GPIO-Pin und GND. Solange niemand drückt, hält der Pull-Up den Pin auf +3,3 V (HIGH). Wird der Taster gedrückt, verbindet er den Pin direkt mit GND → 0 V (LOW). Praktisch: ESP32, Raspberry Pi und Arduino haben interne Pull-Ups eingebaut (INPUT_PULLUP), sodass man für einfache Taster keinen externen Widerstand braucht!',
    analogyOrTip:
      'Wichtig: Mit Pull-Up arbeitet der Taster „Active-Low“ — gedrückt bedeutet LOW (0), losgelassen bedeutet HIGH (1).',
    formulaOrValues: 'Taster: 10 kΩ (oder intern ~45 kΩ) · I²C-Bus: 4,7 kΩ',
    tryAction: {
      label: 'Pull-Up & I²C Pull-Ups in 3D ansehen',
      mode: 'lessons',
      lessonId: 'button-pull',
    },
  },
  {
    id: 'floating-pin',
    term: 'Floating (Offener Eingang)',
    shortSubtitle: 'Unbeschalteter Pin wirkt wie eine Antenne!',
    icon: '📡',
    category: 'Pull-Up, Pull-Down & Logik',
    accentHex: '#f59e0b',
    quickAnswer:
      'Ein digitaler Eingang ohne Pull-Up oder Pull-Down hat keinen definierten Zustand und springt zufällig zwischen HIGH und LOW.',
    explanation:
      'Moderne Mikrocontroller-Eingänge sind extrem hochohmig (Megaohm-Bereich). Schon kleinste elektrische Felder aus Stromkabeln in der Wand (50-Hz-Netzbrummen) oder deine sich nähernde Hand reichen aus, um die Spannung am offenen Pin hin- und herspringen zu lassen. Das führt zu „Geister-Klicks“ bei Tastern.',
    analogyOrTip:
      'Probiere es in Lektion 02 aus: Entferne den Pull-Widerstand und beobachte die wilde 50-Hz-Welle live im Oszilloskop!',
    formulaOrValues: 'Störfrequenz in Europa: 50 Hz Netzbrummen',
    tryAction: {
      label: '50-Hz-Floating im Oszilloskop erleben',
      mode: 'lessons',
      lessonId: 'button-pull',
    },
  },
  {
    id: 'active-low-high',
    term: 'Active-High vs. Active-Low',
    shortSubtitle: 'Wann gilt ein Signal als „ausgelöst“?',
    icon: '🔀',
    category: 'Pull-Up, Pull-Down & Logik',
    accentHex: '#a855f7',
    quickAnswer:
      'Active-High heißt „aktiv bei 3,3 V (1)“, Active-Low heißt „aktiv bei 0 V / GND (0)“.',
    explanation:
      'Viele Relais-Module, Reset-Pins (EN/RST) und Taster mit INPUT_PULLUP schalten bei LOW ein. Im Code prüft man dann if (digitalRead(PIN) == LOW). Active-Low ist besonders störsicher und spart externe Bauteile, weil fast jeder Chip interne Pull-Up-Widerstände besitzt.',
    analogyOrTip:
      'Erkennbar oft an einem Strich über dem Namen, einem „#“ oder einem „n“ davor (z. B. nRST, CS#, EN).',
  },
  {
    id: 'logic-levels',
    term: 'Logikpegel (3,3 V vs. 5 V)',
    shortSubtitle: 'Ab welcher Spannung versteht der Chip HIGH oder LOW?',
    icon: '📶',
    category: 'Pull-Up, Pull-Down & Logik',
    accentHex: '#06b6d4',
    quickAnswer:
      'Digitale Pins kennen nur 0 (LOW) und 1 (HIGH) — ESP32 & Raspberry Pi nutzen 3,3 V, klassische Arduinos (UNO/Nano) 5 V.',
    explanation:
      'Beim ESP32 gilt alles ab V_IH ≈ 2,48 V als sicheres HIGH und alles unter V_IL ≈ 0,83 V als sicheres LOW. Dazwischen liegt die verbotene Zone (UNDEFINED). Achtung: ESP32 und Raspberry Pi sind NICHT 5-V-tolerant! Ein 5-V-Sensor (wie der HC-SR04 ECHO-Pin) muss über einen Spannungsteiler oder Pegelwandler heruntergesetzt werden.',
    analogyOrTip:
      'Faustregel: 3,3 V an einen 5-V-Eingang geht oft gut — aber 5 V an einen 3,3-V-Eingang kann den Chip zerstören!',
    formulaOrValues: 'ESP32 (3,3 V): LOW ≤ 0,83 V · HIGH ≥ 2,48 V',
    tryAction: {
      label: '5-V-Echo-Pegelwandler in 3D testen',
      mode: 'lessons',
      lessonId: 'ultrasonic-hcsr04',
    },
  },
  {
    id: 'debouncing',
    term: 'Entprellen (Debouncing)',
    shortSubtitle: 'Warum ein Tastendruck manchmal 5× zählt',
    icon: '🏀',
    category: 'Pull-Up, Pull-Down & Logik',
    accentHex: '#ec4899',
    quickAnswer:
      'Mechanische Kontakte federn beim Schließen wenige Millisekunden lang auf und ab — Software oder ein kleiner Kondensator glättet das.',
    explanation:
      'Ein Mikrocontroller prüft einen Pin Millionen Mal pro Sekunde. Wenn die kleine Metallfeder im Taster beim Drücken 3–10 ms lang prellt (wie ein fallender Tischtennisball), liest der Code 4–8 separate Klicks. Lösung: Entweder 20–50 ms Wartezeit im Code (millis()) oder ein kleiner 100-nF-Kondensator parallel zum Taster.',
    analogyOrTip:
      'Hardware-Entprellung ist ein einfaches RC-Tiefpassfilter — probiere Lektion 06 dazu aus!',
    formulaOrValues: 'Typische Prellzeit: 5–20 ms · RC-Glättung: 10 kΩ + 100 nF',
  },

  // ===================== GRUNDLAGEN (U / I / R / P) =====================
  {
    id: 'why-resistor',
    term: 'Warum braucht man einen Vorwiderstand?',
    shortSubtitle: 'Der Lebensretter für LEDs und GPIO-Pins!',
    icon: '🛡️',
    category: 'Grundlagen (U/I/R/P)',
    accentHex: '#ef4444',
    quickAnswer:
      'Eine LED begrenzt ihren Strom nicht selbst — ohne Vorwiderstand fließt ein zerstörerischer Kurzschlussstrom.',
    explanation:
      'Sobald die Spannung über einer roten LED ~2,0 V überschreitet, wird sie extrem niederohmig. Schließt du sie direkt an 3,3 V an, versucht ein riesiger Strom (> 100 mA) zu fließen: Die LED brennt durch oder überlastet den ESP32-GPIO (Limit 20 mA). Der Vorwiderstand übernimmt die überschüssige Spannung (3,3 V − 2,0 V = 1,3 V) und drosselt den Strom exakt auf sichere ~6 mA (bei 220 Ω).',
    analogyOrTip:
      'Alltagsbild: Ein Feuerwehrschlauch am kleinen Blumentopf — ohne Drosselventil (Widerstand) sprengt der volle Druck die Pflanze weg.',
    formulaOrValues: 'R = (U_versorgung − V_f) / I  →  (3,3 V − 2,0 V) / 0,006 A ≈ 220 Ω',
    tryAction: {
      label: 'Überstrom-Test in Lektion 01 starten',
      mode: 'lessons',
      lessonId: 'led-resistor',
    },
  },
  {
    id: 'ohms-law',
    term: 'Ohmsches Gesetz (U = R · I)',
    shortSubtitle: 'Die wichtigste Formel der gesamten Elektronik',
    icon: '📐',
    category: 'Grundlagen (U/I/R/P)',
    accentHex: '#38bdf8',
    quickAnswer:
      'Spannung (U) gleich Widerstand (R) mal Strom (I) — kennst du zwei Werte, kannst du den dritten sofort berechnen.',
    explanation:
      'Erhöhst du die Spannung bei gleichem Widerstand, steigt der Strom proportional. Verdoppelst du den Widerstand, halbiert sich der Strom. Damit berechnest du Vorwiderstände für LEDs, prüfst ob ein Netzteil ausreicht oder dimensionierst Spannungsteiler für Sensoren.',
    analogyOrTip:
      'Merk-Dreieck „URI“: Decke die gesuchte Größe ab → U = R · I, I = U / R, R = U / I.',
    formulaOrValues: 'U [V] = R [Ω] · I [A]   |   1 A = 1000 mA   |   1 kΩ = 1000 Ω',
    tryAction: {
      label: 'Ohmsches Gesetz live an LED testen',
      mode: 'lessons',
      lessonId: 'led-resistor',
    },
  },
  {
    id: 'voltage',
    term: 'Spannung U (Volt, V)',
    shortSubtitle: 'Der elektrische „Druck“ zwischen zwei Punkten',
    icon: '🔋',
    category: 'Grundlagen (U/I/R/P)',
    accentHex: '#f97316',
    quickAnswer:
      'Spannung ist der Potenzialunterschied zwischen Pluspol und Minuspol (GND) — vergleichbar mit Wasserdruck in einer Leitung.',
    explanation:
      'Spannung liegt immer ZWISCHEN zwei Punkten an (deshalb hat jedes Messgerät zwei Messspitzen: rot und schwarz/GND). Eine einzelne Zahl wie „3,3 V am GPIO 25“ bedeutet immer: 3,3 V Unterschied gegenüber GND (0 V). Ohne geschlossenen Stromkreis liegt zwar Spannung an, es fließt aber noch kein Strom.',
    analogyOrTip:
      'Alltagsbild: Wasserhahn zu = Druck (Spannung) ist da, aber 0 Liter/Sekunde Durchfluss (Strom = 0 A).',
    formulaOrValues: 'Typisch: 3,3 V (ESP32/Pi) · 5 V (USB/Arduino/WLED) · 12 V (Motoren)',
  },
  {
    id: 'current',
    term: 'Stromstärke I (Ampere, A / mA)',
    shortSubtitle: 'Wie viele Elektronen pro Sekunde fließen',
    icon: '⚡',
    category: 'Grundlagen (U/I/R/P)',
    accentHex: '#eab308',
    quickAnswer:
      'Strom ist die tatsächliche Menge an Ladung, die durch ein Kabel oder Bauteil fließt — gemessen in Ampere (A) oder Milliampere (mA).',
    explanation:
      'Jeder Verbraucher „zieht“ sich so viel Strom, wie sein Widerstand bei der anliegenden Spannung zulässt. Wichtig für Netzteile: Ein 5-V-/10-A-Netzteil „drückt“ niemals 10 A in eine kleine LED — es KANN bis zu 10 A liefern, die Schaltung nimmt aber nur das, was sie braucht (z. B. 15 mA).',
    analogyOrTip:
      'Merkregel bei Netzteilen: Spannung (V) muss exakt stimmen — Strom (A) darf gern höher sein als benötigt!',
    formulaOrValues: 'LED: 5–20 mA · ESP32 WLAN: ~120–240 mA · 60× WS2812B weiß: bis 3,6 A',
  },
  {
    id: 'resistance',
    term: 'Widerstand R (Ohm, Ω)',
    shortSubtitle: 'Die gezielte Bremse für elektrischen Strom',
    icon: '🚧',
    category: 'Grundlagen (U/I/R/P)',
    accentHex: '#d97706',
    quickAnswer:
      'Bremst den Stromfluss und wandelt dabei die überschüssige elektrische Energie in ein kleines bisschen Wärme um.',
    explanation:
      'Widerstände sind ungepolt (Richtung egal!). Ihr Wert wird meist über 4 Farbringe abgelesen (z. B. Rot-Rot-Braun-Gold = 22 × 10¹ Ω = 220 Ω ±5 %). Es gibt feste Widerstände (Vorwiderstand, Pull-Up/Down) und veränderliche Widerstände wie Potentiometer (Drehregler) oder LDR (lichtabhängig).',
    analogyOrTip:
      'Die 3 wichtigsten Werte für deine Bastelkiste: 220 Ω (LEDs), 4,7 kΩ (I²C), 10 kΩ (Pull-Up/Down & Teiler).',
    formulaOrValues: '1 kΩ = 1.000 Ω · 1 MΩ = 1.000.000 Ω',
  },
  {
    id: 'power',
    term: 'Elektrische Leistung P (Watt, W)',
    shortSubtitle: 'Wie viel Energie pro Sekunde verbraucht oder verheizt wird',
    icon: '🔥',
    category: 'Grundlagen (U/I/R/P)',
    accentHex: '#ef4444',
    quickAnswer:
      'Leistung ist Spannung mal Strom (P = U · I) — sie bestimmt, wie hell eine Lampe leuchtet oder wie heiß ein Bauteil wird.',
    explanation:
      'Ein Standard-Steckbrett-Widerstand verträgt 0,25 W (250 mW). Fallen an einem Widerstand 1,3 V bei 6 mA ab, sind das nur 7,8 mW (völlig kalt). Bei einem Linearregler LM7805, der 12 V auf 5 V bei 1 A regelt, werden jedoch (12 V − 5 V) × 1 A = 7 Watt pure Wärme erzeugt — ohne Kühlkörper überhitzt er sofort!',
    analogyOrTip:
      'Vergleiche in Lektion 63 live, warum ein Schaltregler (Buck) kühl bleibt, während der LM7805 glüht!',
    formulaOrValues: 'P [W] = U [V] · I [A] = I² · R = U² / R',
    tryAction: {
      label: 'Wärmeverlust Buck vs. Linear testen',
      mode: 'lessons',
      lessonId: 'power-lab-buck-converter',
    },
  },
  {
    id: 'gnd-common-ground',
    term: 'GND / Masse & Common Ground',
    shortSubtitle: 'Der gemeinsame 0-V-Bezugspunkt jeder Schaltung',
    icon: '⏚',
    category: 'Grundlagen (U/I/R/P)',
    accentHex: '#94a3b8',
    quickAnswer:
      'GND (Ground / Masse) ist der 0-V-Rückleiter. Alle Boards, Sensoren und externen Netzteile müssen ein gemeinsames GND teilen!',
    explanation:
      'Der häufigste Anfängerfehler bei externen Netzteilen (z. B. 5-V-Netzteil für WLED oder Servo + USB am ESP32): Man vergisst das schwarze Massekabel zwischen Netzteil-GND und ESP32-GND. Ohne gemeinsamen Bezugspunkt „versteht“ der LED-Streifen oder Servo das Datensignal vom ESP32 nicht — die LEDs flackern wild oder bleiben dunkel.',
    analogyOrTip:
      'Alltagsbild: Zwei Personen auf verschiedenen Treppenstufen können keine Höhe vergleichen, wenn sie keinen gemeinsamen Boden (0 m) haben.',
    formulaOrValues: 'Kabelfarbe-Konvention: Schwarz oder Blau = GND (0 V)',
  },
  {
    id: 'voltage-divider',
    term: 'Spannungsteiler',
    shortSubtitle: 'Zwei Widerstände in Reihe teilen jede Spannung exakt auf',
    icon: '➗',
    category: 'Grundlagen (U/I/R/P)',
    accentHex: '#0ea5e9',
    quickAnswer:
      'Mit zwei Widerständen R1 und R2 in Reihe kannst du eine höhere Spannung (z. B. 5 V) sicher auf 3,3 V herunterteilen oder Sensoren (LDR) auslesen.',
    explanation:
      'Am Mittelpunkt zwischen R1 (oben an +V) und R2 (unten an GND) entsteht die Teilspannung U_out = U_in · R2 / (R1 + R2). Sind beide gleich groß (z. B. 10 kΩ / 10 kΩ), halbiert sich die Spannung exakt. Ersetzt man R2 durch einen Fotowiderstand (LDR), ändert sich U_out mit der Helligkeit — perfekt für den ADC-Pin!',
    analogyOrTip:
      'Wichtig: Ein Spannungsteiler eignet sich nur für Signale & Messungen — niemals zur Stromversorgung von Motoren oder Boards!',
    formulaOrValues: 'U_out = U_in × R2 / (R1 + R2) · 5 V → 3,3 V: R1 = 1 kΩ, R2 = 2 kΩ',
    tryAction: {
      label: 'Spannungsteiler & LDR in 3D testen',
      mode: 'lessons',
      lessonId: 'voltage-divider',
    },
  },

  // ===================== BAUTEILE ERKLÄRT =====================
  {
    id: 'led-vf-polarity',
    term: 'LED: Anode, Kathode & Durchlassspannung (Vf)',
    shortSubtitle: 'Warum LEDs nur in einer Richtung leuchten',
    icon: '💡',
    category: 'Bauteile erklärt',
    accentHex: '#ef4444',
    quickAnswer:
      'Eine LED ist eine Leuchtdiode: Strom fließt nur von der Anode (+, langer Fuß) zur Kathode (−, kurzer Fuß / flache Gehäusekante).',
    explanation:
      'Jede LED-Farbe besteht aus einem anderen Halbleitermaterial und benötigt eine andere Mindestspannung (Durchlassspannung Vf): Rot ≈ 2,0 V, Gelb ≈ 2,1 V, Grün ≈ 2,2 V, Blau & Weiß ≈ 3,0 V. Steckt man sie falsch herum ein, sperrt sie einfach (leuchtet nicht, geht bei 3,3 V aber auch nicht kaputt).',
    analogyOrTip:
      'Eselsbrücke: „Kathode = Kurz + Kante“ (kurzes Beinchen, abgeflachte Kante am Kunststoff-Kragen).',
    formulaOrValues: 'Rot 2,0 V · Gelb 2,1 V · Grün 2,2 V · Blau/Weiß 3,0 V',
    tryAction: {
      label: 'LED-Farben & Vf in 3D vergleichen',
      mode: 'lessons',
      lessonId: 'led-resistor',
    },
  },
  {
    id: 'capacitor',
    term: 'Kondensator & Elko (Mikrofarad, µF)',
    shortSubtitle: 'Der winzige Blitz-Akku für Stromspitzen & Filter',
    icon: '⚡',
    category: 'Bauteile erklärt',
    accentHex: '#3b82f6',
    quickAnswer:
      'Speichert elektrische Energie kurzfristig im elektrischen Feld — glättet Spannungseinbrüche, filtert Störungen und bremst schnelle Signalwechsel.',
    explanation:
      'Kleine Keramik-Kondensatoren (100 nF, ungepolt) fangen hochfrequentes Rauschen direkt an Chips ab. Große Elektrolyt-Kondensatoren („Elkos“, z. B. 100 µF – 1000 µF, GEPOLT mit weißem Minus-Streifen!) wirken wie ein kleiner Puffer-Tank: Wenn ein LED-Streifen oder WLAN-Modul plötzlich viel Strom zieht, liefert der Elko blitzschnell Energie nach.',
    analogyOrTip:
      'Achtung bei Elkos: Niemals falsch herum anschließen und maximale Spannungsfestigkeit beachten (z. B. 16 V für 5-V-Schaltungen)!',
    formulaOrValues: 'Zeitkonstante im RC-Glied: τ = R · C (nach 5·τ zu 99,3 % geladen)',
    tryAction: {
      label: 'Ladekurve in Lektion 06 ansehen',
      mode: 'lessons',
      lessonId: 'rc-lowpass',
    },
  },
  {
    id: 'mosfet',
    term: 'MOSFET (Logic-Level Lastschalter)',
    shortSubtitle: 'Mit 3,3 V und fast 0 mA riesige Lasten (12 V / 24 V) schalten',
    icon: '🔌',
    category: 'Bauteile erklärt',
    accentHex: '#10b981',
    quickAnswer:
      'Ein elektronischer Schalter ohne mechanische Kontakte: Eine kleine Spannung am Gate (G) verbindet Drain (D) blitzschnell mit Source (S).',
    explanation:
      'Ein ESP32-Pin liefert max. 20 mA bei 3,3 V — viel zu wenig für einen 12-V-Lüfter, Motor oder LED-Streifen. Ein Logic-Level-N-Kanal-MOSFET (z. B. IRLZ44N) wird über die Spannung am Gate gesteuert (zieht fast keinen Strom!) und schaltet den Minuspol der Last direkt gegen GND — sogar tausende Male pro Sekunde für PWM-Dimming! Immer einen 10-kΩ-Pull-Down ans Gate hängen.',
    analogyOrTip:
      'Achte auf das „L“ im Namen (z. B. IRLZ44N statt IRFZ44N): „L“ steht für Logic-Level und schaltet schon bei 3,3 V voll durch!',
    formulaOrValues: 'Pin-Reihenfolge TO-220 (von vorn): Gate (G) · Drain (D) · Source (S)',
    tryAction: {
      label: 'MOSFET-Lasttreiber in 3D testen',
      mode: 'lessons',
      lessonId: 'mosfet-driver',
    },
  },
  {
    id: 'flyback-diode',
    term: 'Diode & Freilaufdiode (1N4007)',
    shortSubtitle: 'Das elektrische Rückschlagventil gegen tödliche Spannungsspitzen',
    icon: '➡️',
    category: 'Bauteile erklärt',
    accentHex: '#f59e0b',
    quickAnswer:
      'Eine Diode lässt Strom nur in einer Richtung durch. Als Freilaufdiode parallel zu Relais oder Motoren fängt sie gefährliche Abschalt-Spannungsspitzen ab.',
    explanation:
      'Spulen (in Relais, Motoren, Magnetventilen) speichern Energie im Magnetfeld. Schaltest du die Spule plötzlich ab, bricht das Magnetfeld zusammen und erzeugt eine riesige umgekehrte Spannungsspitze (Induktions-Kickback, oft > 60 V!), die Transistoren und Mikrocontroller sofort zerstört. Die antiparallel geschaltete 1N4007 (silberner Ring Richtung +V!) leitet diese Energie sicher im Kreis ab.',
    analogyOrTip:
      'Klicke in Lektion 11 auf die 1N4007-Diode um sie zu entfernen — und sieh dir den orangefarbenen Funken-Spike beim Ausschalten an!',
    formulaOrValues: 'Induktionsspannung: U = −L · (dI / dt) · Silberring = Kathode an +V',
    tryAction: {
      label: 'Relais-Kickback mit/ohne Diode erleben',
      mode: 'lessons',
      lessonId: 'relay-flyback',
    },
  },
  {
    id: 'relay',
    term: 'Relais (Elektromechanischer Schalter)',
    shortSubtitle: 'Schaltet getrennte Stromkreise mit hörbarem „Klick“',
    icon: '⚙️',
    category: 'Bauteile erklärt',
    accentHex: '#0284c7',
    quickAnswer:
      'Ein kleiner Elektromagnet schließt einen mechanischen Kontakt (COM / NO / NC) — Steuerkreis und Lastkreis sind elektrisch komplett getrennt.',
    explanation:
      'Vorteil gegenüber MOSFETs: Ein Relais kann auch Wechselstrom (AC) oder völlig getrennte Stromkreise schalten. Nachteile: Es klickt hörbar, ist zu langsam für PWM-Dimming und verschleißt nach hunderttausenden Schaltzyklen. Klemmen: COM = gemeinsamer Eingang, NO (Normally Open) = schließt bei Aktivierung, NC (Normally Closed) = öffnet bei Aktivierung.',
    analogyOrTip:
      'Fertige Relais-Module besitzen bereits Transistor, Freilaufdiode und Optokoppler zum Schutz deines ESP32!',
    tryAction: {
      label: '5-V-Relais in 3D schalten',
      mode: 'lessons',
      lessonId: 'relay-flyback',
    },
  },
  {
    id: 'breadboard-basics',
    term: 'Breadboard (Steckbrett) richtig nutzen',
    shortSubtitle: 'Welche Löcher sind unter dem Kunststoff verbunden?',
    icon: '🧩',
    category: 'Bauteile erklärt',
    accentHex: '#14b8a6',
    quickAnswer:
      'In der Mitte sind immer 5 senkrechte Löcher (a–e bzw. f–j) verbunden; oben und unten laufen waagerechte Stromschienen (+ / −).',
    explanation:
      'Der Mittelgraben (zwischen Reihe e und f) trennt die obere von der unteren Hälfte elektrisch komplett — ideal, um Chips oder Taster rittlings darüberzustecken. Wichtig: Stecke beide Beinchen eines Widerstands oder einer LED niemals in dieselbe 5er-Spalte, sonst schließt die Metallklammer darunter das Bauteil kurz!',
    analogyOrTip:
      'Fahre in unserer 3D-Werkbank mit der Maus über ein beliebiges Loch: Der Tooltip zeigt dir sofort, welche 5 Löcher verbunden sind!',
    tryAction: {
      label: 'Direkt auf der 3D-Werkbank bauen',
      mode: 'sandbox',
    },
  },

  // ===================== BUSSE & SIGNALE =====================
  {
    id: 'pwm',
    term: 'PWM (Pulsweitenmodulation)',
    shortSubtitle: 'Helligkeit, Servo-Winkel & Lüftertempo digital steuern',
    icon: '〰️',
    category: 'Busse & Signale',
    accentHex: '#38bdf8',
    quickAnswer:
      'Ein Pin schaltet blitzschnell (z. B. 1000× pro Sekunde) ein und aus — das Verhältnis aus EIN-Zeit zu Gesamtzeit (Duty-Cycle) regelt die Leistung.',
    explanation:
      'Digitale Pins können normalerweise nur 0 V (aus) oder 3,3 V (voll an). Mit PWM schaltet der Hardware-Timer (beim ESP32: LEDC) so schnell, dass dein Auge bei einer LED oder ein träger Motor nur den Mittelwert wahrnimmt: 25 % Duty-Cycle = viertel Kraft, 50 % = halbe Kraft, 100 % = voll an. Servos nutzen eine Sonderform (50 Hz, 0,5–2,5 ms Pulsbreite für 0°–180°).',
    analogyOrTip:
      'Schau dir in Lektion 04 das Rechtecksignal im Oszilloskop an, während du den Duty-Cycle-Regler schiebst!',
    formulaOrValues: 'Mittelspannung ≈ U_max × (Duty-Cycle / 100 %)',
    tryAction: {
      label: 'PWM-Dimmer im Oszilloskop ansehen',
      mode: 'lessons',
      lessonId: 'pwm-dimmer',
    },
  },
  {
    id: 'adc',
    term: 'ADC (Analog-Digital-Wandler)',
    shortSubtitle: 'Misst stufenlose Spannungen als Zahl (0–4095)',
    icon: '📊',
    category: 'Busse & Signale',
    accentHex: '#f59e0b',
    quickAnswer:
      'Ein ADC wandelt eine echte Spannung (z. B. 1,65 V von einem Poti oder Lichtsensor) in eine digitale Zahl für deinen Code um.',
    explanation:
      'Der ESP32 hat einen 12-Bit-ADC: Er teilt 0–3,3 V in 4096 Stufen (0 bis 4095) ein — eine Stufe entspricht nur 0,8 mV! Tipp für ESP32-Klassiker: Nutze bevorzugt ADC1-Pins (GPIO 32–39), weil ADC2 während aktivem WLAN blockiert ist. Raspberry Pi 4/5 haben keinen eingebauten ADC (hier nimmt man den Pico oder einen externen ADS1115 per I²C).',
    analogyOrTip:
      'Arduino UNO hat 10 Bit (0–1023), ESP32 & Pi Pico haben 12 Bit (0–4095), UNO R4 sogar bis 14 Bit!',
    formulaOrValues: 'ADC-Wert = (U_ein / 3,3 V) × 4095 (12-Bit)',
    tryAction: {
      label: '12-Bit-ADC am Spannungsteiler testen',
      mode: 'lessons',
      lessonId: 'voltage-divider',
    },
  },
  {
    id: 'i2c-bus',
    term: 'I²C-Bus (SDA & SCL)',
    shortSubtitle: 'Dutzende Sensoren & Displays über nur 2 Kabel!',
    icon: '🔗',
    category: 'Busse & Signale',
    accentHex: '#facc15',
    quickAnswer:
      'Ein Zweidraht-Bus aus Datenleitung (SDA) und Taktleitung (SCL), an dem sich bis zu 127 Geräte parallel über ihre Adresse (z. B. 0x3C, 0x76) ansprechen lassen.',
    explanation:
      'Beim I²C-Bus ziehen Geräte die Leitungen nur auf GND (Open-Drain). Deshalb braucht der Bus zwingend Pull-Up-Widerstände (typ. 4,7 kΩ) nach 3,3 V — sonst bleiben SDA und SCL tot! Standard-Pins: ESP32 DevKit SDA=GPIO21 / SCL=GPIO22, Raspberry Pi SDA=GPIO2 / SCL=GPIO3, Arduino UNO SDA=A4 / SCL=A5.',
    analogyOrTip:
      'Teste in Lektion 08, was passiert, wenn die 4,7-kΩ-Pull-Ups am BME280 fehlen: Sofortiger Bus-Ausfall!',
    formulaOrValues: 'Standard-Takt: 100 kHz oder 400 kHz · Typische Adressen: OLED 0x3C, BME280 0x76',
    tryAction: {
      label: 'I²C-Bus & Pull-Ups am BME280 testen',
      mode: 'lessons',
      lessonId: 'i2c-bme280',
    },
  },
  {
    id: 'uart-serial',
    term: 'UART / Seriell (TX & RX)',
    shortSubtitle: 'Immer über Kreuz verbinden: TX an RX!',
    icon: '💬',
    category: 'Busse & Signale',
    accentHex: '#fb923c',
    quickAnswer:
      'Direkte Punkt-zu-Punkt-Datenverbindung zwischen zwei Geräten (z. B. ESP32 ↔ GPS-Modul oder LD2490 Radar) mit fester Geschwindigkeit (Baudrate).',
    explanation:
      'TX steht für Transmit (Senden / Mund), RX für Receive (Empfangen / Ohr). Deshalb MUSS TX des Sensors an RX des Mikrocontrollers und RX des Sensors an TX des Mikrocontrollers! Beide Seiten müssen exakt dieselbe Baudrate einstellen (z. B. 9600, 115200 oder 256000 Baud beim LD2490).',
    analogyOrTip:
      'Goldene Eselsbrücke: „Mund (TX) spricht ins Ohr (RX)“ — niemals Mund an Mund verbinden!',
    formulaOrValues: 'Gekreuzt: Sensor TX → Board RX | Sensor RX → Board TX',
    tryAction: {
      label: 'UART am LD2490 24-GHz-Radar ansehen',
      mode: 'lessons',
      lessonId: 'ld2490-radar',
    },
  },
  {
    id: 'spi-bus',
    term: 'SPI-Bus (MOSI, MISO, SCK, CS)',
    shortSubtitle: 'Der Hochgeschwindigkeits-Bus für TFT-Displays & SD-Karten',
    icon: '🚀',
    category: 'Busse & Signale',
    accentHex: '#6366f1',
    quickAnswer:
      'Ein sehr schneller 4-Draht-Bus (oft 10–40 MHz) für große Datenmengen wie Farbdisplays, SD-Karten oder RFID-Leser.',
    explanation:
      'SPI nutzt vier Leitungen: SCK (Takt), MOSI (Master Out → Slave In), MISO (Master In ← Slave Out) und CS/SS (Chip Select: wählt das angesprochene Gerät per LOW aus). Mehrere SPI-Geräte teilen sich SCK/MOSI/MISO und benötigen nur jeweils einen eigenen CS-Pin.',
    analogyOrTip:
      'Faustregel: Wenige Messwerte → I²C (nur 2 Kabel). Schnelles Grafik-Display oder SD-Karte → SPI!',
    formulaOrValues: 'ESP32 VSPI Standard: SCK=18, MISO=19, MOSI=23, CS=5',
  },
  {
    id: 'level-shifter',
    term: 'Pegelwandler (Level Shifter)',
    shortSubtitle: 'Übersetzt sicher zwischen 3,3 V und 5 V',
    icon: '🔄',
    category: 'Busse & Signale',
    accentHex: '#8b5cf6',
    quickAnswer:
      'Ein kleiner Übersetzer-Chip (z. B. 74AHCT125 für WLED oder bidirektionaler BSS138 für I²C), der 3,3-V-Signale sauber auf 5 V anhebt (und umgekehrt).',
    explanation:
      'WS2812B-LED-Streifen laufen mit 5 V und erwarten laut Datenblatt mind. 3,5 V für ein sicheres HIGH-Datensignal. Ein ESP32 liefert aber nur 3,3 V — bei längeren Kabeln flackern oder spinnen die LEDs. Ein 74AHCT125 hebt das 3,3-V-Signal blitzschnell auf saubere 5,0 V an!',
    analogyOrTip:
      'Für WS2812B (800 kHz) unbedingt einen schnellen 74AHCT125 nutzen — langsame I²C-Pegelwandler verschlucken oft das Timing!',
    tryAction: {
      label: 'WLED-Pegelwandler in 3D testen',
      mode: 'lessons',
      lessonId: 'wled-room',
    },
  },

  // ===================== STROM, AKKUS & SICHERHEIT =====================
  {
    id: 'buck-vs-linear',
    term: 'Buck-Wandler vs. Linearregler (LM7805)',
    shortSubtitle: 'Warum Schaltregler 90 % schaffen und Linearregler heiß werden',
    icon: '🌡️',
    category: 'Strom, Akkus & Sicherheit',
    accentHex: '#f97316',
    quickAnswer:
      'Ein Linearregler verheizt überschüssige Spannung direkt als Wärme; ein Step-Down-Buck-Wandler taktet effizient mit ~90 % Wirkungsgrad.',
    explanation:
      'Willst du aus einem 12-V-Netzteil oder 3S-Akku 5 V bei 1 A gewinnen, erzeugt ein LM7805 genau (12 − 5) V × 1 A = 7 W Hitze (nur 42 % Wirkungsgrad!). Ein Step-Down-Buck-Wandler schaltet mit hoher Frequenz über eine Spule und zieht am 12-V-Eingang nur ~0,46 A — er bleibt kühl und verdoppelt deine Akkulaufzeit!',
    analogyOrTip:
      'Linearregler nur für winzige Ströme (< 150 mA) oder kleine Spannungsdifferenzen nutzen — sonst immer einen Buck-Wandler!',
    formulaOrValues: 'P_verlust (Linear) = (U_ein − U_aus) × I_last',
    tryAction: {
      label: 'Buck vs. LM7805 in Lektion 63 vergleichen',
      mode: 'lessons',
      lessonId: 'power-lab-buck-converter',
    },
  },
  {
    id: 'voltage-drop',
    term: 'Spannungsabfall (Voltage Drop) & Power Injection',
    shortSubtitle: 'Warum lange LED-Streifen am Ende gelb oder rot werden',
    icon: '📉',
    category: 'Strom, Akkus & Sicherheit',
    accentHex: '#ef4444',
    quickAnswer:
      'Dünne Kabel und Leiterbahnen haben einen Eigenwiderstand — bei hohem Strom sinkt die Spannung am Ende der Leitung deutlich ab.',
    explanation:
      'Bei einem 5-m-WS2812B-Streifen fließen mehrere Ampere über dünne Kupferbahnen. Am Ende kommen oft nur noch 3,6 V statt 5,0 V an. Da blaue LEDs ~3,0 V und rote nur ~2,0 V brauchen, fällt zuerst Blau aus → Weiß verfärbt sich gelb-orange! Lösung: Dickeres Kabel (AWG 18 statt AWG 26) und beidseitige 5-V-Einspeisung (Power Injection).',
    analogyOrTip:
      'Kleinerer AWG-Wert = dickeres Kabel! AWG 18 (0,82 mm²) hat viel weniger Verlust als dünnes AWG 26 (0,13 mm²).',
    formulaOrValues: 'ΔU = I × R_kabel (Hin- und Rückleitung zählen doppelt!)',
    tryAction: {
      label: 'Voltage Drop & Power Injection in 3D sehen',
      mode: 'lessons',
      lessonId: 'wled-long',
    },
  },
  {
    id: 'cc-cv-psu',
    term: 'CC / CV (Konstantstrom & Konstantspannung)',
    shortSubtitle: 'Wie dich ein Labornetzteil vor Rauchzeichen schützt',
    icon: '🎛️',
    category: 'Strom, Akkus & Sicherheit',
    accentHex: '#22c55e',
    quickAnswer:
      'Im CV-Modus hält das Netzteil deine Zielspannung fest; überschreitet die Schaltung dein Stromlimit, regelt es im CC-Modus automatisch herunter.',
    explanation:
      'Vor dem ersten Einschalten einer neuen selbst gebauten Platine stellst du am Labornetzteil z. B. 5,0 V und 0,3 A Stromgrenze (CC) ein. Hast du versehentlich einen Kurzschluss gelötet, springt das Netzteil sofort auf „CC“, begrenzt den Strom auf harmlose 0,3 A und rettet deine teuren Chips vor dem Durchbrennen!',
    analogyOrTip:
      'Auch Lithium-Akkus (18650 / LiPo) werden nach exakt diesem CC/CV-Verfahren geladen (erst konstanter Strom, am Ende konstante 4,20 V).',
    tryAction: {
      label: 'Labornetzteil mit CC/CV testen',
      mode: 'lessons',
      lessonId: 'power-lab-bench-psu',
    },
  },
  {
    id: 'battery-sp',
    term: 'Akkus: 1S–4S, mAh & C-Rate',
    shortSubtitle: 'Was bedeuten 3S 18650, 3000 mAh und Entladeschluss?',
    icon: '🪫',
    category: 'Strom, Akkus & Sicherheit',
    accentHex: '#10b981',
    quickAnswer:
      '„S“ (seriell) addiert die Spannung (1S = 3,7 V, 3S = 11,1 V), „P“ (parallel) addiert die Kapazität (mAh). Niemals unter 3,0 V/Zelle tiefentladen!',
    explanation:
      'Eine Li-Ion-18650- oder LiPo-Zelle hat voll 4,2 V, nominal 3,7 V und leer ~3,0–3,2 V. Ein 3000-mAh-Akku kann theoretisch 3 Stunden lang 1000 mA (1 A) oder 30 Stunden lang 100 mA liefern. Für sicheren Betrieb immer ein BMS (Battery Management System) oder eine Schutzschaltung gegen Kurzschluss, Überladung und Tiefentladung verwenden!',
    analogyOrTip:
      'Laufzeit-Faustformel: Stunden ≈ (Kapazität in mAh × 0,85) / Laststrom in mA.',
    formulaOrValues: '1S: 3,0–4,2 V · 2S: 6,0–8,4 V · 3S: 9,0–12,6 V · 4S: 12,0–16,8 V',
    tryAction: {
      label: '18650-Pack (1S–4S) in 3D konfigurieren',
      mode: 'lessons',
      lessonId: 'power-lab-liion-18650',
    },
  },
  {
    id: 'strapping-pins',
    term: 'Strapping-Pins (ESP32 Boot-Fallen)',
    shortSubtitle: 'Warum dein ESP32 manchmal plötzlich nicht startet',
    icon: '⚠️',
    category: 'Strom, Akkus & Sicherheit',
    accentHex: '#f59e0b',
    quickAnswer:
      'Bestimmte ESP32-Pins (z. B. GPIO 0, 2, 12, 15) werden beim Einschalten kurz ausgelesen, um Boot-Modus und Flash-Spannung festzulegen.',
    explanation:
      'Zieht z. B. ein Sensor oder Pull-Up den GPIO 12 beim Booten des klassischen ESP32 auf HIGH, schaltet der Chip die interne Flash-Spannung falsch um und startet nicht! Zieht etwas GPIO 0 auf LOW, landet der ESP32 im Flash-Modus statt dein Programm auszuführen. Nutze für externe Bauteile zuerst „sichere“ Pins wie GPIO 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33.',
    analogyOrTip:
      'Fahre im 3D-Viewport über jeden Pin deines gewählten Boards: Unser Pin-Hover-Tooltip warnt dich automatisch vor Strapping- & Input-Only-Pins!',
  },
  {
    id: 'cold-solder-joint',
    term: 'Kalte Lötstelle & Flussmittel',
    shortSubtitle: 'Woran du eine perfekte Lötstelle sofort erkennst',
    icon: '🔥',
    category: 'Strom, Akkus & Sicherheit',
    accentHex: '#f97316',
    quickAnswer:
      'Eine perfekte Lötstelle ist glänzend, glatt und vulkanförmig nach innen gewölbt — eine matte Kugel ist oft eine „kalte“ Wackelkontakt-Lötstelle.',
    explanation:
      'Wird nur das Lötzinn statt Pad UND Bauteil-Beinchen erhitzt (oder das Teil beim Abkühlen bewegt), benetzt das Zinn das Kupfer nicht richtig. Flussmittel löst unsichtbare Oxidschichten und sorgt dafür, dass das flüssige Zinn sauber in den Spalt fließt. Ideal sind ~350 °C bei bleifreiem Zinn und 2–3 Sekunden Kontaktzeit.',
    analogyOrTip:
      'Übe das perfekte Timing, Temperatur und Flussmittel direkt in unserem interaktiven Löt-Trainer!',
    tryAction: {
      label: 'Im 🔥 Löt-Trainer üben',
      mode: 'soldering',
    },
  },
];
