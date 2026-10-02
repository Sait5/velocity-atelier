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
            inner.push(new T.Vector3(p.x, p.y, p.z - side * .042));
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
    // Spatial bins keep mounted details on the curved skin without scanning every face per vertex.
    const bounds = new T.Box3().setFromPoints(inner), size = bounds.getSize(new T.Vector3()), bins = new Map(), cells = 32;
    const cell = (x, y) => [Math.floor((x - bounds.min.x) / size.x * cells), Math.floor((y - bounds.min.y) / size.y * cells)];
    for (let i = 0; i < faces.length; i += 3) {
        const points = faces.slice(i, i + 3).map(id => inner[id]);
        const b = new T.Box3().setFromPoints(points), lo = cell(b.min.x, b.min.y), hi = cell(b.max.x, b.max.y);
        for (let x = lo[0]; x <= hi[0]; x++)
            for (let y = lo[1]; y <= hi[1]; y++) {
                const key = x + ',' + y;
                if (!bins.has(key))
                    bins.set(key, []);
                bins.get(key).push(i);
            }
    }
    panel.userData.heightAt = (x, y) => { const key = cell(x, y).join(','); for (const i of bins.get(key) || []) {
        const a = inner[faces[i]], b = inner[faces[i + 1]], c = inner[faces[i + 2]], den = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
        if (Math.abs(den) < 1e-12)
            continue;
        const u = ((b.y - c.y) * (x - c.x) + (c.x - b.x) * (y - c.y)) / den, v = ((c.y - a.y) * (x - c.x) + (a.x - c.x) * (y - c.y)) / den;
        if (u >= -1e-5 && v >= -1e-5 && u + v <= 1.00001)
            return u * a.z + v * b.z + (1 - u - v) * c.z;
    } let nearest = inner[0], distance = Infinity; for (const p of inner) {
        const d = (x - p.x) ** 2 + (y - p.y) ** 2;
        if (d < distance) {
            distance = d;
            nearest = p;
        }
    } return nearest.z; };
    return panel;
}
/** Conform armrest, pocket, stitching and hardware to the same curved inner surface. */
export function fitDoorDetails(door, side) {
    door.updateWorldMatrix(true, true);
    const inverse = door.matrixWorld.clone().invert(), panel = door.getObjectByName('door_inner_shell'), heightAt = panel.userData.heightAt;
    const meshes = [];
    door.traverse(o => { if (o instanceof T.Mesh && !['body_door', 'leather_door', 'trim_door', 'chrome_door', 'interior_dark_door', 'door_inner_shell', 'door_edge_returns', 'door_contour_rubber_binding'].includes(o.name))
        meshes.push(o); });
    for (const mesh of meshes) {
        const toDoor = new T.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld), toMesh = toDoor.clone().invert(), baseline = side * .725 - door.position.z;
        if (mesh instanceof T.InstancedMesh) {
            const m = new T.Matrix4();
            for (let i = 0; i < mesh.count; i++) {
                mesh.getMatrixAt(i, m);
                const p = new T.Vector3().setFromMatrixPosition(m).applyMatrix4(toDoor);
                p.z += heightAt(p.x, p.y) - baseline;
                p.applyMatrix4(toMesh);
                m.setPosition(p);
                mesh.setMatrixAt(i, m);
            }
            mesh.instanceMatrix.needsUpdate = true;
            mesh.computeBoundingSphere();
            continue;
        }
        const g = mesh.geometry.clone(), p = g.getAttribute('position');
        let outward = -Infinity;
        for (let i = 0; i < p.count; i++) {
            const v = new T.Vector3().fromBufferAttribute(p, i).applyMatrix4(toDoor);
            outward = Math.max(outward, side * (v.z - baseline));
        }
        const recess = side * Math.min(0, .034 - outward);
        for (let i = 0; i < p.count; i++) {
            const v = new T.Vector3().fromBufferAttribute(p, i).applyMatrix4(toDoor);
            v.z += heightAt(v.x, v.y) - baseline + recess;
            v.applyMatrix4(toMesh);
            p.setXYZ(i, v.x, v.y, v.z);
        }
        g.computeVertexNormals();
        g.computeBoundingSphere();
        mesh.geometry = g;
    }
}
