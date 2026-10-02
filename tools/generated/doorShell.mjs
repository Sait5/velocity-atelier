import * as T from 'three';
/** Use the door's own silhouette and perimeter: inner skin and returns meet the painted skin exactly. */
export function buildJoinedDoorShell(door, side, leather, edgeMaterial) {
    const panels = door.children.filter((o) => o instanceof T.Mesh && o.name === 'body_door');
    const projectedArea = (mesh) => { mesh.geometry.computeBoundingBox(); const size = mesh.geometry.boundingBox.getSize(new T.Vector3()); return size.x * size.y; };
    const skin = panels.sort((a, b) => projectedArea(b) - projectedArea(a))[0];
    if (!skin)
        throw new Error('Door exterior skin missing');
    const source = skin.geometry, attribute = source.getAttribute('position'), outer = [], inner = [], weld = new Map(), ids = [];
    for (let i = 0; i < attribute.count; i++) {
        const p = new T.Vector3().fromBufferAttribute(attribute, i), key = p.toArray().map(v => Math.round(v * 1e6)).join(',');
        let id = weld.get(key);
        if (id === undefined) {
            id = outer.length;
            weld.set(key, id);
            outer.push(p);
            inner.push(new T.Vector3(p.x, p.y, side * .725 - door.position.z));
        }
        ids.push(id);
    }
    const faces = [], edges = new Map();
    for (let i = 0; i < (source.index?.count || attribute.count); i += 3) {
        const [a, b, c] = [0, 1, 2].map(j => ids[source.index ? source.index.getX(i + j) : i + j]);
        const area = new T.Vector3().subVectors(outer[b], outer[a]).cross(new T.Vector3().subVectors(outer[c], outer[a])).z;
        if (area * side < 1e-10)
            continue;
        faces.push(a, c, b);
        for (const [u, v] of [[a, b], [b, c], [c, a]]) {
            const key = [u, v].sort((a, b) => a - b).join(',');
            const existing = edges.get(key);
            if (existing)
                existing.count++;
            else
                edges.set(key, { a: u, b: v, count: 1 });
        }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(inner.flatMap(p => p.toArray()), 3));
    geometry.setAttribute('uv', new T.Float32BufferAttribute(inner.flatMap(p => [(p.x + door.position.x + .75) / 1.35, (p.y + door.position.y - .23) / .70]), 2));
    geometry.setIndex(faces);
    geometry.computeVertexNormals();
    const panel = new T.Mesh(geometry, leather);
    panel.name = 'door_inner_shell';
    panel.castShadow = panel.receiveShadow = true;
    door.add(panel);
    const positions = [], indices = [], perimeter = [], sealEdges = [];
    for (const { a, b, count } of edges.values()) {
        if (count !== 1)
            continue;
        const offset = positions.length / 3;
        positions.push(...outer[a].toArray(), ...outer[b].toArray(), ...inner[b].toArray(), ...inner[a].toArray());
        indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
        perimeter.push({ outer: outer[a].toArray(), inner: inner[a].toArray() });
    }
    for (const { a, b, count } of edges.values())
        if (count === 1)
            sealEdges.push([inner[a], inner[b]]);
    const seal = new T.InstancedMesh(new T.CylinderGeometry(.0022, .0022, 1, 8), edgeMaterial, sealEdges.length);
    const matrix = new T.Matrix4(), up = new T.Vector3(0, 1, 0);
    sealEdges.forEach(([a, b], i) => { const delta = b.clone().sub(a); matrix.compose(a.clone().add(b).multiplyScalar(.5), new T.Quaternion().setFromUnitVectors(up, delta.clone().normalize()), new T.Vector3(1, delta.length(), 1)); seal.setMatrixAt(i, matrix); });
    seal.name = 'door_contour_rubber_binding';
    door.add(seal);
    const returns = new T.BufferGeometry();
    returns.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    returns.setIndex(indices);
    returns.computeVertexNormals();
    const frame = new T.Mesh(returns, edgeMaterial);
    frame.name = 'door_edge_returns';
    frame.castShadow = frame.receiveShadow = true;
    frame.material.side = T.DoubleSide;
    door.add(frame);
    panel.userData.perimeter = perimeter;
    panel.userData.outerFaces = faces;
    panel.userData.outerPositions = outer.map(p => p.toArray());
    return panel;
}
