import * as T from 'three';
/** Small, repeatable leather relief; neutral data preserves the selected leather colour. */
export function leatherGrain() {
    const size = 128, data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            const grain = 128 + Math.round(16 * Math.sin(x * 17.13 + y * 31.7) * Math.sin(x * 7.31 - y * 13.1));
            data.set([grain, grain, grain, 255], i);
        }
    const map = new T.DataTexture(data, size, size);
    map.wrapS = map.wrapT = T.RepeatWrapping;
    map.magFilter = T.LinearFilter;
    map.minFilter = T.LinearMipmapLinearFilter;
    map.generateMipmaps = true;
    map.repeat.set(9, 9);
    map.needsUpdate = true;
    return map;
}
/** Stitches share one draw call and follow a measured path instead of floating boxes. */
export function stitchedPath(parent, points, material, offset = new T.Vector3()) {
    const curve = new T.CatmullRomCurve3(points), count = Math.max(2, Math.floor(curve.getLength() / .006));
    const mesh = new T.InstancedMesh(new T.CylinderGeometry(.00048, .00048, .0027, 5), material, count);
    const up = new T.Vector3(0, 1, 0), matrix = new T.Matrix4(), q = new T.Quaternion();
    for (let i = 0; i < count; i++) {
        const t = (i + .5) / count;
        q.setFromUnitVectors(up, curve.getTangentAt(t).normalize());
        matrix.compose(curve.getPointAt(t).add(offset), q, new T.Vector3(1, 1, 1));
        mesh.setMatrixAt(i, matrix);
    }
    mesh.name = 'upholstery_individual_stitches';
    parent.add(mesh);
    return mesh;
}
export function piping(parent, points, material, radius = .0012) {
    const mesh = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points), Math.max(24, points.length * 8), radius, 8, false), material);
    mesh.name = 'upholstery_bound_edge';
    parent.add(mesh);
    return mesh;
}
/** Closed, UV mapped panel sampled from the cabin's varying cross-section. */
export function fittedPanel(parent, name, surface, material, thickness = .012, nu = 32, nv = 24) {
    const p = [], uv = [], indices = [];
    for (let layer = 0; layer < 2; layer++)
        for (let j = 0; j <= nv; j++)
            for (let i = 0; i <= nu; i++) {
                const u = i / nu, v = j / nv, point = surface(u, v);
                if (layer) {
                    const du = surface(Math.min(1, u + .001), v).sub(surface(Math.max(0, u - .001), v)), dv = surface(u, Math.min(1, v + .001)).sub(surface(u, Math.max(0, v - .001)));
                    const normal = new T.Vector3().crossVectors(dv, du).normalize();
                    if (normal.x > 0)
                        normal.negate();
                    point.addScaledVector(normal, -thickness);
                }
                p.push(...point.toArray());
                uv.push(u, v);
            }
    const stride = nu + 1, count = stride * (nv + 1);
    for (let j = 0; j < nv; j++)
        for (let i = 0; i < nu; i++) {
            const a = j * stride + i, b = a + 1, c = a + stride, d = c + 1;
            indices.push(a, c, b, b, c, d, a + count, b + count, c + count, b + count, d + count, c + count);
        }
    const boundary = [];
    for (let i = 0; i <= nu; i++)
        boundary.push(i);
    for (let j = 1; j <= nv; j++)
        boundary.push(j * stride + nu);
    for (let i = nu - 1; i >= 0; i--)
        boundary.push(nv * stride + i);
    for (let j = nv - 1; j > 0; j--)
        boundary.push(j * stride);
    for (let i = 0; i < boundary.length; i++) {
        const a = boundary[i], b = boundary[(i + 1) % boundary.length];
        indices.push(a, b, b + count, a, b + count, a + count);
    }
    const du = surface(.51, .5).sub(surface(.49, .5)), dv = surface(.5, .51).sub(surface(.5, .49));
    if (new T.Vector3().crossVectors(dv, du).x > 0)
        for (let i = 0; i < indices.length; i += 3) {
            const b = indices[i + 1];
            indices[i + 1] = indices[i + 2];
            indices[i + 2] = b;
        }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(p, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    const mesh = new T.Mesh(g, material);
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
}
