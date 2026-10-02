import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export function addPedalBox(root) {
    const metal = new T.MeshStandardMaterial({ color: '#acb0ac', metalness: .85, roughness: .32 }), black = new T.MeshStandardMaterial({ color: '#111513', roughness: .88 }), hardware = new T.MeshStandardMaterial({ color: '#474e4b', metalness: .8, roughness: .4 });
    const assembly = new T.Group();
    assembly.name = 'mounted_pedal_box';
    root.add(assembly);
    function box(w, h, d, m, x, y, z, r = .008) { const o = new T.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; assembly.add(o); return o; }
    box(.03, .28, .41, black, -.91, .39, .36, .018);
    for (const [z, h, w, label] of [[.23, .18, .06, 'ACCELERATOR'], [.365, .105, .105, 'BRAKE'], [.54, .21, .082, 'REST']]) {
        const pedal = box(.021, h, w, metal, -.65, .34, z, .010);
        pedal.name = `pedal_${label.toLowerCase()}`;
        pedal.rotation.z = .16;
        for (let row = 0; row < 6; row++)
            for (let column = 0; column < (w > .08 ? 3 : 2); column++) {
                const hole = new T.Mesh(new T.CylinderGeometry(.005, .005, .004, 12), black);
                hole.rotation.z = Math.PI / 2;
                hole.position.set(.012, -h * .34 + row * h * .135, -w * .27 + column * w * .27);
                pedal.add(hole);
            }
        for (const y of [-h * .41, h * .41]) {
            const bolt = new T.Mesh(new T.CylinderGeometry(.0035, .0035, .004, 6), hardware);
            bolt.rotation.z = Math.PI / 2;
            bolt.position.set(.012, y, 0);
            pedal.add(bolt);
        }
        const arm = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(-.91, .48, z), new T.Vector3(-.80, .46, z), new T.Vector3(-.675, .35, z)]), 24, .010, 12, false), hardware);
        assembly.add(arm);
        const pivot = new T.Mesh(new T.CylinderGeometry(.016, .016, .05, 24), metal);
        pivot.rotation.x = Math.PI / 2;
        pivot.position.set(-.895, .46, z);
        assembly.add(pivot);
    }
    const light = new T.PointLight('#d6dfeb', .14, 1.2, 2);
    light.position.set(-.48, .53, .35);
    assembly.add(light);
}
