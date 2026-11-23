import * as THREE from 'three';

export interface BreadboardGridSpec {
  cols: number;
  pitch: number;
  width: number;
  height: number;
  depth: number;
}

const ROW_Z_OFFSETS: Record<string, number> = {
  '+top': -2.15,
  '-top': -1.83,
  j: -1.16,
  i: -0.84,
  h: -0.52,
  g: -0.20,
  f: 0.12,
  // Center DIP channel between f (0.12) and e (0.64) — symmetric around z=0 below
};

// Re-centering rows symmetrically around z = 0
const SYMMETRIC_ROWS: Record<string, number> = {
  '+top': -2.18,
  '-top': -1.86,
  j: -1.28,
  i: -0.98,
  h: -0.68,
  g: -0.38,
  f: -0.08,
  // Center trench at z = 0.0 -> wait: let's make trench cleanly around z=0!
  // Let's use exact symmetric values:
  e: 0.34,
  d: 0.64,
  c: 0.94,
  b: 1.24,
  a: 1.54,
  '+bot': 2.02,
  '-bot': 2.34,
};

// Actually let's keep exact symmetry around Z=0:
const BOARD_ROWS: Record<string, number> = {
  '-top': -2.35,
  '+top': -2.03,
  j: -1.46,
  i: -1.16,
  h: -0.86,
  g: -0.56,
  f: -0.26,
  e: 0.26,
  d: 0.56,
  c: 0.86,
  b: 1.16,
  a: 1.46,
  '+bot': 2.03,
  '-bot': 2.35,
};

void ROW_Z_OFFSETS;
void SYMMETRIC_ROWS;

export class BreadboardMesh {
  public readonly group = new THREE.Group();
  public readonly spec: BreadboardGridSpec = {
    cols: 30,
    pitch: 0.28,
    width: 9.2,
    height: 0.62,
    depth: 5.5,
  };

  constructor() {
    this.group.name = 'Breadboard';
    this.buildBody();
    this.buildHoles();
  }

  private buildBody(): void {
    const { width, height, depth } = this.spec;

    // Top surface canvas texture with silkscreen rails, numbers and letters
    const canvas = document.createElement('canvas');
    canvas.width = 1840;
    canvas.height = 1100;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Slightly warm off-white ABS plastic
      ctx.fillStyle = '#e8ecf0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle border bevel
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

      // Center DIP trench shadow
      const midY = canvas.height / 2;
      ctx.fillStyle = '#d5dce4';
      ctx.fillRect(40, midY - 24, canvas.width - 80, 48);
      ctx.strokeStyle = '#b9c4d0';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, midY - 24, canvas.width - 80, 48);

      // Power rail separator lines
      const toCanvasX = (x: number) => ((x + width / 2) / width) * canvas.width;
      const toCanvasY = (z: number) => ((z + depth / 2) / depth) * canvas.height;

      // Top blue (-) and red (+) lines
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#2563eb';
      ctx.beginPath();
      ctx.moveTo(toCanvasX(-4.15), toCanvasY(-2.55));
      ctx.lineTo(toCanvasX(4.15), toCanvasY(-2.55));
      ctx.stroke();

      ctx.strokeStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(toCanvasX(-4.15), toCanvasY(-1.82));
      ctx.lineTo(toCanvasX(4.15), toCanvasY(-1.82));
      ctx.stroke();

      // Bottom red (+) and blue (-) lines
      ctx.strokeStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(toCanvasX(-4.15), toCanvasY(1.82));
      ctx.lineTo(toCanvasX(4.15), toCanvasY(1.82));
      ctx.stroke();

      ctx.strokeStyle = '#2563eb';
      ctx.beginPath();
      ctx.moveTo(toCanvasX(-4.15), toCanvasY(2.55));
      ctx.lineTo(toCanvasX(4.15), toCanvasY(2.55));
      ctx.stroke();

