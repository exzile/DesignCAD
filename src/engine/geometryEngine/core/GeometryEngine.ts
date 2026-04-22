import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js';
import type { Sketch, SketchEntity, SketchPlane } from '../../../types/cad';
import {
  computePlaneAxesFromNormal as computePlaneAxesFromNormalUtil,
  getPlaneAxes as getPlaneAxesUtil,
  getPlaneRotation as getPlaneRotationUtil,
  getSketchAxes as getSketchAxesUtil,
  getSketchExtrudeNormal as getSketchExtrudeNormalUtil,
} from '../planeUtils';
import { computeCoplanarFaceBoundary as computeCoplanarFaceBoundaryUtil } from '../coplanarBoundary';
import {
  computeMeshIntersectionCurve as computeMeshIntersectionCurveUtil,
  computePlaneIntersectionCurve as computePlaneIntersectionCurveUtil,
} from '../intersectionUtils';
import {
  alignMeshToCentroid as alignMeshToCentroidOp,
  circularPattern as circularPatternOp,
  combineMeshes as combineMeshesOp,
  createCosmeticThread as createCosmeticThreadOp,
  createRest as createRestOp,
  createRib as createRibOp,
  createWeb as createWebOp,
  draftMesh as draftMeshOp,
  linearPattern as linearPatternOp,
  makeClosedMesh as makeClosedMeshOp,
  meshSectionSketch as meshSectionSketchOp,
  mirrorMesh as mirrorMeshOp,
  patternOnPath as patternOnPathOp,
  planeCutMesh as planeCutMeshOp,
  reverseMeshNormals as reverseMeshNormalsOp,
  reverseNormals as reverseNormalsOp,
  scaleMesh as scaleMeshOp,
  smoothMesh as smoothMeshOp,
  transformMesh as transformMeshOp,
} from '../operations/meshOps';
import {
  createProfileSketch as createProfileSketchImpl,
  createSketchProfileMesh as createSketchProfileMeshImpl,
  getSketchProfileCentroid as getSketchProfileCentroidImpl,
  isSketchClosedProfile as isSketchClosedProfileImpl,
  sketchToProfileShapesFlat as sketchToProfileShapesFlatImpl,
  sketchToShape as sketchToShapeImpl,
  sketchToShapes as sketchToShapesImpl,
} from './sketch/sketchProfiles';
import {
  createEntityGeometry as createEntityGeometryImpl,
  createFilletGeometry as createFilletGeometryImpl,
  createSketchGeometry as createSketchGeometryImpl,
} from './sketch/sketchRendering';
import {
  buildExtrudeFeatureEdges as buildExtrudeFeatureEdgesImpl,
  buildExtrudeFeatureMesh as buildExtrudeFeatureMeshImpl,
  extrudeSketch as extrudeSketchImpl,
  extrudeSketchSurface as extrudeSketchSurfaceImpl,
  extrudeSketchWithTaper as extrudeSketchWithTaperImpl,
  extrudeThinSketch as extrudeThinSketchImpl,
} from './solid/extrusion';
import {
  coilGeometry as coilGeometryImpl,
  revolveFaceBoundary as revolveFaceBoundaryImpl,
  revolveSketch as revolveSketchImpl,
} from './solid/revolve';
import {
  loftSketches as loftSketchesImpl,
  patchSketch as patchSketchImpl,
  ruledSurface as ruledSurfaceImpl,
  sweepSketchInternal as sweepSketchInternalImpl,
} from './solid/profileSweeps';
import {
  bakeMeshWorldGeometry as bakeMeshWorldGeometryImpl,
  extractMeshGeometry as extractMeshGeometryImpl,
  splitByConnectedComponents as splitByConnectedComponentsImpl,
} from './mesh/meshGeometry';
import {
  csgIntersect as csgIntersectImpl,
  csgSubtract as csgSubtractImpl,
  csgUnion as csgUnionImpl,
} from './solid/csg';
import {
  createSurfacePrimitive as createSurfacePrimitiveImpl,
  fillSurface as fillSurfaceImpl,
  mergeSurfaces as mergeSurfacesImpl,
  offsetCurveToSurface as offsetCurveToSurfaceImpl,
} from './surface/surfaceBasics';
import {
  computeTextureExtrude as computeTextureExtrudeImpl,
  discretizeCurveOnSurface as discretizeCurveOnSurfaceImpl,
  loadImageAsHeightData as loadImageAsHeightDataImpl,
  projectPointsOntoMesh as projectPointsOntoMeshImpl,
} from './surface/surfaceProjection';
import {
  extendSurface as extendSurfaceImpl,
  offsetSurface as offsetSurfaceImpl,
  thickenSurface as thickenSurfaceImpl,
} from './surface/surfaceEditing';
import {
  stitchSurfaces as stitchSurfacesImpl,
  unstitchSurface as unstitchSurfaceImpl,
} from './surface/surfaceStitching';
import {
  splitSurface as splitSurfaceImpl,
  trimSurface as trimSurfaceImpl,
  untrimSurface as untrimSurfaceImpl,
} from './surface/surfaceTrimSplit';

export { tagShared } from '../materials';

