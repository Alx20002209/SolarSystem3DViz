import * as THREE from 'three';
import {clearanceScale,createRockGrid} from './asteroid-clearance.js';
import {TAU} from './orbits.js';
let seed=7401;const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646};
function cloud(positions,color,size,opacity){
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 const material=new THREE.ShaderMaterial({uniforms:{color:{value:new THREE.Color(color)},size:{value:size},opacity:{value:opacity},ratio:{value:Math.min(devicePixelRatio,1.75)}},vertexShader:`uniform float size;uniform float ratio;void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(size*ratio*420./max(1.,-p.z),1.,7.);}`,fragmentShader:`uniform vec3 color;uniform float opacity;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;float a=exp(-r*r*26.)*opacity;gl_FragColor=vec4(color,a);}`,transparent:true,depthWrite:false,blending:THREE.NormalBlending});
 return new THREE.Points(geometry,material);
}
export function createEnvironment(scene,bodies,moons,data,realisticScale=false){
 const belts=new THREE.Group();belts.name='Representative asteroid and Kuiper populations';scene.add(belts);
 const dust=new THREE.Group();dust.name='Zodiacal dust';scene.add(dust);const clouds=new THREE.Group();scene.add(clouds);
 const geometry=new THREE.IcosahedronGeometry(1,1);const pos=geometry.attributes.position;
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),n=1+.13*Math.sin(x*9+y*4)*Math.cos(z*7);pos.setXYZ(i,x*n,y*n,z*n)}geometry.computeVertexNormals();
 const dummy=new THREE.Object3D();const fields=data.belts.map(field=>{const material=new THREE.MeshStandardMaterial({color:field.name==='main'?0x746658:0x9a9c9e,roughness:1});const mesh=new THREE.InstancedMesh(geometry,material,field.objects.length);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;belts.add(mesh);return {...field,mesh}});
 const dustPositions=[];for(let i=0;i<2600;i++){const r=4+random()**1.5*29,a=random()*TAU;dustPositions.push(Math.cos(a)*r,(random()-.5)*r*.085,Math.sin(a)*r)}dust.add(cloud(dustPositions,0xa29478,.8,.045));
 const disk=new THREE.Mesh(new THREE.RingGeometry(4,33,128),new THREE.ShaderMaterial({vertexShader:`varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 p;void main(){float r=length(p.xy);float a=smoothstep(4.,8.,r)*(1.-smoothstep(12.,33.,r))*.017;gl_FragColor=vec4(.4,.32,.21,a);}`,transparent:true,side:THREE.DoubleSide,depthWrite:false}));disk.rotation.x=-Math.PI/2;dust.add(disk);dust.scale.setScalar(realisticScale?10:1);
 const saturn=bodies[5],enceladus=moons.find(m=>m.name==='Enceladus'),torus=new THREE.Group();torus.name='Enhanced Enceladus water-vapour torus';torus.rotation.z=THREE.MathUtils.degToRad(26.7);saturn.root.add(torus);
 const r=enceladus.orbitData.orbit,gas=[],ice=[];
 for(let i=0;i<1500;i++){const a=random()*TAU,dr=(random()+random()+random()-1.5)*r*.15;gas.push((r+dr)*Math.cos(a),(random()+random()-1)*r*.1,(r+dr)*Math.sin(a))}
 for(let i=0;i<2300;i++){const a=random()*TAU,dr=(random()+random()-1)*r*.6;ice.push((r+dr)*Math.cos(a),(random()-.5)*r*.025,(r+dr)*Math.sin(a))}
 torus.add(cloud(gas,0x80afc7,.055,.38));torus.add(cloud(ice,0xcbd8dc,.065,.3));
 const plumeGroup=new THREE.Group();plumeGroup.name='Enceladus south-polar vapour and ice';enceladus.node.add(plumeGroup);const plumePos=[];for(let i=0;i<480;i++){const h=random()**1.5*enceladus.radius*5,a=random()*TAU,w=(enceladus.radius*.12+h*.16)*random();plumePos.push(Math.cos(a)*w,-enceladus.radius-h,Math.sin(a)*w)}const plumeParticles=cloud(plumePos,0xc5e5f1,.025,.65);plumeGroup.add(plumeParticles);const plumeSeeds=plumePos.slice();
 const annotations=[{text:'MAIN ASTEROID BELT',position:new THREE.Vector3(...(realisticScale?[-190,0,190]:[-20,0,20]))},{text:'KUIPER BELT · ICY BODIES',position:new THREE.Vector3(...(realisticScale?[-3900,0,-1000]:[-67,0,-20]))}];
 let beltsOn=true,dustOn=true;
return {belts,dust,torus,plumeGroup,annotations,setBelts(on){beltsOn=on;belts.visible=on},setDust(on){dustOn=on;dust.visible=on;torus.visible=on;plumeGroup.visible=on},get beltsOn(){return beltsOn},get dustOn(){return dustOn},update(days,seconds,obstacles=[],refreshBelts=true){
 if(beltsOn&&refreshBelts){
  const grid=createRockGrid();
  for(const field of fields){field.objects.forEach((a,i)=>{const phase=a.phase+days/a.period*TAU;dummy.position.set(a.a*Math.cos(phase),Math.sin(phase)*a.a*a.inclination,a.a*Math.sin(phase));dummy.rotation.set(a.phase+seconds*.001,a.phase*.7+seconds*.002,a.phase*.3);const radius=a.size*Math.max(...a.stretch)*1.14;let scale=clearanceScale(dummy.position.x,dummy.position.y,dummy.position.z,radius,obstacles);
 if(scale>0&&!grid.accept(dummy.position.x,dummy.position.y,dummy.position.z,radius))scale=0;
 dummy.scale.set(a.size*a.stretch[0]*scale,a.size*a.stretch[1]*scale,a.size*a.stretch[2]*scale);dummy.updateMatrix();field.mesh.setMatrixAt(i,dummy.matrix)});field.mesh.instanceMatrix.needsUpdate=true}
 }
  dust.rotation.y=days/365.2*.0005;
  torus.rotation.y=seconds*.002;
  const pp=plumeParticles.geometry.attributes.position;for(let i=0;i<pp.count;i++){const h=((-plumeSeeds[i*3+1]-enceladus.radius)+seconds*enceladus.radius*.12)%(enceladus.radius*5);const spread=.2+h/(enceladus.radius*5);pp.setXYZ(i,plumeSeeds[i*3]*spread,-enceladus.radius-h,plumeSeeds[i*3+2]*spread)}pp.needsUpdate=true;
 }};
}
