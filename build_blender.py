"""Blender 5 generator: editable modifiers, image-based materials, moons and solar plasma."""
import bpy, math, json
import numpy as np
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
ASSETS=ROOT/'dist/assets'; TEX=ROOT/'dist/textures'
planets=json.loads((ROOT/'dist/planets.json').read_text()); moons=json.loads((ROOT/'dist/moons.json').read_text())
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.fps=30;scene.frame_start=1;scene.frame_end=1440
scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs[0].default_value=(0,0,0,1)
images={}
def load(name):
 if name not in images: images[name]=bpy.data.images.load(str(TEX/name),check_existing=True)
 return images[name]
def save_pixels(name,pixels):
 h,w,_=pixels.shape;im=bpy.data.images.new(name,width=w,height=h);im.pixels.foreach_set(pixels.astype(np.float32).ravel());im.filepath_raw=str(TEX/name);im.file_format='PNG';im.save();images[name]=im;return im
# Earth has actual continent geometry in the imagery, plus separate water roughness and cloud alpha.
im=load('8k_earth_daymap.jpg');im.scale(4096,2048);im.filepath_raw=str(TEX/'4k_earth_daymap.jpg');im.file_format='JPEG';im.save();images['4k_earth_daymap.jpg']=im
p=np.array(im.pixels[:],dtype=np.float32).reshape(2048,4096,4)
water=(p[:,:,2]>p[:,:,0]*1.35)&(p[:,:,2]>p[:,:,1]*1.12)
rough=np.ones_like(p);rough[:,:,:3]=np.where(water[:,:,None],.19,.86);save_pixels('earth_roughness.png',rough)
cloud=load('2k_earth_clouds.jpg');cp=np.array(cloud.pixels[:]).reshape(cloud.size[1],cloud.size[0],4);cp[:,:,3]=np.clip(cp[:,:,:3].mean(axis=2)*1.35-.05,0,.92);cp[:,:,:3]=1;save_pixels('earth_cloud_alpha.png',cp)
files={'Earth':'4k_earth_daymap.jpg','Venus':'2k_venus_atmosphere.jpg'}
def image_node(mat,name):
 n=mat.node_tree.nodes.new('ShaderNodeTexImage');n.image=load(name);return n

def material(name,texture,rock=False):
 mat=bpy.data.materials.new(name+' • physical surface');mat.use_nodes=True
 bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.85 if rock else .62
 tex=image_node(mat,texture);mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
 if rock:
  bump=mat.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.2;bump.inputs['Distance'].default_value=.015
  mat.node_tree.links.new(tex.outputs['Color'],bump.inputs['Height']);mat.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
 if name=='Earth':
  rough=image_node(mat,'earth_roughness.png');rough.image.colorspace_settings.name='Non-Color';mat.node_tree.links.new(rough.outputs['Color'],bs.inputs['Roughness'])
 return mat

def sphere(name,radius,mat,rock=False):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=96,ring_count=48,radius=radius)
 o=bpy.context.object;o.name=name;bpy.ops.object.shade_smooth();o.data.materials.append(mat)
 sub=o.modifiers.new('Smooth silhouette • subdivision','SUBSURF');sub.levels=1;sub.render_levels=2
 if rock:
  tex=bpy.data.textures.new(name+' microrelief',type='CLOUDS');tex.noise_scale=.12;tex.noise_depth=2
  dis=o.modifiers.new('Subtle rocky microrelief','DISPLACE');dis.texture=tex;dis.strength=radius*.002;dis.mid_level=.5
 return o

def export(o,name):
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
 bpy.ops.export_scene.gltf(filepath=str(ASSETS/(name.lower()+'.glb')),export_format='GLB',use_selection=True,export_apply=True,export_animations=False)

def orbit_path(name,a,e=0,inc=0,parent=None):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.bevel_depth=.008
 s=cu.splines.new('POLY');s.points.add(256)
 for k,pt in enumerate(s.points):
  E=k/256*math.tau;y=a*math.sqrt(1-e*e)*math.sin(E);pt.co=(a*(math.cos(E)-e),y*math.cos(inc),y*math.sin(inc),1)
 o=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(o);o.parent=parent;o.data.materials.append(orbit_mat);return o
