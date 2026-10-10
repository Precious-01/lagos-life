import type { StreetPropSpec } from '../game/street';
import type { BoxPart } from './InstancedBoxes';

function part(
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  color: string,
  rotationY = 0,
): BoxPart {
  return { x, y, z, width, height, depth, color, rotationY };
}

/** +1 when the prop faces +Z (north kerb), -1 when it faces -Z (south kerb). The road is at z = 0. */
function roadDirection(prop: StreetPropSpec): 1 | -1 {
  return prop.z < 0 ? 1 : -1;
}

const GOODS_COLORS = ['#e07a1f', '#3f8f3a', '#c8302d', '#f0c14b'] as const;

function kioskParts(prop: StreetPropSpec): BoxPart[] {
  const dir = roadDirection(prop);
  const front = prop.z + (dir * prop.depth) / 2;
  const parts: BoxPart[] = [
    part(prop.x, 1.1, prop.z, prop.width, 2.2, prop.depth, '#3f8f6a'),
    part(prop.x, 2.3, prop.z, prop.width + 0.6, 0.2, prop.depth + 0.6, '#c8553d'),
    part(prop.x, 1.5, front + dir * 0.03, prop.width * 0.6, 0.9, 0.08, '#1f2a2a'),
    part(prop.x, 0.95, front + dir * 0.1, prop.width * 0.7, 0.1, 0.3, '#8a5a3c'),
  ];
  GOODS_COLORS.forEach((color, i) => {
    parts.push(part(prop.x - 0.9 + i * 0.6, 1.2, front + dir * 0.08, 0.4, 0.4, 0.25, color));
  });
  return parts;
}

function stallParts(prop: StreetPropSpec): BoxPart[] {
  const dir = roadDirection(prop);
  const front = prop.z + (dir * prop.depth) / 2;
  const tableZ = prop.z + dir * 0.5;
  const parts: BoxPart[] = [part(prop.x, 0.45, tableZ, prop.width, 0.9, 1.2, '#8a5a3c')];

  for (let i = 0; i < 8; i += 1) {
    const column = i % 4;
    const row = Math.floor(i / 4);
    parts.push(
      part(
        prop.x - 1.05 + column * 0.7,
        1.075,
        tableZ + (row === 0 ? -0.3 : 0.3),
        0.5,
        0.35,
        0.45,
        GOODS_COLORS[i % GOODS_COLORS.length],
      ),
    );
  }

  // Striped canopy.
  const stripes = 4;
  const canopyWidth = prop.width + 0.4;
  for (let i = 0; i < stripes; i += 1) {
    parts.push(
      part(
        prop.x - canopyWidth / 2 + (canopyWidth / stripes) * (i + 0.5),
        2.3,
        prop.z,
        canopyWidth / stripes,
        0.1,
        prop.depth + 0.4,
        i % 2 === 0 ? '#c8553d' : '#f3e6c8',
      ),
    );
  }

  for (const side of [-1, 1]) {
    parts.push(
      part(
        prop.x + side * (prop.width / 2 - 0.05),
        1.15,
        front - dir * 0.05,
        0.1,
        2.3,
        0.1,
        '#4a3a2e',
      ),
    );
  }
  return parts;
}

function danfoParts(prop: StreetPropSpec): BoxPart[] {
  const { x, z } = prop;
  const yellow = '#f2c200';
  const glass = '#1d2a33';
  const dark = '#151515';
  // The danfo faces +X (east).
  const parts: BoxPart[] = [
    part(x, 1.0, z, 7, 1.3, 2.4, yellow),
    part(x, 1.05, z, 7.04, 0.22, 2.44, '#1a1a1a'),
    part(x - 0.3, 2.05, z, 5.8, 0.9, 2.3, yellow),
    part(x - 0.3, 2.55, z, 5.9, 0.1, 2.4, '#e0b000'),
    part(x - 0.3, 2.05, z, 5.0, 0.5, 2.34, glass),
    part(x + 2.6, 2.05, z, 0.06, 0.6, 2.0, glass),
    part(x - 3.2, 2.05, z, 0.06, 0.6, 2.0, glass),
    part(x + 3.5, 0.55, z, 0.12, 0.3, 2.4, '#222222'),
    part(x - 3.5, 0.55, z, 0.12, 0.3, 2.4, '#222222'),
    part(x + 3.52, 0.95, z - 0.8, 0.06, 0.25, 0.35, '#fff2c0'),
    part(x + 3.52, 0.95, z + 0.8, 0.06, 0.25, 0.35, '#fff2c0'),
  ];
  for (const wheelX of [-2.3, 2.3]) {
    for (const wheelSide of [-1, 1]) {
      parts.push(part(x + wheelX, 0.45, z + wheelSide * 1.12, 0.9, 0.9, 0.3, dark));
    }
  }
  return parts;
}

