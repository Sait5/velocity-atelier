import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { piping, stitchedPath } from "./upholsteryDetail.mjs";
export function addDoorPrecision(door, side, leather) {
    const detail = new T.Group();
    detail.name = 'door_precision_trim';
    detail.position.copy(door.position).negate();
    door.add(detail);
    const rubber = new T.MeshStandardMaterial({ name: 'Door soft touch rubber', color: '#0c100e', roughness: .94 });
    const satin = new T.MeshStandardMaterial({ name: 'Door brushed titanium', color: '#69706a', metalness: .88, roughness: .38 });
    const thread = new T.MeshStandardMaterial({ name: 'Door fine saddle stitching', color: '#827563', roughness: 1 });
    const felt = new T.MeshStandardMaterial({ name: 'Door pocket felt', color: '#131815', roughness: 1 });
    const icon = new T.MeshStandardMaterial({ name: 'Door etched markings', color: '#a3ada6', roughness: .63 });
    function box(name, w, h, d, x, y, z, m, r = .003) {
        const o = new T.Mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2, h / 2, d / 2)), m);
        o.name = name;
        o.position.set(x, y, side * z);
        o.castShadow = o.receiveShadow = true;
        detail.add(o);
        return o;
    }
    function path(name, points, m, r = .001) { const o = piping(detail, points.map(p => new T.Vector3(p[0], p[1], side * p[2])), m, r); o.name = name; return o; }
    function screw(x, y, z) {
        const head = new T.Mesh(new T.CylinderGeometry(.0038, .0038, .002, 20), satin);
        head.rotation.x = Math.PI / 2;
        head.position.set(x, y, side * z);
        head.name = 'door_flush_screw_head';
        detail.add(head);
        const socket = new T.Mesh(new T.CircleGeometry(.00165, 6), rubber);
        socket.position.set(x, y, side * (z - .0011));
        socket.rotation.y = side > 0 ? Math.PI : 0;
        socket.name = 'door_hex_socket';
        detail.add(socket);
    }
    // Recessed handle escutcheon, mounting feet and the release lever pivot.
    box('door_handle_recess', .29, .054, .010, -.072, .645, .656, rubber, .005);
    for (const x of [-.185, .057]) {
        box('door_handle_mount', .029, .024, .022, x, .644, .651, satin, .005);
        screw(x, .644, .638);
    }
    box('door_release_thumb_pad', .044, .018, .013, .068, .652, .647, satin, .005);
    for (let i = 0; i < 7; i++)
        box('door_release_grip_ridge', .0012, .012, .0015, .052 + i * .005, .652, .639, rubber, .0005);
    // Rolled armrest edge with two individually stitched seams.
    path('door_armrest_bound_edge', [[-.295, .584, .617], [-.27, .596, .617], [.0, .599, .617], [.255, .587, .617]], leather, .0018);
    for (const y of [.586, .592])
        stitchedPath(detail, [new T.Vector3(-.27, y, side * .6155), new T.Vector3(-.02, y + .004, side * .6155), new T.Vector3(.235, y - .002, side * .6155)], thread);
    for (const y of [.425, .431])
        stitchedPath(detail, [new T.Vector3(-.176, y, side * .652), new T.Vector3(.03, y, side * .652), new T.Vector3(.235, y, side * .652)], thread);
    // Felt floor and narrow dividers remain inside the existing storage pocket.
    box('door_pocket_felt_liner', .411, .006, .037, .03, .431, .686, felt, .002);
    for (let i = 0; i < 19; i++)
        box('door_pocket_liner_rib', .0012, .001, .031, -.155 + i * .020, .435, .686, rubber, .0004);
    for (const x of [-.19, .25])
        screw(x, .393, .688);
    // Soft-touch switches in their own satin bezel, including window pictograms.
    box('door_switch_bezel', .158, .007, .042, -.290, .675, .680, satin, .003);
    for (let i = 0; i < 3; i++) {
        const x = -.34 + i * .048;
        box('door_switch_rocker', .034, .010, .026, x, .681, .680, rubber, .003);
        path('door_window_switch_symbol', [[x - .008, .6865, .673], [x - .008, .6865, .686], [x + .008, .6865, .686], [x + .008, .6865, .673], [x - .008, .6865, .673]], icon, .00045);
        box('door_switch_separator', .001, .002, .031, x + .021, .680, .680, rubber, .0004);
    }
    // Separate tweeter with a radial perforation pattern.
    const tweeter = new T.Mesh(new T.CylinderGeometry(.022, .022, .006, 48), rubber);
    tweeter.rotation.x = Math.PI / 2;
    tweeter.position.set(-.48, .672, side * .649);
    tweeter.name = 'door_tweeter_housing';
    detail.add(tweeter);
    const ring = new T.Mesh(new T.TorusGeometry(.022, .0012, 8, 64), satin);
    ring.position.set(-.48, .672, side * .645);
    ring.name = 'door_tweeter_bezel';
    detail.add(ring);
    const points = [];
    for (let y = -8; y <= 8; y++)
        for (let x = -8; x <= 8; x++) {
            const u = x * .0021 + (y % 2) * .00105, v = y * .00182;
            if (u * u + v * v < .018 * .018)
                points.push(new T.Vector3(-.48 + u, .672 + v, side * .6458));
        }
    const pores = new T.InstancedMesh(new T.CircleGeometry(.00065, 6), felt, points.length), quat = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), side > 0 ? Math.PI : 0);
    points.forEach((p, i) => pores.setMatrixAt(i, new T.Matrix4().compose(p, quat, new T.Vector3(1, 1, 1))));
    pores.name = 'door_tweeter_microperforations';
    detail.add(pores);
    // The main speaker has concentric trim, a recessed centre and etched fasteners.
    for (const r of [.077, .089]) {
        const ring = new T.Mesh(new T.TorusGeometry(r, .0008, 8, 96), satin);
        ring.position.set(-.46, .445, side * .7045);
        ring.name = 'door_speaker_concentric_bezel';
        detail.add(ring);
    }
    for (const a of [.25, 2.34, 4.44])
        screw(-.46 + Math.cos(a) * .080, .445 + Math.sin(a) * .080, .704);
    // Ribbed translucent lamp lens and a separate red door-edge reflector.
    for (let i = 0; i < 18; i++)
        box('door_courtesy_lens_prism', .0017, .010, .0016, .272 + i * .0055, .344, .711, icon, .0005);
    const red = new T.MeshPhysicalMaterial({ name: 'Door reflector red prism', color: '#8a1c17', roughness: .28, metalness: .08, clearcoat: 1 });
    box('door_edge_reflector_bezel', .041, .053, .012, .400, .401, .718, rubber, .006);
    box('door_edge_reflector', .032, .044, .005, .400, .401, .710, red, .004);
    for (let i = 0; i < 8; i++)
        box('door_reflector_prism', .027, .001, .0015, .400, .384 + i * .0048, .706, red, .0004);
    // Satin striker plate, dark latch cavity, captive screws and rubber stop.
    box('door_latch_backplate', .019, .076, .040, .467, .640, .778, satin, .003);
    box('door_latch_cavity', .021, .022, .017, .468, .640, .778, rubber, .004);
    box('door_rubber_stop', .018, .017, .020, .429, .490, .768, rubber, .004);
    for (const y of [.610, .669])
        screw(.465, y, .756);
}
