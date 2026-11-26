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
      // Slightly warm off-white ABS plastic with subtle matte surface gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGrad.addColorStop(0, '#eef2f6');
      bgGrad.addColorStop(0.5, '#e7ecf2');
      bgGrad.addColorStop(1, '#dfe6ee');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Outer molded ABS chamfer highlight & groove
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 12;
      ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 3;
      ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);

      // Power rail separator lines
      const toCanvasX = (x: number) => ((x + width / 2) / width) * canvas.width;
      const toCanvasY = (z: number) => ((z + depth / 2) / depth) * canvas.height;

      // Snap-off power rail molded seam grooves
      ctx.fillStyle = '#cfd8e3';
      ctx.fillRect(24, toCanvasY(-1.76) - 4, canvas.width - 48, 8);
      ctx.fillRect(24, toCanvasY(1.76) - 4, canvas.width - 48, 8);

      // Center DIP trench recess shading
      const midY = canvas.height / 2;
      const trenchGrad = ctx.createLinearGradient(0, midY - 28, 0, midY + 28);
      trenchGrad.addColorStop(0, '#c4cfd9');
      trenchGrad.addColorStop(0.25, '#d6dee7');
      trenchGrad.addColorStop(0.75, '#dce3ec');
      trenchGrad.addColorStop(1, '#eef2f6');
      ctx.fillStyle = trenchGrad;
      ctx.fillRect(36, midY - 26, canvas.width - 72, 52);
      ctx.strokeStyle = '#aebbc9';
      ctx.lineWidth = 2;
      ctx.strokeRect(36, midY - 26, canvas.width - 72, 52);

      // Subtle chamfer bevel rings printed around every breadboard socket
      const allRows = ['j', 'i', 'h', 'g', 'f', 'e', 'd', 'c', 'b', 'a', '-top', '+top', '+bot', '-bot'];
      for (let col = 1; col <= this.spec.cols; col++) {
        const cx = toCanvasX(this.colToLocalX(col));
        for (const r of allRows) {
          if ((r.includes('top') || r.includes('bot')) && col % 6 === 0 && col < 30) continue;
          const cy = toCanvasY(BOARD_ROWS[r]);
          ctx.fillStyle = '#c8d2de';
          ctx.fillRect(cx - 16, cy - 16, 32, 32);
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(cx - 14, cy + 12, 28, 3);
          ctx.fillRect(cx + 12, cy - 14, 3, 28);
        }
      }

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

    // Subtle 3D recess strip for the central DIP channel + molded side rails
    const trenchGeo = new THREE.BoxGeometry(width - 0.5, 0.036, 0.24);
    const trenchMat = new THREE.MeshStandardMaterial({
      color: 0xc2ccd8,
      roughness: 0.65,
    });
    const trenchMesh = new THREE.Mesh(trenchGeo, trenchMat);
    trenchMesh.position.y = height + 0.004;
    this.group.add(trenchMesh);

    // Authentic MB-102 dovetail interlocking tabs along top/right edges
    const tabMat = new THREE.MeshStandardMaterial({
      color: 0xd6dde5,
      roughness: 0.44,
      metalness: 0.05,
    });
    for (const tx of [-2.4, 2.4]) {
      const tab = new THREE.Mesh(new THREE.BoxGeometry(0.46, height * 0.72, 0.14), tabMat);
      tab.position.set(tx, height * 0.44, -depth / 2 - 0.06);
      tab.castShadow = true;
      this.group.add(tab);
    }
    for (const tz of [-1.25, 1.25]) {
      const tab = new THREE.Mesh(new THREE.BoxGeometry(0.14, height * 0.72, 0.42), tabMat);
      tab.position.set(width / 2 + 0.06, height * 0.44, tz);
      tab.castShadow = true;
      this.group.add(tab);
    }
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

    const holeGeo = new THREE.BoxGeometry(0.118, 0.04, 0.118);
    const holeMat = new THREE.MeshStandardMaterial({
      color: 0x0b1120,
      roughness: 0.8,
      metalness: 0.15,
    });

    // Metallic phosphor-bronze/nickel spring clips glinting inside each socket
    const clipGeo = new THREE.BoxGeometry(0.056, 0.046, 0.028);
    const clipMat = new THREE.MeshStandardMaterial({
      color: 0xdbe2ea,
      metalness: 0.92,
      roughness: 0.2,
    });

    const instanced = new THREE.InstancedMesh(holeGeo, holeMat, holePositions.length);
    const clips = new THREE.InstancedMesh(clipGeo, clipMat, holePositions.length);
    const dummy = new THREE.Object3D();
    const clipDummy = new THREE.Object3D();
    const y = this.spec.height - 0.005;

    holePositions.forEach(([x, z], idx) => {
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      instanced.setMatrixAt(idx, dummy.matrix);

      clipDummy.position.set(x, y + 0.002, z);
      clipDummy.updateMatrix();
      clips.setMatrixAt(idx, clipDummy.matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
    clips.instanceMatrix.needsUpdate = true;
    this.group.add(instanced);
    this.group.add(clips);
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
