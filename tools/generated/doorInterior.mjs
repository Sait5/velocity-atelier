import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { buildJoinedDoorShell, fitDoorDetails } from "./doorShell.mjs";
import { stitchedPath } from "./upholsteryDetail.mjs";
import { addDoorPrecision } from "./doorPrecision.mjs";
export function addDoorInterior(door, side, leather) {
    const trim = new T.MeshStandardMaterial({ color: '#171c1a', roughness: .72 }), metal = new T.MeshStandardMaterial({ color: '#59615e', metalness: .9, roughness: .32 }), thread = new T.MeshStandardMaterial({ color: '#a4977e', roughness: .9 });
    const hinge = door.position.clone();
    function mesh(g, m, x, y, z) { const o = new T.Mesh(g, m); o.position.set(x - hinge.x, y - hinge.y, z - hinge.z); o.castShadow = true; o.receiveShadow = true; door.add(o); return o; }
    function box(w, h, d, m, x, y, z, r = .012) { return mesh(new RoundedBoxGeometry(w, h, d, 3, r), m, x, y, z); }
    buildJoinedDoorShell(door, side, leather, trim);
    // Sculpted inset and padded shoulder, entirely inside the original door outline.
    const insert = new T.Shape();
    insert.moveTo(-.59, .52);
    insert.quadraticCurveTo(-.62, .68, -.50, .70);
    insert.lineTo(.27, .70);
    insert.quadraticCurveTo(.39, .69, .39, .59);
    insert.lineTo(.33, .49);
    insert.quadraticCurveTo(.29, .46, .20, .47);
    insert.lineTo(-.38, .51);
    insert.quadraticCurveTo(-.53, .48, -.59, .52);
    const insetGeometry = new T.ExtrudeGeometry(insert, { depth: .012, bevelEnabled: true, bevelSize: .012, bevelThickness: .007, bevelSegments: 5, curveSegments: 24, steps: 1 });
    if (side > 0)
        insetGeometry.scale(1, 1, -1);
    mesh(insetGeometry, leather, 0, 0, side * .712).name = 'door_sculpted_leather_insert';
    box(.86, .048, .046, leather, -.08, .726, side * .706, .019).name = 'door_padded_upper_rail';
    box(.84, .105, .085, trim, -.10, .61, side * .698, .025);
    box(.60, .045, .105, leather, -.02, .58, side * .67, .018);
    box(.53, .105, .05, trim, .03, .405, side * .718, .018);
    box(.48, .016, .075, trim, .03, .455, side * .695, .006);
    box(.43, .008, .038, trim, .03, .426, side * .683, .003).name = 'door_pocket_recess';
    box(.46, .044, .014, leather, .03, .420, side * .660, .006).name = 'door_pocket_front_lip';
    for (const x of [-.195, .255])
        box(.014, .045, .058, trim, x, .420, side * .685, .006);
    const handle = mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(-.19, .635, side * .663), new T.Vector3(-.09, .653, side * .644), new T.Vector3(.06, .65, side * .657)]), 24, .008, 8, false), metal, 0, 0, 0);
    handle.name = 'door_handle_inner';
    const speaker = mesh(new T.CylinderGeometry(.087, .087, .014, 64), trim, -.46, .445, side * .717);
    speaker.rotation.x = Math.PI / 2;
    mesh(new T.TorusGeometry(.084, .0022, 8, 72), metal, -.46, .445, side * .706).name = 'speaker_satin_surround';
    const holes = new T.InstancedMesh(new T.CircleGeometry(.00095, 8), new T.MeshStandardMaterial({ color: '#050706', roughness: 1 }), 1100);
    for (let i = 0; i < 1100; i++) {
        const r = .075 * Math.sqrt((i + .5) / 1100), a = i * 2.39996;
        const pos = new T.Vector3(-.46 + Math.cos(a) * r - hinge.x, .445 + Math.sin(a) * r - hinge.y, side * .704 - hinge.z);
        holes.setMatrixAt(i, new T.Matrix4().compose(pos, new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), side > 0 ? Math.PI : 0), new T.Vector3(1, 1, 1)));
    }
    holes.name = 'door_speaker_1100_perforations';
    door.add(holes);
    for (let i = 0; i < 3; i++)
        box(.035, .012, .025, metal, -.34 + i * .048, .67, side * .68, .003);
    const lock = box(.021, .054, .025, metal, .46, .64, side * .781, .003);
    lock.name = 'door_latch';
    for (const y of [.61, .67]) {
        const fastener = mesh(new T.CylinderGeometry(.004, .004, .012, 10), trim, .473, y, side * .78);
        fastener.rotation.z = Math.PI / 2;
    }
    for (const y of [.39, .67])
        box(.048, .055, .05, metal, -.698, y, side * .79, .006);
    const seam = new T.CatmullRomCurve3([new T.Vector3(-.56, .72, side * .724), new T.Vector3(-.08, .735, side * .724), new T.Vector3(.39, .722, side * .724)]);
    mesh(new T.TubeGeometry(seam, 40, .0011, 5, false), thread, 0, 0, 0);
    for (const y of [.711, .718])
        stitchedPath(door, [-.47, -.24, 0, .23, .30].map(x => new T.Vector3(x, y, side * .681)), thread, hinge.clone().negate());
    stitchedPath(door, [new T.Vector3(-.38, .526, side * .697), new T.Vector3(-.10, .507, side * .697), new T.Vector3(.18, .493, side * .697), new T.Vector3(.29, .51, side * .697)], thread, hinge.clone().negate());
    const lamp = new T.MeshStandardMaterial({ color: '#dce6cf', emissive: '#dce6cf', emissiveIntensity: .3, roughness: .5 });
    box(.11, .014, .012, lamp, .32, .344, side * .718, .003);
    addDoorPrecision(door, side, leather);
    fitDoorDetails(door, side);
}
