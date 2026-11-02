import * as THREE from 'three';
const textures=new THREE.TextureLoader();
export function texture(file,color=true){const t=textures.load('./textures/'+file);t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=8;return t}
export function atmosphere(radius,color,intensity=.65){
 return new THREE.Mesh(new THREE.SphereGeometry(radius*1.018,64,32),new THREE.ShaderMaterial({uniforms:{tint:{value:new THREE.Color(color)},intensity:{value:intensity}},vertexShader:`varying vec3 wn;varying vec3 wp;void main(){wp=(modelMatrix*vec4(position,1.)).xyz;wn=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);}`,fragmentShader:`uniform vec3 tint;uniform float intensity;varying vec3 wn;varying vec3 wp;void main(){vec3 n=normalize(wn);float rim=pow(1.-max(dot(n,normalize(cameraPosition-wp)),0.),3.);float day=.15+.85*max(dot(n,normalize(-wp)),0.);gl_FragColor=vec4(tint*1.5,rim*day*intensity);}`,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
}
export function enhancePlanet(p,model,tilt){
 let surface;model.traverse(o=>{if(o.isMesh){surface=o;o.material.normalMap=null;o.castShadow=true;o.receiveShadow=true;o.material.roughness=p.name==='Earth'?.75:.85;o.material.metalness=0;if(['Mercury','Mars'].includes(p.name)){o.material.bumpMap=o.material.map;o.material.bumpScale=.012*p.radius}}});
 if(p.name==='Earth'){
  const mat=new THREE.MeshPhysicalMaterial({map:surface.material.map,roughnessMap:texture('earth_roughness.png',false),roughness:1,metalness:0,clearcoat:.2,clearcoatRoughness:.2,emissive:0xffffff,emissiveMap:texture('2k_earth_nightmap.jpg'),emissiveIntensity:1.5});
  // glTF uses flipped UV convention relative to TextureLoader.
  mat.roughnessMap.flipY=false;mat.emissiveMap.flipY=false;
  mat.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vPlanetWorld;').replace('#include <project_vertex>','#include <project_vertex>\nvPlanetWorld=(modelMatrix*vec4(transformed,1.)).xyz;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vPlanetWorld;').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance*=1.-smoothstep(-.2,.15,dot(normal,normalize((viewMatrix*vec4(-vPlanetWorld,0.)).xyz)));')};surface.material=mat;
  const clouds=new THREE.Mesh(new THREE.SphereGeometry(p.radius*1.012,96,48),new THREE.MeshStandardMaterial({map:texture('earth_cloud_alpha.png'),transparent:true,opacity:.9,depthWrite:false,roughness:1}));tilt.add(clouds);model.userData.clouds=clouds;
  tilt.add(atmosphere(p.radius,0x398bff,.9));
 } else if(['Venus','Mars','Jupiter','Saturn','Uranus','Neptune'].includes(p.name)){
  const color={Venus:0xf5ce85,Mars:0xe69c70,Jupiter:0xd8b69c,Saturn:0xd7c594,Uranus:0x6bcdd2,Neptune:0x548cf7}[p.name];tilt.add(atmosphere(p.radius,color,p.name==='Mars'?.2:.4));
 }
 if(p.name==='Saturn'){
  const inner=p.radius*1.25,outer=p.radius*2.25,geometry=new THREE.RingGeometry(inner,outer,256);
  const position=geometry.attributes.position,uv=geometry.attributes.uv;
  for(let i=0;i<position.count;i++){const r=Math.hypot(position.getX(i),position.getY(i));uv.setXY(i,(r-inner)/(outer-inner),.5)}
  const ring=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:texture('2k_saturn_ring_alpha.png'),emissiveMap:texture('2k_saturn_ring_alpha.png'),emissive:0xffffff,emissiveIntensity:.28,transparent:true,side:THREE.DoubleSide,roughness:1,depthWrite:false,alphaTest:.05}));ring.rotation.x=-Math.PI/2;ring.receiveShadow=true;tilt.add(ring);
 }
 if(p.name==='Uranus'){
  const ring=new THREE.Mesh(new THREE.RingGeometry(p.radius*1.8,p.radius*1.84,128),new THREE.MeshBasicMaterial({color:0x8b9492,side:THREE.DoubleSide,transparent:true,opacity:.3}));ring.rotation.x=Math.PI/2;tilt.add(ring);
 }
}


export function enhanceMoon(m,model,node){
 model.traverse(o=>{if(!o.isMesh)return;const mat=o.material;mat.normalMap=null;mat.roughness=['Europa','Enceladus','Tethys','Dione'].includes(m.name)?.82:.96;mat.metalness=0;
 if(m.name!=='Titan'){mat.bumpMap=texture(m.detailMap,false);mat.bumpMap.flipY=false;mat.bumpScale=m.radius*.006;}else{mat.bumpMap=null;mat.roughness=1;}
 });
 if(m.name==='Titan')node.add(atmosphere(m.radius,0xe1a452,.6));
}
