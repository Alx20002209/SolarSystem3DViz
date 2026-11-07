import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createEphemeris} from '../dist/ephemeris.js';
import {calendarDisplayPosition} from '../dist/calendar.js';
import {illustrativeBody} from '../dist/scale.js';
const m=JSON.parse(fs.readFileSync('dist/ephemeris/2000/manifest.json'));const buffers=new Map(m.bodies.map(b=>{const v=fs.readFileSync('dist/ephemeris/2000/'+b.file);return[b.name,v.buffer.slice(v.byteOffset,v.byteOffset+v.byteLength)]}));
const c=createEphemeris(m,buffers),raw=JSON.parse(fs.readFileSync('dist/planets.json')),bodies=new Map(raw.map(b=>[b.name,illustrativeBody(b)]));
let clearance=Infinity,closest='',samples=0;
for(let hour=0;hour<=366*24;hour++){
 const day=-.5+hour/24;
 for(let i=0;i<raw.length;i++)for(let j=i+1;j<raw.length;j++){
  const a=raw[i],b=raw[j],p=calendarDisplayPosition(c,a.name,day,bodies,false),q=calendarDisplayPosition(c,b.name,day,bodies,false);
  const extent=v=>v.radius*(v.name==='Saturn'?2.5:v.name==='Uranus'?2:1.1);
  const gap=Math.hypot(...p.map((v,k)=>v-q[k]))-extent(a)-extent(b);
  if(gap<clearance){clearance=gap;closest=a.name+'/'+b.name}
  assert(gap>0,`${a.name}/${b.name} overlap at ${day}`);samples++;
 }
}
for(const p of raw){assert.deepEqual(calendarDisplayPosition(c,p.name,0,bodies,true),c.position(p.name,0));}
console.log(JSON.stringify({samples,minPlanetAndRingClearance:clearance,closest,trueScaleUnchanged:true}));
