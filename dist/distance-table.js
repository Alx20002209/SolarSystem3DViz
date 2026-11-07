import {AU_KM,kmToUnits,scaleBody,illustrativeBody} from './scale.js?v=spacing-table-2';
import {calendarDisplayPosition} from './calendar.js';
export function distanceRows(calendar,rawPlanets,rawMoons,asteroids,day,realistic=false){
 const convert=realistic?scaleBody:illustrativeBody,planets=rawPlanets.map(convert),moons=rawMoons.map(convert);
 for(const m of moons){const p=planets.find(p=>p.name===m.parent);if(!realistic)m.orbit=Math.max(m.orbit,p.radius*1.8/(1-m.e));}
 const objects=[...planets,...moons,...asteroids.map(convert)],bodies=new Map(objects.map(b=>[b.name,b]));
 const display=name=>calendarDisplayPosition(calendar,name,day,bodies,realistic);
 return [{name:'Sun',center:'Sun',referenceKm:0,realKm:0,sunKm:0,displayUnits:0,kmPerUnit:null,physicalRadiusKm:695700,displayRadius:realistic?kmToUnits(695700):3,source:calendar.source('Sun',day)},...objects.map(b=>{
 const center=b.parent||'Sun',p=display(b.name),q=display(center),referenceKm=b.parent?b.distance:b.semimajorAxisAU?b.semimajorAxisAU*AU_KM:b.distance*1e6;
 return {name:b.name,center,referenceKm,realKm:calendar.distance(b.name,day,center),sunKm:calendar.distance(b.name,day),displayUnits:Math.hypot(...p.map((v,i)=>v-q[i])),kmPerUnit:referenceKm/b.orbit,physicalRadiusKm:b.physicalRadiusKm,displayRadius:b.radius,source:calendar.source(b.name,day)};
 })];
}