export class GeometryEngine {
  /**
   * Returns the two in-plane tangent vectors for the given sketch plane.
   * These define the 2-D coordinate system used for circles, rectangles, etc.
   *
   *   XY  (horizontal, Y-normal)  → draws in X–Z world plane
   *   XZ  (vertical front, Z-normal) → draws in X–Y world plane
   *   YZ  (vertical side, X-normal)  → draws in Y–Z world plane
   */
  static getPlaneAxes(plane: SketchPlane): { t1: THREE.Vector3; t2: THREE.Vector3 } {
    return getPlaneAxesUtil(plane);
  }

  /**
   * Compute two orthonormal in-plane tangent vectors (t1, t2) for an arbitrary
   * plane normal. Picks a temporary "up" vector that is least aligned with the
   * normal to avoid degenerate cross products.
   */
  static computePlaneAxesFromNormal(normal: THREE.Vector3): { t1: THREE.Vector3; t2: THREE.Vector3 } {
    return computePlaneAxesFromNormalUtil(normal);
  }

  /**
   * Press-Pull boundary detection: given a hit triangle on a mesh, find every
   * coplanar triangle (same world normal + same plane offset within tolerance),
   * walk the outer edge loop, and return the boundary as ordered world points.
   *
   * Returns null if no clean closed loop can be formed (curved surfaces, faces
   * with holes, degenerate hits, etc.).
   */
  static computeCoplanarFaceBoundary(
    mesh: THREE.Mesh,
    faceIndex: number,
    tol = 1e-3,
  ): { boundary: THREE.Vector3[]; normal: THREE.Vector3; centroid: THREE.Vector3 } | null {
    return computeCoplanarFaceBoundaryUtil(mesh, faceIndex, tol);
  }

  /**
   * Returns the in-plane tangent vectors for any sketch — uses named-plane
   * axes for XY/XZ/YZ and computes from the stored normal for 'custom'.
   * Prefer this over getPlaneAxes when you have access to the full Sketch.
   */
  static getSketchAxes(sketch: Sketch): { t1: THREE.Vector3; t2: THREE.Vector3 } {
    return getSketchAxesUtil(sketch);
  }

  /**
   * Mesh rotation applied by extrudeSketch for named planes. Use this when
   * building any geometry (e.g. flat profile mesh) that must align with the
   * extruded body for the same sketch.
   */
  static getPlaneRotation(plane: 'XY' | 'XZ' | 'YZ'): [number, number, number] {
    return getPlaneRotationUtil(plane);
  }

  /**
   * World direction the extrusion grows along. This is the sketch plane's
   * normal — ExtrudeGeometry depth maps to local Z, which `extrudeSketch`
   * aligns to `planeNormal` via `makeBasis(t1, t2, normal)`.
   */
  static getSketchExtrudeNormal(sketch: Sketch): THREE.Vector3 {
    return getSketchExtrudeNormalUtil(sketch);
  }

  /**
   * World-space centroid of the sketch's profile shape, computed from its 2D
   * bounding-box center. Returns null for empty sketches. Handles both named
   * and custom (face-based) planes.
   */
  static getSketchProfileCentroid(sketch: Sketch, profileIndex?: number): THREE.Vector3 | null {
    return getSketchProfileCentroidImpl(sketch, profileIndex);
  }

  static createSketchProfileMesh(
    sketch: Sketch,
    material: THREE.Material,
    profileIndex?: number,
  ): THREE.Mesh | null {
    return createSketchProfileMeshImpl(sketch, material, profileIndex);
  }

  static createProfileSketch(sketch: Sketch, profileIndex: number): Sketch | null {
    return createProfileSketchImpl(sketch, profileIndex);
  }

  static sketchToShapes(sketch: Sketch): THREE.Shape[] {
    return sketchToShapesImpl(sketch);
  }

  static sketchToProfileShapesFlat(sketch: Sketch): THREE.Shape[] {
    return sketchToProfileShapesFlatImpl(sketch);
  }

  static createSketchGeometry(sketch: Sketch): THREE.Group {
    return createSketchGeometryImpl(sketch);
  }

  static createEntityGeometry(
    entity: SketchEntity,
    plane: SketchPlane = 'XZ',
    axes?: { t1: THREE.Vector3; t2: THREE.Vector3 },
  ): THREE.Object3D | null {
    return createEntityGeometryImpl(entity, plane, axes);
  }

  static sketchToShape(sketch: Sketch): THREE.Shape | null {
    return sketchToShapeImpl(sketch);
  }

  static isSketchClosedProfile(sketch: Sketch): boolean {
    return isSketchClosedProfileImpl(sketch);
  }

  static createFilletGeometry(mesh: THREE.Mesh, radius: number): THREE.Mesh {
    return createFilletGeometryImpl(mesh, radius);
  }
  static extrudeThinSketch(
    sketch: Sketch,
    distance: number,
    thickness: number,
    side: 'inside' | 'outside' | 'center',
  ): THREE.Mesh | null {
    return extrudeThinSketchImpl(sketch, distance, thickness, side);
  }

  static extrudeSketchWithTaper(sketch: Sketch, distance: number, taperAngleDeg: number): THREE.Mesh | null {
    return extrudeSketchWithTaperImpl(sketch, distance, taperAngleDeg);
  }

