import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { getEspBoardById } from '../engine/BoardCatalog';
import { formatResistance } from '../engine/ComponentRegistry';
import type {
  BoardPinAssignment,
  CircuitParameters,
  EspBoardId,
  HoverPartInfo,
  SimulationResult,
  ThemeMode,
} from '../engine/types';
import { formatEndpointLabel, getCatalogItem, normalizePartRow } from '../sandbox/SandboxEngine';
import type {
  HighlightMarker,
  SandboxPartType,
  SandboxSimSummary,
  SandboxState,
  SandboxToolId,
  WireEndpoint,
} from '../sandbox/SandboxTypes';
import { BreadboardMesh } from './components/BreadboardMesh';
import { ButtonMesh } from './components/ButtonMesh';
import { Esp32Mesh } from './components/Esp32Mesh';
import { JumperWireMesh } from './components/JumperWireMesh';
import { Ld2490Mesh } from './components/Ld2490Mesh';
import { LdrMesh } from './components/LdrMesh';
import { LedMesh } from './components/LedMesh';
import { ResistorMesh } from './components/ResistorMesh';
import {
  Bme280Mesh,
  BuzzerMesh,
  CapacitorMesh,
  MosfetMesh,
  RelayModuleMesh,
  RgbLedMesh,
  ServoMesh,
  UltrasonicMesh,
} from './components/SpecialtyModules';
import { LevelShifterMesh, WledStripMesh } from './components/WledStripMesh';
import { MeanWellPowerMesh, WagoClampMesh } from './components/PowerAndWiringMeshes';
import { CoolingFanMesh, OledDisplayMesh } from './components/PiPeripheralsMesh';
import { createSandboxExtraMesh, type AnimatedSandboxExtra } from './components/SandboxExtraMeshes';

export interface SceneCallbacks {
  onButtonPressChange?: (pressed: boolean) => void;
  onHoverPartChange?: (info: HoverPartInfo | null, clientX: number, clientY: number) => void;
  onTogglePartRemoved?: (partId: string) => void;
  onSandboxEndpointClick?: (endpoint: WireEndpoint) => void;
  onSandboxDeleteItem?: (kind: 'part' | 'wire', id: string) => void;
  onSandboxPickPart?: (partId: string) => void;
}

interface SandboxPartHandle {
  type: string;
  led?: LedMesh;
  rgbLed?: RgbLedMesh;
  button?: ButtonMesh;
  ldr?: LdrMesh;
  bme280?: Bme280Mesh;
  hcsr04?: UltrasonicMesh;
  ld2490?: Ld2490Mesh;
  oled?: OledDisplayMesh;
  servo?: ServoMesh;
  buzzer?: BuzzerMesh;
  relay?: RelayModuleMesh;
  fan?: CoolingFanMesh;
  extra?: AnimatedSandboxExtra;
}

function createWorkbenchTexture(theme: ThemeMode): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = theme === 'dark' ? '#0f172a' : '#e6edf6';
    ctx.fillRect(0, 0, 1024, 1024);

    ctx.strokeStyle =
      theme === 'dark' ? 'rgba(51, 65, 85, 0.35)' : 'rgba(148, 163, 184, 0.32)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 1024; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 1024);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(1024, i);
      ctx.stroke();
    }

    ctx.strokeStyle =
      theme === 'dark' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(14, 116, 144, 0.16)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 1024; i += 128) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 1024);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(1024, i);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.anisotropy = 8;
  return tex;
}

function tagHoverable(obj: THREE.Object3D, info: HoverPartInfo): void {
  obj.userData.hoverInfo = info;
  obj.traverse((child) => {
    child.userData.hoverInfo = info;
  });
}

function applyRemovedGhostEffect(obj: THREE.Object3D, removed: boolean): void {
  if (!removed) return;
  // Visually lift the removed component above the board & make it semi-transparent ghosted
  obj.position.y += 0.55;
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const cloned = mats.map((m) => {
        const c = m.clone() as THREE.MeshStandardMaterial;
        c.transparent = true;
        c.opacity = 0.24;
        if ('emissive' in c && c.emissive) {
          c.emissive = new THREE.Color('#f59e0b');
          c.emissiveIntensity = 0.35;
        }
        return c;
      });
      mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0];
    }
  });
}

export class SceneManager {
  private readonly container: HTMLElement;
  private readonly callbacks: SceneCallbacks;

  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly resizeObserver: ResizeObserver;

  private hemiLight!: THREE.HemisphereLight;
  private keyLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private floorMat!: THREE.MeshStandardMaterial;
  private esdMat!: THREE.MeshStandardMaterial;
  private darkFloorTex!: THREE.CanvasTexture;
  private lightFloorTex!: THREE.CanvasTexture;
  private currentTheme: ThemeMode = 'dark';
  private roomDimmed = false;

  private readonly breadboard: BreadboardMesh;
  private esp32: Esp32Mesh;
  private currentBoardId: EspBoardId = 'esp32-devkit-v1';
  private readonly dynamicCircuitGroup = new THREE.Group();

  // Dynamic component handles
  private activeLed: LedMesh | null = null;
  private activeStatusLed: LedMesh | null = null;
  private activeRgbLed: RgbLedMesh | null = null;
  private activeResistor1: ResistorMesh | null = null;
  private activeResistor2: ResistorMesh | null = null;
  private activeButton: ButtonMesh | null = null;
  private activeLdr: LdrMesh | null = null;
  private activeCapacitor: CapacitorMesh | null = null;
  private activeBme280: Bme280Mesh | null = null;
  private activeUltrasonic: UltrasonicMesh | null = null;
  private activeLd2490: Ld2490Mesh | null = null;
  private activeRelay: RelayModuleMesh | null = null;
  private activeServo: ServoMesh | null = null;
  private activeBuzzer: BuzzerMesh | null = null;
  private activeWledStrip: WledStripMesh | null = null;
  private activeMeanWell: MeanWellPowerMesh | null = null;
  private activeTrafficRed: LedMesh | null = null;
  private activeTrafficYellow: LedMesh | null = null;
  private activeTrafficGreen: LedMesh | null = null;
  private activeCoolingFan: CoolingFanMesh | null = null;
  private activeOled: OledDisplayMesh | null = null;

  // Sandbox & Guided Builder state
  private sandboxModeActive = false;
  private sandboxTool: SandboxToolId = 'place';
  private selectedMovePartId: string | null = null;
  private hoverGhostPartType: SandboxPartType | null = null;
  private lastHoverGhostKey = '';
  private readonly markerGroup = new THREE.Group();
  private readonly boardPinPadsGroup = new THREE.Group();
  private readonly hoverGhostGroup = new THREE.Group();
  private readonly hoverSnapRing: THREE.Mesh;
  private readonly sandboxPartHandles = new Map<string, SandboxPartHandle>();
  private lastMarkerKey = '';
  private lastSandboxElapsed = 0;

  private targetServoDeg = 90;
  private currentLayoutKey = '';

  // Raycasting & click-vs-drag detection
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2();
  private isPointerHoldingButton = false;
  private pointerDownPos: { x: number; y: number } | null = null;

  private cameraAnimTargetPos: THREE.Vector3 | null = null;
  private cameraAnimLookAt: THREE.Vector3 | null = null;

  private rafId = 0;
  private lastFrameTime = performance.now();
  private disposed = false;
  private paused = false;
  private contextLost = false;

