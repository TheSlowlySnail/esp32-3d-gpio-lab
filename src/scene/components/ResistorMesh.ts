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

    // Classic beige carbon-film ceramic body (slightly hourglass / peanut shape)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xd9b382,
      roughness: 0.42,
      metalness: 0.05,
    });

    const bodyLength = Math.min(0.92, Math.max(0.68, span * 0.62));
    const coreRadius = 0.145;
    const capRadius = 0.168;

    const centerGeo = new THREE.CylinderGeometry(coreRadius, coreRadius, bodyLength * 0.68, 22);
    centerGeo.rotateZ(Math.PI / 2);
    const centerMesh = new THREE.Mesh(centerGeo, bodyMat);
    centerMesh.position.set(0, bodyElevation, 0);
    centerMesh.castShadow = true;
    this.group.add(centerMesh);

    // Rounded end caps
    const capGeo = new THREE.SphereGeometry(capRadius, 20, 16);
    capGeo.scale(0.82, 1.0, 1.0);
    for (const dir of [-1, 1]) {
      const cap = new THREE.Mesh(capGeo, bodyMat);
      cap.position.set(dir * (bodyLength * 0.34), bodyElevation, 0);
      cap.castShadow = true;
      this.group.add(cap);
    }

    // 4 Color bands (d1, d2, multiplier, tolerance)
    const bandOffsets = [
      -bodyLength * 0.25,
      -bodyLength * 0.08,
      bodyLength * 0.09,
      bodyLength * 0.27,
    ];
    const bandWidth = bodyLength * 0.095;

    bandOffsets.forEach((xOffset, idx) => {
      const r = idx === 3 ? capRadius * 0.96 : coreRadius + 0.008;
      const bandGeo = new THREE.CylinderGeometry(r, r, bandWidth, 24);
      bandGeo.rotateZ(Math.PI / 2);

      const mat = new THREE.MeshStandardMaterial({
        color: 0x000000,
        roughness: idx === 3 ? 0.25 : 0.35,
        metalness: idx === 3 ? 0.65 : 0.08,
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
