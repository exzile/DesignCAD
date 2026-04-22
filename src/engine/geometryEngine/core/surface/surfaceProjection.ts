import * as THREE from 'three';

function sampleHeightBilinear(
  heightData: Uint8ClampedArray,
  width: number,
  height: number,
  u: number,
  v: number,
  channel: 'r' | 'g' | 'b' | 'luminance',
): number {
  const x = u * (width - 1);
  const y = (1 - v) * (height - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, width - 1);
  const y1 = Math.min(y0 + 1, height - 1);
  const fx = x - x0;
  const fy = y - y0;

  const sample = (px: number, py: number): number => {
    const index = (py * width + px) * 4;
    if (channel === 'r') return heightData[index] / 255;
    if (channel === 'g') return heightData[index + 1] / 255;
    if (channel === 'b') return heightData[index + 2] / 255;
    return (
      0.299 * heightData[index] +
      0.587 * heightData[index + 1] +
      0.114 * heightData[index + 2]
    ) / 255;
  };

  const v00 = sample(x0, y0);
  const v10 = sample(x1, y0);
  const v01 = sample(x0, y1);
  const v11 = sample(x1, y1);
  return v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy;
}

export function computeTextureExtrude(
  geometry: THREE.BufferGeometry,
  heightData: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  strength: number,
  channel: 'r' | 'g' | 'b' | 'luminance' = 'luminance',
): THREE.BufferGeometry {
  const result = geometry.clone();
  const positions = result.attributes.position as THREE.BufferAttribute | undefined;
  const normals = result.attributes.normal as THREE.BufferAttribute | undefined;
  const uvs = result.attributes.uv as THREE.BufferAttribute | undefined;
  if (!positions || !normals || !uvs) return result;

  for (let i = 0; i < positions.count; i++) {
    const u = Math.max(0, Math.min(1, uvs.getX(i)));
    const v = Math.max(0, Math.min(1, uvs.getY(i)));
    const height = sampleHeightBilinear(heightData, imageWidth, imageHeight, u, v, channel);
    positions.setXYZ(
      i,
      positions.getX(i) + normals.getX(i) * height * strength,
      positions.getY(i) + normals.getY(i) * height * strength,
      positions.getZ(i) + normals.getZ(i) * height * strength,
    );
  }

  positions.needsUpdate = true;
  result.computeVertexNormals();
  return result;
}

export async function loadImageAsHeightData(
  url: string,
): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      const imageData = context.getImageData(0, 0, image.width, image.height);
      resolve({ data: imageData.data, width: image.width, height: image.height });
    };
    image.onerror = reject;
    image.src = url;
  });
}

export function projectPointsOntoMesh(
  points: THREE.Vector3[],
  mesh: THREE.Mesh,
  direction?: THREE.Vector3,
): THREE.Vector3[] {
  mesh.updateWorldMatrix(true, false);

  const geometry = mesh.geometry;
  if (!geometry.boundingSphere) geometry.computeBoundingSphere();
  const localSphere = geometry.boundingSphere!;
  const worldCenter = localSphere.center.clone().applyMatrix4(mesh.matrixWorld);
  const scale = new THREE.Vector3();
  mesh.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), scale);
  const worldRadius = localSphere.radius * Math.max(Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z));
  const raycaster = new THREE.Raycaster();
  const axisDirections = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1),
  ];

  return points.map((point) => {
    let bestHit: THREE.Vector3 | null = null;
    let bestDistance = Infinity;

    const testHit = (origin: THREE.Vector3, castDirection: THREE.Vector3, far = Infinity): void => {
      raycaster.set(origin, castDirection);
      raycaster.near = 0;
      raycaster.far = far;
      for (const hit of raycaster.intersectObject(mesh, false)) {
        const distance = hit.point.distanceTo(point);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestHit = hit.point.clone();
        }
      }
    };

    if (direction) {
      const castDirection = direction.clone().normalize();
      testHit(point.clone().addScaledVector(castDirection, -1000), castDirection);
    } else {
      for (const axisDirection of axisDirections) testHit(point, axisDirection);
    }

    if (bestHit) return bestHit;

    const fallbackDirection = point.clone().sub(worldCenter);
    const fallbackLength = fallbackDirection.length();
    if (fallbackLength > 1e-9) {
      fallbackDirection.normalize();
      testHit(worldCenter, fallbackDirection, fallbackLength + worldRadius * 2);
    }

    return bestHit ?? point.clone();
  });
}

export function discretizeCurveOnSurface(
  polyline: THREE.Vector3[],
  mesh: THREE.Mesh,
  maxError = 0.1,
  maxDepth = 4,
): THREE.Vector3[] {
  if (polyline.length < 2) return polyline.map((point) => point.clone());

  const subdivide = (
    start: THREE.Vector3,
    end: THREE.Vector3,
    depth: number,
  ): THREE.Vector3[] => {
    if (depth <= 0) return [end.clone()];

    const midpoint = new THREE.Vector3().lerpVectors(start, end, 0.5);
    const projectedMidpoint = projectPointsOntoMesh([midpoint], mesh)[0];
    if (projectedMidpoint.distanceTo(midpoint) <= maxError) {
      return [end.clone()];
    }

    return [
      ...subdivide(start, projectedMidpoint, depth - 1),
      ...subdivide(projectedMidpoint, end, depth - 1),
    ];
  };

  const result: THREE.Vector3[] = [polyline[0].clone()];
  for (let i = 0; i < polyline.length - 1; i++) {
    result.push(...subdivide(polyline[i], polyline[i + 1], maxDepth));
  }
  return result;
}
