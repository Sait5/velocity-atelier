"""Garage trailers in H.264 MP4 next to the WebM originals: Safari on Macs and iPhones plays VP9 WebM badly or not at all,
so the trailers' <video> lists the MP4 first for them (GarageTrailers.client.vue). The pictures are the same films,
re-encoded only (Blender's video sequencer reads the WebM and writes H.264 through its FFmpeg); no audio.
Run: blender -b --factory-startup --python tools/trailers-to-mp4.py [-- <name-filter>]
"""
import bpy, os, sys, glob

DIR = os.path.join('public', 'video', 'garage')
only = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else ''
for src in sorted(glob.glob(os.path.join(DIR, '*.webm'))):
    name = os.path.splitext(os.path.basename(src))[0]
    if only and only not in name: continue
    out = os.path.join(DIR, name + '.mp4')
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.sequence_editor_create()
    strip = sc.sequence_editor.strips.new_movie('film', os.path.abspath(src), 1, 1)
    sc.frame_start, sc.frame_end = 1, strip.frame_final_duration
    clip = bpy.data.movieclips.load(os.path.abspath(src)) if False else None
    w, h = strip.elements[0].orig_width, strip.elements[0].orig_height
    fps = strip.fps
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = w, h, 100
    sc.render.fps, sc.render.fps_base = round(fps), round(fps) / fps
    r = sc.render; r.image_settings.media_type = 'VIDEO'; r.ffmpeg.format = 'MPEG4'; r.ffmpeg.codec = 'H264'
    r.ffmpeg.constant_rate_factor = 'HIGH'; r.ffmpeg.ffmpeg_preset = 'GOOD'; r.ffmpeg.gopsize = int(round(fps)); r.ffmpeg.audio_codec = 'NONE'
    sc.view_settings.view_transform = 'Standard'
    r.filepath = os.path.abspath(out); r.use_file_extension = False
    bpy.ops.render.render(animation=True)
    print('MP4', name, w, h, round(fps, 2), sc.frame_end, os.path.getsize(out) // 1024, 'KB')
