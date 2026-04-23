import type { MutableRefObject } from 'react';
import * as THREE from 'three';
import { useCADStore } from '../../../../../store/cadStore';
import { SubdivisionEngine } from '../../../../../engine/subdivisionEngine/SubdivisionEngine';
import { useFacePicker } from '../../../../../hooks/useFacePicker';
import { useEdgePicker } from '../../../../../hooks/useEdgePicker';
import { useVertexPicker } from '../../../../../hooks/useVertexPicker';

interface FormPickerToolsContext {
  activeTool: string;
  bridgeLoop1Ref: MutableRefObject<string[] | null>;
  weldSelectionRef: MutableRefObject<string[]>;
  flattenSelectionRef: MutableRefObject<string[]>;
  formMeshesRef: MutableRefObject<THREE.Object3D[]>;
  setStatusMessage: (message: string) => void;
  addFormBody: ReturnType<typeof useCADStore.getState>['addFormBody'];
  removeFormBody: ReturnType<typeof useCADStore.getState>['removeFormBody'];
}

function clearMeshCache(formMeshesRef: MutableRefObject<THREE.Object3D[]>) {
  formMeshesRef.current = [];
}

function getClosestEdgeId(
  body: ReturnType<typeof useCADStore.getState>['formBodies'][number],
  hitMidpoint: THREE.Vector3,
): string {
  const verticesById = new Map(body.vertices.map((vertex) => [vertex.id, vertex]));
  let bestEdgeId = '';
  let bestDistance = Infinity;

  for (const edge of body.edges) {
    const start = verticesById.get(edge.vertexIds[0])!.position;
    const end = verticesById.get(edge.vertexIds[1])!.position;
    const dx = (start[0] + end[0]) / 2 - hitMidpoint.x;
    const dy = (start[1] + end[1]) / 2 - hitMidpoint.y;
    const dz = (start[2] + end[2]) / 2 - hitMidpoint.z;
    const distance = dx * dx + dy * dy + dz * dz;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestEdgeId = edge.id;
    }
  }

  return bestEdgeId;
}

function getClosestVertexId(
  body: ReturnType<typeof useCADStore.getState>['formBodies'][number],
  hitPosition: THREE.Vector3,
): string {
  let bestVertexId = '';
  let bestDistance = Infinity;

  for (const vertex of body.vertices) {
    const dx = vertex.position[0] - hitPosition.x;
    const dy = vertex.position[1] - hitPosition.y;
    const dz = vertex.position[2] - hitPosition.z;
    const distance = dx * dx + dy * dy + dz * dz;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestVertexId = vertex.id;
    }
  }

  return bestVertexId;
}

