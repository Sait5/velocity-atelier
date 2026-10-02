import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export function addPedalBox(root) {
    const metal = new T.MeshStandardMaterial({ color: '#acb0ac', metalness: .85, roughness: .32 }), black = new T.MeshStandardMaterial({ color: '#111513', roughness: .88 }), hardware = new T.MeshStandardMaterial({ color: '#474e4b', metalness: .8, roughness: .4 });
    const assembly = new T.Group();
    assembly.name = 'mounted_pedal_box';
    root.add(assembly);
    function box(w, h, d, m, x, y, z, r = .008) { const o = new T.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; assembly.add(o); return o; }
    box(.03, .28, .41, black, -.91, .39, .36, .018);
    // A bolted carrier and heel plate visibly attach the assembly to the footwell.
    box(.10, .040, .40, hardware, -.865, .485, .36, .006);
    const heel = box(.30, .014, .37, black, -.53, .222, .36, .009);
    for (let i = 0; i < 9; i++)
        box(.26, .002, .003, hardware, heel.position.x, .230, .215 + i * .036, .001);
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
        const rim = new T.Mesh(new RoundedBoxGeometry(.022, h + .006, w + .006, 4, .008), hardware);
        rim.position.x = -.001;
        pedal.add(rim);
        // Front faces stay clear of the backing plate; grip dots have a metal bezel.
        for (let row = 0; row < 6; row++)
            for (let col = 0; col < (w > .08 ? 3 : 2); col++) {
                const ring = new T.Mesh(new T.TorusGeometry(.0056, .00065, 6, 16), metal);
                ring.rotation.y = Math.PI / 2;
                ring.position.set(.0126, -h * .34 + row * h * .135, -w * .27 + col * w * .27);
                pedal.add(ring);
            }
        const arm = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(-.91, .48, z), new T.Vector3(-.80, .46, z), new T.Vector3(-.675, .35, z)]), 24, .010, 12, false), hardware);
        assembly.add(arm);
        const pivot = new T.Mesh(new T.CylinderGeometry(.016, .016, .05, 24), metal);
        pivot.rotation.x = Math.PI / 2;
        pivot.position.set(-.895, .46, z);
        assembly.add(pivot);
        for (const dz of [-.029, .029]) {
            const nut = new T.Mesh(new T.CylinderGeometry(.009, .009, .008, 6), hardware);
            nut.rotation.x = Math.PI / 2;
            nut.position.set(-.895, .46, z + dz);
            assembly.add(nut);
        }
        for (const dz of [-w * .34, w * .34])
            box(.05, .035, .014, black, -.899, .482, z + dz, .003);
    }
    const light = new T.PointLight('#d6dfeb', .14, 1.2, 2);
    light.position.set(-.48, .53, .35);
    assembly.add(light);
}
