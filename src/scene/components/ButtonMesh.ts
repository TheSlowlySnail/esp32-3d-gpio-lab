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

    // 4 bent metallic legs going into breadboard holes around the center trench
    const legMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.88,
      roughness: 0.25,
    });
    const legGeo = new THREE.BoxGeometry(0.055, 0.3, 0.055);
    const legOffsets: Array<[number, number]> = [
      [-0.28, -0.26],
      [0.28, -0.26],
      [-0.28, 0.26],
      [0.28, 0.26],
    ];
    for (const [lx, lz] of legOffsets) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, 0.08, lz);
      this.group.add(leg);
    }

    // Dark molded plastic base
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x181c24,
      roughness: 0.55,
      metalness: 0.1,
    });
    const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.28, 0.76), baseMat);
    baseMesh.position.y = 0.22;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    baseMesh.userData.interactive = 'button';
    this.group.add(baseMesh);

    // Metallic top retainer plate
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.82,
      roughness: 0.28,
    });
    const plateMesh = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.05, 0.72), plateMat);
    plateMesh.position.y = 0.375;
    plateMesh.userData.interactive = 'button';
    this.group.add(plateMesh);

    // 4 small black corner rivets
    const rivetGeo = new THREE.CylinderGeometry(0.048, 0.048, 0.04, 12);
    const rivetPositions: Array<[number, number]> = [
      [-0.26, -0.26],
      [0.26, -0.26],
      [-0.26, 0.26],
      [0.26, 0.26],
    ];
    for (const [rx, rz] of rivetPositions) {
      const rivet = new THREE.Mesh(rivetGeo, baseMat);
      rivet.position.set(rx, 0.405, rz);
      this.group.add(rivet);
    }

    // Animated plunger cap (cyan-accented dark cap so user immediately spots it as interactive)
    this.capMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.2,
      roughness: 0.32,
      metalness: 0.12,
    });

    const stemMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.22, 0.26, 24),
      this.capMat,
    );
    stemMesh.position.y = 0.52;
    stemMesh.castShadow = true;
    stemMesh.userData.interactive = 'button';
    this.plungerGroup.add(stemMesh);

    // Subtle concave top rim
    const topDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.21, 0.04, 24),
      this.capMat,
    );
    topDisc.position.y = 0.66;
    topDisc.userData.interactive = 'button';
    this.plungerGroup.add(topDisc);

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
