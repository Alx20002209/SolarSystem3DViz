import assert from 'node:assert/strict';
import fs from 'node:fs';
import {rotationAtDays,planetRotationAt,earthCloudRotationAt,simulationDelta} from '../dist/rotation.js';
import {planetPositionAt,TAU} from '../dist/orbits.js';
import {scaleBody,AU_KM,UNITS_PER_AU} from '../dist/scale.js';
const planets=JSON.parse(fs.readFileSync('dist/planets.json'));
const angularDifference=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const reference=[1407.6,-5832.6,23.9345,24.6229,9.925,10.656,-17.24,16.11];
for(const [i,p] of planets.entries()){
 assert.equal(p.rotation,reference[i]);
 const day=p.rotation/24,period=Math.abs(day),epsilon=period*1e-7;
 for(const n of [-30000,-1,0,1,10000]){
  const before=planetRotationAt(p,n*period-epsilon),after=planetRotationAt(p,n*period+epsilon);
  assert.ok(Math.abs(angularDifference(before,after)-TAU*2e-7)<1e-8,p.name+' wrap');
 }
 const start=planetRotationAt(p,100),quarter=planetRotationAt(p,100+period/4);
 assert.ok(Math.abs(angularDifference(start,quarter)-Math.PI/2)<1e-9);
 assert.equal(Math.sign(Math.cos(p.tilt*Math.PI/180)),Math.sign(p.rotation),p.name+' retrograde encoded once by tilt');
 const physical=scaleBody(p),position=planetPositionAt(physical,i,0),next=planetPositionAt(physical,i,.01);
 assert.ok(position[2]*next[0]-position[0]*next[2]>0,p.name+' orbital angular momentum +Y');
 let distance=0,prev=position;const samples=4096;
 for(let j=1;j<=samples;j++){const v=planetPositionAt(physical,i,p.period*j/samples);distance+=Math.hypot(...v.map((a,k)=>a-prev[k]));prev=v}
 const speed=distance/UNITS_PER_AU*AU_KM/(p.period*86400);
 assert.ok(Math.abs(speed/p.speed-1)<.012,p.name+' NASA mean speed');
 console.log(p.name,'mean speed km/s',speed.toFixed(3),'NASA',p.speed);
}
const earth=planets[2],period=earth.rotation/24;
for(const n of [-10000,-1,0,1,10000]){
 for(const boundary of [n*period,n*period/1.035]){
  const step=1e-7;
  const delta=angularDifference(earthCloudRotationAt(earth,boundary-step),earthCloudRotationAt(earth,boundary+step));
  assert.ok(Math.abs(delta-TAU*2*step/period*1.035)<1e-8,'cloud continuous across independent and surface wraps');
 }
}
assert.equal(simulationDelta(86400,1/86400,false),1);
assert.equal(simulationDelta(100,.25,true),0);
assert.equal(simulationDelta(.2,.25,false),.05); // Slow frames must not slow simulated time.
console.log('PASS: eight periods/directions, positive and negative-date wraps, cloud continuity, NASA mean orbital speeds, pause and real-time clock');