  static extrudeSketch(sketch: Sketch, distance: number, profileIndex?: number): THREE.Mesh | null {
    return extrudeSketchImpl(sketch, distance, profileIndex);
  }

  static extrudeSketchSurface(sketch: Sketch, distance: number): THREE.Mesh | null {
    return extrudeSketchSurfaceImpl(sketch, distance);
  }

  static buildExtrudeFeatureMesh(
    sketch: Sketch,
    distance: number,
    direction: 'positive' | 'negative' | 'symmetric' | 'two-sides',
    taperAngleDeg = 0,
    startOffset = 0,
    distance2 = 0,
    taperAngleDeg2 = taperAngleDeg,
  ): THREE.Mesh | null {
    return buildExtrudeFeatureMeshImpl(
      sketch,
      distance,
      direction,
      taperAngleDeg,
      startOffset,
      distance2,
      taperAngleDeg2,
    );
  }

  static buildExtrudeFeatureEdges(sketch: Sketch, distance: number): THREE.BufferGeometry | null {
    return buildExtrudeFeatureEdgesImpl(sketch, distance);
  }

  static splitByConnectedComponents(
    geom: THREE.BufferGeometry,
    tolerance = 1e-4,
  ): THREE.BufferGeometry[] {
    return splitByConnectedComponentsImpl(geom, tolerance);
  }

  /**
   * Bake a mesh's position/rotation/scale into its BufferGeometry, returning a
   * new world-space geometry. Leaves the input mesh untouched (clones geometry
   * first). Needed for CSG, which operates in the brush's local space.
   */
  static bakeMeshWorldGeometry(mesh: THREE.Mesh): THREE.BufferGeometry {
    return bakeMeshWorldGeometryImpl(mesh);
  }

  /**
   * Remove near-zero-area triangles from a non-indexed BufferGeometry.
   * Used as a safety net for earcut keyhole bridges in single-hole cases.
   * Shapes with many holes take a different path (CSG) to avoid bridges
   * entirely — see extrudeShapesHolesAware below.
   */
  static csgSubtract(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
    return csgSubtractImpl(a, b);
  }

  static csgUnion(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
    return csgUnionImpl(a, b);
  }

  static csgIntersect(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
    return csgIntersectImpl(a, b);
  }

  static revolveFaceBoundary(
    boundary: THREE.Vector3[],
    axisDir: THREE.Vector3,
    angle: number,
    isSurface = false,
  ): THREE.Mesh | null {
    return revolveFaceBoundaryImpl(boundary, axisDir, angle, isSurface);
  }

  static revolveSketch(sketch: Sketch, angle: number, axis: THREE.Vector3): THREE.Mesh | null {
    return revolveSketchImpl(sketch, angle, axis);
  }

  /** Internal sweep implementation that takes both the curve and Frenet frames */
  static loftSketches(profileSketches: Sketch[], surface = false): THREE.Mesh | null {
    return loftSketchesImpl(profileSketches, surface);
  }

  static patchSketch(sketch: Sketch): THREE.Mesh | null {
    return patchSketchImpl(sketch);
  }

  static ruledSurface(sketchA: Sketch, sketchB: Sketch): THREE.Mesh | null {
    return ruledSurfaceImpl(sketchA, sketchB);
  }

  static sweepSketchInternal(profileSketch: Sketch, pathSketch: Sketch, surface = false): THREE.Mesh | null {
    return sweepSketchInternalImpl(profileSketch, pathSketch, surface);
  }

  static extractMeshGeometry(mesh: THREE.Mesh | THREE.Group): THREE.BufferGeometry | null {
    return extractMeshGeometryImpl(mesh);
  }

  // ── D36 Coil — helix sweep primitive ──────────────────────────────────────
  /**
   * Build a coil (spring/helix) geometry by sweeping a circular wire profile
   * along a helix path using Frenet frames.
   *
   * @param outerRadius  - radius from helix axis to wire centre
   * @param wireRadius   - radius of the circular wire cross-section
   * @param pitch        - height gained per full turn
   * @param turns        - number of full turns
   */
  static coilGeometry(
    outerRadius: number,
    wireRadius: number,
    pitch: number,
    turns: number,
  ): THREE.BufferGeometry {
    return coilGeometryImpl(outerRadius, wireRadius, pitch, turns);
  }

  // ── D125 Mesh Reduce ───────────────────────────────────────────────────────
  static async simplifyGeometry(
    geom: THREE.BufferGeometry,
    reductionPercent: number,
  ): Promise<THREE.BufferGeometry> {
    const { SimplifyModifier } = await import(
      'three/examples/jsm/modifiers/SimplifyModifier.js'
    );
    const { mergeVertices } = await import(
      'three/examples/jsm/utils/BufferGeometryUtils.js'
    );

    // SimplifyModifier requires an indexed geometry
    const indexed = geom.index ? geom : mergeVertices(geom);

    const posAttr = indexed.getAttribute('position');
    const count = Math.floor(posAttr.count * reductionPercent / 100);
    if (count <= 0) return geom.clone();

    const modifier = new SimplifyModifier();
    const simplified = modifier.modify(indexed, count);
    return simplified;
  }

