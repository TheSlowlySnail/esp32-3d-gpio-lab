import * as THREE from 'three';
import { getResistorColorBands } from '../../engine/ComponentRegistry';

/**
 * 3D-Kohleschicht-Widerstand mit authentischer Kontur, gebogenen Metall-Beinchen
 * und 4 live aktualisierbaren Farbringen nach IEC 60062.
 */
export class ResistorMesh {
  public readonly group = new THREE.Group();
  private readonly bandMaterials: THREE.MeshStandardMaterial[] = [];
  private lastOhms = -1;

  constructor(startPos: THREE.Vector3, endPos: THREE.Vector3, initialOhms = 220) {
    this.group.name = 'Carbon_Resistor';

    const midpoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
    this.group.position.copy(midpoint);

    const dx = endPos.x - startPos.x;
    const dz = endPos.z - startPos.z;
    const span = Math.hypot(dx, dz);
    const angleY = Math.atan2(-dz, dx);
    this.group.rotation.y = angleY;

    const bodyElevation = 0.44;
    const halfSpan = span / 2;

    // Bent tinned copper leads connecting down into the two breadboard holes
    const leadMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.9,
      roughness: 0.24,
    });

    const leadPoints = [
      new THREE.Vector3(-halfSpan, -0.06, 0),
      new THREE.Vector3(-halfSpan, bodyElevation - 0.04, 0),
      new THREE.Vector3(-halfSpan + 0.08, bodyElevation, 0),
      new THREE.Vector3(halfSpan - 0.08, bodyElevation, 0),
      new THREE.Vector3(halfSpan, bodyElevation - 0.04, 0),
      new THREE.Vector3(halfSpan, -0.06, 0),
    ];
    const leadCurve = new THREE.CatmullRomCurve3(leadPoints, false, 'catmullrom', 0.12);
    const leadGeo = new THREE.TubeGeometry(leadCurve, 28, 0.028, 10, false);
    const leadMesh = new THREE.Mesh(leadGeo, leadMat);
    leadMesh.castShadow = true;
    this.group.add(leadMesh);

    // Gedrechselte LatheGeometry für nahtlose, authentische Erdnuss-Kontur des Kohleschicht-Widerstands
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0xdfb885,
      roughness: 0.36,
      metalness: 0.04,
      clearcoat: 0.45,
      clearcoatRoughness: 0.28,
    });

    const bodyLength = Math.min(0.94, Math.max(0.7, span * 0.62));
    const halfL = bodyLength / 2;
    const coreRadius = 0.142;
    const capRadius = 0.174;

    const profile: THREE.Vector2[] = [
      new THREE.Vector2(0.032, -halfL),
      new THREE.Vector2(capRadius * 0.84, -halfL + 0.015),
      new THREE.Vector2(capRadius, -halfL + 0.07),
      new THREE.Vector2(capRadius * 0.98, -halfL * 0.64),
      new THREE.Vector2(coreRadius, -halfL * 0.44),
      new THREE.Vector2(coreRadius, halfL * 0.44),
      new THREE.Vector2(capRadius * 0.98, halfL * 0.64),
      new THREE.Vector2(capRadius, halfL - 0.07),
      new THREE.Vector2(capRadius * 0.84, halfL - 0.015),
      new THREE.Vector2(0.032, halfL),
    ];
    const latheGeo = new THREE.LatheGeometry(profile, 28);
    latheGeo.rotateZ(-Math.PI / 2);
    const bodyMesh = new THREE.Mesh(latheGeo, bodyMat);
    bodyMesh.position.set(0, bodyElevation, 0);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    this.group.add(bodyMesh);

    // Feine metallische Anschluss-Hülsen direkt an beiden Kappen-Übergängen
    const ferruleGeo = new THREE.CylinderGeometry(0.052, 0.04, 0.06, 14);
    ferruleGeo.rotateZ(Math.PI / 2);
    for (const dir of [-1, 1]) {
      const f = new THREE.Mesh(ferruleGeo, leadMat);
      f.position.set(dir * (halfL + 0.025), bodyElevation, 0);
      this.group.add(f);
    }

    // 4 Color bands (d1, d2, multiplier, tolerance) exakt bündig auf dem Profil
    const bandOffsets = [
      -bodyLength * 0.28,
      -bodyLength * 0.09,
      bodyLength * 0.08,
      bodyLength * 0.29,
    ];
    const bandWidth = bodyLength * 0.092;

    bandOffsets.forEach((xOffset, idx) => {
      const r = idx === 0 || idx === 3 ? capRadius * 0.995 : coreRadius + 0.005;
      const bandGeo = new THREE.CylinderGeometry(r, r, bandWidth, 28, 1, true);
      bandGeo.rotateZ(Math.PI / 2);

      const mat = new THREE.MeshStandardMaterial({
        color: 0x000000,
        roughness: idx === 3 ? 0.22 : 0.34,
        metalness: idx === 3 ? 0.72 : 0.08,
        side: THREE.DoubleSide,
      });
      this.bandMaterials.push(mat);

      const bandMesh = new THREE.Mesh(bandGeo, mat);
      bandMesh.position.set(xOffset, bodyElevation, 0);
      this.group.add(bandMesh);
    });

    this.setResistance(initialOhms);
  }

  public setResistance(ohms: number): void {
    const rounded = Math.round(ohms);
    if (rounded === this.lastOhms) return;
    this.lastOhms = rounded;

    const bands = getResistorColorBands(rounded);
    bands.forEach((band, idx) => {
      const mat = this.bandMaterials[idx];
      if (!mat) return;
      mat.color.set(band.hex);
      // Metallic sheen for gold/silver bands
      const isMetallic = band.name === 'Gold' || band.name === 'Silber';
      mat.metalness = isMetallic ? 0.72 : 0.08;
      mat.roughness = isMetallic ? 0.24 : 0.38;
    });
  }
}