  constructor(container: HTMLElement, callbacks: SceneCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0a101d');
    this.scene.fog = new THREE.FogExp2('#0a101d', 0.015);

    const initW = Math.max(container.clientWidth, 320);
    const initH = Math.max(container.clientHeight, 240);

    this.camera = new THREE.PerspectiveCamera(40, initW / initH, 0.1, 120);
    this.camera.position.set(1.6, 14.4, 18.8);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(initW, initH, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 5.5;
    this.controls.maxDistance = 34;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.06;
    this.controls.target.set(0.0, 0.5, 0.15);
    this.controls.update();

    this.controls.addEventListener('start', () => {
      this.cameraAnimTargetPos = null;
      this.cameraAnimLookAt = null;
    });

    this.setupLighting();
    this.setupWorkbench();

    this.esp32 = new Esp32Mesh(getEspBoardById(this.currentBoardId));
    this.esp32.group.position.set(-5.0, 0, 0);
    this.tagEspBoard();
    this.scene.add(this.esp32.group);

    this.breadboard = new BreadboardMesh();
    this.breadboard.group.position.set(2.0, 0, 0);
    tagHoverable(this.breadboard.group, {
      partId: 'breadboard',
      name: 'Steckbrett (400 Kontakte)',
      categoryLabel: 'Basis-Board',
      description:
        'Lötfreies Steckbrett: Jede 5er-Spalte (a–e und f–j) ist intern leitend verbunden. Oben und unten verlaufen durchgehende +3,3V- und GND-Schienen.',
      specLine: 'Rastermaß 2,54 mm · 30 Spalten',
      removable: false,
      isRemoved: false,
    });
    this.scene.add(this.breadboard.group);

    this.dynamicCircuitGroup.name = 'Dynamic_Circuit';
    this.scene.add(this.dynamicCircuitGroup);

    this.markerGroup.name = 'Guided_Markers';
    this.scene.add(this.markerGroup);

    this.boardPinPadsGroup.name = 'Sandbox_Board_Pins';
    this.scene.add(this.boardPinPadsGroup);

    this.hoverGhostGroup.name = 'Sandbox_Hover_Ghost';
    this.hoverGhostGroup.visible = false;
    this.scene.add(this.hoverGhostGroup);

    this.hoverSnapRing = new THREE.Mesh(
      new THREE.RingGeometry(0.11, 0.17, 24),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      }),
    );
    this.hoverSnapRing.rotation.x = -Math.PI / 2;
    this.hoverSnapRing.visible = false;
    this.scene.add(this.hoverSnapRing);

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.handleResize(width, height);
      }
    });
    this.resizeObserver.observe(this.container);

    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.addEventListener('pointerleave', this.onPointerLeave);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost, false);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored, false);
    window.addEventListener('pointerup', this.onPointerUp);

    this.startRenderLoop();
  }

  private readonly onContextLost = (e: Event): void => {
    e.preventDefault();
    this.contextLost = true;
  };

  private readonly onContextRestored = (): void => {
    this.contextLost = false;
    this.applyEnvironmentLighting();
    this.forceResize();
  };

  public setPaused(paused: boolean): void {
    this.paused = paused;
    if (!paused) {
      requestAnimationFrame(() => this.forceResize());
    }
  }

  public forceResize(): void {
    if (this.disposed) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w > 0 && h > 0) {
      this.handleResize(w, h);
    }
  }

  private tagEspBoard(): void {
    const b = this.esp32.spec;
    tagHoverable(this.esp32.group, {
      partId: 'esp-mcu',
      name: b.name,
      categoryLabel: b.isMini ? 'Mini-Mikrocontroller' : 'Mikrocontroller',
      description: `${b.architecture}. Steuert alle digitalen GPIOs, PWM-Timer, I²C-, UART-Schnittstellen und den 12-Bit-ADC mit 3,3 V Logikpegel.`,
      specLine: `${b.wireless} · ${b.flash}`,
      removable: false,
      isRemoved: false,
    });
  }

  private setupLighting(): void {
    this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 0.8);
    this.hemiLight.position.set(0, 18, 0);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfff8ed, 1.55);
    this.keyLight.position.set(9, 16, 11);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 45;
    this.keyLight.shadow.camera.left = -14;
    this.keyLight.shadow.camera.right = 14;
    this.keyLight.shadow.camera.top = 12;
    this.keyLight.shadow.camera.bottom = -12;
    this.keyLight.shadow.bias = -0.0005;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0x38bdf8, 0.56);
    this.rimLight.position.set(-12, 9, -10);
    this.scene.add(this.rimLight);
  }

  private setupWorkbench(): void {
    this.darkFloorTex = createWorkbenchTexture('dark');
    this.lightFloorTex = createWorkbenchTexture('light');

    this.floorMat = new THREE.MeshStandardMaterial({
      map: this.darkFloorTex,
      roughness: 0.85,
      metalness: 0.08,
    });
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(72, 72), this.floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);

    this.esdMat = new THREE.MeshStandardMaterial({
      color: 0x131c31,
      roughness: 0.78,
      metalness: 0.05,
    });
    const esdPad = new THREE.Mesh(new THREE.BoxGeometry(17.2, 0.05, 9.6), this.esdMat);
    esdPad.position.set(-0.4, 0.025, 0.15);
    esdPad.receiveShadow = true;
    this.scene.add(esdPad);
  }

  public setTheme(theme: ThemeMode): void {
    this.currentTheme = theme;
    this.applyEnvironmentLighting();
  }

  public setRoomDimmed(dimmed: boolean): void {
    this.roomDimmed = dimmed;
    this.applyEnvironmentLighting();
  }

  private applyEnvironmentLighting(): void {
    if (this.roomDimmed) {
      // Darkened studio room so LEDs, WLED strips, traffic lights & OLED glow vividly!
      this.scene.background = new THREE.Color('#02040a');
      this.scene.fog = new THREE.FogExp2('#02040a', 0.018);
      this.renderer.setClearColor('#02040a', 1);
      this.container.style.backgroundColor = '#02040a';
      this.floorMat.map = this.darkFloorTex;
      this.floorMat.needsUpdate = true;
      this.esdMat.color.setHex(0x090d16);
      this.hemiLight.intensity = 0.14;
      this.hemiLight.groundColor.setHex(0x020617);
      this.keyLight.intensity = 0.22;
      this.rimLight.intensity = 0.12;
      this.renderer.toneMappingExposure = 1.28;
      return;
    }

    if (this.currentTheme === 'light') {
      this.scene.background = new THREE.Color('#e6edf6');
      this.scene.fog = new THREE.FogExp2('#e6edf6', 0.011);
      this.renderer.setClearColor('#e6edf6', 1);
      this.container.style.backgroundColor = '#e6edf6';
      this.floorMat.map = this.lightFloorTex;
      this.floorMat.needsUpdate = true;
      this.esdMat.color.setHex(0xd4dee9);
      this.hemiLight.intensity = 1.05;
      this.hemiLight.groundColor.setHex(0xcbd5e1);
      this.keyLight.intensity = 1.35;
      this.rimLight.intensity = 0.42;
      this.renderer.toneMappingExposure = 1.02;
    } else {
      this.scene.background = new THREE.Color('#0a101d');
      this.scene.fog = new THREE.FogExp2('#0a101d', 0.015);
      this.renderer.setClearColor('#0a101d', 1);
      this.container.style.backgroundColor = '#0a101d';
      this.floorMat.map = this.darkFloorTex;
      this.floorMat.needsUpdate = true;
      this.esdMat.color.setHex(0x131c31);
      this.hemiLight.intensity = 0.8;
      this.hemiLight.groundColor.setHex(0x0f172a);
      this.keyLight.intensity = 1.55;
      this.rimLight.intensity = 0.56;
      this.renderer.toneMappingExposure = 1.12;
    }
  }

  private handleResize(width: number, height: number): void {
    if (this.disposed || width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.renderer.render(this.scene, this.camera);
  }

  public focusCamera(position: [number, number, number], target: [number, number, number]): void {
    this.cameraAnimTargetPos = new THREE.Vector3(...position);
    this.cameraAnimLookAt = new THREE.Vector3(...target);
  }

  private swapEspBoardIfNeeded(boardId: EspBoardId): boolean {
    if (boardId === this.currentBoardId) return false;
    this.scene.remove(this.esp32.group);
    this.currentBoardId = boardId;
    const spec = getEspBoardById(boardId);
    this.esp32 = new Esp32Mesh(spec);
    const xPos = spec.family === 'raspberry-pi-sbc' && !spec.isMini ? -5.55 : spec.isMini ? -4.4 : -5.0;
    this.esp32.group.position.set(xPos, 0, 0);
    this.tagEspBoard();
    this.scene.add(this.esp32.group);
    return true;
  }

  public syncSimulation(params: CircuitParameters, result: SimulationResult): void {
    this.sandboxModeActive = false;
    this.boardPinPadsGroup.visible = false;
    this.markerGroup.visible = false;
    this.hoverSnapRing.visible = false;
    this.hoverGhostGroup.visible = false;

    const boardChanged = this.swapEspBoardIfNeeded(params.boardId);
    const removedKey = [...params.removedParts].sort().join(',');
    const wledBucket = params.topology === 'wled-compact' ? Math.round(params.wledLedCount / 6) : 0;
    const layoutKey = [
      params.boardId,
      params.topology,
      params.withoutBreadboard ? 'nobread' : 'bread',
      params.pullMode,
      params.dividerMode,
      params.i2cPullupEnabled,
      params.wledPowerInjection,
      params.wledPowerSource,
      Math.round(params.wledBatteryCapacityMah / 1000),
      params.psuMode,
      params.psuRegulatorType,
      Math.round(params.psuBatteryCapacityMah / 1000),
      wledBucket,
      removedKey,
    ].join(':');

    if (boardChanged || layoutKey !== this.currentLayoutKey) {
      this.rebuildCircuitLayout(params);
      this.currentLayoutKey = layoutKey;
    }

    this.esp32.setStatusLed(
      result.statusLedOn,
      params.topology === 'rgb-led' ? result.rgbHex : undefined,
    );

    switch (params.topology) {
      case 'led-resistor':
        this.activeResistor1?.setResistance(params.resistorOhms);
        this.activeLed?.updateVisuals(
          params.ledColor,
          result.ledBrightnessPercent,
          result.isOvercurrent,
          result.isCriticalOvercurrent,
          result.timestamp,
        );
        break;
      case 'button-pull':
        this.activeButton?.setPressed(params.buttonPressed);
        this.activeResistor1?.setResistance(params.pullResistorOhms);
        this.activeStatusLed?.updateVisuals('blue', result.statusLedOn ? 92 : 0, false, false, result.timestamp);
        break;
      case 'voltage-divider':
        this.activeResistor1?.setResistance(params.r1Ohms);
        if (params.dividerMode === 'resistors') {
          this.activeResistor2?.setResistance(params.r2Ohms);
        } else {
          this.activeLdr?.setLightLevel(params.lightLevelPercent);
        }
        this.activeStatusLed?.updateVisuals('green', result.adcPercent, false, false, result.timestamp);
        break;
      case 'pwm-dimmer':
        this.activeLed?.updateVisuals('blue', result.ledBrightnessPercent, false, false, result.timestamp);
        break;
      case 'rgb-led':
        this.activeRgbLed?.updateRgb(result.rgbHex, result.ledBrightnessPercent);
        break;
      case 'rc-lowpass':
        this.activeResistor1?.setResistance(params.rcResistorOhms);
        this.activeCapacitor?.setChargeRatio(result.capacitorChargeRatio);
        this.activeStatusLed?.updateVisuals('yellow', result.capacitorChargeRatio * 100, false, false, result.timestamp);
        break;
      case 'mosfet-driver':
        this.activeLed?.updateVisuals('white', result.ledBrightnessPercent, false, false, result.timestamp);
        break;
      case 'i2c-bme280':
        this.activeBme280?.setActive(params.i2cPullupEnabled && result.statusLedOn);
        break;
      case 'ultrasonic-hcsr04':
        this.activeUltrasonic?.updateWave(params.ultrasonicDistanceCm, result.timestamp);
        this.activeStatusLed?.updateVisuals('red', result.statusLedOn ? 95 : 0, false, false, result.timestamp);
        break;
      case 'ld2490-radar':
        this.activeLd2490?.updateVisuals(
          result.radarDetected,
          params.ld2490TargetPresent,
          params.ld2490TargetDistanceM,
          params.ld2490TargetMoving,
          result.timestamp,
        );
        this.activeStatusLed?.updateVisuals('green', result.statusLedOn ? 100 : 0, false, false, result.timestamp);
        break;
      case 'relay-flyback':
        this.activeRelay?.updateState(
          result.relayClosed,
          params.relayFlybackDiode && !params.removedParts.includes('flyback-diode'),
          result.kickbackSpikeActive,
        );
        this.activeStatusLed?.updateVisuals('yellow', result.relayClosed ? 100 : 0, false, false, result.timestamp);
        break;
      case 'servo-pwm':
        this.targetServoDeg = result.servoAngleDeg;
        break;
      case 'piezo-buzzer':
        this.activeBuzzer?.updateSound(result.buzzerActive, params.buzzerFrequencyHz, result.timestamp);
        break;
      case 'wled-compact':
      case 'wled-medium':
      case 'wled-long-injection':
        this.activeWledStrip?.updateEffect(
          params.wledEffect,
          result.wledEffectiveBrightnessPct,
          result.wledVoltageDropRatio,
          result.wledDataGlitch,
          result.timestamp,
        );
        this.activeMeanWell?.updateBatteryVisuals(
          params.wledBatterySocPct,
          !params.removedParts.includes('meanwell-power'),
        );
        break;
      case 'pi-traffic-light':
        this.activeTrafficRed?.updateVisuals('red', result.piTrafficLeds.red ? 100 : 0, false, false, result.timestamp);
        this.activeTrafficYellow?.updateVisuals('yellow', result.piTrafficLeds.yellow ? 100 : 0, false, false, result.timestamp);
        this.activeTrafficGreen?.updateVisuals('green', result.piTrafficLeds.green ? 100 : 0, false, false, result.timestamp);
        break;
      case 'pi-fan-pwm':
        this.activeCoolingFan?.setSpeed(result.piFanSpeedPct);
        break;
      case 'pi-oled-i2c':
        this.activeOled?.updateScreen(result.piOledLines, params.piOledContrastPct);
        break;
      case 'power-supply-lab':
        this.activeMeanWell?.updateBatteryVisuals(
          params.psuBatterySocPct,
          !params.removedParts.includes('meanwell-power'),
        );
        this.activeLed?.updateVisuals(
          result.isCriticalOvercurrent ? 'red' : result.isOvercurrent ? 'yellow' : 'green',
          result.ledBrightnessPercent,
          result.isOvercurrent,
          result.isCriticalOvercurrent,
          result.timestamp,
        );
        this.activeOled?.updateScreen(
          params.removedParts.includes('meanwell-power')
            ? []
            : [
                params.psuMode.toUpperCase(),
                `U = ${result.nodeVoltage.toFixed(2)} V`,
                `I = ${Math.round(result.currentMa)} mA`,
                result.wledBatteryRuntimeHours > 0
                  ? `BAT: ${result.wledBatteryRuntimeHours.toFixed(1)}h`
                  : `P = ${(result.powerMw / 1000).toFixed(2)} W`,
              ],
          95,
        );
        break;
    }
  }

  private clearDynamicCircuit(): void {
    while (this.dynamicCircuitGroup.children.length > 0) {
      this.dynamicCircuitGroup.remove(this.dynamicCircuitGroup.children[0]);
    }
    this.activeLed = null;
    this.activeStatusLed = null;
    this.activeRgbLed = null;
    this.activeResistor1 = null;
    this.activeResistor2 = null;
    this.activeButton = null;
    this.activeLdr = null;
    this.activeCapacitor = null;
    this.activeBme280 = null;
    this.activeUltrasonic = null;
    this.activeLd2490 = null;
    this.activeRelay = null;
    this.activeServo = null;
    this.activeBuzzer = null;
    this.activeWledStrip = null;
    this.activeMeanWell = null;
    this.activeTrafficRed = null;
    this.activeTrafficYellow = null;
    this.activeTrafficGreen = null;
    this.activeCoolingFan = null;
    this.activeOled = null;
  }

  private addWire(
    start: THREE.Vector3,
    end: THREE.Vector3,
    color: number,
    arcHeight = 1.4,
    lateralOffset = 0,
    hoverInfo?: HoverPartInfo,
  ): THREE.Group {
    const wire = new JumperWireMesh({ start, end, color, arcHeight, lateralOffset });
    if (hoverInfo) {
      tagHoverable(wire.group, hoverInfo);
      applyRemovedGhostEffect(wire.group, hoverInfo.isRemoved);
    }
    this.dynamicCircuitGroup.add(wire.group);
    return wire.group;
  }

  private registerPart(
    obj: THREE.Object3D,
    info: HoverPartInfo,
  ): void {
    tagHoverable(obj, info);
    applyRemovedGhostEffect(obj, info.isRemoved);
    this.dynamicCircuitGroup.add(obj);
  }

  private rebuildCircuitLayout(params: CircuitParameters): void {
    this.clearDynamicCircuit();

    const noBreadboard = params.withoutBreadboard;
    this.breadboard.group.visible = !noBreadboard;

    let wagoPos: WagoClampMesh | null = null;
    let wagoGnd: WagoClampMesh | null = null;
    let wagoPosPort = 0;
    let wagoGndPort = 0;

    if (noBreadboard) {
      // Mount two authentic WAGO 221-415 lever clamps on the ESD mat for direct breadboard-free wiring!
      wagoPos = new WagoClampMesh(0xef4444, 5);
      wagoPos.group.position.set(0.4, 0.05, -2.25);
      this.registerPart(wagoPos.group, {
        partId: 'wago-pos',
        name: 'WAGO 221-415 Verteilerklemme (+V)',
        categoryLabel: 'Direktverdrahtung',
        description: 'Werkzeuglose Hebelklemme für den fertigen Aufbau ohne Steckbrett: verteilt +3,3 V / +5 V sicher auf alle Verbraucher (bis 32 A).',
        specLine: 'Ohne Breadboard · 5-fach Hebelklemme',
        removable: false,
        isRemoved: false,
      });

      wagoGnd = new WagoClampMesh(0x1e293b, 5);
      wagoGnd.group.position.set(3.4, 0.05, -2.25);
      this.registerPart(wagoGnd.group, {
        partId: 'wago-gnd',
        name: 'WAGO 221-415 Masseklemme (GND)',
        categoryLabel: 'Direktverdrahtung',
        description: 'Verbindet alle Masseleitungen (ESP, Netzteil/Akku, Sensoren und LED-Streifen) sternförmig ohne Steckbrett.',
        specLine: 'Ohne Breadboard · Gemeinsame Masse (0 V)',
        removable: false,
        isRemoved: false,
      });

      // Subtle soldered Perfboard/wire-splice rail markers under direct-mounted parts
      const spliceBar = new THREE.Mesh(
        new THREE.BoxGeometry(7.8, 0.04, 2.8),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75, transparent: true, opacity: 0.32 }),
      );
      spliceBar.position.set(2.0, 0.06, 0.2);
      this.dynamicCircuitGroup.add(spliceBar);
    }

    const hole = (col: number, row: string): THREE.Vector3 => {
      if (noBreadboard && wagoPos && wagoGnd) {
        if (row === '+top' || row === '+bot') {
          return wagoPos.getPortWorld((wagoPosPort++) % 5);
        }
        if (row === '-top' || row === '-bot') {
          return wagoGnd.getPortWorld((wagoGndPort++) % 5);
        }
        const p = this.breadboard.getWorldHolePosition(col, row);
        p.y = 0.1; // sit directly on desk/splice mat when breadboard is hidden
        return p;
      }
      return this.breadboard.getWorldHolePosition(col, row);
    };

    const pin = (name: string) => this.esp32.getWorldPinPosition(name);
    const rolePin = (role: Parameters<Esp32Mesh['getWorldRolePin']>[0]) =>
      this.esp32.getWorldRolePin(role);
    const isRem = (id: string) => params.removedParts.includes(id);

    // Common power rails
    this.addWire(pin('3V3'), hole(2, '+top'), 0xef4444, 1.85, -0.35, {
      partId: 'wire-vcc',
      name: 'Versorgungsleitung (+3,3 V / +5 V)',
      categoryLabel: 'Jumperkabel',
      description: 'Versorgt die rote Plus-Schiene des Steckbretts mit der Betriebsspannung.',
      specLine: 'Rot = Plus-Schiene',
      removable: false,
      isRemoved: false,
    });
    this.addWire(pin('GND'), hole(2, '-top'), 0x1e293b, 2.15, -0.65, {
      partId: 'wire-gnd',
      name: 'Masseleitung (GND)',
      categoryLabel: 'Jumperkabel',
      description: 'Gemeinsamer Bezugspunkt (0 V) zwischen Mikrocontroller und allen Bauteilen auf dem Steckbrett.',
      specLine: 'Schwarz = Masse (0 V)',
      removable: false,
      isRemoved: false,
    });

    switch (params.topology) {
      case 'led-resistor': {
        this.addWire(rolePin('outA'), hole(8, 'f'), 0x38bdf8, 1.9, 0.35);
        this.activeResistor1 = new ResistorMesh(hole(8, 'h'), hole(14, 'h'), params.resistorOhms);
        this.registerPart(this.activeResistor1.group, {
          partId: 'resistor',
          name: `Vorwiderstand R1 (${formatResistance(params.resistorOhms)})`,
          categoryLabel: 'Passives Bauteil',
          description: 'Begrenzt den Strom durch die LED nach dem Ohmschen Gesetz I = (3,3 V − Vf) / R. Farbringe passen sich live an.',
          specLine: 'Klicken zum Entfernen / Einstecken',
          removable: true,
          isRemoved: isRem('resistor'),
        });

        this.activeLed = new LedMesh(hole(14, 'g'), hole(17, 'g'));
        this.registerPart(this.activeLed.group, {
          partId: 'led',
          name: '5mm Standard-LED',
          categoryLabel: 'Aktives Bauteil',
          description: 'Leuchtdiode mit fester Durchlassspannung (Vf). Leuchtet, sobald ein Vorwärtsstrom durch Anode (+) nach Kathode (−) fließt.',
          specLine: 'Nennstrom: 20 mA · Klicken zum Entfernen',
          removable: true,
          isRemoved: isRem('led'),
        });
        this.addWire(hole(17, 'j'), hole(17, '-top'), 0x1e293b, 0.85, 0);
        break;
      }

      case 'button-pull': {
        const btnCenter = hole(12, 'f').lerp(hole(12, 'e'), 0.5);
        this.activeButton = new ButtonMesh(btnCenter);
        this.registerPart(this.activeButton.group, {
          partId: 'button',
          name: 'Kurzhub-Taster (SPST-NO)',
          categoryLabel: 'Eingabe-Bauteil',
          description: 'Schließer-Taster: Verbindet im gedrückten Zustand den GPIO-Eingang mit 3,3 V (Pull-Down) oder GND (Pull-Up). Gedrückt halten zum Testen!',
          specLine: 'Klicken = Drücken · Leertaste aktiv',
          removable: false,
          isRemoved: isRem('button'),
        });

        this.addWire(rolePin('inputA'), hole(13, 'h'), 0x38bdf8, 2.05, 0.45);
        if (params.pullMode === 'pull-down' || params.pullMode === 'pull-up') {
          this.addWire(
            hole(11, 'j'),
            hole(11, params.pullMode === 'pull-down' ? '+top' : '-top'),
            params.pullMode === 'pull-down' ? 0xef4444 : 0x1e293b,
            0.9,
            0,
          );
          this.activeResistor1 = new ResistorMesh(hole(13, 'g'), hole(19, 'g'), params.pullResistorOhms);
          this.registerPart(this.activeResistor1.group, {
            partId: 'pull-resistor',
            name: `${params.pullMode === 'pull-down' ? 'Pull-Down' : 'Pull-Up'}-Widerstand (${formatResistance(params.pullResistorOhms)})`,
            categoryLabel: 'Passives Bauteil',
            description: 'Hält den offenen GPIO-Eingang auf einem definierten Pegel und verhindert 50-Hz-Störrauschen (Floating).',
            specLine: 'Klicken zum Entfernen → 50-Hz-Floating testen!',
            removable: true,
            isRemoved: isRem('pull-resistor'),
          });
          this.addWire(
            hole(19, 'j'),
            hole(19, params.pullMode === 'pull-down' ? '-top' : '+top'),
            params.pullMode === 'pull-down' ? 0x1e293b : 0xef4444,
            0.9,
            0,
          );
        } else {
          this.addWire(hole(11, 'j'), hole(11, '+top'), 0xef4444, 0.9, 0);
        }

        this.addWire(rolePin('outB'), hole(23, 'd'), 0xa855f7, 2.25, 0.9);
        this.dynamicCircuitGroup.add(new ResistorMesh(hole(23, 'c'), hole(26, 'c'), 220).group);
        this.activeStatusLed = new LedMesh(hole(26, 'e'), hole(28, 'e'));
        this.registerPart(this.activeStatusLed.group, {
          partId: 'status-led',
          name: 'GPIO-Status-LED',
          categoryLabel: 'Indikator',
          description: 'Spiegelt live den vom ESP32 gelesenen digitalen Zustand des Taster-Pins wider. Flackert bei Floating!',
          specLine: 'Zeigt digitalRead() in Echtzeit',
          removable: false,
          isRemoved: false,
        });
        this.addWire(hole(28, 'a'), hole(28, '-bot'), 0x1e293b, 0.75, 0);
        this.addWire(hole(29, '-top'), hole(29, '-bot'), 0x1e293b, 1.15, 0.25);
        break;
      }

      case 'voltage-divider': {
        this.addWire(hole(8, 'j'), hole(8, '+top'), 0xef4444, 0.85, 0);
        this.activeResistor1 = new ResistorMesh(hole(8, 'h'), hole(14, 'h'), params.r1Ohms);
        this.registerPart(this.activeResistor1.group, {
          partId: 'r1',
          name: `Oberer Widerstand R1 (${formatResistance(params.r1Ohms)})`,
          categoryLabel: 'Spannungsteiler',
          description: 'Liegt zwischen +3,3 V und dem ADC-Abgriff. Entfernt man R1, fällt die Ausgangsspannung über R2 auf 0,00 V.',
          specLine: 'Klicken zum Entfernen / Einstecken',
          removable: true,
          isRemoved: isRem('r1'),
        });
        this.addWire(rolePin('adc'), hole(14, 'f'), 0xf59e0b, 2.15, 0.2);

        if (params.dividerMode === 'resistors') {
          this.activeResistor2 = new ResistorMesh(hole(14, 'g'), hole(20, 'g'), params.r2Ohms);
          this.registerPart(this.activeResistor2.group, {
            partId: 'r2',
            name: `Unterer Widerstand R2 (${formatResistance(params.r2Ohms)})`,
            categoryLabel: 'Spannungsteiler',
            description: 'Liegt zwischen ADC-Abgriff und GND. Entfernt man R2, springt der ADC auf volle 3,30 V (4095).',
            specLine: 'Klicken zum Entfernen / Einstecken',
            removable: true,
            isRemoved: isRem('r2'),
          });
          this.addWire(hole(20, 'j'), hole(20, '-top'), 0x1e293b, 0.9, 0);
        } else {
          this.activeLdr = new LdrMesh(hole(14, 'g'), hole(17, 'g'));
          this.registerPart(this.activeLdr.group, {
            partId: 'r2',
            name: 'Fotowiderstand (LDR GL5528)',
            categoryLabel: 'Optischer Sensor',
            description: 'Verringert seinen Widerstand bei Lichteinfall (~100 kΩ dunkel bis ~500 Ω hell) und verändert so die ADC-Spannung.',
            specLine: 'Klicken zum Entfernen / Einstecken',
            removable: true,
            isRemoved: isRem('r2'),
          });
          this.addWire(hole(17, 'j'), hole(17, '-top'), 0x1e293b, 0.9, 0);
        }

        this.addWire(rolePin('outA'), hole(24, 'd'), 0x22c55e, 2.25, 0.95);
        this.dynamicCircuitGroup.add(new ResistorMesh(hole(24, 'c'), hole(27, 'c'), 220).group);
        this.activeStatusLed = new LedMesh(hole(27, 'e'), hole(29, 'e'));
        this.registerPart(this.activeStatusLed.group, {
          partId: 'adc-led',
          name: 'ADC-Feedback-LED',
          categoryLabel: 'Indikator',
          description: 'Leuchtet proportional zum gemessenen 12-Bit-ADC-Wert (0–4095).',
          specLine: 'PWM-gespiegelter Analogwert',
          removable: false,
          isRemoved: false,
        });
        this.addWire(hole(29, 'a'), hole(29, '-bot'), 0x1e293b, 0.75, 0);
        this.addWire(hole(30, '-top'), hole(30, '-bot'), 0x1e293b, 1.1, 0.2);
        break;
      }

      case 'pwm-dimmer': {
        this.addWire(rolePin('outA'), hole(9, 'f'), 0x38bdf8, 1.95, 0.35);
        const r = new ResistorMesh(hole(9, 'h'), hole(15, 'h'), 220);
        this.registerPart(r.group, {
          partId: 'resistor',
          name: '220 Ω Vorwiderstand',
          categoryLabel: 'Passives Bauteil',
          description: 'Begrenzt den Spitzenstrom während jedes 3,3-V-PWM-Impulses.',
          specLine: 'Klicken zum Entfernen / Einstecken',
          removable: true,
          isRemoved: isRem('resistor'),
        });
        this.activeLed = new LedMesh(hole(15, 'g'), hole(18, 'g'));
        this.registerPart(this.activeLed.group, {
          partId: 'pwm-led',
          name: 'Dimmbare 5mm-LED (LEDC PWM)',
          categoryLabel: 'Aktives Bauteil',
          description: 'Wird über den Hardware-PWM-Tastgrad (Duty-Cycle) flimmerfrei gedimmt.',
          specLine: 'Tastgrad 0–100 %',
          removable: false,
          isRemoved: false,
        });
        this.addWire(hole(18, 'j'), hole(18, '-top'), 0x1e293b, 0.85, 0);
        break;
      }

      case 'rgb-led': {
        this.addWire(rolePin('outA'), hole(7, 'f'), 0xef4444, 1.8, 0.1);
        this.addWire(rolePin('outB'), hole(8, 'd'), 0x22c55e, 2.1, 0.5);
        this.addWire(rolePin('outC'), hole(9, 'b'), 0x3b82f6, 2.35, 0.85);

        this.registerPart(new ResistorMesh(hole(7, 'h'), hole(13, 'h'), 220).group, {
          partId: 'r-red',
          name: 'Vorwiderstand Rot (220 Ω)',
          categoryLabel: 'Rot-Kanal',
          description: 'Begrenzt den Rot-Kanal der RGB-LED. Klicken trennt den Rot-Anteil ab.',
          specLine: 'Klicken zum Entfernen',
          removable: true,
          isRemoved: isRem('r-red'),
        });
        this.registerPart(new ResistorMesh(hole(8, 'e'), hole(15, 'e'), 220).group, {
          partId: 'r-green',
          name: 'Vorwiderstand Grün (220 Ω)',
          categoryLabel: 'Grün-Kanal',
          description: 'Begrenzt den Grün-Kanal der RGB-LED. Klicken trennt den Grün-Anteil ab.',
          specLine: 'Klicken zum Entfernen',
          removable: true,
          isRemoved: isRem('r-green'),
        });
        this.registerPart(new ResistorMesh(hole(9, 'c'), hole(16, 'c'), 100).group, {
          partId: 'r-blue',
          name: 'Vorwiderstand Blau (100 Ω)',
          categoryLabel: 'Blau-Kanal',
          description: 'Kleinerer Widerstand wegen höherer Durchlassspannung von Blau (3,0 V). Klicken trennt Blau ab.',
          specLine: 'Klicken zum Entfernen',
          removable: true,
          isRemoved: isRem('r-blue'),
        });

        this.addWire(hole(15, 'd'), hole(15, 'g'), 0x22c55e, 0.65, 0);
        this.addWire(hole(16, 'b'), hole(16, 'g'), 0x3b82f6, 0.8, 0.15);

        this.activeRgbLed = new RgbLedMesh([hole(13, 'g'), hole(14, 'g'), hole(15, 'h'), hole(16, 'h')]);
        this.registerPart(this.activeRgbLed.group, {
          partId: 'rgb-led',
          name: '4-Pin Common-Cathode RGB-LED',
          categoryLabel: 'Aktives Bauteil',
          description: 'Mischt Rot, Grün und Blau additiv zu 16,7 Millionen Farben über drei getrennte PWM-Kanäle.',
          specLine: 'Gemeinsame Kathode an GND',
          removable: false,
          isRemoved: false,
        });
        this.addWire(hole(14, 'j'), hole(14, '-top'), 0x1e293b, 0.85, 0);
        break;
      }

      case 'rc-lowpass': {
        this.addWire(rolePin('outA'), hole(7, 'f'), 0x38bdf8, 1.9, 0.25);
        this.activeResistor1 = new ResistorMesh(hole(7, 'h'), hole(13, 'h'), params.rcResistorOhms);
        this.registerPart(this.activeResistor1.group, {
          partId: 'resistor',
          name: `Ladewiderstand R (${formatResistance(params.rcResistorOhms)})`,
          categoryLabel: 'RC-Filter',
          description: 'Bestimmt zusammen mit C die Zeitkonstante τ = R · C für die Lade- und Entladekurve.',
          specLine: 'Klicken zum Entfernen',
          removable: true,
          isRemoved: isRem('resistor'),
        });

        this.activeCapacitor = new CapacitorMesh(hole(13, 'g'), hole(16, 'g'));
        this.registerPart(this.activeCapacitor.group, {
          partId: 'capacitor',
          name: `Elektrolyt-Kondensator (${Math.round(params.rcCapacitorUf)} µF)`,
          categoryLabel: 'Energiespeicher',
          description: 'Speichert elektrische Ladung und glättet steile Spannungssprünge zu einer weichen e-Funktion. Entfernen zeigt sofort harte Rechtecke!',
          specLine: 'Klicken zum Entfernen / Einstecken',
          removable: true,
          isRemoved: isRem('capacitor'),
        });
        this.addWire(hole(16, 'j'), hole(16, '-top'), 0x1e293b, 0.85, 0);
        this.addWire(rolePin('adc'), hole(13, 'f'), 0xf59e0b, 2.2, 0.55);

        this.addWire(hole(13, 'j'), hole(23, 'j'), 0xfacc15, 1.25, -0.35);
        this.dynamicCircuitGroup.add(new ResistorMesh(hole(23, 'h'), hole(26, 'h'), 220).group);
        this.activeStatusLed = new LedMesh(hole(26, 'g'), hole(28, 'g'));
        this.registerPart(this.activeStatusLed.group, {
          partId: 'cap-led',
          name: 'Ladezustands-LED',
          categoryLabel: 'Indikator',
          description: 'Zeigt die aktuelle Kondensatorspannung U_C als sanftes Auf- und Abdimmen.',
          specLine: 'Folgt U_C(t)',
          removable: false,
          isRemoved: false,
        });
        this.addWire(hole(28, 'j'), hole(28, '-top'), 0x1e293b, 0.8, 0);
        break;
      }

      case 'mosfet-driver': {
        this.addWire(rolePin('outA'), hole(11, 'f'), 0x38bdf8, 1.95, 0.25);
        this.registerPart(new ResistorMesh(hole(11, 'h'), hole(11, '-top'), 10000).group, {
          partId: 'gate-pulldown',
          name: '10 kΩ Gate-Pulldown-Widerstand',
          categoryLabel: 'Schutzbauteil',
          description: 'Entlädt die isolierte Gate-Kapazität sicher auf 0 V. Ohne ihn schwebt das Gate (Floating) und der MOSFET flackert gefährlich!',
          specLine: 'Klicken zum Entfernen → Floating-Gate testen!',
          removable: true,
          isRemoved: isRem('gate-pulldown'),
        });

        const mosfet = new MosfetMesh([hole(11, 'g'), hole(13, 'g'), hole(15, 'g')]);
        this.registerPart(mosfet.group, {
          partId: 'mosfet',
          name: 'Logic-Level N-Kanal MOSFET (IRLZ44N)',
          categoryLabel: 'Leistungsschalter',
          description: 'Schaltet hohe Lastströme (5–24 V) nahezu verlustfrei über ein 3,3-V-Gate-Signal ohne den ESP32-Pin zu belasten.',
          specLine: 'TO-220 · R_DS(on) ≈ 35 mΩ · Klicken zum Entfernen',
          removable: true,
          isRemoved: isRem('mosfet'),
        });
        this.addWire(hole(15, 'j'), hole(15, '-top'), 0x1e293b, 0.85, 0);
        this.addWire(hole(13, 'e'), hole(21, 'e'), 0xf59e0b, 1.15, 0.25);
        this.activeLed = new LedMesh(hole(23, 'e'), hole(21, 'd'));
        this.registerPart(this.activeLed.group, {
          partId: 'mosfet-load',
          name: `Geschaltete ${params.mosfetLoadVoltage}-V-Last`,
          categoryLabel: 'Verbraucher',
          description: 'Symbolisiert einen LED-Streifen oder Gleichstrommotor, der vom MOSFET gegen GND geschaltet wird.',
          specLine: `${params.mosfetLoadVoltage} V DC Lastkreis`,
          removable: false,
          isRemoved: false,
        });
        this.addWire(hole(23, 'b'), hole(23, '+top'), 0xef4444, 1.2, 0.2);
        break;
      }

      case 'i2c-bme280': {
        this.activeBme280 = new Bme280Mesh([hole(14, 'f'), hole(15, 'f'), hole(16, 'f'), hole(17, 'f')]);
        this.registerPart(this.activeBme280.group, {
          partId: 'bme280',
          name: 'BME280 I²C Umweltsensor',
          categoryLabel: 'Digitaler Sensor',
          description: 'Misst Temperatur, Luftfeuchtigkeit und Luftdruck digital über I²C (Adresse 0x76). Entfernen erzeugt I²C-NACK.',
          specLine: 'I²C 400 kHz · Klicken zum Entfernen',
          removable: true,
          isRemoved: isRem('bme280'),
        });

        this.addWire(hole(14, 'j'), hole(14, '+top'), 0xef4444, 0.85, 0);
        this.addWire(hole(15, 'j'), hole(15, '-top'), 0x1e293b, 0.95, 0);
        this.addWire(rolePin('scl'), hole(16, 'e'), 0xfacc15, 2.1, 0.25);
        this.addWire(rolePin('sda'), hole(17, 'd'), 0x38bdf8, 2.35, 0.65);
        this.addWire(hole(16, 'e'), hole(16, 'g'), 0xfacc15, 0.55, 0);
        this.addWire(hole(17, 'd'), hole(17, 'g'), 0x38bdf8, 0.65, 0);

        const pullupsRemoved = !params.i2cPullupEnabled || isRem('i2c-pullups');
        const pullupGroup = new THREE.Group();
        pullupGroup.add(new ResistorMesh(hole(16, 'h'), hole(22, 'h'), 4700).group);
        pullupGroup.add(new ResistorMesh(hole(17, 'i'), hole(24, 'i'), 4700).group);
        this.registerPart(pullupGroup, {
          partId: 'i2c-pullups',
          name: '2× 4,7 kΩ I²C Pull-Up-Widerstände',
          categoryLabel: 'Bus-Widerstände',
          description: 'Ziehen die Open-Drain-Leitungen SDA und SCL nach +3,3 V. Ohne sie bricht der I²C-Bus sofort ab!',
          specLine: 'Klicken zum Entfernen / Einstecken',
          removable: true,
          isRemoved: pullupsRemoved,
        });
        this.addWire(hole(22, 'j'), hole(22, '+top'), 0xef4444, 0.8, 0);
        this.addWire(hole(24, 'j'), hole(24, '+top'), 0xef4444, 0.85, 0);
        break;
      }

      case 'ultrasonic-hcsr04': {
        this.activeUltrasonic = new UltrasonicMesh([hole(11, 'h'), hole(13, 'h'), hole(15, 'h'), hole(17, 'h')]);
        this.registerPart(this.activeUltrasonic.group, {
          partId: 'hcsr04',
          name: 'HC-SR04 Ultraschall-Abstandssensor',
          categoryLabel: 'Abstandssensor',
          description: 'Sendet 40-kHz-Schallimpulse aus und misst die Echo-Laufzeit (58,2 µs pro cm). Arbeitet mit 5 V Logik.',
          specLine: '2–400 cm · Klicken zum Entfernen',
          removable: true,
          isRemoved: isRem('hcsr04'),
        });

        this.addWire(hole(11, 'j'), hole(11, '+top'), 0xef4444, 0.85, 0);
        this.addWire(hole(17, 'j'), hole(17, '-top'), 0x1e293b, 0.9, 0);
        this.addWire(rolePin('outA'), hole(13, 'f'), 0x22c55e, 1.95, 0.15);

        this.registerPart(new ResistorMesh(hole(15, 'f'), hole(21, 'f'), 1000).group, {
          partId: 'echo-r1',
          name: '1 kΩ Vorwiderstand (ECHO-Teiler)',
          categoryLabel: 'Pegelwandler',
          description: 'Bildet mit dem 2-kΩ-Widerstand den 5 V → 3,33 V Schutz-Spannungsteiler.',
          specLine: 'Oberer Teiler-Zweig (1 kΩ)',
          removable: false,
          isRemoved: false,
        });
        this.registerPart(new ResistorMesh(hole(21, 'g'), hole(26, 'g'), 2000).group, {
          partId: 'echo-divider',
          name: '2 kΩ Schutz-Widerstand (ECHO → GND)',
          categoryLabel: 'Schutzbauteil',
          description: 'Teilt das 5-V-ECHO-Signal sicher auf 3,33 V herunter. Entfernst du ihn, liegen zerstörerische 5 V direkt am ESP-Pin!',
          specLine: 'Klicken zum Entfernen → 5V-Warnung testen!',
          removable: true,
          isRemoved: isRem('echo-divider'),
        });
        this.addWire(hole(26, 'j'), hole(26, '-top'), 0x1e293b, 0.85, 0);
        this.addWire(rolePin('inputA'), hole(21, 'e'), 0x38bdf8, 2.3, 0.65);

        this.activeStatusLed = new LedMesh(hole(27, 'd'), hole(29, 'd'));
        this.registerPart(this.activeStatusLed.group, {
          partId: 'us-led',
          name: 'Nahbereichs-Warn-LED (< 50 cm)',
          categoryLabel: 'Indikator',
          description: 'Leuchtet rot auf, sobald ein Hindernis näher als 50 cm erkannt wird.',
          specLine: 'Schwellwert: 50 cm',
          removable: false,
          isRemoved: false,
        });
        this.addWire(rolePin('outB'), hole(27, 'b'), 0xef4444, 2.45, 0.95);
        this.addWire(hole(29, 'a'), hole(29, '-bot'), 0x1e293b, 0.75, 0);
        this.addWire(hole(30, '-top'), hole(30, '-bot'), 0x1e293b, 1.0, 0.15);
        break;
      }

      case 'ld2490-radar': {
        this.activeLd2490 = new Ld2490Mesh([
          hole(11, 'h'),
          hole(12, 'h'),
          hole(13, 'h'),
          hole(14, 'h'),
          hole(15, 'h'),
        ]);
        this.registerPart(this.activeLd2490.group, {
          partId: 'ld2490',
          name: 'HLK-LD2490 24 GHz mmWave Präsenz-Radar',
          categoryLabel: 'Radar-Sensor',
          description: 'Erkennt über 24-GHz-Patch-Antennen Bewegung UND ruhende Personen anhand minimaler Atembewegungen. Kommuniziert via UART (256000 Baud) + OUT-Pin.',
          specLine: 'Reichweite 0,2–6 m · Klicken zum Entfernen',
          removable: true,
          isRemoved: isRem('ld2490'),
        });

        this.addWire(hole(11, 'j'), hole(11, '+top'), 0xef4444, 0.85, 0);
        this.addWire(hole(12, 'j'), hole(12, '-top'), 0x1e293b, 0.95, 0);
        this.addWire(rolePin('uartRx'), hole(13, 'f'), 0x22c55e, 2.05, 0.25, {
          partId: 'wire-tx',
          name: 'UART-Datenleitung (LD2490 TX → ESP RX)',
          categoryLabel: 'Serieller Bus',
          description: 'Überträgt Entfernungs-Gates und Signalenergie-Frames mit 256.000 Baud zum ESP.',
          specLine: 'Gekreuzt: TX → RX',
          removable: false,
          isRemoved: false,
        });
        this.addWire(rolePin('uartTx'), hole(14, 'g'), 0xfacc15, 2.25, 0.55, {
          partId: 'wire-rx',
          name: 'UART-Konfigurationsleitung (ESP TX → LD2490 RX)',
          categoryLabel: 'Serieller Bus',
          description: 'Sendet Gate-Empfindlichkeiten und Schwellwerte vom ESP an den LD2490.',
          specLine: 'Gekreuzt: TX → RX',
          removable: false,
          isRemoved: false,
        });
        this.addWire(rolePin('inputA'), hole(15, 'f'), 0x38bdf8, 2.45, 0.85, {
          partId: 'radar-out-wire',
          name: 'LD2490 OUT-Präsenzleitung',
          categoryLabel: 'Schaltsignal',
          description: 'Liefert ein sofortiges 3,3-V-HIGH-Signal bei erkannter Präsenz. Klicken trennt die Leitung!',
          specLine: 'Klicken zum Entfernen / Einstecken',
          removable: true,
          isRemoved: isRem('radar-out-wire'),
        });

        this.addWire(rolePin('outA'), hole(23, 'd'), 0x10b981, 2.35, 1.05);
        this.dynamicCircuitGroup.add(new ResistorMesh(hole(23, 'c'), hole(26, 'c'), 220).group);
        this.activeStatusLed = new LedMesh(hole(26, 'e'), hole(28, 'e'));
        this.registerPart(this.activeStatusLed.group, {
          partId: 'radar-led',
          name: 'Präsenz-Indikator-LED',
          categoryLabel: 'Indikator',
          description: 'Leuchtet grün auf, sobald der ESP ein HIGH-Präsenzsignal vom LD2490 empfängt.',
          specLine: 'Direkte Präsenz-Anzeige',
          removable: false,
          isRemoved: false,
        });
        this.addWire(hole(28, 'a'), hole(28, '-bot'), 0x1e293b, 0.75, 0);
        this.addWire(hole(29, '-top'), hole(29, '-bot'), 0x1e293b, 1.05, 0.2);
        break;
      }

      case 'relay-flyback': {
        const relayCenter = hole(15, 'f').lerp(hole(15, 'e'), 0.5);
        this.activeRelay = new RelayModuleMesh(relayCenter);
        this.registerPart(this.activeRelay.group, {
          partId: 'flyback-diode',
          name: '5V Relais + 1N4007 Freilaufdiode',
          categoryLabel: 'Induktiver Aktor',
          description: 'Elektromagnetischer Schalter mit antiparalleler 1N4007-Schutzdiode. Klicken entfernt/setzt die 1N4007-Freilaufdiode zum Testen des Abschalt-Spikes!',
          specLine: 'Klicken = 1N4007 Diode ein/aus · Leertaste = Relais schalten',
          removable: true,
          isRemoved: !params.relayFlybackDiode || isRem('flyback-diode'),
        });

        this.addWire(rolePin('outA'), hole(9, 'f'), 0x38bdf8, 1.95, 0.3);
        this.dynamicCircuitGroup.add(new ResistorMesh(hole(9, 'h'), hole(13, 'h'), 1000).group);
        this.addWire(hole(15, 'j'), hole(15, '+top'), 0xef4444, 0.9, 0);
        this.addWire(hole(17, 'j'), hole(17, '-top'), 0x1e293b, 0.9, 0);

        this.addWire(hole(18, 'd'), hole(24, 'd'), 0xfacc15, 1.15, 0.2);
        this.dynamicCircuitGroup.add(new ResistorMesh(hole(24, 'c'), hole(27, 'c'), 220).group);
        this.activeStatusLed = new LedMesh(hole(27, 'e'), hole(29, 'e'));
        this.dynamicCircuitGroup.add(this.activeStatusLed.group);
        this.addWire(hole(29, 'a'), hole(29, '-bot'), 0x1e293b, 0.75, 0);
        this.addWire(hole(30, '-top'), hole(30, '-bot'), 0x1e293b, 1.05, 0.2);
        break;
      }

      case 'servo-pwm': {
        const servoCenter = hole(17, 'f').lerp(hole(17, 'e'), 0.5);
        this.activeServo = new ServoMesh(servoCenter);
        this.activeServo.setAngle(params.servoAngleDeg, 1.0);
        this.registerPart(this.activeServo.group, {
          partId: 'servo',
          name: 'SG90 Mikro-Servo (0°–180°)',
          categoryLabel: 'Elektromotor / Aktor',
          description: 'Interner Regelkreis positioniert den Servo-Arm exakt proportional zur 50-Hz-PWM-Pulsbreite (0,5–2,5 ms).',
          specLine: 'Versorgung 5 V · Signal 50 Hz',
          removable: false,
          isRemoved: false,
        });

        this.addWire(rolePin('outA'), hole(12, 'f'), 0xf97316, 2.0, 0.35, {
          partId: 'servo-signal',
          name: 'Orange PWM-Steuerleitung',
          categoryLabel: 'Signalkabel',
          description: 'Überträgt die 50-Hz-Positionspulse vom ESP zum Servo. Klicken trennt die Leitung!',
          specLine: 'Klicken zum Entfernen / Einstecken',
          removable: true,
          isRemoved: isRem('servo-signal'),
        });
        this.addWire(hole(12, 'g'), hole(15, 'g'), 0xf97316, 0.7, 0);
        this.addWire(hole(15, 'j'), hole(15, '+top'), 0xef4444, 0.95, 0);
        this.addWire(hole(17, 'j'), hole(17, '-top'), 0x78350f, 0.95, 0);
        break;
      }

      case 'piezo-buzzer': {
        this.addWire(rolePin('outA'), hole(9, 'f'), 0x38bdf8, 1.9, 0.3);
        this.registerPart(new ResistorMesh(hole(9, 'h'), hole(14, 'h'), 100).group, {
          partId: 'resistor',
          name: '100 Ω Schutzwiderstand',
          categoryLabel: 'Passives Bauteil',
          description: 'Begrenzt kapazitive Umladeströme des Piezos. Klicken trennt den Buzzer stumm.',
          specLine: 'Klicken zum Entfernen',
          removable: true,
          isRemoved: isRem('resistor'),
        });
        this.activeBuzzer = new BuzzerMesh(hole(14, 'g'), hole(18, 'g'));
        this.registerPart(this.activeBuzzer.group, {
          partId: 'buzzer',
          name: 'Passiver Piezo-Summer',
          categoryLabel: 'Akustischer Aktor',
          description: 'Piezo-Kristall verformt sich im Takt der Rechteckfrequenz (200–4000 Hz) und erzeugt Töne.',
          specLine: 'LEDC / tone() Ansteuerung',
          removable: false,
          isRemoved: false,
        });
        this.addWire(hole(18, 'j'), hole(18, '-top'), 0x1e293b, 0.85, 0);
        break;
      }

      case 'wled-compact':
      case 'wled-medium':
      case 'wled-long-injection': {
        const profile =
          params.topology === 'wled-compact'
            ? 'compact'
            : params.topology === 'wled-medium'
              ? 'medium'
              : 'long';

        // Mean Well 5V Netzteil / Akku-USV-Modul links neben dem ESP32!
        this.activeMeanWell = new MeanWellPowerMesh(
          params.wledPowerSource,
          params.wledBatteryCapacityMah,
          params.wledBatterySocPct,
        );
        this.activeMeanWell.group.position.set(-8.65, 0.04, 0.65);
        const isBat = params.wledPowerSource === 'meanwell-battery';
        this.registerPart(this.activeMeanWell.group, {
          partId: 'meanwell-power',
          name: isBat
            ? `Mean Well DC-UPS + ${Math.round(params.wledBatteryCapacityMah / 1000)} Ah Li-Ion Akku`
            : 'Mean Well LRS-50-5 Schaltnetzteil (5 V / 10 A)',
          categoryLabel: isBat ? 'Mean Well Akku-USV' : '5V Industrie-Netzteil',
          description: isBat
            ? 'Kombiniert ein Mean-Well-5V-Modul mit einem blauen 18650-Akku-Pack für mobilen oder unterbrechungsfreien WLED-Betrieb. Liefert hohe Ströme direkt an Streifen und Power Injection.'
            : 'Der WLED-Community-Standard: geregeltes 5-V-Industrie-Schaltnetzteil mit hoher Stromreserve für lange WS2812B-Streifen.',
          specLine: '5,0 V DC · Klicken zum Trennen / Anschließen',
          removable: true,
          isRemoved: isRem('meanwell-power'),
        });

        // Heavy-gauge 5V (+) and GND (-) feeder cables from Mean Well terminals into power rails / WAGO clamps
        this.addWire(this.activeMeanWell.getVPosWorld(), hole(2, '+top'), 0xef4444, 2.35, -0.8);
        this.addWire(this.activeMeanWell.getGndWorld(), hole(2, '-top'), 0x1e293b, 2.65, -1.1);

        // 1000 uF Stützkondensator an den Power-Rails auf dem Breadboard / neben WAGO
        const bufCap = new CapacitorMesh(
          noBreadboard ? hole(6, 'h') : hole(5, '+top'),
          noBreadboard ? hole(6, 'j') : hole(5, '-top'),
        );
        this.registerPart(bufCap.group, {
          partId: 'buffer-cap',
          name: '1000 µF Stützkondensator (Elko)',
          categoryLabel: 'WLED Schutzbauteil',
          description: 'Puffert schnelle 5-V-Stromspitzen der WS2812B-LEDs und verhindert ESP32-Brownout-Resets beim Einschalten.',
          specLine: '1000 µF / 16 V · Klicken zum Entfernen',
          removable: true,
          isRemoved: isRem('buffer-cap'),
        });
        if (noBreadboard) {
          this.addWire(hole(6, 'h'), hole(6, '+top'), 0xef4444, 0.85, 0);
          this.addWire(hole(6, 'j'), hole(6, '-top'), 0x1e293b, 0.85, 0);
        }

        let dataOutHole = hole(12, 'd');

        if (profile !== 'compact') {
          // 74AHCT125 3.3V -> 5V Logic-Level-Shifter IC straddling center channel
          const shifterCenter = hole(12, 'f').lerp(hole(12, 'e'), 0.5);
          const shifter = new LevelShifterMesh(shifterCenter);
          this.registerPart(shifter.group, {
            partId: 'level-shifter',
            name: '74AHCT125 Pegelwandler (3,3 V → 5 V)',
            categoryLabel: 'WLED Signal-IC',
            description: 'Hebt das 3,3-V-Datensignal des ESP32 sauber auf 5,0 V an (WS2812B verlangt ≥ 3,5 V HIGH). Entfernen löst sofort Daten-Glitches aus!',
            specLine: 'DIP-14 · Klicken zum Entfernen',
            removable: true,
            isRemoved: isRem('level-shifter'),
          });
          this.addWire(rolePin('outA'), hole(10, 'f'), 0x22c55e, 1.95, 0.2);
          this.addWire(hole(10, 'j'), hole(10, '+top'), 0xef4444, 0.75, 0);
          this.addWire(hole(14, 'j'), hole(14, '-top'), 0x1e293b, 0.75, 0);
          dataOutHole = hole(15, 'd');
        } else {
          this.addWire(rolePin('outA'), hole(10, 'd'), 0x22c55e, 1.95, 0.25);
          dataOutHole = hole(10, 'c');
        }

        // 330 Ohm Serien-Datenwiderstand vor DIN
        const rStart = profile === 'compact' ? hole(10, 'b') : hole(15, 'b');
        const rEnd = profile === 'compact' ? hole(16, 'b') : hole(21, 'b');
        this.registerPart(new ResistorMesh(rStart, rEnd, 330).group, {
          partId: 'data-resistor',
          name: '330 Ω WLED Datenwiderstand',
          categoryLabel: 'Impedanzschutz',
          description: 'Dämpft 800-kHz-Signalreflexionen (Ringing) auf der Datenleitung und schützt den DIN-Eingang der ersten WS2812B-LED.',
          specLine: 'Orange-Orange-Braun-Gold · Klicken zum Entfernen',
          removable: true,
          isRemoved: isRem('data-resistor'),
        });
        void dataOutHole;

        // 3D WS2812B WLED LED Strip!
        this.activeWledStrip = new WledStripMesh(profile, params.wledLedCount);
        const meters = (params.wledLedCount / 60).toFixed(2).replace('.', ',');
        this.registerPart(this.activeWledStrip.group, {
          partId: 'wled-strip',
          name: `WLED WS2812B Streifen (${params.wledLedCount} LEDs · ~${meters} m)`,
          categoryLabel: 'Adressierbare LEDs',
          description: 'Einzeln ansteuerbare 5050-RGB-LEDs mit integriertem Treiber-IC (800 kHz). Bei langen Streifen ohne Power Injection verfärben sich die hinteren LEDs wegen Spannungsabfall gelb-rot!',
          specLine: `5 V DC · bis ${(params.wledLedCount * 0.058).toFixed(1).replace('.', ',')} A bei Vollweiß`,
          removable: false,
          isRemoved: false,
        });

        // Start power & data feeder cables into the beginning of the LED strip
        const stripStart = this.activeWledStrip.getStartPosition();
        this.addWire(
          rEnd,
          stripStart.clone().add(new THREE.Vector3(0, 0.05, 0)),
          0x22c55e,
          1.2,
          0.15,
        );
        this.addWire(
          hole(6, '+bot'),
          stripStart.clone().add(new THREE.Vector3(-0.22, 0.05, 0)),
          0xef4444,
          1.0,
          -0.1,
        );
        this.addWire(
          hole(7, '-bot'),
          stripStart.clone().add(new THREE.Vector3(0.22, 0.05, 0)),
          0x1e293b,
          1.05,
          0.1,
        );
        // Link top power rails down to bottom power rails
        this.addWire(hole(3, '+top'), hole(3, '+bot'), 0xef4444, 0.9, -0.15);
        this.addWire(hole(4, '-top'), hole(4, '-bot'), 0x1e293b, 1.0, 0.15);

        // Long 5m strip: dedicated 5V & GND Power Injection cables to the FAR END of the strip!
        if (profile === 'long') {
          const stripEnd = this.activeWledStrip.getEndPosition();
          const injectionRemoved = !params.wledPowerInjection || isRem('power-injection');
          const injGroup = new THREE.Group();
          injGroup.add(
            new JumperWireMesh({
              start: hole(10, '+top'),
              end: stripEnd.clone().add(new THREE.Vector3(0.18, 0.05, 0)),
              color: 0xef4444,
              arcHeight: 1.35,
            }).group,
          );
          injGroup.add(
            new JumperWireMesh({
              start: hole(11, '-top'),
              end: stripEnd.clone().add(new THREE.Vector3(-0.18, 0.05, 0)),
              color: 0x1e293b,
              arcHeight: 1.5,
            }).group,
          );
          this.registerPart(injGroup, {
            partId: 'power-injection',
            name: '5V / GND Power Injection (Streifenende)',
            categoryLabel: 'WLED Einspeisung',
            description: 'Speist 5 V und GND zusätzlich am Ende des 5-m-Streifens ein, halbiert den Leitungsweg und verhindert den Gelb-/Rotstich durch Spannungsabfall!',
            specLine: 'Klicken zum Entfernen → Voltage Drop live sehen!',
            removable: true,
            isRemoved: injectionRemoved,
          });
        }
        break;
      }

      case 'pi-traffic-light': {
        // 3 separate GPIO lines -> 3x 220 Ohm resistors -> Red, Yellow, Green LEDs
        this.addWire(rolePin('outA'), hole(7, 'f'), 0xef4444, 1.85, 0.15);
        this.addWire(rolePin('outB'), hole(14, 'f'), 0xfacc15, 2.05, 0.45);
        this.addWire(rolePin('outC'), hole(21, 'f'), 0x22c55e, 2.25, 0.75);

        this.registerPart(new ResistorMesh(hole(7, 'h'), hole(11, 'h'), 220).group, {
          partId: 'r-red',
          name: 'Vorwiderstand Ampel Rot (220 Ω)',
          categoryLabel: 'Ampel-Kanal',
          description: 'Begrenzt den Strom der roten Ampel-LED (~5,9 mA). Klicken deaktiviert die Rot-Phase.',
          specLine: 'Klicken zum Entfernen',
          removable: true,
          isRemoved: isRem('r-red'),
        });
        this.registerPart(new ResistorMesh(hole(14, 'h'), hole(18, 'h'), 220).group, {
          partId: 'r-yellow',
          name: 'Vorwiderstand Ampel Gelb (220 Ω)',
          categoryLabel: 'Ampel-Kanal',
          description: 'Begrenzt den Strom der gelben Ampel-LED (~5,5 mA). Klicken deaktiviert die Gelb-Phase.',
          specLine: 'Klicken zum Entfernen',
          removable: true,
          isRemoved: isRem('r-yellow'),
        });
        this.registerPart(new ResistorMesh(hole(21, 'h'), hole(25, 'h'), 220).group, {
          partId: 'r-green',
          name: 'Vorwiderstand Ampel Grün (220 Ω)',
          categoryLabel: 'Ampel-Kanal',
          description: 'Begrenzt den Strom der grünen Ampel-LED (~5,0 mA). Klicken deaktiviert die Grün-Phase.',
          specLine: 'Klicken zum Entfernen',
          removable: true,
          isRemoved: isRem('r-green'),
        });

        this.activeTrafficRed = new LedMesh(hole(11, 'g'), hole(13, 'g'));
        this.registerPart(this.activeTrafficRed.group, {
          partId: 'led-red',
          name: 'Ampel-LED Rot',
          categoryLabel: 'Raspberry Pi Ausgang',
          description: 'Halt-Signal gesteuert durch den ersten Pi-GPIO-Ausgang.',
          specLine: 'Vf = 2,0 V · ~5,9 mA',
          removable: false,
          isRemoved: false,
        });

        this.activeTrafficYellow = new LedMesh(hole(18, 'g'), hole(20, 'g'));
        this.registerPart(this.activeTrafficYellow.group, {
          partId: 'led-yellow',
          name: 'Ampel-LED Gelb',
          categoryLabel: 'Raspberry Pi Ausgang',
          description: 'Übergangs-Signal gesteuert durch den zweiten Pi-GPIO-Ausgang.',
          specLine: 'Vf = 2,1 V · ~5,5 mA',
          removable: false,
          isRemoved: false,
        });

        this.activeTrafficGreen = new LedMesh(hole(25, 'g'), hole(27, 'g'));
        this.registerPart(this.activeTrafficGreen.group, {
          partId: 'led-green',
          name: 'Ampel-LED Grün',
          categoryLabel: 'Raspberry Pi Ausgang',
          description: 'Fahrt-Signal gesteuert durch den dritten Pi-GPIO-Ausgang.',
          specLine: 'Vf = 2,2 V · ~5,0 mA',
          removable: false,
          isRemoved: false,
        });

        this.addWire(hole(13, 'j'), hole(13, '-top'), 0x1e293b, 0.8, 0);
        this.addWire(hole(20, 'j'), hole(20, '-top'), 0x1e293b, 0.8, 0);
        this.addWire(hole(27, 'j'), hole(27, '-top'), 0x1e293b, 0.8, 0);
        break;
      }

      case 'pi-fan-pwm': {
        this.addWire(rolePin('outA'), hole(10, 'f'), 0x38bdf8, 1.95, 0.25);
        this.dynamicCircuitGroup.add(new ResistorMesh(hole(10, 'h'), hole(10, '-top'), 10000).group);

        const mosfet = new MosfetMesh([hole(10, 'g'), hole(12, 'g'), hole(14, 'g')]);
        this.registerPart(mosfet.group, {
          partId: 'fan-mosfet',
          name: 'N-Kanal MOSFET Lüfter-Treiber',
          categoryLabel: 'Leistungsschalter',
          description: 'Schaltet den 5-V-Lüfterstrom (~200 mA) per 3,3-V-PWM vom Raspberry Pi ohne den GPIO zu überlasten.',
          specLine: 'Klicken zum Entfernen → Kühlung fällt aus!',
          removable: true,
          isRemoved: isRem('fan-mosfet'),
        });
        this.addWire(hole(14, 'j'), hole(14, '-top'), 0x1e293b, 0.85, 0);

        const fanPos = hole(22, 'f').lerp(hole(22, 'e'), 0.5);
        this.activeCoolingFan = new CoolingFanMesh(fanPos);
        this.registerPart(this.activeCoolingFan.group, {
          partId: 'pi-fan',
          name: '5V Axiallüfter (40 mm, PWM-geregelt)',
          categoryLabel: 'Aktive Kühlung',
          description: 'Temperaturgeregelter 5-V-Kühllüfter für Raspberry Pi SoCs. Drehzahl folgt live der CPU-Temperatur-Kurve.',
          specLine: '5 V DC · bis ~210 mA · Klicken zum Entfernen',
          removable: true,
          isRemoved: isRem('pi-fan'),
        });
        this.addWire(hole(12, 'e'), hole(20, 'e'), 0xf59e0b, 1.1, 0.15);
        this.addWire(hole(22, 'j'), hole(22, '+top'), 0xef4444, 0.9, 0);
        break;
      }

      case 'pi-oled-i2c': {
        this.activeOled = new OledDisplayMesh([
          hole(14, 'f'),
          hole(15, 'f'),
          hole(16, 'f'),
          hole(17, 'f'),
        ]);
        this.registerPart(this.activeOled.group, {
          partId: 'oled-display',
          name: '0,96" SSD1306 I²C OLED-Display (128×64)',
          categoryLabel: 'I²C Display',
          description: 'Selbstleuchtendes Zweifarben-OLED (Gelb + Cyan) an I²C-Adresse 0x3C. Zeigt live System-, Netzwerk- oder GPIO-Daten des Raspberry Pi.',
          specLine: 'I²C 0x3C · 3,3 V · Klicken zum Entfernen',
          removable: true,
          isRemoved: isRem('oled-display'),
        });

        this.addWire(hole(14, 'j'), hole(14, '-top'), 0x1e293b, 0.85, 0);
        this.addWire(hole(15, 'j'), hole(15, '+top'), 0xef4444, 0.85, 0);
        this.addWire(rolePin('scl'), hole(16, 'i'), 0xfacc15, 1.55, -0.45);
        this.addWire(rolePin('sda'), hole(17, 'h'), 0x38bdf8, 1.75, -0.75, {
          partId: 'i2c-sda',
          name: 'I²C SDA-Datenleitung',
          categoryLabel: 'I²C Bus',
          description: 'Überträgt die 128×64-Pixel-Framebuffer-Daten vom Raspberry Pi zum SSD1306-OLED.',
          specLine: 'Klicken zum Entfernen → Display geht aus!',
          removable: true,
          isRemoved: isRem('i2c-sda'),
        });
        break;
      }

      case 'power-supply-lab': {
        const isBat =
          params.psuMode === 'liion-18650' ||
          params.psuMode === 'lipo-pack' ||
          params.psuMode === 'solar-ups';
        this.activeMeanWell = new MeanWellPowerMesh(
          isBat ? 'meanwell-battery' : 'meanwell-psu',
          params.psuBatteryCapacityMah,
          params.psuBatterySocPct,
        );
        this.activeMeanWell.group.position.set(-8.65, 0.04, 0.55);
        this.registerPart(this.activeMeanWell.group, {
          partId: 'meanwell-power',
          name: isBat
            ? `${params.psuBatteryCells}S Akku-Pack (${Math.round(params.psuBatteryCapacityMah / 1000)} Ah)`
            : `Konfigurierbares Netzteil (${params.psuVoltageV.toFixed(1).replace('.', ',')} V / ${params.psuCurrentLimitA.toFixed(1).replace('.', ',')} A)`,
          categoryLabel: isBat ? 'Akku-Pack & BMS' : 'Labor-/Schaltnetzteil',
          description:
            'Konfigurierbare Stromquelle — ändere Spannung, Zellenanzahl, Stromlimit, Regler & AWG-Kabel rechts im Inspector!',
          specLine: 'Klicken zum Trennen / Anschließen',
          removable: true,
          isRemoved: isRem('meanwell-power'),
        });

        this.addWire(this.activeMeanWell.getVPosWorld(), hole(2, '+top'), 0xef4444, 2.25, -0.75);
        this.addWire(this.activeMeanWell.getGndWorld(), hole(2, '-top'), 0x1e293b, 2.55, -1.05);

        // 1000 uF Stützkondensator
        const cap = new CapacitorMesh(hole(5, '+top'), hole(5, '-top'));
        this.registerPart(cap.group, {
          partId: 'buffer-cap',
          name: '1000 µF Stütz- & Glättungs-Elko',
          categoryLabel: 'Spannungs-Filter',
          description:
            'Glättet Spannungswelligkeit (Ripple) und puffert Lastspitzen. Entfernen zeigt sofort Ripple im Oszilloskop!',
          specLine: '1000 µF / 25 V · Klicken zum Entfernen',
          removable: true,
          isRemoved: isRem('buffer-cap'),
        });

        // Spannungsregler / Buck-MOSFET Stufe
        const reg = new MosfetMesh([hole(9, 'g'), hole(11, 'g'), hole(13, 'g')]);
        this.registerPart(reg.group, {
          partId: 'regulator-stage',
          name:
            params.psuRegulatorType === 'buck'
              ? 'Step-Down Buck-Wandler (~90 % Wirkungsgrad)'
              : 'Linearregler LM7805 (verheizt Spannungsdifferenz!)',
          categoryLabel: 'Spannungsregler',
          description:
            'Regelt die Eingangsspannung auf die Zielspannung herunter. Vergleiche rechts im Inspector Buck vs. Linear!',
          specLine: params.psuRegulatorType === 'buck' ? 'Schaltregler ~90 % η' : 'Linearregler (Abwärme!)',
          removable: false,
          isRemoved: false,
        });
        this.addWire(hole(9, 'j'), hole(9, '+top'), 0xef4444, 0.85, 0);
        this.addWire(hole(13, 'j'), hole(13, '-top'), 0x1e293b, 0.85, 0);

        // OLED Live-Power-Monitor auf dem Steckbrett!
        this.activeOled = new OledDisplayMesh([
          hole(16, 'f'),
          hole(17, 'f'),
          hole(18, 'f'),
          hole(19, 'f'),
        ]);
        this.registerPart(this.activeOled.group, {
          partId: 'power-oled',
          name: 'Live-Power-Monitor (INA219 + OLED)',
          categoryLabel: 'Messgerät',
          description: 'Zeigt live Ausgangsspannung, Laststrom, Leistung & Akku-Restlaufzeit.',
          specLine: 'Echtzeit-Telemetrie',
          removable: false,
          isRemoved: false,
        });
        this.addWire(hole(16, 'j'), hole(16, '-top'), 0x1e293b, 0.8, 0);
        this.addWire(hole(17, 'j'), hole(17, '+top'), 0xef4444, 0.8, 0);
        this.addWire(rolePin('scl'), hole(18, 'i'), 0xfacc15, 1.55, -0.45);
        this.addWire(rolePin('sda'), hole(19, 'h'), 0x38bdf8, 1.75, -0.75);

        // Last-Indikator-LED + Lastwiderstand
        this.dynamicCircuitGroup.add(new ResistorMesh(hole(22, 'h'), hole(26, 'h'), 220).group);
        this.activeLed = new LedMesh(hole(26, 'g'), hole(28, 'g'));
        this.registerPart(this.activeLed.group, {
          partId: 'load-indicator',
          name: 'Simulierte Last & Status-LED',
          categoryLabel: 'Verbraucher',
          description: 'Grün = stabil, Gelb = Strombegrenzung, Rot = Regler-Überhitzung!',
          specLine: `Laststrom: ${Math.round(params.psuLoadMa)} mA`,
          removable: false,
          isRemoved: false,
        });
        this.addWire(hole(22, 'j'), hole(22, '+top'), 0xef4444, 0.85, 0);
        this.addWire(hole(28, 'j'), hole(28, '-top'), 0x1e293b, 0.85, 0);
        break;
      }
    }
  }

  public setSandboxTool(tool: SandboxToolId): void {
    this.sandboxTool = tool;
    if (tool === 'wire' || tool === 'delete') {
      this.hoverGhostGroup.visible = false;
    }
  }

  public setSandboxGhostPartType(type: SandboxPartType | null): void {
    if (this.hoverGhostPartType === type) return;
    this.hoverGhostPartType = type;
    this.lastHoverGhostKey = '';
    if (!type) {
      this.hoverGhostGroup.visible = false;
    }
  }

  private buildSandboxPartVisual(
    type: SandboxPartType,
    col: number,
    effectiveRow: string,
    registerLiveHandles: boolean,
  ): {
    group: THREE.Group | null;
    handle: SandboxPartHandle;
    pins: THREE.Vector3[];
  } {
    const hole = (c: number, r: string) =>
      this.breadboard.getWorldHolePosition(Math.max(1, Math.min(30, c)), r);
    const def = getCatalogItem(type);
    const pins = def.pinOffsets.map((po) => hole(col + po.dCol, effectiveRow));
    const partCenter = hole(col + Math.floor(def.colSpan / 2), effectiveRow);
    let group: THREE.Group | null = null;
    const handle: SandboxPartHandle = { type };

    switch (type) {
      case 'led-red':
      case 'led-green':
      case 'led-blue':
      case 'led-yellow': {
        const led = new LedMesh(pins[0], pins[1]);
        handle.led = led;
        group = led.group;
        break;
      }
      case 'led-rgb': {
        const rgb = new RgbLedMesh(pins);
        handle.rgbLed = rgb;
        group = rgb.group;
        break;
      }
      case 'resistor-220':
      case 'resistor-10k': {
        const r = new ResistorMesh(pins[0], pins[1], type === 'resistor-220' ? 220 : 10000);
        group = r.group;
        break;
      }
      case 'mosfet-irlz44n': {
        const m = new MosfetMesh(pins);
        group = m.group;
        break;
      }
      case 'button': {
        const btn = new ButtonMesh(partCenter);
        handle.button = btn;
        if (registerLiveHandles) this.activeButton = btn;
        group = btn.group;
        break;
      }
      case 'capacitor': {
        const cap = new CapacitorMesh(pins[0], pins[1]);
        group = cap.group;
        break;
      }
      case 'ldr': {
        const ldr = new LdrMesh(pins[0], pins[1]);
        handle.ldr = ldr;
        group = ldr.group;
        break;
      }
      case 'bme280': {
        const bme = new Bme280Mesh(pins);
        handle.bme280 = bme;
        group = bme.group;
        break;
      }
      case 'hcsr04': {
        const us = new UltrasonicMesh(pins);
        handle.hcsr04 = us;
        group = us.group;
        break;
      }
      case 'ld2490': {
        const ld = new Ld2490Mesh(pins);
        handle.ld2490 = ld;
        group = ld.group;
        break;
      }
      case 'oled': {
        const oled = new OledDisplayMesh(pins);
        handle.oled = oled;
        group = oled.group;
        break;
      }
      case 'servo': {
        const srv = new ServoMesh(partCenter);
        handle.servo = srv;
        if (registerLiveHandles) this.activeServo = srv;
        group = srv.group;
        break;
      }
      case 'buzzer': {
        const bz = new BuzzerMesh(pins[0], pins[1]);
        handle.buzzer = bz;
        group = bz.group;
        break;
      }
      case 'relay-module': {
        const rel = new RelayModuleMesh(partCenter);
        handle.relay = rel;
        group = rel.group;
        break;
      }
      case 'cooling-fan': {
        const fan = new CoolingFanMesh(partCenter);
        handle.fan = fan;
        if (registerLiveHandles) this.activeCoolingFan = fan;
        group = fan.group;
        break;
      }
      default: {
        const extra = createSandboxExtraMesh(type, pins);
        handle.extra = extra;
        group = extra.group;
        break;
      }
    }

    return { group, handle, pins };
  }

  private updateHoverGhost(type: SandboxPartType, rawCol: number, rawRow: string): void {
    const def = getCatalogItem(type);
    const col = Math.max(1, Math.min(30 - def.colSpan, Math.round(rawCol - def.colSpan / 2)));
    const effectiveRow = normalizePartRow(rawRow);
    const key = `${type}:${col}:${effectiveRow}`;
    if (key === this.lastHoverGhostKey) {
      this.hoverGhostGroup.visible = true;
      return;
    }
    this.lastHoverGhostKey = key;

    while (this.hoverGhostGroup.children.length > 0) {
      this.hoverGhostGroup.remove(this.hoverGhostGroup.children[0]);
    }

    const { group, pins } = this.buildSandboxPartVisual(type, col, effectiveRow, false);
    if (group) {
      group.position.y += 0.04;
      group.traverse((child) => {
        // Ghost darf niemals Raycasting blockieren!
        child.raycast = () => {};
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          const cloned = mats.map((m) => {
            const c = m.clone() as THREE.MeshStandardMaterial;
            c.transparent = true;
            c.opacity = 0.58;
            c.depthWrite = false;
            if ('emissive' in c && c.emissive) {
              c.emissive = new THREE.Color('#06b6d4');
              c.emissiveIntensity = 0.32;
            }
            return c;
          });
          mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0];
        }
      });
      this.hoverGhostGroup.add(group);
    }

    // Leuchtende Pin-Fußabdruck-Ringe exakt auf den Ziel-Löchern des Steckbretts!
    const pinRingGeo = new THREE.RingGeometry(0.055, 0.115, 16);
    const pinRingMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
    });
    for (const p of pins) {
      const r = new THREE.Mesh(pinRingGeo, pinRingMat);
      r.rotation.x = -Math.PI / 2;
      r.position.set(p.x, p.y + 0.045, p.z);
      r.raycast = () => {};
      this.hoverGhostGroup.add(r);
    }

    this.hoverGhostGroup.visible = true;
  }

  private resolveEndpointWorld(ep: WireEndpoint): THREE.Vector3 {
    if (ep.kind === 'board') {
      const role = ep.boardPinRole ?? '3V3';
      if (role === '3V3' || role === 'GND') {
        return this.esp32.getWorldPinPosition(role);
      }
      return this.esp32.getWorldRolePin(role as keyof BoardPinAssignment);
    }
    return this.breadboard.getWorldHolePosition(ep.col ?? 1, ep.row ?? 'g');
  }

  private rebuildBoardPinPads(): void {
    while (this.boardPinPadsGroup.children.length > 0) {
      this.boardPinPadsGroup.remove(this.boardPinPadsGroup.children[0]);
    }

    const roles: Array<{ role: string; color: number }> = [
      { role: '3V3', color: 0xef4444 },
      { role: 'GND', color: 0x64748b },
      { role: 'outA', color: 0x38bdf8 },
      { role: 'outB', color: 0xa855f7 },
      { role: 'outC', color: 0x22c55e },
      { role: 'inputA', color: 0x0ea5e9 },
      { role: 'adc', color: 0xf59e0b },
      { role: 'sda', color: 0x06b6d4 },
      { role: 'scl', color: 0xfacc15 },
      { role: 'uartTx', color: 0xfb923c },
      { role: 'uartRx', color: 0x34d399 },
    ];

    const sphereGeo = new THREE.SphereGeometry(0.115, 14, 14);
    for (const item of roles) {
      const ep: WireEndpoint = { kind: 'board', boardPinRole: item.role };
      const pos = this.resolveEndpointWorld(ep);
      const mat = new THREE.MeshStandardMaterial({
        color: item.color,
        emissive: item.color,
        emissiveIntensity: 0.75,
        roughness: 0.25,
      });
      const dot = new THREE.Mesh(sphereGeo, mat);
      dot.position.copy(pos).add(new THREE.Vector3(0, 0.08, 0));
      dot.userData.sandboxEndpoint = ep;
      dot.userData.hoverInfo = {
        partId: `pin-${item.role}`,
        name: formatEndpointLabel(ep, this.currentBoardId),
        categoryLabel: 'Board-Anschluss',
        description: 'Klicke diesen leuchtenden Pin im Jumperkabel-Modus an, um eine Leitung zum Steckbrett zu ziehen!',
        specLine: `Pin-Rolle: ${item.role}`,
        removable: false,
        isRemoved: false,
      } satisfies HoverPartInfo;
      this.boardPinPadsGroup.add(dot);
    }
  }

  /**
   * Synchronisiert die 3D-Szene im freien Werkbank- (Sandbox) oder Geführten Bau-Modus.
   */
  public syncSandbox(
    boardId: EspBoardId,
    state: SandboxState,
    summary: SandboxSimSummary,
    highlights: HighlightMarker[],
    wireStart: WireEndpoint | null,
    elapsedSeconds: number,
    selectedMovePartId: string | null = null,
  ): void {
    this.sandboxModeActive = true;
    this.lastSandboxElapsed = elapsedSeconds;
    this.selectedMovePartId = selectedMovePartId;
    this.breadboard.group.visible = true;
    this.boardPinPadsGroup.visible = true;
    this.markerGroup.visible = true;

    const boardChanged = this.swapEspBoardIfNeeded(boardId);
    if (boardChanged || this.boardPinPadsGroup.children.length === 0) {
      this.rebuildBoardPinPads();
    }

    const partsKey = state.parts.map((p) => `${p.id}:${p.type}:${p.col}:${p.row}`).join('|');
    const wiresKey = state.wires
      .map(
        (w) =>
          `${w.id}:${w.colorHex}:${w.from.kind}:${w.from.boardPinRole ?? ''}:${w.from.col ?? ''}:${w.from.row ?? ''}:${w.to.kind}:${w.to.boardPinRole ?? ''}:${w.to.col ?? ''}:${w.to.row ?? ''}`,
      )
      .join('|');
    const layoutKey = `sandbox:${boardId}:${partsKey}::${wiresKey}`;

    if (boardChanged || layoutKey !== this.currentLayoutKey) {
      this.rebuildSandboxScene(state);
      this.currentLayoutKey = layoutKey;
    }

    // Update live visuals of all user-placed components
    this.esp32.setStatusLed(summary.activePartsCount > 0);
    for (const part of state.parts) {
      const handle = this.sandboxPartHandles.get(part.id);
      const runtime = summary.partStates.get(part.id);
      if (!handle || !runtime) continue;

      if (handle.led) {
        const colId =
          part.type === 'led-green'
            ? 'green'
            : part.type === 'led-blue'
              ? 'blue'
              : part.type === 'led-yellow'
                ? 'yellow'
                : 'red';
        handle.led.updateVisuals(
          colId,
          runtime.brightnessPct,
          runtime.overcurrent,
          runtime.overcurrent,
          elapsedSeconds,
        );
      }
      if (handle.rgbLed) {
        const col = new THREE.Color().setHSL((elapsedSeconds * 0.25) % 1, 0.95, 0.55);
        handle.rgbLed.updateRgb(`#${col.getHexString()}`, runtime.active ? 95 : 0);
      }
      if (handle.button) {
        handle.button.setPressed(state.buttonPressed);
      }
      if (handle.ldr) {
        handle.ldr.setLightLevel(state.lightPercent);
      }
      if (handle.bme280) {
        handle.bme280.setActive(runtime.active);
      }
      if (handle.hcsr04 && runtime.powered) {
        handle.hcsr04.updateWave(65, elapsedSeconds);
      }
      if (handle.ld2490) {
        handle.ld2490.updateVisuals(
          runtime.active,
          runtime.powered && state.radarPresent,
          2.0,
          true,
          elapsedSeconds,
        );
      }
      if (handle.oled) {
        handle.oled.updateScreen(
          runtime.active
            ? [
                this.esp32.spec.shortName.toUpperCase(),
                'SANDBOX OLED OK',
                `ACTIVE PARTS: ${summary.activePartsCount}`,
                `I = ${summary.totalCurrentMa.toFixed(1)} mA`,
              ]
            : [],
          90,
        );
      }
      if (handle.servo && runtime.active) {
        this.targetServoDeg = state.servoAngleDeg;
      }
      if (handle.buzzer) {
        handle.buzzer.updateSound(runtime.active, 880, elapsedSeconds);
      }
      if (handle.relay) {
        handle.relay.updateState(runtime.active, false, true);
      }
      if (handle.fan) {
        handle.fan.setSpeed(runtime.active ? 100 : 0);
      }
      if (handle.extra) {
        handle.extra.update(runtime.active, runtime.powered, elapsedSeconds);
      }
    }

    // Update pulsing target markers (Guided Builder + active wire start point + selected move part)
    const allMarkers: HighlightMarker[] = [...highlights];
    if (wireStart) {
      allMarkers.push({ endpoint: wireStart, colorHex: '#facc15', label: 'Start' });
    }
    if (selectedMovePartId) {
      const moved = state.parts.find((p) => p.id === selectedMovePartId);
      if (moved) {
        allMarkers.push({
          endpoint: { kind: 'breadboard', col: moved.col, row: moved.row },
          colorHex: '#f59e0b',
          label: 'Verschieben',
        });
      }
    }
    const markerKey = allMarkers
      .map(
        (m) =>
          `${m.colorHex}:${m.endpoint.kind}:${m.endpoint.boardPinRole ?? ''}:${m.endpoint.col ?? ''}:${m.endpoint.row ?? ''}`,
      )
      .join('|');
    if (markerKey !== this.lastMarkerKey) {
      this.rebuildMarkers(allMarkers);
      this.lastMarkerKey = markerKey;
    }
  }

  private rebuildMarkers(markers: HighlightMarker[]): void {
    while (this.markerGroup.children.length > 0) {
      this.markerGroup.remove(this.markerGroup.children[0]);
    }
    for (const m of markers) {
      const pos = this.resolveEndpointWorld(m.endpoint);
      const col = new THREE.Color(m.colorHex);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.16, 0.27, 28),
        new THREE.MeshBasicMaterial({
          color: col,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.92,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pos.x, pos.y + 0.08, pos.z);
      ring.userData.pulseBaseY = pos.y + 0.08;
      this.markerGroup.add(ring);

      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.72, 10),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.5 }),
      );
      beacon.position.set(pos.x, pos.y + 0.44, pos.z);
      this.markerGroup.add(beacon);
    }
  }

  private rebuildSandboxScene(state: SandboxState): void {
    this.clearDynamicCircuit();
    this.sandboxPartHandles.clear();

    for (const part of state.parts) {
      const def = getCatalogItem(part.type);
      const effectiveRow = normalizePartRow(part.row);
      const { group, handle } = this.buildSandboxPartVisual(part.type, part.col, effectiveRow, true);

      if (group) {
        const hoverInfo: HoverPartInfo = {
          partId: part.id,
          name: `${def.name} (${part.col}${effectiveRow})`,
          categoryLabel: def.category,
          description: def.description,
          specLine: `Pins: ${def.pinOffsets.map((po) => `${part.col + po.dCol}${effectiveRow} (${po.pinLabel})`).join(' · ')}`,
          removable: false,
          isRemoved: false,
        };
        tagHoverable(group, hoverInfo);
        group.traverse((c) => {
          c.userData.sandboxItem = { kind: 'part', id: part.id };
        });
        this.dynamicCircuitGroup.add(group);
        this.sandboxPartHandles.set(part.id, handle);
      }
    }

    // Build all user-placed jumper wires
    state.wires.forEach((w, idx) => {
      const start = this.resolveEndpointWorld(w.from);
      const end = this.resolveEndpointWorld(w.to);
      const isBoardWire = w.from.kind === 'board' || w.to.kind === 'board';
      const wireColor = new THREE.Color(w.colorHex).getHex();
      const wire = new JumperWireMesh({
        start,
        end,
        color: wireColor,
        arcHeight: isBoardWire ? 1.85 + (idx % 3) * 0.2 : 0.95,
        lateralOffset: isBoardWire ? ((idx % 5) - 2) * 0.22 : 0,
      });
      const info: HoverPartInfo = {
        partId: w.id,
        name: `Jumperkabel (${formatEndpointLabel(w.from, this.currentBoardId)} ↔ ${formatEndpointLabel(w.to, this.currentBoardId)})`,
        categoryLabel: 'Jumperkabel',
        description: 'Frei verlegtes 3D-Jumperkabel in deiner eigenen Schaltung.',
        specLine: 'Mit Löschen-Werkzeug anklicken zum Entfernen',
        removable: false,
        isRemoved: false,
      };
      tagHoverable(wire.group, info);
      wire.group.traverse((c) => {
        c.userData.sandboxItem = { kind: 'wire', id: w.id };
      });
      this.dynamicCircuitGroup.add(wire.group);
    });
  }

  private pickSandboxEndpoint(clientX: number, clientY: number): WireEndpoint | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);

    // 1. Check board pin dots first (easy picking for ESP/Pi pins)
    const pinHits = this.raycaster.intersectObject(this.boardPinPadsGroup, true);
    if (pinHits.length > 0 && pinHits[0].object.userData.sandboxEndpoint) {
      return pinHits[0].object.userData.sandboxEndpoint as WireEndpoint;
    }

    // 2. Check breadboard surface -> snap to nearest hole
    const bbHits = this.raycaster.intersectObject(this.breadboard.group, true);
    if (bbHits.length > 0) {
      const nearest = this.breadboard.findNearestHole(bbHits[0].point);
      return { kind: 'breadboard', col: nearest.col, row: nearest.row };
    }
    return null;
  }

  private pickSandboxDeleteItem(
    clientX: number,
    clientY: number,
  ): { kind: 'part' | 'wire'; id: string } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);

    const hits = this.raycaster.intersectObject(this.dynamicCircuitGroup, true);
    for (const h of hits) {
      const item = h.object.userData.sandboxItem as { kind: 'part' | 'wire'; id: string } | undefined;
      if (item) return item;
    }
    return null;
  }

  private getHoverTarget(clientX: number, clientY: number): HoverPartInfo | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);

    // Prioritize dynamic components & ESP board before the underlying breadboard
    const targets = this.sandboxModeActive
      ? [this.boardPinPadsGroup, this.dynamicCircuitGroup, this.esp32.group, this.breadboard.group]
      : [this.dynamicCircuitGroup, this.esp32.group, this.breadboard.group];
    for (const root of targets) {
      if (!root.visible) continue;
      const hits = this.raycaster.intersectObject(root, true);
      for (const h of hits) {
        const info = h.object.userData.hoverInfo as HoverPartInfo | undefined;
        if (info) return info;
      }
    }
    return null;
  }

  private hitTestButton(clientX: number, clientY: number): boolean {
    if (!this.activeButton) return false;
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;

    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObject(this.activeButton.group, true);
    return hits.some((h) => h.object.userData.interactive === 'button');
  }

  private readonly onPointerMove = (e: PointerEvent): void => {
    const hitBtn = this.hitTestButton(e.clientX, e.clientY);
    this.activeButton?.setHovered(hitBtn);

    if (this.sandboxModeActive && this.sandboxTool !== 'delete') {
      const showGhost =
        this.hoverGhostPartType !== null &&
        (this.sandboxTool === 'place' ||
          (this.sandboxTool === 'move' && this.selectedMovePartId !== null));
      const showSnap =
        this.sandboxTool === 'place' ||
        this.sandboxTool === 'wire' ||
        (this.sandboxTool === 'move' && this.selectedMovePartId !== null);
      if (showSnap) {
        const ep = this.pickSandboxEndpoint(e.clientX, e.clientY);
        if (ep && (this.sandboxTool === 'wire' || ep.kind === 'breadboard')) {
          const snapEp =
            this.sandboxTool !== 'wire' && ep.kind === 'breadboard' && ep.row
              ? { ...ep, row: normalizePartRow(ep.row) }
              : ep;
          const pos = this.resolveEndpointWorld(snapEp);
          this.hoverSnapRing.position.set(pos.x, pos.y + 0.05, pos.z);
          this.hoverSnapRing.visible = !showGhost;

          if (showGhost && ep.kind === 'breadboard' && ep.col !== undefined && this.hoverGhostPartType) {
            this.updateHoverGhost(this.hoverGhostPartType, ep.col, ep.row ?? 'g');
          } else {
            this.hoverGhostGroup.visible = false;
          }
        } else {
          this.hoverSnapRing.visible = false;
          this.hoverGhostGroup.visible = false;
        }
      } else {
        this.hoverSnapRing.visible = false;
        this.hoverGhostGroup.visible = false;
      }
    } else {
      this.hoverSnapRing.visible = false;
      this.hoverGhostGroup.visible = false;
    }

    const hoverInfo = this.getHoverTarget(e.clientX, e.clientY);
    this.callbacks.onHoverPartChange?.(hoverInfo, e.clientX, e.clientY);

    if (
      hitBtn ||
      this.isPointerHoldingButton ||
      hoverInfo?.removable ||
      this.sandboxModeActive
    ) {
      this.renderer.domElement.style.cursor =
        this.sandboxModeActive && this.sandboxTool === 'delete'
          ? 'crosshair'
          : this.sandboxModeActive && this.sandboxTool === 'move'
            ? this.selectedMovePartId
              ? 'grabbing'
              : 'grab'
            : 'pointer';
    } else {
      this.renderer.domElement.style.cursor = 'grab';
    }
  };

  private readonly onPointerLeave = (): void => {
    this.activeButton?.setHovered(false);
    this.hoverSnapRing.visible = false;
    this.hoverGhostGroup.visible = false;
    this.callbacks.onHoverPartChange?.(null, 0, 0);
  };

  private readonly onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    this.pointerDownPos = { x: e.clientX, y: e.clientY };

    if (this.hitTestButton(e.clientX, e.clientY)) {
      this.isPointerHoldingButton = true;
      this.controls.enabled = false;
      this.callbacks.onButtonPressChange?.(true);
    }
  };

  private readonly onPointerUp = (e: PointerEvent): void => {
    if (this.isPointerHoldingButton) {
      this.isPointerHoldingButton = false;
      this.controls.enabled = true;
      this.callbacks.onButtonPressChange?.(false);
      this.pointerDownPos = null;
      return;
    }

    // Short click (< 5px drag)
    if (this.pointerDownPos) {
      const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
      this.pointerDownPos = null;
      if (dist < 5) {
        if (this.sandboxModeActive) {
          if (this.sandboxTool === 'delete') {
            const target = this.pickSandboxDeleteItem(e.clientX, e.clientY);
            if (target) this.callbacks.onSandboxDeleteItem?.(target.kind, target.id);
          } else if (this.sandboxTool === 'move') {
            if (!this.selectedMovePartId) {
              const target = this.pickSandboxDeleteItem(e.clientX, e.clientY);
              if (target?.kind === 'part') {
                this.callbacks.onSandboxPickPart?.(target.id);
              }
            } else {
              const ep = this.pickSandboxEndpoint(e.clientX, e.clientY);
              if (ep && ep.kind === 'breadboard') {
                this.callbacks.onSandboxEndpointClick?.(ep);
              }
            }
          } else {
            const ep = this.pickSandboxEndpoint(e.clientX, e.clientY);
            if (ep) this.callbacks.onSandboxEndpointClick?.(ep);
          }
          return;
        }
        const hoverInfo = this.getHoverTarget(e.clientX, e.clientY);
        if (hoverInfo?.removable) {
          this.callbacks.onTogglePartRemoved?.(hoverInfo.partId);
        }
      }
    }
  };

  private startRenderLoop(): void {
    const tick = (now: number) => {
      if (this.disposed) return;
      this.rafId = requestAnimationFrame(tick);

      const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000);
      this.lastFrameTime = now;

      if (this.paused || this.contextLost) return;
      if (this.container.clientWidth === 0 || this.container.clientHeight === 0) return;

      if (this.cameraAnimTargetPos && this.cameraAnimLookAt) {
        const alpha = 1 - Math.exp(-dt * 5.5);
        this.camera.position.lerp(this.cameraAnimTargetPos, alpha);
        this.controls.target.lerp(this.cameraAnimLookAt, alpha);

        if (
          this.camera.position.distanceTo(this.cameraAnimTargetPos) < 0.04 &&
          this.controls.target.distanceTo(this.cameraAnimLookAt) < 0.04
        ) {
          this.camera.position.copy(this.cameraAnimTargetPos);
          this.controls.target.copy(this.cameraAnimLookAt);
          this.cameraAnimTargetPos = null;
          this.cameraAnimLookAt = null;
        }
      }

      this.activeButton?.update(dt);
      this.activeServo?.setAngle(this.targetServoDeg, dt);
      this.activeCoolingFan?.update(dt);
      if (this.sandboxModeActive && this.markerGroup.children.length > 0) {
        const pulse = 1.0 + Math.sin(this.lastSandboxElapsed * 6.5) * 0.22;
        for (const ch of this.markerGroup.children) {
          if (ch.userData.pulseBaseY !== undefined) {
            ch.scale.set(pulse, pulse, 1);
          }
        }
      }
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.removeEventListener('pointerleave', this.onPointerLeave);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestored);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
