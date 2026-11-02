// One linear scale for heliocentric positions, satellite orbits and body radii.
// AU definition: IAU 2012; nominal solar radius: IAU 2015 / NASA fact sheet.
export const AU_KM=149597870.7;
export const UNITS_PER_AU=100;
export const kmToUnits=km=>km/AU_KM*UNITS_PER_AU;
export const SUN_RADIUS=kmToUnits(695700);
export function scaleBody(body){
 if(!(body.physicalRadiusKm>0))throw Error('Missing physical radius: '+body.name);
 return {...body,unitsPerAU:UNITS_PER_AU,assetRadius:body.radius,radius:kmToUnits(body.physicalRadiusKm),
  orbit:body.parent?kmToUnits(body.distance):body.semimajorAxisAU?body.semimajorAxisAU*UNITS_PER_AU:kmToUnits(body.distance*1e6)};
}
export function systemExtent(planet,moons){
 return Math.max(planet.radius*2.5,...moons.filter(m=>m.parent===planet.name).map(m=>m.orbit*(1+m.e)+m.radius));
}
// Particle coordinates represent a sampled population, not catalogued ephemerides.
export function scaleEnvironment(data){
 return {...data,belts:data.belts.map(field=>{
  const values=field.objects.map(a=>a.a),lo=Math.min(...values),hi=Math.max(...values);
  const [inner,outer]=field.name==='main'?[2.2,3.2]:[30,50];
  return {...field,objects:field.objects.map(a=>{
   const au=inner+(a.a-lo)/(hi-lo)*(outer-inner);
   return {...a,a:au*UNITS_PER_AU,period:365.256*au**1.5,
    size:kmToUnits(field.name==='main'?Math.max(.1,a.size*100):Math.max(1,a.size*1000))};
  })};
 })};
}
