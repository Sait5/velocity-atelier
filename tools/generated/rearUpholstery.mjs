import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { fittedPanel, piping, stitchedPath } from "./upholsteryDetail.mjs";
export function addRearUpholstery(cabin, material, leather = material) {
    const rear = new T.Group();
    rear.name = 'rear_tailored_trim';
    cabin.add(rear);
    const thread = new T.MeshStandardMaterial({ name: 'Rear saddle thread', color: '#776e60', roughness: .96 });
    const metal = new T.MeshStandardMaterial({ name: 'Rear satin hardware', color: '#545b56', metalness: .82, roughness: .36 });
    const recess = new T.MeshStandardMaterial({ name: 'Rear recessed felt', color: '#090c0b', roughness: 1 });
    function pad(name, w, h, d, x, y, z, m = leather, r = .008) {
        const o = new T.Mesh(new RoundedBoxGeometry(w, h, d, 5, Math.min(r, w / 2, h / 2, d / 2)), m);
        o.name = name;
        o.position.set(x, y, z);
        o.castShadow = o.receiveShadow = true;
        rear.add(o);
        return o;
    }
    // Replace the former extruded U shape. Lateral panels stay inside |z| <= .735.
    const width = (v) => .707 - .025 * v - .012 * v * v;
    const face = (u, v) => new T.Vector3(.487 + .066 * v * v, .245 + .600 * v, (u * 2 - 1) * width(v));
    fittedPanel(rear, 'rear_contoured_backing', face, material, .018);
    for (const side of [-1, 1]) {
        const surface = (u, v) => {
            const height = .14 + v * .76, span = .047 + u * (width(height) - .08);
            return new T.Vector3(.487 + .066 * height * height - .006 - .007 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI), .245 + .60 * height, side * span);
        };
        fittedPanel(rear, side < 0 ? 'rear_left_leather_panel' : 'rear_right_leather_panel', surface, leather, .005);
        for (const u of [.022, .038, .962, .978])
            stitchedPath(rear, Array.from({ length: 30 }, (_, i) => surface(u, .035 + i * .93 / 29).add(new T.Vector3(-.0008, 0, 0))), thread);
        for (const v of [.025, .040, .96, .975])
            stitchedPath(rear, Array.from({ length: 40 }, (_, i) => surface(.04 + i * .92 / 39, v).add(new T.Vector3(-.0008, 0, 0))), thread);
        piping(rear, Array.from({ length: 35 }, (_, i) => surface(i / 34, 1)), material, .0016);
        // Slim tapered quarter return replaces the projecting rounded end caps.
        const quarter = (u, v) => new T.Vector3(.421 + u * (.132 + .024 * v) + .009 * Math.sin(v * Math.PI), .285 + v * .535, side * (.726 - .030 * v - .040 * u * u - .011 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI)));
        fittedPanel(rear, 'rear_quarter_fitted_return', quarter, leather, .008, 20, 30);
        for (const u of [.10, .15])
            stitchedPath(rear, Array.from({ length: 28 }, (_, i) => quarter(u, .05 + i * .90 / 27).add(new T.Vector3(-.001, 0, -side * .001))), thread);
        piping(rear, Array.from({ length: 28 }, (_, i) => quarter(0, i / 27)), material, .0022);
        // Webbing and buckles follow the rear-panel lean rather than floating in front.
        const strapSurface = (u, v) => {
            const y = .379 + v * .222, h = (y - .245) / .600, z = .2215 + u * .027;
            return surface((z - .047) / (width(h) - .08), (h - .14) / .76).add(new T.Vector3(-.003, 0, 0));
        };
        fittedPanel(rear, 'rear_luggage_webbing', strapSurface, material, .002, 6, 24);
        for (const u of [.13, .87])
            stitchedPath(rear, Array.from({ length: 24 }, (_, i) => strapSurface(u, i / 23).add(new T.Vector3(-.0006, 0, 0))), thread);
        for (const y of [.405, .568]) {
            const x = strapSurface(.5, (y - .379) / .222).x - .003;
            pad('rear_strap_buckle_frame', .009, .025, .041, x, y, side * .235, metal, .003);
            pad('rear_strap_buckle_slot', .003, .012, .025, x - .006, y, side * .235, recess, .002);
        }
        pad('rear_lower_service_cover', .014, .067, .49, .478, .286, side * .326, material, .005);
        for (const z of [side * .095, side * .56]) {
            const screw = new T.Mesh(new T.CylinderGeometry(.0034, .0034, .002, 16), metal);
            screw.rotation.z = Math.PI / 2;
            screw.position.set(.469, .286, z);
            screw.name = 'rear_flush_fastener';
            rear.add(screw);
            pad('rear_fastener_socket', .001, .0012, .0038, .4675, .286, z, recess, .0003);
        }
    }
    pad('rear_top_bound_lip', .057, .023, 1.31, .555, .844, 0, leather, .009);
    for (const y of [.845, .850])
        stitchedPath(rear, [new T.Vector3(.525, y, -.62), new T.Vector3(.525, y, 0), new T.Vector3(.525, y, .62)], thread);
    const spine = (u, v) => face(.5 + (u - .5) * .050, .10 + v * .81).add(new T.Vector3(-.008, 0, 0));
    fittedPanel(rear, 'rear_central_service_spine', spine, material, .005, 8, 32);
    fittedPanel(rear, 'rear_vent_recess', (u, v) => spine(.12 + u * .76, .70 + v * .25).add(new T.Vector3(-.001, 0, 0)), recess, .001, 8, 16);
    for (let i = 0; i < 8; i++) {
        const p = spine(.5, .715 + i * .03);
        pad('rear_vent_satin_louvre', .005, .005, .046, p.x - .003, p.y, 0, metal, .002);
    }
    pad('rear_floor_inset', .365, .018, 1.40, .427, .231, 0, material, .007);
    return rear;
}
