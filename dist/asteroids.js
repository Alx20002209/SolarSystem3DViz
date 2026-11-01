import * as THREE from 'three';
export function createAsteroids(scene,data,label,pickMeshes,onSelect){
 const items=data.map((a,index)=>{
  const root=new THREE.Group();scene.add(root);
  const geometry=new THREE.SphereGeometry(a.radius,96,64),p=geometry.attributes.position,colors=[];
  for(let i=0;i<p.count;i++){
   const x=p.getX(i)/a.radius,y=p.getY(i)/a.radius,z=p.getZ(i)/a.radius;
   const noise=Math.sin(x*19+y*8+index)*Math.cos(z*23-x*9),fine=Math.sin(x*73+z*49)*Math.cos(y*57);
   let amount=1+noise*.003+fine*.0008;
   for(let k=0;k<32;k++){const cy=1-2*(k+.5)/32,ca=k*2.399+index,cs=Math.sqrt(1-cy*cy),distance=Math.acos(Math.max(-1,Math.min(1,x*cs*Math.cos(ca)+y*cy+z*cs*Math.sin(ca)))),width=.05+(k%5)*.018,q=distance/width;if(q<1.4)amount+=-.018*Math.exp(-q*q*3)+.006*Math.exp(-Math.pow((q-1)*7,2));}
   p.setXYZ(i,x*a.radius*amount*(index===1?1.12:1),y*a.radius*amount*(index===1?.85:.96),z*a.radius*amount);
   const c=new THREE.Color(a.color).multiplyScalar(.78+noise*.15+fine*.07);colors.push(c.r,c.g,c.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  const model=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95}));root.add(model);
  const sign=label(a.name,'planet-label asteroid-label');const button=document.createElement('button');button.textContent=a.name;button.setAttribute('aria-label','Inspect '+a.name);sign.replaceChildren(button);
  const item={...a,root,model,label:sign};button.onclick=()=>onSelect(item);pickMeshes(model,()=>onSelect(item));return item;
 });
 return {items,update(days,seconds){for(const a of items){const t=a.phase+days/a.period*Math.PI*2;a.root.position.set(a.orbit*Math.cos(t),0,a.orbit*Math.sin(t));a.model.rotation.y=seconds*Math.PI*2/240;}}};
}
