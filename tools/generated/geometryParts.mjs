import * as T from 'three';
export function removeGeometryParts(mesh, predicate) {
    const g = mesh.geometry, p = g.getAttribute('position');
    if (!p)
        return;
    mesh.updateWorldMatrix(true, false);
    const points = [], parent = Array.from({ length: p.count }, (_, i) => i), map = new Map();
    function find(i) { let r = i; while (parent[r] !== r)
        r = parent[r]; while (parent[i] !== i) {
        const next = parent[i];
        parent[i] = r;
        i = next;
    } return r; }
    function join(a, b) { parent[find(a)] = find(b); }
    for (let i = 0; i < p.count; i++) {
        const v = new T.Vector3().fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
        points.push(v);
        const key = v.toArray().map(v => Math.round(v * 1e6)).join(',');
        if (map.has(key))
            join(i, map.get(key));
        else
            map.set(key, i);
    }
    const triangles = [];
    for (let i = 0; i < (g.index?.count || p.count); i += 3) {
        const ids = [0, 1, 2].map(j => g.index ? g.index.getX(i + j) : i + j);
        join(ids[0], ids[1]);
        join(ids[1], ids[2]);
        triangles.push(ids);
    }
    const parts = new Map();
    for (const ids of triangles) {
        const key = find(ids[0]);
        let part = parts.get(key);
        if (!part) {
            part = { min: new T.Vector3(Infinity, Infinity, Infinity), max: new T.Vector3(-Infinity, -Infinity, -Infinity), ids: [] };
            parts.set(key, part);
        }
        part.ids.push(...ids);
        for (const id of ids) {
            part.min.min(points[id]);
            part.max.max(points[id]);
        }
    }
    const keep = [];
    for (const part of parts.values())
        if (!predicate(part.min, part.max))
            for (const id of part.ids)
                keep.push(id);
    if (keep.length !== (g.index?.count || p.count)) {
        const next = g.clone();
        next.setIndex(keep);
        mesh.geometry = next;
        g.dispose();
    }
}
