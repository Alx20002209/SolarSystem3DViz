import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createEphemeris,interpolateState} from '../dist/ephemeris.js';
const root=new URL('../dist/ephemeris/2000/',import.meta.url),m=JSON.parse(fs.readFileSync(new URL('manifest.json',root)));
const buffers=new Map(m.bodies.map(b=>{const v=fs.readFileSync(new URL(b.file,root));return [b.name,v.buffer.slice(v.byteOffset,v.byteOffset+v.byteLength)]}));
const c=createEphemeris(m,buffers);let max=0,maxV=0,n=0;
for(const b of m.bodies){
 for(const check of b.validationSamples){
  const s=c.state(b.name,check.day),parent=b.parent?c.state(b.parent,check.day):{position:[0,0,0],velocity:[0,0,0]};
  const error=Math.hypot(...s.position.map((v,i)=>v-parent.position[i]-check.positionKm[i]));
  const ve=Math.hypot(...s.velocity.map((v,i)=>v-parent.velocity[i]-check.velocityKmS[i]));
  assert(error<1,`${b.name}: ${error} km`);max=Math.max(max,error);maxV=Math.max(maxV,ve);n++;
 }
 const values=new Float64Array(buffers.get(b.name));
 for(const index of [0,Math.floor(b.count/2),b.count-2]){
  const a=interpolateState(values,index*6,b.stepSeconds,0),z=interpolateState(values,index*6,b.stepSeconds,1);
  assert.deepEqual(a.position,Array.from(values.slice(index*6,index*6+3)));
  assert.deepEqual(z.position,Array.from(values.slice((index+1)*6,(index+1)*6+3)));
  assert.deepEqual(a.velocity,Array.from(values.slice(index*6+3,index*6+6)));
  assert.deepEqual(z.velocity,Array.from(values.slice((index+1)*6+3,(index+1)*6+6)));
 }
}
assert.throws(()=>c.state('Earth',-.50001),RangeError);assert.throws(()=>c.state('Earth',365.50001),RangeError);
for(const day of [-.5,59,365.5])assert(c.distance('Sun',day)===0);
console.log(JSON.stringify({checks:n,maxSourceRelativePositionErrorKm:max,maxVelocityErrorKmS:maxV,endpointContinuity:'PASS',coverageGuards:'PASS'}));