export function useFormPickerTools({
  activeTool,
  bridgeLoop1Ref,
  weldSelectionRef,
  flattenSelectionRef,
  formMeshesRef,
  setStatusMessage,
  addFormBody,
  removeFormBody,
}: FormPickerToolsContext): void {
  useFacePicker({
    enabled: activeTool === 'form-insert-edge',
    filter: (mesh) => !!mesh.userData.formBodyId,
    onClick: (result) => {
      const state = useCADStore.getState();
      const bodyId = result.mesh.userData.formBodyId as string;
      const body = state.formBodies.find((candidate) => candidate.id === bodyId);
      if (!body) {
        setStatusMessage('Insert Edge: no active form body');
        return;
      }

      const hitCentroid = result.centroid;
      const verticesById = new Map(body.vertices.map((vertex) => [vertex.id, vertex]));
      let bestFaceId = '';
      let bestDistance = Infinity;

      for (const face of body.faces) {
        let cx = 0;
        let cy = 0;
        let cz = 0;
        for (const vertexId of face.vertexIds) {
          const position = verticesById.get(vertexId)!.position;
          cx += position[0];
          cy += position[1];
          cz += position[2];
        }
        const count = face.vertexIds.length;
        const dx = hitCentroid.x - cx / count;
        const dy = hitCentroid.y - cy / count;
        const dz = hitCentroid.z - cz / count;
        const distance = dx * dx + dy * dy + dz * dz;
        if (distance < bestDistance) {
          bestDistance = distance;
          bestFaceId = face.id;
        }
      }

      if (!bestFaceId) {
        return;
      }

      const updated = SubdivisionEngine.insertEdge(body, bestFaceId);
      removeFormBody(bodyId);
      addFormBody({ ...body, vertices: updated.vertices, edges: updated.edges, faces: updated.faces });
      clearMeshCache(formMeshesRef);
      setStatusMessage('Insert Edge: face split into two quads');
    },
  });

  useEdgePicker({
    enabled: activeTool === 'form-insert-point',
    filter: (mesh) => !!mesh.userData.formBodyId,
    onClick: (result) => {
      const state = useCADStore.getState();
      const bodyId = result.mesh.userData.formBodyId as string;
      const body = state.formBodies.find((candidate) => candidate.id === bodyId);
      if (!body) {
        setStatusMessage('Insert Point: no active form body');
        return;
      }

      const bestEdgeId = getClosestEdgeId(body, result.midpoint);
      if (!bestEdgeId) {
        return;
      }

      const updated = SubdivisionEngine.insertPoint(body, bestEdgeId, 0.5);
      removeFormBody(bodyId);
      addFormBody({ ...body, vertices: updated.vertices, edges: updated.edges, faces: updated.faces });
      clearMeshCache(formMeshesRef);
      setStatusMessage('Insert Point: edge midpoint vertex added');
    },
  });

  useEdgePicker({
    enabled: activeTool === 'form-bridge',
    filter: (mesh) => !!mesh.userData.formBodyId,
    onClick: (result) => {
      const state = useCADStore.getState();
      const bodyId = result.mesh.userData.formBodyId as string;
      const body = state.formBodies.find((candidate) => candidate.id === bodyId);
      if (!body) {
        return;
      }

      const bestEdgeId = getClosestEdgeId(body, result.midpoint);
      if (!bestEdgeId) {
        return;
      }

      const loop = SubdivisionEngine.findEdgeLoop(body, bestEdgeId);
      const loopVertices = loop.map((edgeId) => body.edges.find((edge) => edge.id === edgeId)!.vertexIds[0]);

      if (!bridgeLoop1Ref.current) {
        bridgeLoop1Ref.current = loopVertices;
        setStatusMessage(`Bridge: first loop selected (${loopVertices.length} verts) - click second loop edge`);
        return;
      }

      const firstLoop = bridgeLoop1Ref.current;
      bridgeLoop1Ref.current = null;
      if (firstLoop.length !== loopVertices.length) {
        setStatusMessage('Bridge: loops have different vertex counts - cannot bridge');
        return;
      }

      const updated = SubdivisionEngine.bridge(body, firstLoop, loopVertices);
      removeFormBody(bodyId);
      addFormBody({ ...body, vertices: updated.vertices, edges: updated.edges, faces: updated.faces });
      clearMeshCache(formMeshesRef);
      setStatusMessage('Bridge: loops connected with quad faces');
    },
  });

  useEdgePicker({
    enabled: activeTool === 'form-fill-hole',
    filter: (mesh) => !!mesh.userData.formBodyId,
    onClick: (result) => {
      const state = useCADStore.getState();
      const bodyId = result.mesh.userData.formBodyId as string;
      const body = state.formBodies.find((candidate) => candidate.id === bodyId);
      if (!body) {
        return;
      }

      const bestEdgeId = getClosestEdgeId(body, result.midpoint);
      if (!bestEdgeId) {
        return;
      }

      const updated = SubdivisionEngine.fillHole(body, bestEdgeId);
      if (updated === body) {
        setStatusMessage('Fill Hole: clicked edge is not a boundary edge');
        return;
      }

      removeFormBody(bodyId);
      addFormBody({ ...body, vertices: updated.vertices, edges: updated.edges, faces: updated.faces });
      clearMeshCache(formMeshesRef);
      setStatusMessage('Fill Hole: boundary capped with fan faces');
    },
  });

  useVertexPicker({
    enabled: activeTool === 'form-weld',
    maxDistance: 20,
    filter: (mesh) => !!mesh.userData.formBodyId,
    onClick: (result) => {
      const state = useCADStore.getState();
      const bodyId = result.mesh.userData.formBodyId as string;
      const body = state.formBodies.find((candidate) => candidate.id === bodyId);
      if (!body) {
        return;
      }

      const bestVertexId = getClosestVertexId(body, result.position);
      if (!bestVertexId) {
        return;
      }

      const selection = weldSelectionRef.current;
      if (selection.includes(bestVertexId)) {
        if (selection.length < 2) {
          setStatusMessage('Weld: select at least 2 vertices before merging');
          return;
        }
        const updated = SubdivisionEngine.weld(body, selection);
        removeFormBody(bodyId);
        addFormBody({ ...body, vertices: updated.vertices, edges: updated.edges, faces: updated.faces });
        clearMeshCache(formMeshesRef);
        weldSelectionRef.current = [];
        setStatusMessage(`Weld: ${selection.length} vertices merged`);
        return;
      }

      selection.push(bestVertexId);
      setStatusMessage(`Weld: ${selection.length} vertex(ices) selected - click a selected vertex to merge`);
    },
  });

  useVertexPicker({
    enabled: activeTool === 'form-unweld',
    maxDistance: 20,
    filter: (mesh) => !!mesh.userData.formBodyId,
    onClick: (result) => {
      const state = useCADStore.getState();
      const bodyId = result.mesh.userData.formBodyId as string;
      const body = state.formBodies.find((candidate) => candidate.id === bodyId);
      if (!body) {
        return;
      }

      const bestVertexId = getClosestVertexId(body, result.position);
      if (!bestVertexId) {
        return;
      }

      const updated = SubdivisionEngine.unweld(body, bestVertexId);
      removeFormBody(bodyId);
      addFormBody({ ...body, vertices: updated.vertices, edges: updated.edges, faces: updated.faces });
      clearMeshCache(formMeshesRef);
      setStatusMessage('Unweld: vertex split into per-face copies');
    },
  });

  useVertexPicker({
    enabled: activeTool === 'form-flatten',
    maxDistance: 20,
    filter: (mesh) => !!mesh.userData.formBodyId,
    onClick: (result) => {
      const state = useCADStore.getState();
      const bodyId = result.mesh.userData.formBodyId as string;
      const body = state.formBodies.find((candidate) => candidate.id === bodyId);
      if (!body) {
        return;
      }

      const bestVertexId = getClosestVertexId(body, result.position);
      if (!bestVertexId) {
        return;
      }

      const selection = flattenSelectionRef.current;
      if (!selection.includes(bestVertexId)) {
        selection.push(bestVertexId);
        setStatusMessage(`Flatten: ${selection.length} vertex(ices) selected - re-click a selected vertex to flatten`);
        return;
      }

      let averageY = 0;
      for (const vertexId of selection) {
        const vertex = body.vertices.find((candidate) => candidate.id === vertexId);
        if (vertex) {
          averageY += vertex.position[1];
        }
      }
      averageY /= selection.length;

      const updated = SubdivisionEngine.flatten(body, selection, [0, 1, 0], averageY);
      removeFormBody(bodyId);
      addFormBody({ ...body, vertices: updated.vertices, edges: updated.edges, faces: updated.faces });
      clearMeshCache(formMeshesRef);
      flattenSelectionRef.current = [];
      setStatusMessage(`Flatten: ${selection.length} vertices projected to Y=${averageY.toFixed(2)}`);
    },
  });
}
