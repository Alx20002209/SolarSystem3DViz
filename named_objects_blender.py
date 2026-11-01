import bpy,json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parent

def add_named_objects():
 for a in json.loads((ROOT/'dist/named-asteroids.json').read_text()):
  for name in [a['name']+' named object',a['name']+' sign']:
   old=bpy.data.objects.get(name)
   if old:bpy.data.objects.remove(old,do_unlink=True)
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4,radius=a['radius']);o=bpy.context.object;o.name=a['name']+' named object'
  o.location=(a['orbit']*math.cos(a['phase']),a['orbit']*math.sin(a['phase']),0)
  for poly in o.data.polygons:poly.use_smooth=True
  t=bpy.data.textures.new(a['name']+' rock detail',type='CLOUDS');t.noise_scale=.08
  mod=o.modifiers.new('Illustrative rock relief','DISPLACE');mod.texture=t;mod.strength=a['radius']*.035
  mat=bpy.data.materials.new(a['name']+' rough surface');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.3,.28,.25,1);bs.inputs['Roughness'].default_value=.95;o.data.materials.append(mat)
  o.driver_add('rotation_euler',2).driver.expression=f'(frame-1)/30/240*{math.tau}'
  for axis,fn in [(0,'cos'),(1,'sin')]:o.driver_add('location',axis).driver.expression=f'{a["orbit"]}*{fn}({a["phase"]}+(frame-1)/30*.25/1800*{math.tau})'
  o['source']=a['source'];o['note']='Illustrative surface, size, position and orbital timing';o['clickable_name']=a['name']
  cu=bpy.data.curves.new(a['name']+' sign','FONT');cu.body=a['name'];cu.size=.4;sign=bpy.data.objects.new(a['name']+' sign',cu);bpy.context.collection.objects.link(sign);sign.parent=o;sign.location=(0,0,a['radius']+.3)
 for m in json.loads((ROOT/'dist/moons.json').read_text()):
  o=bpy.data.objects.get(m['name'])
  if o:o.driver_add('rotation_euler',2).driver.expression=f'(frame-1)/30/180*{math.tau}'
 print('NAMED_OBJECTS_AND_MOON_SPIN_READY')

if __name__=='__main__':
 import sys
 sys.path.insert(0,str(ROOT))
 from environment_blender import add_environment
 bpy.ops.wm.open_mainfile(filepath=str(ROOT/'Solar System.blend'));add_environment();add_named_objects();bpy.context.scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'Solar System.blend'))
