import {createAtmospherePanel} from './atmosphere.js';
import * as THREE from 'three';
import {createMenu} from './menu.js';
import {sampleFlight} from './camera-flight.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {EffectComposer} from './vendor/addons/postprocessing/EffectComposer.js';
import {RenderPass} from './vendor/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from './vendor/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from './vendor/addons/postprocessing/OutputPass.js';
import {positionAt,planetPositionAt,planetHeliocentricAt,planetOrbitAt,createSatelliteOrbit,AU_KM,TAU} from './orbits.js';
import {enhancePlanet,enhanceMoon} from './materials.js';
import {createAsteroids} from './asteroids.js';
import {createEnvironment} from './environment.js';
import {createSun,createStars} from './effects.js';
const $=id=>document.getElementById(id);
const modelInfo=$('model-info'),modelParagraphs=modelInfo.querySelectorAll('p');
modelParagraphs[2].textContent="Planet positions use JPL's approximate Keplerian elements for 1800–2050; Earth's center is corrected from the Earth–Moon barycentre using the Moon's relative position. These are not full Horizons integrations. The local date/time is converted to UTC and then TDB. Display distances and sizes remain compressed; physical heliocentric coordinates are available for comparison.";
modelParagraphs[3].textContent='The Moon and Titan use JPL Horizons geometric state vectors at J2000.0 (ecliptic J2000). Titan’s mean motion is fitted between that state and a second Horizons vector on 2028-07-05, using its JPL mean period to resolve the intervening orbit count. The other 20 selected moons use JPL mean periods and eccentricities with simplified, illustrative starting phases and orientations. Date/time input uses your browser’s local time zone; the range slider scrubs the simulation time. Pause freezes orbital motion and planetary rotation. Moon surfaces keep an illustrative three-minute spin.';
const ephemerisLink=document.createElement('a');ephemerisLink.href='https://ssd.jpl.nasa.gov/planets/approx_pos.html';ephemerisLink.target='_blank';ephemerisLink.rel='noopener';ephemerisLink.textContent='JPL approximate planetary positions ↗';modelInfo.insertBefore(ephemerisLink,modelInfo.querySelector('a'));
const horizonsLink=document.createElement('a');horizonsLink.href='https://ssd.jpl.nasa.gov/horizons/';horizonsLink.target='_blank';horizonsLink.rel='noopener';horizonsLink.textContent='NASA/JPL Horizons ↗';modelInfo.insertBefore(horizonsLink,modelInfo.querySelector('a'));
export const interactableObjects=[];
const menu=createMenu();
createAtmospherePanel(()=>$('planet-name').textContent);
async function data(file){const r=await fetch(file);if(!r.ok)throw Error(file+' could not load');return r.json()}
const [planets,moonData,environmentData,environmentSources,satelliteEphemerides]=await Promise.all([data('./planets.json'),data('./moons.json'),data('./environment-data.json'),data('./environment-sources.json'),data('./satellite-ephemerides.json')]);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x000000);
const camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.05,2000);
const isMobileViewport=()=>innerWidth<650||matchMedia('(pointer: coarse)').matches;
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,isMobileViewport()?2:1.5));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
$('universe').append(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=.5;controls.maxDistance=340;controls.maxPolarAngle=Math.PI*.98;
// A display-balanced point light keeps the compressed outer planets readable.
scene.add(new THREE.AmbientLight(0xffffff,.16));const light=new THREE.PointLight(0xfff4e5,3.5,0,0);scene.add(light);
const solar=createSun(scene);createStars(scene);
const renderTarget=new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType,samples:isMobileViewport()?0:4});const composer=new EffectComposer(renderer,renderTarget);composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.25,.15,1.15);composer.addPass(bloom);composer.addPass(new OutputPass());
const orbitGroup=new THREE.Group();scene.add(orbitGroup);const bodies=[],moons=[];let earthMoonOrbit=null;
const DAY_MS=86400000,J2000_UTC_MS=Date.UTC(2000,0,1,11,58,55,816),J2000_TDB_OFFSET=64.183927;
const leapSeconds=[[1972,1,10],[1972,7,11],[1973,1,12],[1974,1,13],[1975,1,14],[1976,1,15],[1977,1,16],[1978,1,17],[1979,1,18],[1980,1,19],[1981,7,20],[1982,7,21],[1983,7,22],[1985,7,23],[1988,1,24],[1990,1,25],[1991,1,26],[1992,7,27],[1993,7,28],[1994,7,29],[1996,1,30],[1997,7,31],[1999,1,32],[2006,1,33],[2009,1,34],[2012,7,35],[2015,7,36],[2017,1,37]];
function tdbMinusUtcSeconds(date){
 const year=date.getUTCFullYear(),month=date.getUTCMonth()+1;
 let offset;
 if(year>=1972){offset=10;for(const [y,m,value] of leapSeconds){if(year>y||year===y&&month>=m)offset=value;else break;}offset+=32.184;}
 else{
  const y=year+(date.getUTCMonth()+date.getUTCDate()/30)/12;
  const deltaT=y<1860?(()=>{const t=y-1800;return 13.72-.332447*t+.0068612*t**2+.0041116*t**3-.00037436*t**4+.0000121272*t**5-.0000001699*t**6+.000000000875*t**7})():y<1900?(()=>{const t=y-1860;return 7.62+.5737*t-.251754*t**2+.01680668*t**3-.0004473624*t**4+t**5/233174})():y<1920?(()=>{const t=y-1900;return -2.79+1.494119*t-.0598939*t**2+.0061966*t**3-.000197*t**4})():y<1941?(()=>{const t=y-1920;return 21.20+.84493*t-.076100*t**2+.0020936*t**3})():y<1961?(()=>{const t=y-1950;return 29.07+.407*t-t**2/233+t**3/2547})():(()=>{const t=y-1975;return 45.45+1.067*t-t**2/260-t**3/718})();
  offset=deltaT;
 }
 const jd=2440587.5+date.getTime()/DAY_MS+offset/86400,g=(357.53+0.9856003*(jd-2451545))*Math.PI/180;
 return offset+0.001657*Math.sin(g)+0.000022*Math.sin(2*g);
}
function utcToTdbDays(date){return (date.getTime()-J2000_UTC_MS+(tdbMinusUtcSeconds(date)-J2000_TDB_OFFSET)*1000)/DAY_MS}
function tdbDaysToUtcDate(value){
 let date=new Date(J2000_UTC_MS+value*DAY_MS);
 for(let i=0;i<3;i++)date=new Date(J2000_UTC_MS+value*DAY_MS-(tdbMinusUtcSeconds(date)-J2000_TDB_OFFSET)*1000);
 return date;
}
const MIN_DATE_DAYS=utcToTdbDays(new Date('1800-01-01T00:00:00Z')),MAX_DATE_DAYS=utcToTdbDays(new Date('2050-12-31T23:59:59Z'));
let selected=2,selectedMoon=null,selectedAsteroid=null,following=false,paused=false,days=Math.max(MIN_DATE_DAYS,Math.min(MAX_DATE_DAYS,utcToTdbDays(new Date()))),spinSeconds=0,effectTime=0,names=true,moonsVisible=true;
const dateSlider=$('date'),datePicker=$('date-picker');
dateSlider.min=String(MIN_DATE_DAYS);dateSlider.max=String(MAX_DATE_DAYS);dateSlider.value=String(days);
let displayedDateMinute='';
function localDateTimeValue(date){const pad=value=>String(value).padStart(2,'0');return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`}
function timezoneOffsetLabel(date){const minutes=-date.getTimezoneOffset(),sign=minutes>=0?'+':'−';return `UTC${sign}${String(Math.floor(Math.abs(minutes)/60)).padStart(2,'0')}:${String(Math.abs(minutes)%60).padStart(2,'0')}`}
function updateDateControls(){
 const date=tdbDaysToUtcDate(days),value=localDateTimeValue(date),minute=`${value}:${date.getTimezoneOffset()}`;
 if(dateSlider.value!==String(days))dateSlider.value=String(days);
 if(minute!==displayedDateMinute){displayedDateMinute=minute;datePicker.value=value;$('timezone-output').textContent=timezoneOffsetLabel(date);datePicker.title=`Your local time (${Intl.DateTimeFormat().resolvedOptions().timeZone||'browser time zone'}), ${timezoneOffsetLabel(date)}`;}
 $('date-prev-month').disabled=days<=MIN_DATE_DAYS;$('date-next-month').disabled=days>=MAX_DATE_DAYS;
}
function selectDate(value){days=Math.max(MIN_DATE_DAYS,Math.min(MAX_DATE_DAYS,value));paused=true;$('play').textContent='▶';$('play').setAttribute('aria-label','Resume orbital movement');updateDateControls()}
function shiftDateByMonth(offset){const current=tdbDaysToUtcDate(days),day=current.getDate(),target=new Date(current.getFullYear(),current.getMonth()+offset,1,current.getHours(),current.getMinutes()),lastDay=new Date(target.getFullYear(),target.getMonth()+1,0).getDate();target.setDate(Math.min(day,lastDay));selectDate(utcToTdbDays(target))}
function dateInputToDay(value){const date=new Date(value);return Number.isNaN(date.getTime())?NaN:utcToTdbDays(date)}
updateDateControls();
let cameraFlight=null;
const loader=new GLTFLoader();
function pickMeshes(model,onClick){model.traverse(o=>{if(o.isMesh){o.userData.onClick=onClick;interactableObjects.push(o)}})}
function label(name,type='planet-label'){const el=document.createElement('div');el.className=type;el.textContent=name.toUpperCase();$('labels').append(el);return el}
function orbit(p,phase=0,planetIndex=null){const pts=[];for(let j=0;j<=256;j++)pts.push(new THREE.Vector3(...(planetIndex===null?positionAt(p,p.period*j/256,phase):planetOrbitAt(p,planetIndex,TAU*j/256))));return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.32}))}
try{
 await Promise.all(planets.map(async(p,i)=>{const gltf=await loader.loadAsync(`./assets/${p.name.toLowerCase()}.glb`);const root=new THREE.Group(),tilt=new THREE.Group(),model=gltf.scene;root.add(tilt);tilt.add(model);tilt.rotation.z=THREE.MathUtils.degToRad(p.tilt);scene.add(root);enhancePlanet(p,model,tilt);pickMeshes(model,()=>selectPlanet(i));const line=orbit(p,0,i);orbitGroup.add(line);bodies[i]={root,tilt,model,label:label(p.name),phase:i*.72};root.position.fromArray(planetPositionAt(p,i,days));}));
 await Promise.all(moonData.map(async(m,index)=>{
  const parentIndex=planets.findIndex(p=>p.name===m.parent),p=planets[parentIndex],asset=await loader.loadAsync(`./assets/${m.name.toLowerCase()}.glb`);
  const orbitData={...m,orbit:Math.max(m.orbit,p.radius*1.8/(1-m.e))};const node=new THREE.Group();
  const satelliteState=satelliteEphemerides[m.name]?{...satelliteEphemerides[m.name],epochTdbJulianDate:satelliteEphemerides.epochTdbJulianDate}:null;
  const satelliteOrbit=satelliteState?createSatelliteOrbit(satelliteState,orbitData.orbit):null;
  const plane=new THREE.Group();bodies[parentIndex].root.add(plane);if(!satelliteOrbit&&m.parent!=='Earth'&&m.name!=='Nereid')plane.rotation.z=THREE.MathUtils.degToRad(p.tilt);
  node.add(asset.scene);plane.add(node);if(m.name==='Moon')earthMoonOrbit=satelliteOrbit;
  enhanceMoon(m,asset.scene,node);
  const points=satelliteOrbit?Array.from({length:257},(_,j)=>new THREE.Vector3(...satelliteOrbit.orbitAt(TAU*j/256))):null;
  const line=satelliteOrbit?new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.2})):orbit(orbitData);line.material.opacity=.2;plane.add(line);
  const item={...m,orbitData,parentIndex,node,plane,line,model:asset.scene,label:label(m.name,'planet-label moon-label'),phase:index*1.3,satelliteOrbit};moons[index]=item;node.position.fromArray(satelliteOrbit?satelliteOrbit.positionAt(days):positionAt(orbitData,days,item.phase));pickMeshes(asset.scene,()=>selectMoon(item));
 }));
}catch(error){$('loading').textContent='A planet or moon could not load. Reload to try again.';throw error}
const environment=createEnvironment(scene,bodies,moons,environmentData);
const asteroidData=await data('./named-asteroids.json');
const asteroids=createAsteroids(scene,asteroidData,label,pickMeshes,selectAsteroid);
$('labels').removeAttribute('aria-hidden');
const beltObstacles=[{node:solar.group,radius:3.4},...bodies.map((b,i)=>({node:b.root,radius:planets[i].radius*(i===5?2.3:i===6?1.9:1.08)})),...moons.map(m=>({node:m.node,radius:m.radius*1.15})),...asteroids.items.map(a=>({node:a.root,radius:a.radius*1.2}))];
const obstaclePosition=new THREE.Vector3();
const environmentLabels=environment.annotations.map(a=>({...a,label:label(a.text,'planet-label region-label')}));
const sunLabel=label('Sun');pickMeshes(solar.surface,()=>selectPlanet(-1));
function planetDisplayPosition(p,index){
 const position=planetPositionAt(p,index,days);
 if(p.name==='Earth'&&earthMoonOrbit){
  const moon=earthMoonOrbit.positionKmAt(days),earthMassFraction=1/81.30056907419062,scale=p.orbit/AU_KM*earthMassFraction;
  position[0]-=moon[0]*scale;position[1]-=moon[2]*scale;position[2]-=moon[1]*scale;
 }
 return position;
}
function ephemerisAt(utcDate){
 const date=utcDate instanceof Date?utcDate:new Date(utcDate);
 if(Number.isNaN(date.getTime()))throw new TypeError('ephemerisAt requires a valid date');
 const tdbDays=utcToTdbDays(date),planetVectors=planets.map((planet,index)=>{
  let [x,y,z]=planetHeliocentricAt(index,tdbDays);
  if(planet.name==='Earth'&&earthMoonOrbit){
   const moon=earthMoonOrbit.positionKmAt(tdbDays),fraction=1/81.30056907419062/AU_KM;
   x-=moon[0]*fraction;y-=moon[1]*fraction;z-=moon[2]*fraction;
  }
  return {name:planet.name,xAu:x,yAu:y,zAu:z};
 });
 const titan=moons.find(m=>m.name==='Titan')?.satelliteOrbit;
 const titanPositionKm=titan?.positionKmAt(tdbDays);
 return {
  utc:date.toISOString(),
  julianDateTdb:2451545+tdbDays,
  referenceFrame:'Ecliptic J2000.0, heliocentric; Titan vector is Saturn-centred',
  planets:planetVectors,
  titanRelativeToSaturnKm:titanPositionKm?{x:titanPositionKm[0],y:titanPositionKm[1],z:titanPositionKm[2]}:null
 };
}
function selectedObject(){return selectedAsteroid?.root??selectedMoon?.node??(selected===-1?solar.group:bodies[selected].root)}
const worldPosition=new THREE.Vector3();function selectedPosition(){return selectedObject().getWorldPosition(worldPosition)}
function infoFields(labels,values){document.querySelectorAll('.stats>div>span').forEach((e,i)=>e.textContent=labels[i]);['distance','speed','period','rotation'].forEach((id,i)=>$(id).innerHTML=values[i])}
$('close-detail').onclick=()=>{$('detail').hidden=true};
function showDetails(){
 $('detail').hidden=false;
 const p=planets[selected];let title;
 if(selectedAsteroid){const a=selectedAsteroid;title=a.name;$('category').textContent=a.kind.toUpperCase()+' / MAIN BELT';$('description').textContent='A separate, slowly rotating belt object. Shape and relief are artistic; position, size and orbit timing are illustrative.';infoFields(['SIZE / DIMENSIONS','REGION','SURFACE','DISPLAY MOTION'],[a.diameter,'Main asteroid belt','Illustrative relief','Slow rotation']);}
 else if(selectedMoon){const m=selectedMoon;title=m.name;$('category').textContent=`MOON OF ${m.parent.toUpperCase()}`;$('description').textContent=`${m.name} orbits ${m.parent}. ${m.surfaceNote}`;infoFields(['MEAN DISTANCE FROM PLANET','ORBITAL ECCENTRICITY','ONE ORBIT','ORBIT DIRECTION'],[`${m.distance.toLocaleString()} <small>km</small>`,m.e.toFixed(3),`${m.period.toFixed(3)} <small>Earth days</small>`,m.inclination>90?'Retrograde':'Prograde']);}
 else if(selected===-1){title='Sun';$('category').textContent='OUR CENTRAL STAR';$('description').textContent='A turbulent sphere of glowing plasma. Granulation, a luminous corona and looping prominences bring its surface to life.';infoFields(['STAR TYPE','ENERGY SOURCE','PLANETARY SYSTEM','MOONS IN THIS MODEL'],['G-type star','Nuclear fusion','8 <small>planets</small>','22 <small>selected moons</small>']);}
 else{title=p.name;$('category').textContent=`0${selected+1} / ${selected<4?'TERRESTRIAL WORLD':selected<6?'GAS GIANT':'ICE GIANT'}`;$('description').textContent=p.description;infoFields(['ORBIT SEMIMAJOR AXIS','MEAN ORBITAL SPEED','SIDEREAL ORBIT PERIOD','SIDEREAL ROTATION'],[`${p.distance.toLocaleString()} <small>million km</small>`,`${p.speed.toFixed(2)} <small>km / s</small>`,`${p.period.toLocaleString()} <small>Earth days</small>`,`${Math.abs(p.rotation).toLocaleString()} <small>h${p.rotation<0?' · retrograde':''}</small>`]);}
 const source=$('surface-source');source.hidden=!selectedMoon&&!selectedAsteroid;if(selectedAsteroid){source.href=selectedAsteroid.source;source.textContent='Object facts & source'}else if(selectedMoon){source.href=selectedMoon.surfaceSource;source.textContent='Surface imagery & provenance ↗'}
 $('planet-name').textContent=title;$('focus').textContent=following?'Unlock camera · free pan':`Follow ${title}`;$('focus').setAttribute('aria-label',following?`Stop following ${title} and unlock camera`:`Follow ${title}`);
 document.querySelectorAll('#planet-nav button').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.index)===selected));bodies.forEach((b,i)=>b.label.classList.toggle('selected',i===selected));
 const host=$('moon-list');host.replaceChildren();const system=selectedAsteroid?[]:moons.filter(m=>m.parentIndex===selected);
 $('moon-heading').textContent=selectedAsteroid?'NAMED BELT OBJECT':selected===-1?'SELECT A WORLD BELOW':system.length?`${system.length} ${system.length===1?'MOON':selected<4?'MOONS':'MAJOR MOONS'} SHOWN`:'NO NATURAL MOONS';
 for(const m of system){const button=document.createElement('button');button.textContent=m.name;button.classList.toggle('active',selectedMoon===m);button.onclick=()=>{selectMoon(m);focus(true)};host.append(button)}
}
function selectPlanet(i){selected=i;selectedMoon=null;selectedAsteroid=null;following=false;showDetails();focus(true)}
function selectMoon(m){selected=m.parentIndex;selectedMoon=m;selectedAsteroid=null;moonsVisible=true;m.plane.visible=true;$('moons').textContent='Moons on';$('moons').setAttribute('aria-pressed','true');following=false;showDetails();focus(true)}
function selectAsteroid(a){selected=-2;selectedMoon=null;selectedAsteroid=a;following=false;showDetails();focus(true)}
function cancelFlight(){cameraFlight=null;controls.enabled=true;}
function focus(force){
 following=force??!following;
 if(following){
  scene.updateMatrixWorld(true);
  const target=selectedPosition().clone();
  const radius=selectedAsteroid?selectedAsteroid.radius:selectedMoon?Math.max(.15,selectedMoon.radius):selected===-1?3:planets[selected].radius;
  const direction=camera.position.clone().sub(target);
  if(direction.lengthSq()<1e-8)direction.copy(camera.position).sub(controls.target);
  if(direction.lengthSq()<1e-8)direction.set(0,.3,1);
  direction.normalize();
  cameraFlight={from:camera.position.toArray(),lookFrom:controls.target.toArray(),direction:direction.toArray(),distance:radius*(selectedMoon||selectedAsteroid?6.5:9),elapsed:0,duration:2.4};
  controls.minDistance=Math.max(.08,radius*1.5);controls.enabled=false;
 }else cancelFlight();
 showDetails();
}
// Direct camera gestures take over immediately; clicking another body retargets from here.
renderer.domElement.addEventListener('pointerdown',e=>{if(e.button===2&&following){following=false;cancelFlight();showDetails()}else cancelFlight()},{capture:true});
renderer.domElement.addEventListener('wheel',cancelFlight,{capture:true,passive:true});

for(const [i,p] of [[-1,{name:'Sun',color:'#ff9b35'}],...planets.map((p,i)=>[i,p])]){const button=document.createElement('button');button.dataset.index=i;button.innerHTML=`<span class="dot" style="background:${p.color}"></span>${p.name}`;button.onclick=()=>selectPlanet(i);$('planet-nav').append(button)}
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down;
renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5){down=null;return}down=null;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const visible=interactableObjects.filter(o=>{let p=o;while(p){if(!p.visible)return false;p=p.parent}return true});raycaster.intersectObjects(visible,false)[0]?.object.userData.onClick?.()});
function overview(top=false){cancelFlight();following=false;controls.minDistance=.5;camera.position.set(top?0:102,top?205:125,top?.01:140);if(innerWidth<650)camera.position.multiplyScalar(1.3);controls.target.set(0,0,0);controls.update();showDetails()}
$('home').onclick=()=>overview();$('top').onclick=()=>overview(true);$('focus').onclick=()=>focus();
$('play').onclick=()=>{paused=!paused;$('play').textContent=paused?'▶':'Ⅱ';$('play').setAttribute('aria-label',paused?'Resume orbital movement':'Pause orbital movement')};$('time').oninput=()=>{$('time-output').textContent=`${$('time').value} days / sec`};dateSlider.oninput=()=>selectDate(Number(dateSlider.value));datePicker.oninput=()=>{if(datePicker.value)selectDate(dateInputToDay(datePicker.value))};$('date-prev-month').onclick=()=>shiftDateByMonth(-1);$('date-next-month').onclick=()=>shiftDateByMonth(1);
$('paths').onclick=()=>{orbitGroup.visible=!orbitGroup.visible;$('paths').textContent=`Orbits ${orbitGroup.visible?'on':'off'}`;$('paths').setAttribute('aria-pressed',orbitGroup.visible)};
$('names').onclick=()=>{names=!names;$('names').textContent=`Labels ${names?'on':'off'}`;$('names').setAttribute('aria-pressed',names)};
$('moons').onclick=()=>{moonsVisible=!moonsVisible;if(!moonsVisible&&selectedMoon)selectPlanet(selected);$('moons').textContent=`Moons ${moonsVisible?'on':'off'}`;$('moons').setAttribute('aria-pressed',moonsVisible)};
$('belts').onclick=()=>{environment.setBelts(!environment.beltsOn);$('belts').textContent=`Belts ${environment.beltsOn?'on':'off'}`;$('belts').setAttribute('aria-pressed',environment.beltsOn)};
$('dust-gas').onclick=()=>{environment.setDust(!environment.dustOn);$('dust-gas').textContent=`Dust / gas ${environment.dustOn?'on':'off'}`;$('dust-gas').setAttribute('aria-pressed',environment.dustOn)};
$('environment-info').onclick=()=>$('environment-dialog').showModal();$('close-environment').onclick=()=>$('environment-dialog').close();
for(const item of environmentSources){const section=document.createElement('section');section.className='source-item';const heading=document.createElement('h3');heading.textContent=item.title;const placement=document.createElement('strong');placement.textContent=item.placement;const note=document.createElement('p');note.textContent=item.note;const link=document.createElement('a');link.href=item.url;link.target='_blank';link.rel='noopener';link.textContent='Read the scientific source ↗';section.append(heading,placement,note,link);$('environment-sources').append(section)}
$('about').onclick=()=>$('model-info').showModal();$('close-about').onclick=()=>$('model-info').close();
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,isMobileViewport()?2:1.5));renderTarget.samples=isMobileViewport()?0:4;renderer.setSize(innerWidth,innerHeight);composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(innerWidth,innerHeight)});
scene.updateMatrixWorld(true);overview();$('loading').remove();const clock=new THREE.Clock(),v=new THREE.Vector3(),old=new THREE.Vector3(),temp=new THREE.Vector3(),beltUpdateInterval=.25;let beltUpdateElapsed=beltUpdateInterval;
function placeLabel(el,position,offset,visible=true){v.copy(position);v.y+=offset;v.project(camera);el.style.display=names&&visible&&v.z<1&&v.z>-1?'block':'none';el.style.transform=`translate(${(v.x*.5+.5)*innerWidth}px,${(-v.y*.5+.5)*innerHeight}px) translate(-50%,-100%)`}
function animate(){requestAnimationFrame(animate);const elapsed=clock.getDelta(),frameDt=Math.min(elapsed,.05),dt=menu.isOpen?0:frameDt,rate=Number($('time').value);beltUpdateElapsed+=menu.isOpen?0:Math.min(elapsed,.5);const refreshBelts=beltUpdateElapsed>=beltUpdateInterval;if(refreshBelts)beltUpdateElapsed%=beltUpdateInterval;if(!paused){days=Math.min(MAX_DATE_DAYS,days+dt*rate);if(days>=MAX_DATE_DAYS){paused=true;$('play').textContent='▶';$('play').setAttribute('aria-label','Resume orbital movement')}}spinSeconds+=dt;effectTime+=dt*.35;old.copy(selectedPosition());
 bodies.forEach((b,i)=>{b.root.position.fromArray(planetDisplayPosition(planets[i],i));b.model.rotation.y=(TAU*24*days/Math.abs(planets[i].rotation))%TAU;if(b.model.userData.clouds)b.model.userData.clouds.rotation.y=b.model.rotation.y*1.035});
 moons.forEach(m=>{m.node.position.fromArray(m.satelliteOrbit?m.satelliteOrbit.positionAt(days):positionAt(m.orbitData,days,m.phase));m.model.rotation.y=TAU*spinSeconds/180;m.plane.visible=moonsVisible;m.line.visible=orbitGroup.visible&&m.parentIndex===selected&&following});environment.belts.visible=environment.beltsOn&&!(following&&selectedAsteroid);asteroids.update(days,spinSeconds);solar.update(effectTime);scene.updateMatrixWorld(true);
 for(const b of beltObstacles){b.node.getWorldPosition(obstaclePosition);b.x=obstaclePosition.x;b.y=obstaclePosition.y;b.z=obstaclePosition.z;}
 environment.update(days,spinSeconds,beltObstacles,refreshBelts);
 if(cameraFlight){
  const f=cameraFlight;f.elapsed+=dt;
  const pose=sampleFlight(f.from,f.lookFrom,f.direction,f.distance,selectedPosition().toArray(),f.elapsed/f.duration);
  camera.position.fromArray(pose.position);controls.target.fromArray(pose.look);camera.lookAt(controls.target);
  if(f.elapsed>=f.duration)cancelFlight();
 }else{
  if(following){const target=selectedPosition().clone();camera.position.add(target.clone().sub(old));controls.target.copy(target)}
  if(!menu.isOpen)controls.update();
 }
 camera.updateMatrixWorld();
 bodies.forEach((b,i)=>placeLabel(b.label,b.root.position,planets[i].radius+1));moons.forEach(m=>{m.node.getWorldPosition(temp);placeLabel(m.label,temp,m.radius+.2,moonsVisible&&m.parentIndex===selected&&following&&camera.position.distanceTo(temp)<55)});placeLabel(sunLabel,new THREE.Vector3(),3.6);asteroids.items.forEach(a=>placeLabel(a.label,a.root.position,a.radius+.4,!following||selectedAsteroid===a));environmentLabels.forEach(a=>placeLabel(a.label,a.position,1,environment.beltsOn&&!following));updateDateControls();composer.render();}animate();
window.solarSystem={scene,camera,controls,bodies,moons,planets,interactableObjects,asteroids,ephemerisAt,get days(){return days}};
