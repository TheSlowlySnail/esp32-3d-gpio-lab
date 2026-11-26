import * as THREE from 'three';

/**
 * Klickbarer 3D-Kurzhub-Taster (SPST) mit physikalischer Druck-Animation,
 * Hover-Highlight und Raycasting-Markierung.
 */
export class ButtonMesh {
  public readonly group = new THREE.Group();
  private readonly plungerGroup = new THREE.Group();
  private readonly capMat: THREE.MeshStandardMaterial;

  private targetPress = 0;
  private currentPress = 0;
  private hovered = false;

  constructor(centerPos: THREE.Vector3) {
    this.group.name = 'Tactile_Button';
    this.group.position.copy(centerPos);

    // 4 gebogene Gull-Wing-Beinchen (treten seitlich aus dem Taster-Gehäuse aus und knicken nach unten ab)
    const legMat = new THREE.MeshStandardMaterial({
      color: 0xdbe2ea,
      metalness: 0.92,
      roughness: 0.2,
    });
    const legOffsets: Array<[number, number]> = [
      [-0.28, -0.26],
      [0.28, -0.26],
      [-0.28, 0.26],
      [0.28, 0.26],
    ];
    for (const [lx, lz] of legOffsets) {
      const sx = Math.sign(lx);
      const pts = [
        new THREE.Vector3(lx - sx * 0.06, 0.19, lz),
        new THREE.Vector3(lx + sx * 0.14, 0.19, lz),
        new THREE.Vector3(lx + sx * 0.14, -0.05, lz),
      ];
      const legCurve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.08);
      const leg = new THREE.Mesh(new THREE.TubeGeometry(legCurve, 12, 0.028, 6, false), legMat);
      this.group.add(leg);
    }

    // Dark molded plastic base mit leicht abgesetzter Unterkante
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x161b26,
      roughness: 0.48,
      metalness: 0.12,
    });
    const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.26, 0.76), baseMat);
    baseMesh.position.y = 0.23;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    baseMesh.userData.interactive = 'button';
    this.group.add(baseMesh);

    // Gebürstete Metall-Deckplatte + gestanzter Führungs-Kragen um den Stößel
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0xd4dbe3,
      metalness: 0.88,
      roughness: 0.22,
    });
    const plateMesh = new THREE.Mesh(new THREE.BoxGeometry(0.73, 0.055, 0.73), plateMat);
    plateMesh.position.y = 0.38;
    plateMesh.userData.interactive = 'button';
    this.group.add(plateMesh);

    const collarRing = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.028, 10, 24), plateMat);
    collarRing.rotation.x = Math.PI / 2;
    collarRing.position.y = 0.415;
    this.group.add(collarRing);

    // 4 small black corner heat-staked rivets
    const rivetGeo = new THREE.CylinderGeometry(0.054, 0.06, 0.045, 14);
    const rivetPositions: Array<[number, number]> = [
      [-0.26, -0.26],
      [0.26, -0.26],
      [-0.26, 0.26],
      [0.26, 0.26],
    ];
    for (const [rx, rz] of rivetPositions) {
      const rivet = new THREE.Mesh(rivetGeo, baseMat);
      rivet.position.set(rx, 0.415, rz);
      this.group.add(rivet);
    }

    // Animated plunger cap mit ergonomisch abgeschrägter Oberkante & feinem Ring
    this.capMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.2,
      roughness: 0.28,
      metalness: 0.14,
    });

    const stemMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.225, 0.26, 28),
      this.capMat,
    );
    stemMesh.position.y = 0.52;
    stemMesh.castShadow = true;
    stemMesh.userData.interactive = 'button';
    this.plungerGroup.add(stemMesh);

    const topBevel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.21, 0.048, 28),
      this.capMat,
    );
    topBevel.position.y = 0.67;
    topBevel.userData.interactive = 'button';
    this.plungerGroup.add(topBevel);

    const topRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.014, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.25, metalness: 0.2 }),
    );
    topRing.rotation.x = Math.PI / 2;
    topRing.position.y = 0.695;
    this.plungerGroup.add(topRing);

    this.group.add(this.plungerGroup);
  }

  public setPressed(pressed: boolean): void {
    this.targetPress = pressed ? 1 : 0;
  }

  public setHovered(hovered: boolean): void {
    this.hovered = hovered;
    this.refreshCapAppearance();
  }

  private refreshCapAppearance(): void {
    if (this.targetPress > 0.5) {
      this.capMat.color.setHex(0x38bdf8);
      this.capMat.emissive.setHex(0x38bdf8);
      this.capMat.emissiveIntensity = 0.75;
    } else if (this.hovered) {
      this.capMat.color.setHex(0x22d3ee);
      this.capMat.emissive.setHex(0x06b6d4);
      this.capMat.emissiveIntensity = 0.48;
    } else {
      this.capMat.color.setHex(0x0ea5e9);
      this.capMat.emissive.setHex(0x0284c7);
      this.capMat.emissiveIntensity = 0.2;
    }
  }

  public update(deltaSeconds: number): void {
    const speed = Math.min(1, deltaSeconds * 22);
    this.currentPress += (this.targetPress - this.currentPress) * speed;
    // Physically depress the plunger down into the housing
    this.plungerGroup.position.y = -this.currentPress * 0.13;
    this.refreshCapAppearance();
  }
}
