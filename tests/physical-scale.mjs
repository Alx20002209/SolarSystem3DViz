import assert from 'node:assert/strict';
import fs from 'node:fs';
import {scaleBody,scaleEnvironment,kmToUnits,UNITS_PER_AU,systemExtent,SUN_RADIUS} from '../dist/scale.js';
import {planetPositionAt,planetOrbitAt,positionAt,TAU} from '../dist/orbits.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../dist/'+n+'.json',import.meta.url)));
const planets=read('planets').map(scaleBody),moons=read('moons').map(scaleBody),asteroids=read('named-asteroids').map(scaleBody);
assert.equal(kmToUnits(149597870.7),UNITS_PER_AU);
for(const b of [...planets,...moons,...asteroids]){
 assert.ok(b.radius>0&&Number.isFinite(b.orbit));
 assert.ok(Math.abs(b.radius/kmToUnits(b.physicalRadiusKm)-1)<1e-12);
 if(b.parent){assert.equal(b.orbit,kmToUnits(b.distance));const p=planets.find(p=>p.name===b.parent);assert.ok(b.orbit*(1-b.e)>p.radius*1.2+b.radius*1.3,b.name+' clears parent');}
}
for(const p of planets){const ms=moons.filter(m=>m.parent===p.name).sort((a,b)=>a.orbit-b.orbit);for(let i=1;i<ms.length;i++)assert.ok(ms[i].orbit*(1-ms[i].e)-ms[i].radius*1.3>ms[i-1].orbit*(1+ms[i-1].e)+ms[i-1].radius*1.3,ms[i].name+' orbital shell separation');}
let minimum=Infinity,samples=0;
for(let days=-73048;days<=18627;days+=30){
 const points=planets.map((p,i)=>planetPositionAt(p,i,days));
 for(let i=0;i<planets.length;i++){
  assert.ok(Math.hypot(...points[i])>SUN_RADIUS+systemExtent(planets[i],moons));
  const start=planetOrbitAt(planets[i],i,0,days),end=planetOrbitAt(planets[i],i,TAU,days);
  assert.ok(Math.hypot(...start.map((x,j)=>x-end[j]))<1e-8,'closed date-specific orbit');
  for(let j=i+1;j<planets.length;j++){
   const gap=Math.hypot(...points[i].map((x,k)=>x-points[j][k]))-systemExtent(planets[i],moons)-systemExtent(planets[j],moons);
   assert.ok(gap>0,planets[i].name+' / '+planets[j].name);minimum=Math.min(minimum,gap);
  }
 }
 samples++;
}
// Conservative radius bounds over the full supported period, independent of phase.
for(let i=1;i<planets.length;i++){
 let outer=0,inner=Infinity;
 for(const day of [-73048,18627]){
  outer=Math.max(outer,Math.hypot(...planetOrbitAt(planets[i-1],i-1,Math.PI,day))+systemExtent(planets[i-1],moons));
  inner=Math.min(inner,Math.hypot(...planetOrbitAt(planets[i],i,0,day))-systemExtent(planets[i],moons));
 }
 assert.ok(inner>outer,'adjacent system radial bounds: '+planets[i].name);
}
const europa=moons.find(m=>m.name==='Europa');assert.equal(europa.orbit,kmToUnits(671100));
const belts=scaleEnvironment(read('environment-data')).belts;
for(const b of belts){const lo=b.name==='main'?220:3000,hi=b.name==='main'?320:5000;assert.ok(b.objects.every(o=>o.a>=lo-1e-8&&o.a<=hi+1e-8));}
console.log(JSON.stringify({bodies:planets.length+moons.length+asteroids.length+1,dateSamples:samples,minimumSystemGapUnits:minimum,europaOrbitUnits:europa.orbit,status:'PASS: common scale, parent/moon clearance, all planetary system radial bounds, epoch paths and belts'}));

// Default layout remains the original per-planet compressed layout.
for(const [i,p] of read('planets').entries()){const raw=planetPositionAt(p,i,0),physical=planetPositionAt(scaleBody(p),i,0);const factor=Math.hypot(...physical)/Math.hypot(...raw);assert.ok(factor>1);assert.ok(raw.every((v,k)=>Math.abs(v*factor-physical[k])<1e-8));}