  // ── D115 Reverse Normal ────────────────────────────────────────────────────
  static reverseNormals(geom: THREE.BufferGeometry): void {
    reverseNormalsOp(geom);
  }

  // ── D168 Mirror Mesh ───────────────────────────────────────────────────────
  /**
   * Reflect a mesh through a named plane (XY, XZ, YZ).
   * Returns a new THREE.Mesh with cloned + reflected geometry and flipped face normals.
   * Caller owns the returned mesh (must dispose when done).
   */
  static mirrorMesh(source: THREE.Mesh, plane: 'XY' | 'XZ' | 'YZ'): THREE.Mesh {
    return mirrorMeshOp(source, plane);
  }

  // ── MSH8 — Reverse Mesh Normals ────────────────────────────────────────────
  /**
   * Clone the geometry of a mesh and flip its face winding (reverses normals).
   * Returns a new THREE.Mesh; caller owns it (must dispose when done).
   */
  static reverseMeshNormals(mesh: THREE.Mesh): THREE.Mesh {
    return reverseMeshNormalsOp(mesh);
  }

  // ── MSH7 — Combine Meshes ─────────────────────────────────────────────────
  /**
   * Merge all provided meshes into a single geometry (concatenation, no CSG).
   * Each mesh's world transform is baked in.
   */
  static combineMeshes(meshes: THREE.Mesh[]): THREE.Mesh {
    return combineMeshesOp(meshes);
  }

  // ── MSH11 — Transform Mesh ────────────────────────────────────────────────
  /**
   * Apply a translate/rotate/uniform-scale transform to a cloned mesh geometry.
   * Angles are in radians. Returns a new THREE.Mesh; caller owns it.
   */
  static transformMesh(mesh: THREE.Mesh, params: { tx: number; ty: number; tz: number; rx: number; ry: number; rz: number; scale: number }): THREE.Mesh {
    return transformMeshOp(mesh, params);
  }

  // ── SLD13 — Scale Mesh ────────────────────────────────────────────────────
  /**
   * Scale a cloned mesh geometry by independent X/Y/Z factors.
   * Returns a new THREE.Mesh; caller owns it.
   */
  static scaleMesh(mesh: THREE.Mesh, sx: number, sy: number, sz: number): THREE.Mesh {
    return scaleMeshOp(mesh, sx, sy, sz);
  }

  // ---------------------------------------------------------------------------
  // Surface intersection: mesh-mesh and plane-mesh
  // ---------------------------------------------------------------------------

  /**
   * Computes the intersection curve(s) between two triangle meshes.
   *
   * Algorithm: for each triangle pair (one from meshA, one from meshB),
   * compute the triangle-triangle intersection segment. Collect all segments,
   * then chain them into ordered polylines (closed loops where possible).
   *
   * @returns Array of polylines (each is an ordered array of world-space Vector3).
   *          Empty array if meshes don't intersect.
   */
  static computeMeshIntersectionCurve(
    meshA: THREE.Mesh,
    meshB: THREE.Mesh,
    tol = 1e-6,
  ): THREE.Vector3[][] {
    return computeMeshIntersectionCurveUtil(meshA, meshB, tol);
  }

  /**
   * Intersects a mesh with a plane, returning the intersection polyline(s).
   * More efficient than mesh-mesh intersection when one surface is planar.
   *
   * @param mesh    The mesh to slice
   * @param plane   The cutting plane (THREE.Plane in world space)
   * @returns       Array of polylines (world-space Vector3 arrays)
   */
  static computePlaneIntersectionCurve(
    mesh: THREE.Mesh,
    plane: THREE.Plane,
    tol = 1e-6,
  ): THREE.Vector3[][] {
    return computePlaneIntersectionCurveUtil(mesh, plane, tol);
  }

  // ---------------------------------------------------------------------------
  // D137 — Texture Extrude
  // ---------------------------------------------------------------------------

  /**
   * Bilinear sample of a height-map pixel array at normalized UV coordinates.
   *
   * @param heightData  Flat RGBA Uint8ClampedArray (from canvas.getImageData)
   * @param w           Image width in pixels
   * @param h           Image height in pixels
   * @param u           Horizontal UV in [0, 1]
   * @param v           Vertical UV in [0, 1]
   * @param channel     Which channel to read: 'r' | 'g' | 'b' | 'luminance'
   * @returns           Sampled height value in [0, 1]
   */
  
  /**
   * Applies a height-map-driven displacement to a mesh, pushing vertices
   * along their normals by an amount proportional to the texture value at
   * the corresponding UV coordinate.
   *
   * This is a CPU-side operation that produces a NEW BufferGeometry
   * (does not mutate the input). For use with D137 Texture Extrude.
   *
   * @param geometry    Source geometry (must have position, normal, uv attributes)
   * @param heightData  Flat RGBA pixel array (Uint8ClampedArray from canvas.getImageData)
   * @param imageWidth  Width of the height map in pixels
   * @param imageHeight Height of the height map in pixels
   * @param strength    Max displacement distance in model units (positive = outward along normal)
   * @param channel     Which channel to read height from: 'r' | 'g' | 'b' | 'luminance' (default: 'luminance')
   * @returns           A NEW BufferGeometry with displaced positions (same topology as input)
   */
  static computeTextureExtrude(
    geometry: THREE.BufferGeometry,
    heightData: Uint8ClampedArray,
    imageWidth: number,
    imageHeight: number,
    strength: number,
    channel: 'r' | 'g' | 'b' | 'luminance' = 'luminance',
  ): THREE.BufferGeometry {
    return computeTextureExtrudeImpl(geometry, heightData, imageWidth, imageHeight, strength, channel);
  }

