import {kmToUnits} from './scale.js';
// Velocity is km/s; interpolation interval is seconds. No extrapolation.
export function interpolateState(values,offset,step,t){
 const t2=t*t,t3=t2*t,position=[],velocity=[];
 for(let k=0;k<3;k++){
  const p0=values[offset+k],v0=values[offset+k+3],p1=values[offset+k+6],v1=values[offset+k+9];
  position.push((2*t3-3*t2+1)*p0+(t3-2*t2+t)*step*v0+(-2*t3+3*t2)*p1+(t3-t2)*step*v1);
  velocity.push((6*t2-6*t)/step*p0+(3*t2-4*t+1)*v0+(-6*t2+6*t)/step*p1+(3*t2-2*t)*v1);
 }
 return {position,velocity};
}
export function createEphemeris(manifest,buffers){
 if(!manifest.complete||manifest.bodies.length!==35)throw Error('Ephemeris coverage is incomplete');
 const data=new Map(manifest.bodies.map(b=>{const buffer=buffers.get(b.name);if(!buffer||buffer.byteLength!==b.count*48)throw Error('Invalid ephemeris: '+b.name);return [b.name,{...b,values:new Float64Array(buffer)}]}));
 let cachedDay=NaN,cache=new Map();
 function state(name,day){
  if(!Number.isFinite(day)||day<manifest.startDay||day>manifest.endDay)throw RangeError('No validated coverage outside 2000');
  if(day!==cachedDay){cachedDay=day;cache.clear()}
  if(cache.has(name))return cache.get(name);
  const b=data.get(name);if(!b)throw Error('Unknown body: '+name);
  const coordinate=(day-manifest.startDay)*86400/b.stepSeconds,index=Math.min(b.count-2,Math.floor(coordinate)),t=Math.min(1,Math.max(0,coordinate-index));
  const s=interpolateState(b.values,index*6,b.stepSeconds,t);
  if(b.parent){const p=state(b.parent,day);for(let k=0;k<3;k++){s.position[k]+=p.position[k];s.velocity[k]+=p.velocity[k]}}
  cache.set(name,s);return s;
 }
 const relative=(name,day,center,key)=>{const a=state(name,day)[key],b=state(center,day)[key];return a.map((v,i)=>v-b[i])};
 return {manifest,state,position(name,day){const [x,y,z]=relative(name,day,'Sun','position');return [kmToUnits(x),kmToUnits(z),-kmToUnits(y)]},distance(name,day,center='Sun'){return Math.hypot(...relative(name,day,center,'position'))},speed(name,day,center='Sun'){return Math.hypot(...relative(name,day,center,'velocity'))},source(name,day){const url=new URL(data.get(name).query);['START_TIME','STOP_TIME','STEP_SIZE'].forEach(k=>url.searchParams.delete(k));url.searchParams.set('CENTER',"'500@0'");url.searchParams.set('TLIST',String(2451545+day));return url.href}};
}
export async function loadEphemeris(){
 const root='./ephemeris/2000/';const r=await fetch(root+'manifest.json');if(!r.ok)throw Error('Ephemeris manifest unavailable');const m=await r.json();
 const buffers=new Map();let cursor=0;
 // Four local static-asset fetches at a time; no runtime calls to NASA.
 await Promise.all(Array.from({length:4},async()=>{while(cursor<m.bodies.length){const b=m.bodies[cursor++];const response=await fetch(root+b.file);if(!response.ok)throw Error('Ephemeris unavailable: '+b.name);buffers.set(b.name,await response.arrayBuffer())}}));
 return createEphemeris(m,buffers);
}
