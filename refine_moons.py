import bpy,json,math,numpy as np
from pathlib import Path
ROOT=Path(__file__).resolve().parent;TEX=ROOT/'dist/textures';ASSETS=ROOT/'dist/assets'

def refine_moons():
 sources=json.loads((ROOT/'dist/moon-map-sources.json').read_text());moons=json.loads((ROOT/'dist/moons.json').read_text())
 original=ROOT/'work/enceladus-cassini-original.jpg'
 if original.exists():
  im=bpy.data.images.load(str(original),check_existing=True);im.scale(2048,1024);im.file_format='JPEG';im.filepath_raw=str(TEX/'moon-maps/enceladus.jpg');im.save()
  sources['Enceladus']={'file':'moon-maps/enceladus.jpg','page':'https://www.lpi.usra.edu/icy_moons/saturn/enceladus/','url':'https://www.lpi.usra.edu/icy_moons/images/esmap-cyl-KH.jpg','credit':'Paul Schenk / Lunar and Planetary Institute; NASA/JPL Cassini ISS, CC BY 4.0','note':'Cassini global mosaic resized to 2048 × 1024.'}
 def png(name,px):
  h,w,_=px.shape;im=bpy.data.images.new(name,width=w,height=h);im.pixels.foreach_set(px.astype(np.float32).ravel());im.filepath_raw=str(TEX/name);im.file_format='PNG';im.save();return im
 for m in moons:
  name=m['name'];o=bpy.data.objects[name]
  if name in sources:
   file=sources[name]['file'];m['texture']=file;m['surfaceSource']=sources[name]['page'];m['surfaceNote']=sources[name]['note'];m['surfaceType']='Spacecraft mosaic'
  elif name=='Moon':file='2k_moon.jpg';m['surfaceSource']='https://www.solarsystemscope.com/textures/';m['surfaceType']='Mapped lunar surface';m['surfaceNote']='NASA-based lunar map by Solar System Scope, CC BY 4.0.'
  else:
   file=m['texture'];m['surfaceType']='Illustrative reconstruction';m['surfaceNote']='No global spacecraft texture used; relief and colour are illustrative.';m['surfaceSource']='https://science.nasa.gov/'+('saturn/moons/titan/facts/' if name=='Titan' else 'neptune/moons/'+name.lower()+'/')
  image=bpy.data.images.load(str(TEX/file),check_existing=False)
  if name=='Titan':
   w,h=1024,512;u,v=np.meshgrid(np.linspace(0,math.tau,w),np.linspace(-math.pi/2,math.pi/2,h));px=np.ones((h,w,4));shade=.86+.05*np.sin(u*3+v*2)-.2*np.abs(np.sin(v))**6;px[:,:,:3]=np.array([.76,.48,.18])*shade[:,:,None];image=png('titan_haze.png',px);file='titan_haze.png';m['texture']=file;m['surfaceNote']='Illustrative amber atmospheric haze; not a visible-light map of the ground.'
  w,h=image.size;pixels=np.array(image.pixels[:]).reshape(h,w,4);gray=pixels[:,:,:3].mean(axis=2);blur=gray.copy()
  for _ in range(3):blur=(blur+np.roll(blur,2,0)+np.roll(blur,-2,0)+np.roll(blur,2,1)+np.roll(blur,-2,1))/5
  relief=np.ones_like(pixels);relief[:,:,:3]=np.clip(.5+(gray-blur)*.65,0,1)[:,:,None];height_name='moon-maps/'+name.lower()+'_detail.png';height=png(height_name,relief);height.colorspace_settings.name='Non-Color';m['detailMap']=height_name
  mat=bpy.data.materials.new(name+' • spacecraft surface');mat.use_nodes=True;nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.82 if name in ['Europa','Enceladus','Tethys','Dione'] else .96
  tx=nodes.new('ShaderNodeTexImage');tx.image=image;links.new(tx.outputs['Color'],bs.inputs['Base Color'])
  if name!='Titan':
   bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.18;bump.inputs['Distance'].default_value=m['radius']*.006;detail=nodes.new('ShaderNodeTexImage');detail.image=height;links.new(detail.outputs['Color'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bs.inputs['Normal'])
  if name in ['Europa','Enceladus']:bs.inputs['Coat Weight'].default_value=.08;bs.inputs['Coat Roughness'].default_value=.65
  o.data.materials.clear();o.data.materials.append(mat)
  # Small irregular moons get a stronger geometric silhouette; smooth icy moons remain nearly spherical.
  for mod in o.modifiers:
   if mod.type=='DISPLACE':mod.strength=m['radius']*(.035 if name in ['Phobos','Deimos','Proteus'] else .0015)
  o['surface_source']=m['surfaceSource'];o['surface_note']=m['surfaceNote']
  clone=o.copy();clone.data=o.data.copy();clone.animation_data_clear();clone.parent=None;clone.location=(0,0,0);clone.rotation_euler=(0,0,0);clone.name=name+'_Asset';bpy.context.collection.objects.link(clone)
  bpy.ops.object.select_all(action='DESELECT');clone.select_set(True);bpy.context.view_layer.objects.active=clone
  bpy.ops.export_scene.gltf(filepath=str(ASSETS/(name.lower()+'.glb')),export_format='GLB',use_selection=True,export_apply=True,export_animations=False)
  bpy.data.objects.remove(clone,do_unlink=True)

 for im in bpy.data.images:
  if im.source=='FILE':im.pack()
 (ROOT/'dist/moons.json').write_text(json.dumps(moons,indent=2));(ROOT/'dist/moon-map-sources.json').write_text(json.dumps(sources,indent=2))
 print('REFINED_MOONS',len(moons),'spacecraft maps',len(sources)+1)

if __name__=='__main__':
 bpy.ops.wm.open_mainfile(filepath=str(ROOT/'Solar System.blend'));bpy.context.scene.frame_set(1);refine_moons();bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'Solar System.blend'))