orbit_mat=bpy.data.materials.new('Standard white orbit');orbit_mat.diffuse_color=(1,1,1,1);orbit_mat.use_nodes=True
ob=orbit_mat.node_tree.nodes.get('Principled BSDF');ob.inputs['Emission Color'].default_value=(1,1,1,1);ob.inputs['Emission Strength'].default_value=.5
roots={};bodies={}
for idx,p in enumerate(planets):
 name=p['name'];rock=name in ['Mercury','Mars','Earth']
 o=sphere(name,p['radius'],material(name,files.get(name,'2k_'+name.lower()+'.jpg'),rock),rock and name!='Earth')
 export(o,name)
 pivot=bpy.data.objects.new(name+'_Orbit',None);bpy.context.collection.objects.link(pivot);o.parent=pivot;roots[name]=pivot;bodies[name]=o
 o.rotation_euler.x=math.radians(p['tilt'])
 drv=o.driver_add('rotation_euler',2).driver;drv.expression=f'(frame-1)/30/{min(360,max(120,180*math.sqrt(abs(p["rotation"])/23.9)))}*{math.tau}'
 for frame in range(1,1442,4):
  M=(frame-1)/30*.25/p['period']*math.tau+idx*.72;E=M
  for _ in range(10):E-=(E-p['e']*math.sin(E)-M)/(1-p['e']*math.cos(E))
  y=p['orbit']*math.sqrt(1-p['e']**2)*math.sin(E);inc=math.radians(p['inclination']);pivot.location=(p['orbit']*(math.cos(E)-p['e']),y*math.cos(inc),y*math.sin(inc));pivot.keyframe_insert(data_path='location',frame=frame)
 orbit_path(name+' white orbit',p['orbit'],p['e'],inc)
 if name=='Earth':
  cloud_mat=bpy.data.materials.new('Earth • independent cloud layer');cloud_mat.use_nodes=True
  bs=cloud_mat.node_tree.nodes.get('Principled BSDF');tx=image_node(cloud_mat,'earth_cloud_alpha.png');cloud_mat.node_tree.links.new(tx.outputs['Color'],bs.inputs['Base Color']);cloud_mat.node_tree.links.new(tx.outputs['Alpha'],bs.inputs['Alpha'])
  clouds=sphere('Earth clouds',p['radius']*1.012,cloud_mat);clouds.parent=o;clouds.location=(0,0,0)
 if name=='Saturn':
  vertices=[];faces=[]
  for j in range(257):
   a=j/256*math.tau
   for r in [p['radius']*1.25,p['radius']*2.25]:vertices.append((r*math.cos(a),r*math.sin(a),0))
  for j in range(256):faces.append((2*j,2*j+1,2*j+3,2*j+2))
  mesh=bpy.data.meshes.new('Saturn rings');mesh.from_pydata(vertices,[],faces);mesh.uv_layers.new()
  for poly in mesh.polygons:
   for li in poly.loop_indices:
    vi=mesh.loops[li].vertex_index;mesh.uv_layers[0].data[li].uv=(vi%2,0.5)
  ring=bpy.data.objects.new('Saturn • detailed icy rings',mesh);bpy.context.collection.objects.link(ring);ring.parent=o
  mat=material('Saturn rings','2k_saturn_ring_alpha.png');bs=mat.node_tree.nodes.get('Principled BSDF');tx=next(n for n in mat.node_tree.nodes if n.type=='TEX_IMAGE');mat.node_tree.links.new(tx.outputs['Alpha'],bs.inputs['Alpha']);ring.data.materials.append(mat)
# Moon shapes and unique procedural surface maps; only Earth's Moon uses a mapped lunar texture.
rng=np.random.default_rng(42)
for m in moons:
 name=m['name'];w,h=1024,512
 if name=='Moon':tex='2k_moon.jpg'
 else:
  u,v=np.meshgrid(np.linspace(0,math.tau,w),np.linspace(-math.pi/2,math.pi/2,h));phase=rng.uniform(0,20)
  noise=sum(np.sin(u*f+np.sin(v*f*.73+phase))*np.cos(v*f+phase)/a for f,a in [(7,3),(19,6),(47,12),(101,24)])
  rgb=np.array([int(m['color'][i:i+2],16)/255 for i in (1,3,5)])
  px=np.ones((h,w,4));px[:,:,:3]=rgb*(.82+noise[:,:,None]*.4)
  for _ in range(75):
   cx,cy=rng.uniform(0,w),rng.uniform(0,h);r=rng.uniform(3,25);yy,xx=np.ogrid[:h,:w];d=np.sqrt((xx-cx)**2+(yy-cy)**2)/r
   crater=-np.exp(-d*d*3)*.16+np.exp(-((d-.9)*9)**2)*.1;px[:,:,:3]+=crater[:,:,None]
  if name=='Europa':
   cracks=np.abs(np.sin(u*8+np.sin(v*11+phase)))<.045;px[cracks,:3]*=[.6,.35,.2]
  if name=='Titan':px[:,:,:3]=rgb*(.85+.07*np.sin(v[:,:,None]*18))
  px[:,:,:3]=np.clip(px[:,:,:3],0,1);tex=name.lower()+'_surface.png';save_pixels(tex,px)
 m['texture']=tex
 o=sphere(name,m['radius'],material(name,tex,name!='Titan'),name!='Titan')
 if name in ['Phobos','Deimos','Proteus']:o.scale=(1.3,.85,1)
 export(o,name)
 p=next(p for p in planets if p['name']==m['parent']);a=p['radius']*(2.8+m['rank']*.75)
 if m['parent']=='Saturn':a=p['radius']*(2.7+m['rank']*.5)
 a=max(a,p['radius']*1.8/(1-m['e']));m['orbit']=a
 pivot=bpy.data.objects.new(name+'_MoonOrbit',None);bpy.context.collection.objects.link(pivot);pivot.parent=roots[m['parent']]
 # Equatorial orientation is simplified; Earth and Nereid use ecliptic inclination.
 pivot.rotation_euler.x=math.radians(m['inclination']+(p['tilt'] if m['parent'] not in ['Earth'] and name!='Nereid' else 0))
 o.parent=pivot;o.location=(a,0,0)
 o.driver_add('rotation_euler',2).driver.expression=f'(frame-1)/30/240*{math.tau}'
 for frame in range(1,1442,4):
  M=(frame-1)/30*.0009375/m['period']*math.tau+m['rank']*1.3;E=M
  for _ in range(10):E-=(E-m['e']*math.sin(E)-M)/(1-m['e']*math.cos(E))
  o.location=(a*(math.cos(E)-m['e']),a*math.sqrt(1-m['e']**2)*math.sin(E),0);o.keyframe_insert(data_path='location',frame=frame)
 orbit_path(name+' moon orbit',a,m['e'],parent=pivot)
