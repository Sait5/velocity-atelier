"""Fit the unmodified, rigid supplied linkage to the inner jamb and door metal."""
exec(open('tools/place-revuelto-mechanism.py',encoding='utf8').read().split('# Reuse the reviewed rigid fit.')[0])
conversion=M(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
data=json.load(open('tools/generated/revuelto-placement-before-rigid.json'))['left']
matrix=M([[data[c*4+r] for c in range(4)] for r in range(4)])
matrix.translation.y-=.08
rig.matrix_world=conversion.inverted()@matrix@conversion@M.Diagonal((.001,.001,.001,1))
body_surface=tree([o for o in car if o.name in ['DoorSill_PlasticBlack_01','DoorSill_PlasticBlack_03']])
door_surface=tree([o for o in car if o.name=='DoorJambLF_CarPaint'])
body_plate=bpy.data.objects['Body_Mount | four-bolt mounting flange']
door_plate=bpy.data.objects['Door_Mount | bolt flange']
def centre(o):return sum((o.matrix_world@V(p) for p in o.bound_box),V())/8
for iteration in range(32):
 bpy.context.view_layer.update();a,b=centre(body_plate),centre(door_plate)
 ta=body_surface.find_nearest(a)[0];tb=door_surface.find_nearest(b)[0]
 rotation=(b-a).rotation_difference(tb-ta).to_matrix().to_4x4()
 rig.matrix_world=M.Translation((ta+tb)/2)@rotation@M.Translation(-(a+b)/2)@rig.matrix_world
bpy.context.view_layer.update()
left=conversion@rig.matrix_world@M.Diagonal((1000,1000,1000,1))@conversion.inverted()
right=M.Diagonal((1,1,-1,1))@left
json.dump({'left':[left[r][c] for c in range(4) for r in range(4)],'right':[right[r][c] for c in range(4) for r in range(4)]},open('tools/generated/revuelto-rigid-placement.json','w'),indent=2)
print('RIGID_FIT',list(centre(body_plate)),list(centre(door_plate)),body_surface.find_nearest(centre(body_plate))[3],door_surface.find_nearest(centre(door_plate))[3],flush=True)
mount=bpy.data.objects['Door_Mount'];closed=mount.matrix_world.copy().inverted();poses=[]
for index in range(241):
 frame=1+119*index/240;bpy.context.scene.frame_set(int(frame),subframe=frame%1)
 transform=conversion@mount.matrix_world@closed@conversion.inverted()
 poses.append([transform[r][c] for c in range(4) for r in range(4)])
json.dump(poses,open('tools/generated/revuelto-current-door-poses.json','w'))

