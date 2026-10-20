"""Lamborghini Revuelto: clevis bracket that ties the top of the native gas strut to the door (it floated 12 mm off it).
The strut, the gooseneck arm and its body bracket are native; the door turns on the arm tip (revueltoDoorMotion.ts).
Output public/models/revuelto-door-hinges.glb, car coordinates, closed doors: hinge_door_{P|N}_0 (+ _bolts).
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from hingekit import *
from revuelto_common import setup_revuelto
EXPORT = ROOT + '/public/models/revuelto-door-hinges.glb'
DOOR_PIN = Vector((-.856, .545, .924))          # top end of the native strut (+z side)
STRUT_DIR = (Vector((-.856, .545, .924)) - Vector((-.795, .267, .877))).normalized()

root, doors = setup_revuelto()
door_tree = bvh_for(doors[1])
steel = mat('Revuelto strut bracket', (.05, .052, .056), .5, .45)
loc, nrm, i, d = door_tree.find_nearest(tb(DOOR_PIN))
sp, sn = bt(loc), bt(nrm).normalized()
if sn.dot(DOOR_PIN - sp) < 0: sn = -sn
print('door surface under the pin', tuple(round(c, 3) for c in sp), 'normal', tuple(round(c, 2) for c in sn), 'gap', round(d * 1000, 1), 'mm')
across = sn.cross(STRUT_DIR).normalized()        # pin axis: across the strut, along the door surface
parts = []
for side, tag in ((1, 'P'), (-1, 'N')):
    bm = bmesh.new(); bmb = bmesh.new()
    beam(bm, tuple(sp + sn * .002 - STRUT_DIR * .016), tuple(sp + sn * .002 + STRUT_DIR * .016), .03, .004, tuple(sn), side)
    for k in (-1, 1):
        ear = across * .0105 * k
        beam(bm, tuple(sp + sn * .003 + ear), tuple(DOOR_PIN + sn * .006 + ear), .016, .003, tuple(across), side)
    cylinder(bm, tuple(DOOR_PIN), tuple(across), .0032, .028, side, 12)
    for k in (-1, 1):
        bolt(bmb, tuple(sp + sn * .004 + STRUT_DIR * .011 * k), tuple(sn), side, .0032, .0025)
    parts += [obj(f'hinge_door_{tag}_0', bm, steel), obj(f'hinge_door_{tag}_0_bolts', bmb, steel)]
export(parts, EXPORT)
print('exported', EXPORT, os.path.getsize(EXPORT))