(ROOT/'dist/moons.json').write_text(json.dumps(moons,indent=2))
# Sun: editable subdivision and animated displacement with a textured emission network.
mat=material('Sun','2k_sun.jpg');bs=mat.node_tree.nodes.get('Principled BSDF');tx=next(n for n in mat.node_tree.nodes if n.type=='TEX_IMAGE');mat.node_tree.links.new(tx.outputs['Color'],bs.inputs['Emission Color']);bs.inputs['Emission Strength'].default_value=2.5
sun=sphere('Sun • photosphere',3,mat)
noise=bpy.data.textures.new('Solar convection',type='CLOUDS');noise.noise_scale=.2
mod=sun.modifiers.new('Granulated plasma silhouette','DISPLACE');mod.texture=noise;mod.strength=.035
sun.driver_add('rotation_euler',2).driver.expression='frame/3000'
export(sun,'Sun')
# Glowing prominence arches.
fire=bpy.data.materials.new('Solar prominence emission');fire.use_nodes=True;bs=fire.node_tree.nodes.get('Principled BSDF');bs.inputs['Emission Color'].default_value=(1,.075,.003,1);bs.inputs['Emission Strength'].default_value=6
for k in range(12):
 cu=bpy.data.curves.new('Plasma loop','CURVE');cu.dimensions='3D';cu.bevel_depth=.018;s=cu.splines.new('POLY');s.points.add(40)
 phi=k*2.399
 for j,pt in enumerate(s.points):
  t=j/40*math.pi;a=phi+(j/40-.5)*.35;r=3+math.sin(t)*(.25+(k%3)*.18);pt.co=(r*math.cos(a),r*math.sin(a),math.sin(phi*2)*.4,1)
 ob=bpy.data.objects.new('Sun prominence %02d'%k,cu);bpy.context.collection.objects.link(ob);ob.data.materials.append(fire)
bpy.ops.object.light_add(type='POINT',location=(0,0,0));bpy.context.object.name='Solar radiance';bpy.context.object.data.energy=40000
bpy.ops.object.camera_add(location=(85,-100,110));cam=bpy.context.object;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=145;scene.camera=cam
# Emissive stellar points against an exactly black world.
verts=[];faces=[]
for k in range(1800):
 v=Vector(rng.normal(size=3));v.normalize();v*=400;r=float(rng.uniform(.06,.22));base=len(verts)
 for offset in [(r,0,0),(-r,0,0),(0,r,0),(0,-r,0),(0,0,r),(0,0,-r)]:verts.append(tuple(v+Vector(offset)))
 for f in [(0,2,4),(2,1,4),(1,3,4),(3,0,4),(2,0,5),(1,2,5),(3,1,5),(0,3,5)]:faces.append(tuple(base+i for i in f))
mesh=bpy.data.meshes.new('Stellar geometry');mesh.from_pydata(verts,[],faces);star=bpy.data.objects.new('Luminous background stars',mesh);bpy.context.collection.objects.link(star)
sm=bpy.data.materials.new('Starlight');sm.use_nodes=True;bs=sm.node_tree.nodes.get('Principled BSDF');bs.inputs['Emission Color'].default_value=(.78,.86,1,1);bs.inputs['Emission Strength'].default_value=7;mesh.materials.append(sm)
scene.render.engine='CYCLES';scene.cycles.samples=32
scene['notes']='22 selected moons. Independent illustrative spin/moon clocks. Image maps: Solar System Scope CC BY 4.0. Relief from image/procedural detail is artistic, not measured topography.'
import sys
sys.path.insert(0,str(ROOT))
from refine_moons import refine_moons
from environment_blender import add_environment
refine_moons()
add_environment()
from named_objects_blender import add_named_objects
add_named_objects()
for im in bpy.data.images:
 if im.source=='FILE':im.pack()
scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'Solar System.blend'))
print('REALISTIC_ASSETS_READY',len(planets),'planets',len(moons),'moons')
