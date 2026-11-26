import * as THREE from 'three';

export interface JumperWireOptions {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: number;
  arcHeight?: number;
  lateralOffset?: number;
}

/**
 * Automatisch geroutetes 3D-Jumperkabel (CatmullRomCurve3 + TubeGeometry)
 * mit schwarzen Dupont-Steckerhülsen und metallischen Steckstiften an beiden Enden.
 */
export class JumperWireMesh {
  public readonly group = new THREE.Group();

  constructor(options: JumperWireOptions) {
    this.group.name = 'Jumper_Wire';
    const { start, end, color, arcHeight = 1.25, lateralOffset = 0 } = options;

    const pinMat = new THREE.MeshStandardMaterial({
      color: 0xdbe2ea,
      metalness: 0.92,
      roughness: 0.18,
    });
    const housingMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.48,
      metalness: 0.12,
    });
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.55,
      metalness: 0.08,
    });
    const wireMat = new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.34,
      metalness: 0.04,
      clearcoat: 0.35,
      clearcoatRoughness: 0.3,
    });

    const housingHeight = 0.36;
    const housingGeo = new THREE.BoxGeometry(0.118, housingHeight, 0.118);
    const pinGeo = new THREE.CylinderGeometry(0.024, 0.022, 0.2, 10);
    const crimpWindowGeo = new THREE.BoxGeometry(0.052, 0.09, 0.124);
    const strainReliefGeo = new THREE.CylinderGeometry(0.062, 0.072, 0.09, 12);
    const bootRingGeo = new THREE.CylinderGeometry(0.056, 0.062, 0.06, 12);

    for (const pt of [start, end]) {
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.set(pt.x, pt.y + 0.02, pt.z);
      this.group.add(pin);

      const housing = new THREE.Mesh(housingGeo, housingMat);
      housing.position.set(pt.x, pt.y + housingHeight / 2 + 0.04, pt.z);
      housing.castShadow = true;
      this.group.add(housing);

      // Authentic metallic Dupont locking-tab glint on the side of the black housing
      const crimp = new THREE.Mesh(crimpWindowGeo, pinMat);
      crimp.position.set(pt.x, pt.y + housingHeight * 0.56 + 0.04, pt.z);
      this.group.add(crimp);

      // Top molded collar + color-matched strain relief boot
      const collar = new THREE.Mesh(strainReliefGeo, collarMat);
      collar.position.set(pt.x, pt.y + housingHeight + 0.065, pt.z);
      this.group.add(collar);

      const boot = new THREE.Mesh(bootRingGeo, wireMat);
      boot.position.set(pt.x, pt.y + housingHeight + 0.125, pt.z);
      this.group.add(boot);
    }

    const p0 = new THREE.Vector3(start.x, start.y + housingHeight + 0.14, start.z);
    const p4 = new THREE.Vector3(end.x, end.y + housingHeight + 0.14, end.z);

    const dir = new THREE.Vector3().subVectors(p4, p0);
    const dist = dir.length();
    const peakY = Math.max(p0.y, p4.y) + Math.max(0.55, Math.min(arcHeight, dist * 0.38));

    // Perpendicular horizontal vector for optional clean cable routing separation
    const perp = new THREE.Vector3(-dir.z, 0, dir.x);
    if (perp.lengthSq() > 0.0001) {
      perp.normalize().multiplyScalar(lateralOffset);
    }

    const p1 = new THREE.Vector3().lerpVectors(p0, p4, 0.18);
    p1.y = Math.max(p0.y + 0.45, peakY * 0.85);
    p1.add(perp.clone().multiplyScalar(0.65));

    const p2 = new THREE.Vector3().lerpVectors(p0, p4, 0.5);
    p2.y = peakY;
    p2.add(perp);

    const p3 = new THREE.Vector3().lerpVectors(p0, p4, 0.82);
    p3.y = Math.max(p4.y + 0.45, peakY * 0.85);
    p3.add(perp.clone().multiplyScalar(0.65));

    const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3, p4], false, 'centripetal', 0.5);
    const tubeGeo = new THREE.TubeGeometry(curve, 36, 0.045, 12, false);

    const wireMesh = new THREE.Mesh(tubeGeo, wireMat);
    wireMesh.castShadow = true;
    this.group.add(wireMesh);
  }
}