      // + / - Symbols
      ctx.font = 'bold 28px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const sideX of [-4.32, 4.32]) {
        ctx.fillStyle = '#2563eb';
        ctx.fillText('−', toCanvasX(sideX), toCanvasY(-2.35));
        ctx.fillText('−', toCanvasX(sideX), toCanvasY(2.35));
        ctx.fillStyle = '#dc2626';
        ctx.fillText('+', toCanvasX(sideX), toCanvasY(-2.03));
        ctx.fillText('+', toCanvasX(sideX), toCanvasY(2.03));
      }

      // Column numbers (1, 5, 10, 15, 20, 25, 30)
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 22px JetBrains Mono, monospace';
      for (let col = 1; col <= this.spec.cols; col++) {
        if (col === 1 || col % 5 === 0) {
          const x = this.colToLocalX(col);
          ctx.fillText(String(col), toCanvasX(x), toCanvasY(-1.67));
          ctx.fillText(String(col), toCanvasX(x), toCanvasY(1.67));
        }
      }

      // Row letters a-e, f-j
      ctx.font = 'bold 21px JetBrains Mono, monospace';
      const letters = ['j', 'i', 'h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
      for (const letter of letters) {
        const z = BOARD_ROWS[letter];
        ctx.fillText(letter, toCanvasX(-4.34), toCanvasY(z));
        ctx.fillText(letter, toCanvasX(4.34), toCanvasY(z));
      }
    }

    const topTexture = new THREE.CanvasTexture(canvas);
    topTexture.colorSpace = THREE.SRGBColorSpace;
    topTexture.anisotropy = 8;

    const sideMat = new THREE.MeshStandardMaterial({
      color: 0xd9dfe6,
      roughness: 0.45,
      metalness: 0.05,
    });
    const topMat = new THREE.MeshStandardMaterial({
      map: topTexture,
      roughness: 0.42,
      metalness: 0.04,
    });

    const bodyGeo = new THREE.BoxGeometry(width, height, depth);
    const bodyMesh = new THREE.Mesh(bodyGeo, [
      sideMat,
      sideMat,
      topMat,
      sideMat,
      sideMat,
      sideMat,
    ]);
    bodyMesh.position.y = height / 2;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    this.group.add(bodyMesh);

    // Subtle dark rubber base pad underneath
    const baseGeo = new THREE.BoxGeometry(width - 0.14, 0.08, depth - 0.14);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.04;
    this.group.add(baseMesh);

    // Subtle 3D recess strip for the central DIP channel
    const trenchGeo = new THREE.BoxGeometry(width - 0.5, 0.04, 0.22);
    const trenchMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.65,
    });
    const trenchMesh = new THREE.Mesh(trenchGeo, trenchMat);
    trenchMesh.position.y = height + 0.005;
    this.group.add(trenchMesh);
  }

  private buildHoles(): void {
    const holePositions: Array<[number, number]> = [];

    // Main terminal strips (a-e, f-j)
    const mainRows = ['j', 'i', 'h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
    for (let col = 1; col <= this.spec.cols; col++) {
      const x = this.colToLocalX(col);
      for (const r of mainRows) {
        holePositions.push([x, BOARD_ROWS[r]]);
      }
    }

    // Power rails (grouped in blocks of 5 with gaps, authentic breadboard look)
    const railRows = ['-top', '+top', '+bot', '-bot'];
    for (let col = 1; col <= this.spec.cols; col++) {
      // Leave small break every 6th column on outer rails
      if (col % 6 === 0 && col < 30) continue;
      const x = this.colToLocalX(col);
      for (const r of railRows) {
        holePositions.push([x, BOARD_ROWS[r]]);
      }
    }

    const holeGeo = new THREE.BoxGeometry(0.115, 0.04, 0.115);
    const holeMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.7,
      metalness: 0.25,
    });

    const instanced = new THREE.InstancedMesh(holeGeo, holeMat, holePositions.length);
    const dummy = new THREE.Object3D();
    const y = this.spec.height - 0.005;

    holePositions.forEach(([x, z], idx) => {
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      instanced.setMatrixAt(idx, dummy.matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
    this.group.add(instanced);
  }

  private colToLocalX(col: number): number {
    const centerCol = (this.spec.cols + 1) / 2;
    return (col - centerCol) * this.spec.pitch;
  }

  /**
   * Gibt die lokale Position eines Steckbrett-Lochs an der Oberseite zurück.
   * col: 1..30, row: 'a'..'j' | '+top' | '-top' | '+bot' | '-bot'
   */
  public getLocalHolePosition(col: number, row: string): THREE.Vector3 {
    const x = this.colToLocalX(col);
    const z = BOARD_ROWS[row] ?? 0;
    return new THREE.Vector3(x, this.spec.height, z);
  }

  /**
   * Gibt die Weltposition eines Steckbrett-Lochs zurück.
   */
  public getWorldHolePosition(col: number, row: string): THREE.Vector3 {
    const local = this.getLocalHolePosition(col, row);
    this.group.updateMatrixWorld(true);
    return local.applyMatrix4(this.group.matrixWorld);
  }

  /**
   * Findet zu einem 3D-Weltpunkt auf der Breadboard-Oberfläche das nächstgelegene Steckloch.
   */
  public findNearestHole(worldPoint: THREE.Vector3): { col: number; row: string } {
    this.group.updateMatrixWorld(true);
    const inv = this.group.matrixWorld.clone().invert();
    const local = worldPoint.clone().applyMatrix4(inv);

    const centerCol = (this.spec.cols + 1) / 2;
    const rawCol = Math.round(local.x / this.spec.pitch + centerCol);
    const col = Math.max(1, Math.min(this.spec.cols, rawCol));

    let bestRow = 'g';
    let bestDist = Infinity;
    for (const [rowKey, rz] of Object.entries(BOARD_ROWS)) {
      const d = Math.abs(local.z - rz);
      if (d < bestDist) {
        bestDist = d;
        bestRow = rowKey;
      }
    }
    return { col, row: bestRow };
  }
}
