import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { revueltoDoorPivot, revueltoDoorAxis } from './revueltoDoorMotion.mjs';
/** Add hardware to the existing assemblies. Never reparent or edit a car mesh. */
export function installFittedDoorHardware(vehicle, key) {
    const { root, doors } = vehicle;
    // The authored static piston pieces are replaced by the connected animated rig.
    if (key === 'revuelto')
        root.traverse(o => { if (/^DoorJamb[LR]FPiston/.test(o.name))
            o.visible = false; });
    const steel = new T.MeshStandardMaterial({ name: 'Door hinge zinc steel', color: key === 'revuelto' ? '#f2f3f0' : '#747b80', metalness: key === 'revuelto' ? .18 : .82, roughness: .42 });
    const dark = new T.MeshStandardMaterial({ name: 'Door hinge coated steel', color: key === 'revuelto' ? '#f2f3f0' : '#262c30', metalness: key === 'revuelto' ? .18 : .7, roughness: .5 });
    const chrome = new T.MeshStandardMaterial({ name: 'Door hinge pins', color: '#a1a8ad', metalness: .95, roughness: .29 });
    const rubber = new T.MeshStandardMaterial({ name: 'Door check rubber', color: '#141819', roughness: .9 });
    let serial = 0;
    const dynamic = [];
    const looms = [];
    const liftingLinks = [];
    const gasSupports = [];
    const closed = doors.map(d => d.position.clone());
    function mesh(parent, name, geo, mat, pos) {
        const item = new T.Mesh(geo, mat);
        item.name = `${key}_${name}_${serial++}`;
        item.position.copy(pos instanceof T.Vector3 ? pos : new T.Vector3(...pos));
        item.castShadow = true;
        item.receiveShadow = true;
        parent.add(item);
        return item;
    }
    function plate(parent, name, p, size, mat = steel) { return mesh(parent, name, new RoundedBoxGeometry(...size, 2, .0015), mat, p); }
    function pin(parent, name, p, r, h, mat = chrome, axis = 'y', sides = 16) { const item = mesh(parent, name, new T.CylinderGeometry(r, r, h, sides), mat, p); if (axis === 'x')
        item.rotation.z = Math.PI / 2; if (axis === 'z')
        item.rotation.x = Math.PI / 2; return item; }
    function bolts(parent, p, axis) { for (const y of [-.016, .016]) {
        const at = [p[0], p[1] + y, p[2]];
        pin(parent, 'washer', at, .0058, .0016, steel, axis);
        pin(parent, 'M6_hex_bolt', at, .0045, .004, chrome, axis, 6);
    } }
    function strut(name, start, door, end, r, from, to, mat) {
        const item = pin(root, name, [0, 0, 0], r, 1, mat);
        dynamic.push({ mesh: item, start, door, end, from, to });
        return item;
    }
    function forgedLeaf(parent, name, y, side, reach) {
        // A curved, upright forged bracket: thickness is vertical, not a long rod.
        const shape = new T.Shape();
        shape.moveTo(-.008, .006);
        shape.lineTo(.013, .006);
        shape.quadraticCurveTo(reach - .006, -.010, reach + .006, -.045);
        shape.lineTo(reach + .006, -.065);
        shape.lineTo(reach - .008, -.065);
        shape.lineTo(reach - .008, -.045);
        shape.quadraticCurveTo(.014, -.022, -.008, -.011);
        shape.closePath();
        const geo = new T.ExtrudeGeometry(shape, { depth: .034, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .0015, bevelThickness: .0015 });
        geo.rotateX(Math.PI / 2);
        geo.scale(1, 1, side);
        if (side < 0) {
            const a = geo.getAttribute('position'), n = geo.getAttribute('normal'), uv = geo.getAttribute('uv');
            for (let i = 0; i < a.count; i += 3) {
                for (const attribute of [a, n, uv]) {
                    const size = attribute.itemSize;
                    for (let j = 0; j < size; j++) {
                        const data = attribute.array, tmp = data[(i + 1) * size + j];
                        data[(i + 1) * size + j] = data[(i + 2) * size + j];
                        data[(i + 2) * size + j] = tmp;
                    }
                }
            }
        }
        return mesh(parent, name, geo, steel, [0, y + .017, 0]);
    }
    function liftingArm(name, length) {
        const outline = new T.Shape();
        outline.moveTo(-.018, -length / 2);
        outline.lineTo(.018, -length / 2);
        outline.lineTo(.026, -length * .24);
        outline.lineTo(.016, length / 2);
        outline.lineTo(-.016, length / 2);
        outline.lineTo(-.026, -length * .24);
        outline.closePath();
        const hole = new T.Path();
        hole.moveTo(-.008, -length * .24);
        hole.lineTo(-.006, length * .23);
        hole.lineTo(.006, length * .23);
        hole.lineTo(.008, -length * .24);
        hole.closePath();
        outline.holes.push(hole);
        const geometry = new T.ExtrudeGeometry(outline, { depth: .008, bevelEnabled: true, bevelSize: .001, bevelThickness: .001, bevelSegments: 2 });
        geometry.translate(0, 0, -.004);
        return mesh(root, name, geometry, dark, [0, 0, 0]);
    }
    function wiringBoot(fixed, leaf, pivot, door, localPivot, side) {
        const a = new T.Vector3(-.033, -.145, -side * .050), b = new T.Vector3(.049, -.145, -side * .058);
        const fixedCollar = pin(fixed, 'body_wiring_grommet', a, .014, .012, rubber), doorCollar = pin(leaf, 'door_wiring_grommet', b, .014, .012, rubber);
        const segments = [], rings = [];
        for (let i = 0; i < 28; i++) {
            segments.push(pin(root, 'flexible_wiring_boot', [0, 0, 0], .0075, 1, rubber));
            rings.push(mesh(root, 'wiring_boot_rib', new T.TorusGeometry(.0084, .0018, 6, 12), rubber, [0, 0, 0]));
        }
        looms.push({ start: pivot.clone().add(a), door, end: localPivot.clone().add(b), side, segments, rings, fixedCollar, doorCollar });
    }
    root.updateWorldMatrix(true, true);
    doors.forEach((door, i) => {
        const rest = root.worldToLocal(door.getWorldPosition(new T.Vector3())), side = Math.sign(rest.z);
        const pivot = key === 'porsche' ? new T.Vector3(-.77, .70, side * .84) : key === 'ferrari' ? new T.Vector3(rest.x - .14, rest.y, side * .84) : revueltoDoorPivot(side), localPivot = pivot.clone().sub(rest);
        const fixed = new T.Group();
        fixed.name = `${key}_FixedHinge_${i}`;
        fixed.position.copy(pivot);
        root.add(fixed);
        const leaf = new T.Group();
        leaf.name = `${key}_DoorHinge_${i}`;
        leaf.position.copy(localPivot);
        door.add(leaf);
        if (key !== 'revuelto') {
            const heights = key === 'porsche' ? [.44, .67] : [.43, .68];
            for (const height of heights) {
                const y = height - rest.y;
                plate(fixed, 'body_mount', [-.030, y, -side * .035], [.042, .056, .008]);
                bolts(fixed, [-.030, y, -side * .041], 'z');
                plate(fixed, 'body_knuckle_web', [-.013, y, -side * .017], [.030, .034, .027]);
                for (const dy of [-.016, .016])
                    pin(fixed, 'fixed_knuckle', [0, y + dy, 0], .0095, .014, steel);
                pin(fixed, 'hinge_axis', [0, y, 0], .0045, .051);
                pin(leaf, 'moving_knuckle', [0, y, 0], .009, .016, steel);
                const reach = key === 'porsche' ? .048 : .15;
                forgedLeaf(leaf, 'upright_door_bracket', y, side, reach);
                plate(leaf, 'door_mount', [reach, y, -side * .056], [.009, .055, .029]);
                bolts(leaf, [reach + .006, y, -side * .056], 'x');
            }
            wiringBoot(fixed, leaf, pivot, door, localPivot, side);
            // The flat door check sits below the loom, inside the jamb.
            const start = pivot.clone().add(new T.Vector3(-.020, -.20, -side * .060)), end = new T.Vector3(.057, -.20, -side * .065);
            plate(fixed, 'check_housing', [-.020, -.20, -side * .060], [.026, .015, .017], dark);
            plate(leaf, 'check_stop', end.toArray(), [.018, .014, .017], rubber);
            strut('sliding_check', start, door, end.clone().add(localPivot), .0025, 0, 1, dark);
        }
        else {
            // A compact coaxial hinge. The whole door follows the same inclined axis.
            const axis = revueltoDoorAxis(side);
            plate(fixed, 'body_anchor', [-.025, -.040, -side * .045], [.045, .074, .012], steel);
            bolts(fixed, [-.025, -.040, -side * .054], 'z');
            plate(fixed, 'body_hinge_web', [-.015, -.010, -side * .020], [.030, .042, .030], steel);
            for (const distance of [-.018, .018]) {
                const knuckle = pin(fixed, 'fixed_knuckle', axis.clone().multiplyScalar(distance), .013, .015, steel);
                knuckle.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), axis);
            }
            const shaft = pin(fixed, 'inclined_hinge_axis', [0, 0, 0], .005, .059, chrome);
            shaft.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), axis);
            const moving = pin(leaf, 'moving_knuckle', [0, 0, 0], .012, .019, steel);
            moving.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), axis);
            plate(leaf, 'door_hinge_web', [.018, -.014, -side * .018], [.044, .032, .030], steel);
            plate(leaf, 'door_anchor', [.035, -.047, -side * .043], [.049, .069, .012], steel);
            bolts(leaf, [.035, -.047, -side * .052], 'z');
            const base = new T.Vector3(-.015, -.31, -side * .045), tip = new T.Vector3(.12, -.075, -side * .045);
            plate(fixed, 'gas_body_anchor', base.toArray(), [.032, .046, .016], steel);
            plate(leaf, 'gas_door_anchor', tip.toArray(), [.032, .042, .016], steel);
            const start = pivot.clone().add(base), end = localPivot.clone().add(tip);
            const barrel = pin(root, 'gas_barrel', [0, 0, 0], .010, .15, dark), rod = pin(root, 'gas_piston', [0, 0, 0], .0045, 1, chrome);
            gasSupports.push({ start, door, end, barrel, rod, length: .15 });
            pin(fixed, 'gas_lower_eye', base, .012, .018, steel, 'z');
            pin(leaf, 'gas_upper_eye', tip, .012, .018, steel, 'z');
            wiringBoot(fixed, leaf, pivot, door, localPivot, side);
        }
    });
    const unitY = new T.Vector3(0, 1, 0);
    function updateHardware() {
        root.updateWorldMatrix(true, true);
        for (const item of dynamic) {
            const end = root.worldToLocal(item.door.localToWorld(item.end.clone())), delta = end.sub(item.start), length = delta.length();
            item.mesh.position.copy(item.start).addScaledVector(delta, (item.from + item.to) / 2);
            item.mesh.quaternion.setFromUnitVectors(unitY, delta.normalize());
            item.mesh.scale.y = length * (item.to - item.from);
        }
        for (const item of liftingLinks) {
            const end = root.worldToLocal(item.door.localToWorld(item.end.clone())), span = end.clone().sub(item.start), d = span.length(), direction = span.clone().normalize();
            // Intersection of two fixed-radius circles, in the lifting plane.
            const { a, b } = item, along = (a * a - b * b + d * d) / (2 * d), height = Math.sqrt(Math.max(0, a * a - along * along));
            const bend = new T.Vector3(.9, -.2, -item.side * .2);
            bend.addScaledVector(direction, -bend.dot(direction)).normalize();
            const joint = item.start.clone().addScaledVector(direction, along).addScaledVector(bend, height);
            const normal = new T.Vector3().crossVectors(direction, bend).normalize();
            for (const [link, p, q] of [[item.lower, item.start, joint], [item.upper, joint, end]]) {
                const alongLink = q.clone().sub(p).normalize();
                link.position.copy(p).add(q).multiplyScalar(.5);
                link.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3().crossVectors(alongLink, normal).normalize(), alongLink, normal));
            }
            item.elbow.position.copy(joint);
            item.elbow.quaternion.setFromUnitVectors(unitY, normal);
        }
        for (const support of gasSupports) {
            const end = root.worldToLocal(support.door.localToWorld(support.end.clone())), delta = end.clone().sub(support.start), distance = delta.length(), direction = delta.normalize();
            support.barrel.position.copy(support.start).addScaledVector(direction, support.length / 2);
            support.barrel.quaternion.setFromUnitVectors(unitY, direction);
            const extension = distance - support.length + .015;
            support.rod.position.copy(support.start).addScaledVector(direction, (support.length - .015 + distance) / 2);
            support.rod.quaternion.setFromUnitVectors(unitY, direction);
            support.rod.scale.y = extension;
        }
        for (const loom of looms) {
            const { start, door, end, side } = loom;
            const finish = root.worldToLocal(door.localToWorld(end.clone()));
            const c1 = start.clone().add(new T.Vector3(.016, -.012, -side * .046));
            const c2 = root.worldToLocal(door.localToWorld(end.clone().add(new T.Vector3(-.014, -.012, -side * .046))));
            const curve = new T.CubicBezierCurve3(start, c1, c2, finish), count = loom.segments.length;
            loom.fixedCollar.quaternion.setFromUnitVectors(unitY, c1.clone().sub(start).normalize());
            const doorTangent = new T.Vector3(.014, .012, side * .046).normalize();
            loom.doorCollar.quaternion.setFromUnitVectors(unitY, doorTangent);
            for (let i = 0; i < count; i++) {
                const a = curve.getPoint(i / count), b = curve.getPoint((i + 1) / count), delta = b.clone().sub(a), segment = loom.segments[i], ring = loom.rings[i];
                segment.position.copy(a).add(b).multiplyScalar(.5);
                segment.quaternion.setFromUnitVectors(unitY, delta.clone().normalize());
                segment.scale.y = delta.length() + .0005;
                ring.position.copy(curve.getPoint((i + .5) / count));
                ring.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), curve.getTangent((i + .5) / count));
            }
        }
    }
    const original = vehicle.setDoors?.bind(vehicle);
    function setDoors(left, right = left) {
        if (original)
            original(left, right);
        else
            doors.forEach((door, i) => {
                const rest = closed[i], side = Math.sign(rest.z), pivot = new T.Vector3(rest.x - .14, rest.y, side * .84);
                door.rotation.y = -side * 1.02 * T.MathUtils.clamp(i === 0 ? left : right, 0, 1);
                door.position.copy(rest).sub(pivot).applyAxisAngle(unitY, door.rotation.y).add(pivot);
            });
        updateHardware();
    }
    updateHardware();
    return { ...vehicle, setDoors };
}
