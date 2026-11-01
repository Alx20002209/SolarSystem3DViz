import bpy,json,math,random
from pathlib import Path
ROOT=Path(__file__).resolve().parent

def add_environment():
 name='Environmental structures — enhanced visibility'
 if name in bpy.data.collections:
  old=bpy.data.collections[name]
  for obj in list(old.objects):bpy.data.objects.remove(obj,do_unlink=True)
  bpy.data.collections.remove(old)
 collection=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(collection)
 def into(o):
  for c in list(o.users_collection):c.objects.unlink(o)
  collection.objects.link(o);return o
 def mat(name,color):
  m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Roughness'].default_value=1;return m
 rock=mat('Dark main-belt rock',(.22,.18,.14));ice=mat('Kuiper icy bodies',(.36,.38,.4));dustmat=mat('Zodiacal dust scattering proxy',(.4,.33,.22))
 template=[(1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1)];triangles=[(0,2,4),(2,1,4),(1,3,4),(3,0,4),(2,0,5),(1,2,5),(3,1,5),(0,3,5)]
 def particles(name,positions,sizes,material):
  verts=[];faces=[]
  for (x,y,z),r in zip(positions,sizes):
   start=len(verts)
   verts.extend([(x+dx*r,y+dy*r*.75,z+dz*r*.6) for dx,dy,dz in template]);faces.extend([tuple(start+i for i in f) for f in triangles])
  mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.materials.append(material);o=bpy.data.objects.new(name,mesh);collection.objects.link(o);return o
 data=json.loads((ROOT/'dist/environment-data.json').read_text())
 for field in data['belts']:
  items=field['objects'];positions=[(a['a']*math.cos(a['phase']),a['a']*math.sin(a['phase']),a['a']*math.sin(a['phase'])*a['inclination']) for a in items]
  o=particles('Main asteroid belt' if field['name']=='main' else 'Kuiper Belt • icy small bodies',positions,[a['size'] for a in items],rock if field['name']=='main' else ice)
  o['placement']='Between Mars and Jupiter' if field['name']=='main' else 'Beyond Neptune, main region 30–50 AU; distance compressed'
  o['note']='Representative particles, not an asteroid catalogue; sizes enhanced'
  period=sum(a['period'] for a in items)/len(items);o.driver_add('rotation_euler',2).driver.expression=f'(frame-1)/30*.25/{period}*{math.tau}'
 random.seed(7401);positions=[]
 for _ in range(2000):
  r=4+random.random()**1.5*29;a=random.random()*math.tau;positions.append((r*math.cos(a),r*math.sin(a),(random.random()-.5)*r*.085))
 o=particles('Inner zodiacal dust • enhanced',positions,[.018]*len(positions),dustmat);o['note']='Diffuse inner-system dust; visible particle size is exaggerated'
 moons=json.loads((ROOT/'dist/moons.json').read_text());enc=next(m for m in moons if m['name']=='Enceladus');r=enc['orbit']
 def volume(name,density):
  m=bpy.data.materials.new(name);m.use_nodes=True;nodes=m.node_tree.nodes;nodes.clear();out=nodes.new('ShaderNodeOutputMaterial');v=nodes.new('ShaderNodeVolumePrincipled');v.inputs['Density'].default_value=density;v.inputs['Color'].default_value=(.55,.75,.9,1);m.node_tree.links.new(v.outputs['Volume'],out.inputs['Volume']);return m
 positions=[]
 for _ in range(1500):
  a=random.random()*math.tau;dr=(random.random()+random.random()-1)*1.2;positions.append(((r+dr)*math.cos(a),(r+dr)*math.sin(a),(random.random()-.5)*.8))
 torus=particles('Enceladus gas particles',positions,[.025]*len(positions),ice);torus.parent=bpy.data.objects['Saturn_Orbit'];torus.rotation_euler.x=math.radians(26.7);torus['note']='Particle representation of gas; enhanced visibility, not individual molecules at scale'
 positions=[]
 for _ in range(2200):
  a=random.random()*math.tau;dr=(random.random()+random.random()-1)*r*.6;positions.append(((r+dr)*math.cos(a),(r+dr)*math.sin(a),(random.random()-.5)*.17))
 o=particles('Saturn diffuse E ring • ice grains',positions,[.025]*len(positions),ice);o.parent=bpy.data.objects['Saturn_Orbit'];o.rotation_euler.x=math.radians(26.7)
 radius=enc['radius'];positions=[]
 for _ in range(480):
  h=random.random()*radius*5;a=random.random()*math.tau;w=(.025+h*.16)*random.random();positions.append((math.cos(a)*w,math.sin(a)*w,-radius-h))
 plume=particles('Enceladus south-polar plume particles',positions,[.006]*len(positions),ice);plume.parent=bpy.data.objects['Enceladus']
 bpy.context.scene['environment_sources']='See dist/environment-sources.json. Belts and clouds use compressed positions and enhanced visibility.'
 bpy.context.scene.camera.data.ortho_scale=180
 print('ENVIRONMENT_READY',sum(len(b['objects']) for b in data['belts']))

if __name__=='__main__':
 bpy.ops.wm.open_mainfile(filepath=str(ROOT/'Solar System.blend'));bpy.context.scene.frame_set(1);add_environment();bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'Solar System.blend'))