function fenceParts(prop: StreetPropSpec): BoxPart[] {
  const color = '#3d4a55';
  const posts = Math.max(1, Math.round(prop.width / 2));
  const parts: BoxPart[] = [
    part(prop.x, prop.height - 0.1, prop.z, prop.width, 0.08, 0.08, color),
    part(prop.x, prop.height * 0.5, prop.z, prop.width, 0.08, 0.08, color),
  ];
  for (let i = 0; i <= posts; i += 1) {
    parts.push(
      part(
        prop.x - prop.width / 2 + (prop.width / posts) * i,
        prop.height / 2,
        prop.z,
        0.1,
        prop.height,
        0.1,
        color,
      ),
    );
  }
  return parts;
}

function palmParts(prop: StreetPropSpec): BoxPart[] {
  const { x, z } = prop;
  const parts: BoxPart[] = [
    part(x, 3, z, 0.35, 6, 0.35, '#8a6a4a'),
    part(x, 6.1, z, 0.7, 0.5, 0.7, '#6b5a3a'),
  ];
  for (let k = 0; k < 6; k += 1) {
    const angle = (k * Math.PI) / 3;
    parts.push(
      part(
        x + Math.cos(angle) * 1.4,
        6.3,
        z + Math.sin(angle) * 1.4,
        2.8,
        0.1,
        0.55,
        k % 2 === 0 ? '#2f6b34' : '#3f7d3a',
        -angle,
      ),
    );
  }
  for (let k = 0; k < 3; k += 1) {
    const angle = (k * 2 * Math.PI) / 3 + Math.PI / 6;
    parts.push(
      part(
        x + Math.cos(angle) * 0.7,
        6.55,
        z + Math.sin(angle) * 0.7,
        1.6,
        0.1,
        0.45,
        '#4a8f3f',
        -angle,
      ),
    );
  }
  return parts;
}

function poleParts(prop: StreetPropSpec): BoxPart[] {
  const { x, z, height } = prop;
  const parts: BoxPart[] = [
    part(x, height / 2, z, 0.3, height, 0.3, '#6b5a48'),
    part(x, height - 0.7, z, 2.4, 0.14, 0.14, '#4a3a2e'),
    part(x, height - 1.5, z, 1.8, 0.14, 0.14, '#4a3a2e'),
  ];
  for (const offset of [-0.9, 0, 0.9]) {
    parts.push(part(x + offset, height - 0.5, z, 0.1, 0.25, 0.1, '#2b2b2b'));
  }
  return parts;
}

function streetlightParts(prop: StreetPropSpec): BoxPart[] {
  const dir = roadDirection(prop);
  const { x, z, height } = prop;
  return [
    part(x, height / 2, z, 0.2, height, 0.2, '#4a5058'),
    part(x, height - 0.1, z + dir * 0.8, 0.12, 0.12, 1.6, '#4a5058'),
    part(x, height - 0.2, z + dir * 1.6, 0.35, 0.15, 0.6, '#f6e7b0'),
  ];
}

/** The boxes that draw one prop. Visuals only: collision uses the prop's footprint. */
export function propBoxes(prop: StreetPropSpec): BoxPart[] {
  switch (prop.type) {
    case 'kiosk':
      return kioskParts(prop);
    case 'market-stall':
      return stallParts(prop);
    case 'danfo':
      return danfoParts(prop);
    case 'fence':
      return fenceParts(prop);
    case 'palm':
      return palmParts(prop);
    case 'utility-pole':
      return poleParts(prop);
    case 'streetlight':
      return streetlightParts(prop);
  }
}