  /**
   * Loads an image URL and returns its pixel data as a Uint8ClampedArray.
   * Requires a browser environment (uses canvas).
   *
   * @returns Promise resolving to { data, width, height }
   */
  static async loadImageAsHeightData(
    url: string,
  ): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
    return loadImageAsHeightDataImpl(url);
  }

  // ---------------------------------------------------------------------------
  // D46 Project to Surface — surface projection helpers
  // ---------------------------------------------------------------------------

  /**
   * Projects an array of 3D world-space points onto the nearest surface of a mesh.
   * Uses BVH-style ray casting: for each point, casts a ray toward the mesh center
   * to find the closest intersection, then uses the hit face normal to find the
   * true closest surface point.
   *
   * Practical use: D46 Project to Surface — projects sketch curve points onto
   * a body surface to create a 3D curve on the surface.
   *
   * @param points    World-space source points to project
   * @param mesh      Target surface mesh (must have matrixWorld applied)
   * @param direction Optional projection direction (world-space unit vector).
   *                  If omitted, projects along the closest surface normal.
   * @returns         Projected points (same length as input). Points that miss the
   *                  mesh are returned at the closest found position, or unchanged
   *                  if no hit is possible.
   */
  static projectPointsOntoMesh(
    points: THREE.Vector3[],
    mesh: THREE.Mesh,
    direction?: THREE.Vector3,
  ): THREE.Vector3[] {
    return projectPointsOntoMeshImpl(points, mesh, direction);
  }

  /**
   * Takes a projected polyline (from projectPointsOntoMesh) and smooths/re-samples
   * it by recursively subdividing edges that deviate from the surface.
   *
   * @param polyline    World-space projected points
   * @param mesh        The surface mesh
   * @param maxError    Max deviation allowed (model units, default 0.1)
   * @param maxDepth    Max recursion depth (default 4)
   * @returns           Refined polyline that more closely follows the surface
   */
  static discretizeCurveOnSurface(
    polyline: THREE.Vector3[],
    mesh: THREE.Mesh,
    maxError = 0.1,
    maxDepth = 4,
  ): THREE.Vector3[] {
    return discretizeCurveOnSurfaceImpl(polyline, mesh, maxError, maxDepth);
  }

  // ── SFC7: Fill Surface ─────────────────────────────────────────────────────
  /**
   * Creates a planar or blended patch from boundary polylines.
   * - G0: fan triangulation from centroid
   * - G1/G2: blend boundary points toward centroid for a smoother interior
   */
  static fillSurface(
    boundaryPoints: THREE.Vector3[][],
    continuity: ('G0' | 'G1' | 'G2')[],
  ): THREE.BufferGeometry {
    return fillSurfaceImpl(boundaryPoints, continuity);
  }

  static offsetCurveToSurface(
    points: THREE.Vector3[],
    distance: number,
    referenceNormal: THREE.Vector3,
  ): THREE.BufferGeometry {
    return offsetCurveToSurfaceImpl(points, distance, referenceNormal);
  }

  static mergeSurfaces(meshA: THREE.Mesh, meshB: THREE.Mesh): THREE.BufferGeometry {
    return mergeSurfacesImpl(meshA, meshB);
  }

  static createSurfacePrimitive(
    type: 'plane' | 'box' | 'sphere' | 'cylinder' | 'torus' | 'cone',
    params: Record<string, number>,
  ): THREE.BufferGeometry {
    return createSurfacePrimitiveImpl(type, params);
  }

  static offsetSurface(mesh: THREE.Mesh, distance: number): THREE.BufferGeometry {
    return offsetSurfaceImpl(mesh, distance);
  }

  static extendSurface(
    mesh: THREE.Mesh,
    distance: number,
    mode: 'natural' | 'tangent' | 'perpendicular',
  ): THREE.BufferGeometry {
    return extendSurfaceImpl(mesh, distance, mode);
  }

  static thickenSurface(
    mesh: THREE.Mesh,
    thickness: number,
    direction: 'inside' | 'outside' | 'symmetric',
  ): THREE.BufferGeometry {
    return thickenSurfaceImpl(mesh, thickness, direction);
  }

  static stitchSurfaces(
    meshes: THREE.Mesh[],
    tolerance = 1e-3,
  ): { geometry: THREE.BufferGeometry; isSolid: boolean } {
    return stitchSurfacesImpl(meshes, tolerance);
  }

  // ── SFC13 — Unstitch ─────────────────────────────────────────────────────────
  /**
   * Split a stitched quilt back into its component face groups.
   *
   * Algorithm:
   * 1. Build a face-adjacency graph: two triangles are adjacent if they share an
   *    edge (by index).
   * 2. Find connected components of triangles via BFS.
   * 3. Extract each component into its own BufferGeometry with re-indexed verts.
   *
   * Returns one geometry per connected component. If there is only one component
   * the original geometry is returned in a single-element array (no copy).
   */
  static unstitchSurface(mesh: THREE.Mesh): THREE.BufferGeometry[] {
    return unstitchSurfaceImpl(mesh);
  }

  // ── SFC10 — Surface Trim ──────────────────────────────────────────────────
  /**
   * Trims `mesh` against `trimmerMesh` (or a plane derived from it).
   *
   * Strategy: extract the first-triangle plane of the trimmer, then keep only
   * the triangles on the `keepSide` of that plane.  Open-boundary — no cap is
   * added (surface trim, not solid).
   *
   * @returns New BufferGeometry containing only the kept triangles.
   */
  static trimSurface(
    mesh: THREE.Mesh,
    trimmerMesh: THREE.Mesh,
    keepSide: 'inside' | 'outside',
  ): THREE.BufferGeometry {
    return trimSurfaceImpl(mesh, trimmerMesh, keepSide);
  }

  // ── SFC14 — Surface Split ─────────────────────────────────────────────────
  /**
   * Splits `mesh` by a plane (or by a plane derived from the first triangle of
   * a splitter mesh).  Triangles straddling the plane are cut at the plane edge.
   *
   * @returns Tuple [sideA geometry (positive half), sideB geometry (negative half)].
   *          Either may be empty if the plane misses the mesh entirely.
   */
  static splitSurface(
    mesh: THREE.Mesh,
    splitter: THREE.Mesh | THREE.Plane,
  ): THREE.BufferGeometry[] {
    return splitSurfaceImpl(mesh, splitter);
  }

  // ── SFC15 — Untrim ────────────────────────────────────────────────────────
  /**
   * Restores trimmed boundary edges by extruding them outward to an expanded
   * bounding box.  This approximates Fusion 360's "Untrim" which extends a
   * surface to its natural (untrimmed) boundary.
   *
   * Algorithm:
   * 1. Compute expanded Box3 of the mesh.
   * 2. Find boundary edges (edges referenced by exactly one triangle).
   * 3. For each boundary edge, project both vertices outward along the surface
   *    normal until they touch the expanded bounds, forming a quad patch.
   * 4. Merge original geometry + all patches into one BufferGeometry.
   *
   * @param mesh         Source surface mesh.
   * @param expandFactor How much to expand the bounding box (default 1.5×).
   * @returns New BufferGeometry with boundary extended.
   */
  static untrimSurface(mesh: THREE.Mesh, expandFactor = 1.5): THREE.BufferGeometry {
    return untrimSurfaceImpl(mesh, expandFactor);
  }

  // ── SLD7 — Linear Pattern ─────────────────────────────────────────────────
  static linearPattern(mesh: THREE.Mesh, params: {
    dirX: number; dirY: number; dirZ: number;
    spacing: number; count: number;
    dir2X?: number; dir2Y?: number; dir2Z?: number;
    spacing2?: number; count2?: number;
  }): THREE.Mesh[] {
    return linearPatternOp(mesh, params);
  }

  // ── SLD8 — Circular Pattern ───────────────────────────────────────────────
  static circularPattern(mesh: THREE.Mesh, params: {
    axisX: number; axisY: number; axisZ: number;
    originX: number; originY: number; originZ: number;
    count: number; totalAngle: number; // degrees
  }): THREE.Mesh[] {
    return circularPatternOp(mesh, params);
  }

  // ── MSH2 — Plane Cut ─────────────────────────────────────────────────────
  static planeCutMesh(mesh: THREE.Mesh, planeNormal: THREE.Vector3, planeOffset: number, keepSide: 'positive' | 'negative'): THREE.Mesh {
    return planeCutMeshOp(mesh, planeNormal, planeOffset, keepSide);
  }

  // ── MSH3 — Make Closed Mesh ──────────────────────────────────────────────
  static makeClosedMesh(mesh: THREE.Mesh): THREE.Mesh {
    return makeClosedMeshOp(mesh);
  }

  // ── MSH5 — Mesh Smooth ───────────────────────────────────────────────────
  static smoothMesh(mesh: THREE.Mesh, iterations: number, factor: number = 0.5): THREE.Mesh {
    return smoothMeshOp(mesh, iterations, factor);
  }

  // ── MSH13 — Mesh Section Sketch ──────────────────────────────────────────
  static meshSectionSketch(mesh: THREE.Mesh, plane: THREE.Plane): THREE.Vector3[][] {
    return meshSectionSketchOp(mesh, plane);
  }

  // ── SLD1 — Rib ───────────────────────────────────────────────────────────
  static createRib(profilePoints: THREE.Vector3[], thickness: number, height: number, normal: THREE.Vector3): THREE.Mesh {
    return createRibOp(profilePoints, thickness, height, normal);
  }

  // ── SLD2 — Web ───────────────────────────────────────────────────────────
  static createWeb(entityPoints: THREE.Vector3[][], thickness: number, height: number, normal: THREE.Vector3): THREE.Mesh {
    return createWebOp(entityPoints, thickness, height, normal);
  }

  // ── SLD4 — Rest ──────────────────────────────────────────────────────────
  static createRest(
    centerX: number, centerY: number, centerZ: number,
    normalX: number, normalY: number, normalZ: number,
    width: number, depth: number, thickness: number,
  ): THREE.Mesh {
    return createRestOp(centerX, centerY, centerZ, normalX, normalY, normalZ, width, depth, thickness);
  }

  // ── SLD5 — Cosmetic Thread helix ─────────────────────────────────────────
  static createCosmeticThread(radius: number, pitch: number, length: number, turns?: number): THREE.BufferGeometry {
    return createCosmeticThreadOp(radius, pitch, length, turns);
  }

  // ── SLD9 — Pattern on Path ───────────────────────────────────────────────
  static patternOnPath(mesh: THREE.Mesh, pathPoints: THREE.Vector3[], count: number): THREE.Mesh[] {
    return patternOnPathOp(mesh, pathPoints, count);
  }

  // ── MSH1 — Remesh ────────────────────────────────────────────────────────
  static remesh(mesh: THREE.Mesh, mode: 'refine' | 'coarsen', iterations: number): THREE.Mesh {
    if (mode === 'refine') {
      let geom = mesh.geometry.clone().toNonIndexed();
      for (let iter = 0; iter < iterations; iter++) {
        const pos = geom.attributes.position as THREE.BufferAttribute;
        const newVerts: number[] = [];
        for (let i = 0; i < pos.count; i += 3) {
          const a = new THREE.Vector3().fromBufferAttribute(pos, i);
          const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
          const c = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
          const ab = a.clone().add(b).multiplyScalar(0.5);
          const bc = b.clone().add(c).multiplyScalar(0.5);
          const ca = c.clone().add(a).multiplyScalar(0.5);
          for (const [x, y, z] of [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]] as [THREE.Vector3, THREE.Vector3, THREE.Vector3][]) {
            newVerts.push(x.x, x.y, x.z, y.x, y.y, y.z, z.x, z.y, z.z);
          }
        }
        geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(newVerts), 3));
      }
      geom.computeVertexNormals();
      const result = new THREE.Mesh(geom, mesh.material);
      result.userData = { ...mesh.userData };
      return result;
    } else {
      // Coarsen → decimate via quadric edge-collapse (three.js SimplifyModifier).
      // Previous implementation called smoothMesh instead, which only perturbed
      // vertex positions and never reduced triangle count — the feature
      // silently did the wrong thing.
      //
      // Remove 20% of triangles per iteration, clamped to a minimum triangle
      // count so we never collapse the mesh to nothing. SimplifyModifier
      // requires a merged (indexed) geometry; non-indexed input has every
      // vertex duplicated at triangle seams which blocks edge collapse.
      const srcNI = mesh.geometry.clone();
      const merged = srcNI.index ? srcNI : mergeVertices(srcNI, 1e-4);
      if (!srcNI.index) srcNI.dispose();
      const modifier = new SimplifyModifier();
      let cur = merged;
      for (let iter = 0; iter < iterations; iter++) {
        const pos = cur.attributes.position as THREE.BufferAttribute;
        const vertCount = pos.count;
        // Target 20% reduction, but keep at least 60 vertices so we don't
        // obliterate the mesh on a large iteration count.
        const remove = Math.max(0, Math.min(vertCount - 60, Math.floor(vertCount * 0.2)));
        if (remove < 3) break; // nothing meaningful left to simplify
        const next = modifier.modify(cur, remove);
        if (cur !== merged) cur.dispose();
        cur = next;
      }
      cur.computeVertexNormals();
      // `merged` and `cur` may be the same reference on iter-0 early-break.
      if (cur === merged) {
        const result = new THREE.Mesh(cur, mesh.material);
        result.userData = { ...mesh.userData };
        return result;
      }
      merged.dispose();
      const result = new THREE.Mesh(cur, mesh.material);
      result.userData = { ...mesh.userData };
      return result;
    }
  }

  // ── PL1 — Boss ───────────────────────────────────────────────────────────
  // ── SLD10 — Shell ────────────────────────────────────────────────────────
  static shellMesh(mesh: THREE.Mesh, thickness: number, direction: 'inward' | 'outward' | 'symmetric'): THREE.Mesh {
    const inwardDist = direction === 'outward' ? 0 : -thickness;

    // Get outer geometry (clone of original) and weld coincident vertices.
    // Shelling MUST use welded vertices so the offset is applied using each
    // position's averaged normal, not a per-triangle face normal. The old
    // implementation called `toNonIndexed()` first → every triangle kept its
    // own copy of every shared corner vertex, and `computeVertexNormals`
    // then gave each triangle its own face normal (not averaged). Offsetting
    // along those opens seams between adjacent triangles — the classic
    // "torn shell" failure mode. Merging vertices up front fixes it.
    let outerGeom = mesh.geometry.clone();
    outerGeom.applyMatrix4(mesh.matrixWorld);
    // Drop pre-existing normals so mergeVertices can unify by position alone.
    outerGeom.deleteAttribute('normal');
    outerGeom = mergeVertices(outerGeom, 1e-4);
    outerGeom.computeVertexNormals();

    // Build inner shell: offset every unique welded vertex along its
    // averaged normal. Because the geometry is indexed with shared corner
    // vertices, every triangle sharing a corner sees the same offset and
    // the shell stays watertight.
    const innerGeom = outerGeom.clone();
    const innerPos = innerGeom.attributes.position as THREE.BufferAttribute;
    const innerNorm = innerGeom.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < innerPos.count; i++) {
      const nx = innerNorm.getX(i), ny = innerNorm.getY(i), nz = innerNorm.getZ(i);
      innerPos.setXYZ(i,
        innerPos.getX(i) + nx * inwardDist,
        innerPos.getY(i) + ny * inwardDist,
        innerPos.getZ(i) + nz * inwardDist,
      );
    }
    innerPos.needsUpdate = true;

    // Flip inner shell winding — reverse each triangle's index order.
    if (innerGeom.index) {
      const idx = innerGeom.index;
      for (let i = 0; i < idx.count; i += 3) {
        const a = idx.getX(i + 1);
        idx.setX(i + 1, idx.getX(i + 2));
        idx.setX(i + 2, a);
      }
      idx.needsUpdate = true;
    }
    innerGeom.computeVertexNormals();

    // Merge outer + inner into one non-indexed geometry (simpler than
    // concatenating two indexed geometries with offset indices).
    const outerNI = outerGeom.toNonIndexed();
    const innerNI = innerGeom.toNonIndexed();
    outerGeom.dispose();
    innerGeom.dispose();
    const outerArr = outerNI.attributes.position.array as Float32Array;
    const innerArr = innerNI.attributes.position.array as Float32Array;
    const combined = new Float32Array(outerArr.length + innerArr.length);
    combined.set(outerArr, 0);
    combined.set(innerArr, outerArr.length);
    outerNI.dispose();
    innerNI.dispose();
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(combined, 3));
    geom.computeVertexNormals();
    const result = new THREE.Mesh(geom, mesh.material);
    result.userData = { ...mesh.userData };
    return result;
  }

  // ── SLD11 — Draft ────────────────────────────────────────────────────────
  static draftMesh(mesh: THREE.Mesh, pullAxisDir: THREE.Vector3, draftAngle: number, fixedPlaneY: number = 0): THREE.Mesh {
    return draftMeshOp(mesh, pullAxisDir, draftAngle, fixedPlaneY);
  }

  // ── SLD16 — Remove Face and Heal ─────────────────────────────────────────
  static removeFaceAndHeal(
    mesh: THREE.Mesh,
    faceNormal: THREE.Vector3,
    faceCentroid: THREE.Vector3,
    // `normalTolRad` is the maximum angular difference (in radians) between a
    // triangle's normal and the target face normal for it to count as
    // "coplanar". The previous default of 0.1 was applied as `dot > 1 - 0.1`,
    // i.e. cos(θ) > 0.9 → any triangle within ~26° matched, which on a
    // curved fillet collected every triangle of the fillet and deleted too
    // much. 2° matches real flat faces without catching adjacent curvature.
    normalTolRad: number = 2 * Math.PI / 180,
  ): THREE.Mesh {
    const geom = mesh.geometry.clone().toNonIndexed();
    geom.applyMatrix4(mesh.matrixWorld);
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const n = faceNormal.clone().normalize();
    const cosMin = Math.cos(normalTolRad);
    // Test "same plane" by comparing the plane-equation offset (n·p = d) of
    // each triangle to the target face's offset. This is the correct planar-
    // coplanarity test — previous centroid-distance check was scaled by the
    // mesh bounding sphere and was too tight for geometries whose face spans
    // most of the bounding box (a simple box's +Y face triangle centroids
    // sit ~sqrt(2) from the face centroid, far beyond 5% of the radius).
    if (!geom.boundingSphere) geom.computeBoundingSphere();
    const planeTol = Math.max(0.01, (geom.boundingSphere?.radius ?? 1) * 0.02);
    const planeOffset = n.dot(faceCentroid);

    const keptVerts: number[] = [];
    for (let i = 0; i < pos.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(pos, i);
      const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
      const c = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
      const triN = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
      const triCen = a.clone().add(b).add(c).divideScalar(3);
      const sameNormal = triN.dot(n) > cosMin;
      const samePlane = Math.abs(n.dot(triCen) - planeOffset) < planeTol;
      if (sameNormal && samePlane) continue;
      keptVerts.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    }

    const tempGeom = new THREE.BufferGeometry();
    tempGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(keptVerts), 3));
    const tempMesh = new THREE.Mesh(tempGeom, mesh.material);
    return this.makeClosedMesh(tempMesh);
  }

  // ── MSH9 — Mesh Align ────────────────────────────────────────────────────
  static alignMeshToCentroid(sourceMesh: THREE.Mesh, targetMesh: THREE.Mesh): THREE.Mesh {
    return alignMeshToCentroidOp(sourceMesh, targetMesh);
  }

}
