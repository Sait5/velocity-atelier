"""Revuelto in runtime car coordinates (source rotated -90deg about Y, offset), with the site's door grouping."""
import re, math
from common import *

def setup_revuelto():
    load('lamborghini-revuelto-web.glb')
    root = bpy.data.objects.new('car_root', None); bpy.context.scene.collection.objects.link(root)
    for o in list(bpy.data.objects):
        if o.parent is None and o is not root:
            o.parent = root
    # three: source.rotation.y=-PI/2; position (.10516,.00108,0)
    rot3 = Matrix.Rotation(-math.pi / 2, 4, 'Y')
    m3 = Matrix.Translation((.10516, .00108, 0)) @ rot3
    root.matrix_world = B @ m3 @ BI
    bpy.context.view_layer.update()
    doors = {}
    for side, code in ((1, 'L'), (-1, 'R')):
        pat = re.compile(rf'^(Door{code}F_|DoorJamb{code}F_|DoorCard{code}F|WingMirror{code}_|MirrorBase{code}_|Glass{code}M_)')
        doors[side] = [o for o in bpy.data.objects if o.type == 'MESH' and pat.match(o.name) and 'Piston' not in o.name]
    return root, doors

def pose_matrix(side, p, pivot=None, axis=None, angle=1.22):
    pivot = pivot or (-.80, .98, side * .86)
    axis = axis or Vector((side * .035, -side * .55, 1)).normalized()
    return three_rotation_about(Vector(pivot), axis, angle * p)
