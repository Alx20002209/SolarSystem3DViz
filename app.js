import {orbitGuide,GM} from './orbit-guides.js';
import {loadEphemeris} from './ephemeris.js';
import {calendarDisplayPosition} from './calendar.js';
import {renderResolution} from './render-resolution.js';
import {planetRotationAt,earthCloudRotationAt,simulationDelta} from './rotation.js';
import {scaleBody,scaleEnvironment,systemExtent,SUN_RADIUS,illustrativeBody} from './scale.js?v=spacing-table-2';
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
import {positionAt,planetPositionAt,planetOrbitAt,TAU} from './orbits.js';
import {enhancePlanet,enhanceMoon} from './materials.js';
import {createAsteroids} from './asteroids.js';
import {createEnvironment} from './environment.js';
import {createSun,createStars} from './effects.js';
const $=id=>document.getElementById(id);
const viewParams=new URLSearchParams(location.search),referenceMode=viewParams.get('calendar')==='2000',realisticScale=viewParams.get('scale')==='realistic';
const displayBody=b=>realisticScale?scaleBody(b):illustrativeBody(b);
const sunRadius=realisticScale?SUN_RADIUS:3;
const modelInfo=$('model-info'),modelParagraphs=modelInfo.querySelectorAll('p');
modelParagraphs[1].textContent='Sun, planet and moon sizes and orbital distances share a single linear scale. Labels are clickable screen markers, not enlarged bodies. Use Inner system, All planets, or Moon system to navigate.';
modelParagraphs[2].textContent="Planet positions for selected dates use JPL's approximate Keplerian elements valid from 1800 through 2050; this is not a high-precision Horizons ephemeris. Distances and mean body radii share one linear scale (100 units = 1 AU). Planet spin rates follow NASA sidereal periods as simulation time advances; starting longitude and pole orientation are simplified. Gas giants use reference bulk periods, not latitude-dependent cloud winds. Earth cloud drift is illustrative. Use Real time for one simulated second per real second; the default remains accelerated.";
modelParagraphs[3].textContent='22 selected moons are included: Earth’s Moon, Phobos and Deimos, the four Galilean moons, seven major Saturnian moons, the five major Uranian moons, and Triton, Proteus and Nereid. This is not every known moon. Moon periods and eccentricities use JPL mean elements; starting phases and orientations are simplified. The date controls select a UTC day; the speed control advances planet and moon orbits on one simulation clock. Pause freezes orbital motion and planetary rotation. Moon surfaces keep an illustrative three-minute spin.';
if(!realisticScale){modelParagraphs[1].textContent='Illustrative Scale uses the previous compressed orbital layout and enlarged bodies. This layout does not preserve distance or size ratios; moon systems can overlap neighboring planetary orbits. Enable Realistic Scale for consistent physical spacing.';modelParagraphs[2].textContent=modelParagraphs[2].textContent.replace('Distances and mean body radii share one linear scale (100 units = 1 AU).','Positions are mapped onto the previous compressed display orbits.');document.querySelector('.intro p').innerHTML='Eight worlds. One star. Endless curiosity.<br>Select a planet to begin exploring.';document.querySelector('.mini-note').innerHTML='Illustrative scale · 22 selected moons.<br>Enable Realistic Scale for true distance ratios.';}
const ephemerisLink=document.createElement('a');ephemerisLink.href='https://ssd.jpl.nasa.gov/planets/approx_pos.html';ephemerisLink.target='_blank';ephemerisLink.rel='noopener';ephemerisLink.textContent='JPL approximate planetary positions ↗';modelInfo.insertBefore(ephemerisLink,modelInfo.querySelector('a'));
export const interactableObjects=[];
const menu=createMenu();
createAtmospherePanel(()=>$('planet-name').textContent);
async function data(file){const r=await fetch(file);if(!r.ok)throw Error(file+' could not load');return r.json()}
const [rawPlanets,rawMoons,rawEnvironment,environmentSources]=await Promise.all([data('./planets.json'),data('./moons.json'),data('./environment-data.json'),data('./environment-sources.json')]);
const calendar=referenceMode?await loadEphemeris().catch(error=>{$('loading').textContent='The validated motion data could not load. Reload to retry; no approximate fallback is used.';throw error}):null;
const planets=rawPlanets.map(displayBody),moonData=rawMoons.map(displayBody),environmentData=realisticScale?scaleEnvironment(rawEnvironment):rawEnvironment;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x000000);
const camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.05,realisticScale?100000:2000);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(renderResolution(innerWidth,innerHeight,devicePixelRatio,matchMedia('(pointer:coarse)').matches).pixelRatio);renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
$('universe').append(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=.5;controls.maxDistance=24000;controls.maxPolarAngle=Math.PI*.98;
// A display-balanced point light keeps the compressed outer planets readable.
scene.add(new THREE.AmbientLight(0xffffff,.16));const light=new THREE.PointLight(0xfff4e5,3.5,0,0);scene.add(light);
const solar=createSun(scene);solar.group.scale.setScalar(sunRadius/3);const stars=createStars(scene);stars.scale.setScalar(realisticScale?30:1);
const renderTarget=new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType,samples:4});const composer=new EffectComposer(renderer,renderTarget);composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.25,.15,1.15);composer.addPass(bloom);composer.addPass(new OutputPass());
const orbitGroup=new THREE.Group();scene.add(orbitGroup);const bodies=[],moons=[];
const DAY_MS=86400000,J2000_MS=Date.UTC(2000,0,1,12),MIN_DATE_DAYS=referenceMode?-.5:Math.round((Date.UTC(1800,0,1,12)-J2000_MS)/DAY_MS),MAX_DATE_DAYS=referenceMode?365.5-1/86400:Math.round((Date.UTC(2050,11,31,12)-J2000_MS)/DAY_MS);
let selected=2,selectedMoon=null,selectedAsteroid=null,following=false,systemView=false,paused=false,days=Math.max(MIN_DATE_DAYS,Math.min(MAX_DATE_DAYS,(Date.now()-J2000_MS)/DAY_MS)),spinSeconds=0,effectTime=0,names=true,moonsVisible=true;
const dateSlider=$('date'),datePicker=$('date-picker');
dateSlider.min=String(referenceMode?0:MIN_DATE_DAYS);dateSlider.max=String(referenceMode?365:MAX_DATE_DAYS);dateSlider.value=String(Math.round(days));days=Number(dateSlider.value);
let displayedDateDay=NaN;
const utcDate=()=>new Date(J2000_MS+days*DAY_MS);
function timeFraction(){const value=$('calendar-time')?.value||'12:00:00';const parts=value.split(':').map(Number);return ((parts[0]||0)*3600+(parts[1]||0)*60+(parts[2]||0))/86400-.5;}
function updateDateControls(){const day=referenceMode?Math.floor(days+.5):Math.round(days);if(day===displayedDateDay&&!referenceMode)return;displayedDateDay=day;const value=String(day);if(dateSlider.value!==value)dateSlider.value=value;const now=referenceMode?utcDate():new Date(J2000_MS+day*DAY_MS);datePicker.value=now.toISOString().slice(0,10);const time=$('calendar-time');if(time&&document.activeElement!==time)time.value=now.toISOString().slice(11,19);$('date-prev-month').disabled=day<=(referenceMode?0:MIN_DATE_DAYS);$('date-next-month').disabled=day>=(referenceMode?365:MAX_DATE_DAYS)}
function selectDate(day){days=Math.max(MIN_DATE_DAYS,Math.min(MAX_DATE_DAYS,referenceMode?day:Math.round(day)));paused=true;$('play').textContent='▶';$('play').setAttribute('aria-label','Resume orbital movement');updateDateControls();if(referenceMode){const url=new URL(location.href);url.searchParams.set('date',datePicker.value);url.searchParams.set('at',utcDate().toISOString().slice(11,19));url.searchParams.set('paused','true');history.replaceState(null,'',url);showDetails()}}
function shiftDateByMonth(offset){const current=utcDate(),day=current.getUTCDate(),target=new Date(Date.UTC(current.getUTCFullYear(),current.getUTCMonth()+offset,1,12)),lastDay=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0,12)).getUTCDate();target.setUTCDate(Math.min(day,lastDay));selectDate((target.getTime()-J2000_MS)/DAY_MS+(referenceMode?timeFraction():0))}
function dateInputToDay(value){const [year,month,day]=value.split('-').map(Number);return (Date.UTC(year,month-1,day,12)-J2000_MS)/DAY_MS}
if(viewParams.has('day')&&Number.isFinite(Number(viewParams.get('day'))))days=Math.max(MIN_DATE_DAYS,Math.min(MAX_DATE_DAYS,Number(viewParams.get('day'))));
if(referenceMode){const date=viewParams.get('date')||'2000-01-01',at=viewParams.get('at')||'12:00:00';const value=(Date.parse(date+'T'+at+'Z')-J2000_MS)/DAY_MS;days=Number.isFinite(value)?Math.max(MIN_DATE_DAYS,Math.min(MAX_DATE_DAYS,value)):0;datePicker.min='2000-01-01';datePicker.max='2000-12-31';}
paused=referenceMode?viewParams.get('paused')!=='false':viewParams.get('paused')==='true';if(paused){$('play').textContent='▶';$('play').setAttribute('aria-label','Resume orbital movement')}
updateDateControls();
let cameraFlight=null;
const loader=new GLTFLoader();
function pickMeshes(model,onClick){model.traverse(o=>{if(o.isMesh){o.userData.onClick=onClick;interactableObjects.push(o)}})}
function makeLabelClickable(el,name,onClick){const button=document.createElement('button');button.textContent=name;button.setAttribute('aria-label','Inspect '+name);button.onclick=onClick;el.replaceChildren(button);el.classList.add('body-marker')}
function label(name,type='planet-label'){const el=document.createElement('div');el.className=type;el.textContent=name.toUpperCase();$('labels').append(el);return el}
function orbit(p,phase=0,planetIndex=null){const pts=[];for(let j=0;j<=256;j++)pts.push(new THREE.Vector3(...(planetIndex===null?positionAt(p,p.period*j/256,phase):planetOrbitAt(p,planetIndex,TAU*j/256,days))));return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.32}))}
try{
 await Promise.all(planets.map(async(p,i)=>{const gltf=await loader.loadAsync(`./assets/${p.name.toLowerCase()}.glb`);const root=new THREE.Group(),tilt=new THREE.Group(),model=gltf.scene;root.add(tilt);tilt.add(model);tilt.rotation.z=THREE.MathUtils.degToRad(p.tilt);scene.add(root);enhancePlanet({...p,radius:p.assetRadius},model,tilt);tilt.scale.setScalar(p.radius/p.assetRadius);model.traverse(o=>{if(o.isMesh&&o.material.bumpScale)o.material.bumpScale*=p.radius/p.assetRadius});pickMeshes(model,()=>selectPlanet(i));const line=orbit(p,0,i);orbitGroup.add(line);bodies[i]={root,tilt,model,line,label:label(p.name),phase:i*.72};makeLabelClickable(bodies[i].label,p.name,()=>selectPlanet(i));root.position.fromArray(planetPositionAt(p,i,days));}));
 await Promise.all(moonData.map(async(m,index)=>{
  const parentIndex=planets.findIndex(p=>p.name===m.parent),p=planets[parentIndex],asset=await loader.loadAsync(`./assets/${m.name.toLowerCase()}.glb`);
    const plane=new THREE.Group();bodies[parentIndex].root.add(plane);if(m.parent!=='Earth'&&m.name!=='Nereid')plane.rotation.z=THREE.MathUtils.degToRad(p.tilt);
  const orbitData={...m,orbit:realisticScale?m.orbit:Math.max(m.orbit,p.radius*1.8/(1-m.e))};const node=new THREE.Group();node.add(asset.scene);plane.add(node);
  asset.scene.scale.setScalar(m.radius/m.assetRadius);enhanceMoon(m,asset.scene,node);
    const line=orbit(orbitData);line.material.opacity=.2;plane.add(line);const item={...m,orbitData,parentIndex,node,plane,line,model:asset.scene,label:label(m.name,'planet-label moon-label'),phase:index*1.3};moons[index]=item;makeLabelClickable(item.label,m.name,()=>selectMoon(item));node.position.fromArray(positionAt(orbitData,days,item.phase));pickMeshes(asset.scene,()=>selectMoon(item));
 }));
}catch(error){$('loading').textContent='A planet or moon could not load. Reload to try again.';throw error}
const environment=createEnvironment(scene,bodies,moons,environmentData,realisticScale);
const asteroidData=(await data('./named-asteroids.json')).map(a=>realisticScale?scaleBody(a):{...illustrativeBody(a),period:1800,e:0,inclination:0});
const asteroids=createAsteroids(scene,asteroidData,label,pickMeshes,selectAsteroid);
const calendarBodies=new Map([...planets,...asteroidData,...moons.map(m=>({...m,orbit:m.orbitData.orbit}))].map(b=>[b.name,b]));
const datedPosition=(name,at=days)=>calendarDisplayPosition(calendar,name,at,calendarBodies,realisticScale);
const referenceOrbitGroup=new THREE.Group();scene.add(referenceOrbitGroup);referenceOrbitGroup.visible=referenceMode;
const referenceGuides=referenceMode?[...calendarBodies.values()].map(body=>{const line=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:body.parent?.25:.4}));referenceOrbitGroup.add(line);return {body,line}}):[];
let guideDay=NaN;
function updateReferenceTrail(){
 if(!referenceMode||!referenceOrbitGroup.visible)return;
 const rebuild=!Number.isFinite(guideDay)||Math.abs(days-guideDay)>=.01;
 for(const {body,line} of referenceGuides){
  const parent=body.parent||'Sun';line.position.fromArray(datedPosition(parent));
  line.visible=!body.parent||(moonsVisible&&following&&selected>=0&&planets[selected].name===body.parent);
  if(!rebuild)continue;
  const state=calendar.state(body.name,days),center=calendar.state(parent,days),r=state.position.map((v,i)=>v-center.position[i]),v=state.velocity.map((v,i)=>v-center.velocity[i]);
  const actual=Math.hypot(...r),display=new THREE.Vector3(...datedPosition(body.name)).distanceTo(line.position),factor=display/actual;
  const points=orbitGuide(r,v,GM[parent]+(GM[body.name]||0)).map(([x,y,z])=>new THREE.Vector3(x*factor,z*factor,-y*factor));
  line.geometry.dispose();line.geometry=new THREE.BufferGeometry().setFromPoints(points);
 }
 if(rebuild)guideDay=days;
}
$('labels').removeAttribute('aria-hidden');
const beltObstacles=[{node:solar.group,radius:sunRadius*1.2},...bodies.map((b,i)=>({node:b.root,radius:planets[i].radius*(i===5?2.3:i===6?1.9:1.08)})),...moons.map(m=>({node:m.node,radius:m.radius*1.15})),...asteroids.items.map(a=>({node:a.root,radius:a.radius*1.2}))];
const obstaclePosition=new THREE.Vector3();
const environmentLabels=environment.annotations.map(a=>({...a,label:label(a.text,'planet-label region-label')}));
const sunLabel=label('Sun');makeLabelClickable(sunLabel,'Sun',()=>selectPlanet(-1));pickMeshes(solar.surface,()=>selectPlanet(-1));
function selectedObject(){return selectedAsteroid?.root??selectedMoon?.node??(selected===-1?solar.group:bodies[selected].root)}
const worldPosition=new THREE.Vector3();function selectedPosition(){return selectedObject().getWorldPosition(worldPosition)}
function infoFields(labels,values){document.querySelectorAll('.stats>div>span').forEach((e,i)=>e.textContent=labels[i]);['distance','speed','period','rotation'].forEach((id,i)=>$(id).innerHTML=values[i])}
$('close-detail').onclick=()=>{$('detail').hidden=true};
function updateReferenceStats(title=$('planet-name').textContent){const parent=selectedMoon?.parent||'Sun';infoFields(['DISTANCE FROM SUN · THIS DATE',selectedMoon?`DISTANCE FROM ${parent.toUpperCase()} · THIS DATE`:'DISTANCE FROM SUN (AU)',`SPEED RELATIVE TO ${parent.toUpperCase()}`,'POSITION TIME (UTC)'],[`${calendar.distance(title,days).toLocaleString(undefined,{maximumFractionDigits:0})} <small>km</small>`,selectedMoon?`${calendar.distance(title,days,parent).toLocaleString(undefined,{maximumFractionDigits:0})} <small>km</small>`:`${(calendar.distance(title,days)/149597870.7).toFixed(6)} <small>AU</small>`,`${calendar.speed(title,days,parent).toFixed(3)} <small>km/s</small>`,`${utcDate().toISOString().slice(0,10)} <small>${utcDate().toISOString().slice(11,19)}</small>`]);$('surface-source').href=calendar.source(title,days);}
function showDetails(){
 $('detail').hidden=false;$('detail').scrollTop=0;
 const p=planets[selected];let title;
 if(selectedAsteroid){const a=selectedAsteroid;title=a.name;$('category').textContent=a.kind.toUpperCase()+' / MAIN BELT';$('description').textContent='A separate, slowly rotating belt object. Mean size and orbital dimensions use JPL data in Realistic Scale. The default illustrative layout uses enlarged objects and compressed orbits.';infoFields(['SIZE / DIMENSIONS','REGION','SURFACE','DISPLAY MOTION'],[a.diameter,'Main asteroid belt','Illustrative relief','Slow rotation']);}
 else if(selectedMoon){const m=selectedMoon;title=m.name;$('category').textContent=`MOON OF ${m.parent.toUpperCase()}`;$('description').textContent=`${m.name} orbits ${m.parent}. ${m.surfaceNote}`;infoFields(['MEAN DISTANCE FROM PLANET','ORBITAL ECCENTRICITY','ONE ORBIT','ORBIT DIRECTION'],[`${m.distance.toLocaleString()} <small>km</small>`,m.e.toFixed(3),`${m.period.toFixed(3)} <small>Earth days</small>`,m.inclination>90?'Retrograde':'Prograde']);}
 else if(selected===-1){title='Sun';$('category').textContent='OUR CENTRAL STAR';$('description').textContent='A turbulent sphere of glowing plasma. Granulation, a luminous corona and looping prominences bring its surface to life.';infoFields(['STAR TYPE','ENERGY SOURCE','PLANETARY SYSTEM','MOONS IN THIS MODEL'],['G-type star','Nuclear fusion','8 <small>planets</small>','22 <small>selected moons</small>']);}
 else{title=p.name;$('category').textContent=`0${selected+1} / ${selected<4?'TERRESTRIAL WORLD':selected<6?'GAS GIANT':'ICE GIANT'}`;$('description').textContent=p.description;infoFields(['ORBIT SEMIMAJOR AXIS','MEAN ORBITAL SPEED','SIDEREAL ORBIT PERIOD','SIDEREAL ROTATION'],[`${p.distance.toLocaleString()} <small>million km</small>`,`${p.speed.toFixed(2)} <small>km / s</small>`,`${p.period.toLocaleString()} <small>Earth days</small>`,`${Math.abs(p.rotation).toLocaleString()} <small>h${p.rotation<0?' · retrograde':''}</small>`]);}
 if(referenceMode)updateReferenceStats(title);
 const source=$('surface-source');source.hidden=!selectedMoon&&!selectedAsteroid;if(selectedAsteroid){source.href=selectedAsteroid.source;source.textContent='Object facts & source'}else if(selectedMoon){source.href=selectedMoon.surfaceSource;source.textContent='Surface imagery & provenance ↗'}
 if(referenceMode){source.hidden=false;source.href=calendar.source(title,days);source.textContent='Verify this body in NASA/JPL Horizons ↗';}
 $('planet-name').textContent=title;$('focus').innerHTML=`${following?'Following':'Follow'} ${title} <span>↗</span>`;
 document.querySelectorAll('#planet-nav button').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.index)===selected));bodies.forEach((b,i)=>b.label.classList.toggle('selected',i===selected));
 $('system-view').hidden=selected<0||!moons.some(m=>m.parentIndex===selected);
 const host=$('moon-list');host.replaceChildren();const system=selectedAsteroid?[]:moons.filter(m=>m.parentIndex===selected);
 $('moon-heading').textContent=selectedAsteroid?'NAMED BELT OBJECT':selected===-1?'SELECT A WORLD BELOW':system.length?`${system.length} ${system.length===1?'MOON':selected<4?'MOONS':'MAJOR MOONS'} SHOWN`:'NO NATURAL MOONS';
 for(const m of system){const button=document.createElement('button');button.textContent=m.name;button.classList.toggle('active',selectedMoon===m);button.onclick=()=>{selectMoon(m);focus(true)};host.append(button)}
}
function selectPlanet(i){selected=i;selectedMoon=null;selectedAsteroid=null;following=false;showDetails();focus(true)}
function selectMoon(m){selected=m.parentIndex;selectedMoon=m;selectedAsteroid=null;moonsVisible=true;m.plane.visible=true;$('moons').textContent='Moons on';$('moons').setAttribute('aria-pressed','true');following=false;showDetails();focus(true)}
function selectAsteroid(a){selected=-2;selectedMoon=null;selectedAsteroid=a;following=false;showDetails();focus(true)}
function cancelFlight(){cameraFlight=null;controls.enabled=true;}
function focus(force,wholeSystem=false){
 systemView=wholeSystem;
 following=force??!following;
 if(following){
  scene.updateMatrixWorld(true);
  const target=selectedPosition().clone();
  const radius=selectedAsteroid?selectedAsteroid.radius:selectedMoon?selectedMoon.radius:selected===-1?sunRadius:planets[selected].radius;
  const direction=camera.position.clone().sub(target);
  if(direction.lengthSq()<1e-8)direction.copy(camera.position).sub(controls.target);
  if(direction.lengthSq()<1e-8)direction.set(0,.3,1);
  if(wholeSystem)direction.set(0,.9,1).applyAxisAngle(new THREE.Vector3(0,0,1),THREE.MathUtils.degToRad(planets[selected].tilt));
  direction.normalize();
  cameraFlight={from:camera.position.toArray(),lookFrom:controls.target.toArray(),direction:direction.toArray(),distance:wholeSystem?systemExtent(planets[selected],moonData)*3.8:radius*(selectedMoon||selectedAsteroid?7:9),elapsed:0,duration:2.4};
  controls.minDistance=Math.max(1e-8,radius*1.3);controls.enabled=false;
 }else cancelFlight();
 showDetails();
}
// Direct camera gestures take over immediately; clicking another body retargets from here.
renderer.domElement.addEventListener('pointerdown',cancelFlight,{capture:true});
renderer.domElement.addEventListener('wheel',cancelFlight,{capture:true,passive:true});

for(const [i,p] of [[-1,{name:'Sun',color:'#ff9b35'}],...planets.map((p,i)=>[i,p])]){const button=document.createElement('button');button.dataset.index=i;button.innerHTML=`<span class="dot" style="background:${p.color}"></span>${p.name}`;button.onclick=()=>selectPlanet(i);$('planet-nav').append(button)}
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down;
renderer.domElement.addEventListener('pointercancel',()=>{down=null});
renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5){down=null;return}down=null;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const visible=interactableObjects.filter(o=>{let p=o;while(p){if(!p.visible)return false;p=p.parent}return true});raycaster.intersectObjects(visible,false)[0]?.object.userData.onClick?.()});
function overview(top=false,inner=false){cancelFlight();following=false;systemView=false;controls.minDistance=.000001;const extent=realisticScale?(inner?240:3700):105;camera.position.set(top?0:extent*1.6,top?extent*3.2:extent*2,top?.01:extent*2.2);if(innerWidth<650)camera.position.multiplyScalar(1.3);controls.target.set(0,0,0);controls.update();showDetails()}
$('scale-mode').textContent=realisticScale?'Realistic Scale ✓':'Realistic Scale';$('scale-mode').setAttribute('aria-pressed',String(realisticScale));$('scale-mode').title=realisticScale?'Return to the previous illustrative scale':'Use true relative distances and sizes';
$('scale-mode').onclick=()=>{const url=new URL(location.href);if(realisticScale)url.searchParams.delete('scale');else url.searchParams.set('scale','realistic');url.searchParams.set('day',String(days));url.searchParams.set('paused',String(paused));if(referenceMode){url.searchParams.set('date',utcDate().toISOString().slice(0,10));url.searchParams.set('at',utcDate().toISOString().slice(11,19))}location.assign(url.href)};
$('inner').hidden=!realisticScale;$('home').textContent=realisticScale?'↺ All planets':'↺ Overview';
$('inner').onclick=()=>overview(false,true);$('system-view').onclick=()=>{if(selected>=0){selectedMoon=null;following=false;focus(true,true)}};
$('home').onclick=()=>overview();$('top').onclick=()=>overview(true);$('focus').onclick=()=>focus();
$('play').onclick=()=>{if(referenceMode&&days>=MAX_DATE_DAYS)return;paused=!paused;$('play').textContent=paused?'▶':'Ⅱ';$('play').setAttribute('aria-label',paused?'Resume orbital movement':'Pause orbital movement')};function showTimeRate(){const rate=Number($('time').value);$('time-output').textContent=Math.abs(rate-1/86400)<1e-12?'1× · real time':`${rate.toLocaleString(undefined,{maximumFractionDigits:5})} days / sec`;}
$('time').oninput=showTimeRate;$('slow-time').onclick=()=>{$('time').value='0.005';showTimeRate()};$('real-time').onclick=()=>{$('time').value=String(1/86400);showTimeRate()};dateSlider.oninput=()=>selectDate(Number(dateSlider.value)+(referenceMode?timeFraction():0));datePicker.oninput=()=>{if(datePicker.value)selectDate(dateInputToDay(datePicker.value)+(referenceMode?timeFraction():0))};$('date-prev-month').onclick=()=>shiftDateByMonth(-1);$('date-next-month').onclick=()=>shiftDateByMonth(1);
$('paths').onclick=()=>{const group=referenceMode?referenceOrbitGroup:orbitGroup;group.visible=!group.visible;$('paths').textContent=`Orbits ${group.visible?'on':'off'}`;$('paths').setAttribute('aria-pressed',String(group.visible))};
$('names').onclick=()=>{names=!names;$('names').textContent=`Labels ${names?'on':'off'}`;$('names').setAttribute('aria-pressed',names)};
$('moons').onclick=()=>{moonsVisible=!moonsVisible;if(!moonsVisible&&selectedMoon)selectPlanet(selected);$('moons').textContent=`Moons ${moonsVisible?'on':'off'}`;$('moons').setAttribute('aria-pressed',moonsVisible)};
$('belts').onclick=()=>{environment.setBelts(!environment.beltsOn);$('belts').textContent=`Belts ${environment.beltsOn?'on':'off'}`;$('belts').setAttribute('aria-pressed',environment.beltsOn)};
$('dust-gas').onclick=()=>{environment.setDust(!environment.dustOn);$('dust-gas').textContent=`Dust / gas ${environment.dustOn?'on':'off'}`;$('dust-gas').setAttribute('aria-pressed',environment.dustOn)};
$('environment-info').onclick=()=>$('environment-dialog').showModal();$('close-environment').onclick=()=>$('environment-dialog').close();
for(const item of environmentSources){if(!realisticScale)item.note+=' In Illustrative Scale, this region is compressed to the previous display layout.';const section=document.createElement('section');section.className='source-item';const heading=document.createElement('h3');heading.textContent=item.title;const placement=document.createElement('strong');placement.textContent=item.placement;const note=document.createElement('p');note.textContent=item.note;const link=document.createElement('a');link.href=item.url;link.target='_blank';link.rel='noopener';link.textContent='Read the scientific source ↗';section.append(heading,placement,note,link);$('environment-sources').append(section)}
$('about').onclick=()=>$('model-info').showModal();$('close-about').onclick=()=>$('model-info').close();

const distanceTableButton=document.createElement('button');distanceTableButton.textContent='Distances & scale';distanceTableButton.onclick=()=>{const u=new URL('./distances.html',location.href);u.searchParams.set('date',referenceMode?utcDate().toISOString().slice(0,10):'2000-01-01');u.searchParams.set('at',referenceMode?utcDate().toISOString().slice(11,19):'12:00:00');if(realisticScale)u.searchParams.set('scale','realistic');window.open(u.href,'_blank','noopener')};document.querySelector('.scene-actions').append(distanceTableButton);
const calendarButton=document.createElement('button');calendarButton.textContent=referenceMode?'Calendar 2000 ✓':'Solar calendar';calendarButton.onclick=()=>{const u=new URL(location.href);u.search='?calendar=2000&date=2000-01-01';location.assign(u.href)};document.querySelector('.scene-actions').prepend(calendarButton);
if(referenceMode){
 const chooser=document.createElement('select');chooser.id='calendar-object';chooser.setAttribute('aria-label','Select any of the 35 bodies');
 const choices=[{name:'Sun',choose:()=>selectPlanet(-1)},...planets.map((p,i)=>({name:p.name,choose:()=>selectPlanet(i)})),...moons.map(m=>({name:m.name,choose:()=>selectMoon(m)})),...asteroids.items.map(a=>({name:a.name,choose:()=>selectAsteroid(a)}))];
 chooser.add(new Option('Explore all 35 bodies…',''));choices.forEach((c,i)=>chooser.add(new Option(c.name,String(i))));chooser.onchange=()=>{if(chooser.value!=='')choices[Number(chooser.value)].choose()};document.querySelector('.scene-actions').prepend(chooser);
 document.querySelector('.intro p').textContent=realisticScale?'35 bodies · JPL positions · True distance scale':'35 bodies · JPL positions · Illustrative distance scale';
 document.querySelector('.mini-note').textContent=realisticScale?'JPL-based interpolated motion · 2000 only. White paths are instantaneous orbit guides; moon paths are relative to their planet. Surface orientation is illustrative.':'JPL-based interpolated motion · Compressed distances and enlarged bodies. Numeric distances use physical coordinates; interpolation is approximate.';
 const nasaButton=document.createElement('button');nasaButton.textContent='NASA 3D reference';nasaButton.onclick=()=>{const stamp=utcDate().toISOString();window.open('https://eyes.nasa.gov/apps/solar-system/#/home?time='+encodeURIComponent(stamp)+'&rate=0','_blank','noopener')};document.querySelector('.scene-actions').append(nasaButton);
 const alignmentLink=document.createElement('a');alignmentLink.href='./ephemeris/2000/alignment.html';alignmentLink.target='_blank';alignmentLink.rel='noopener';alignmentLink.className='accuracy-link';alignmentLink.textContent='Alignment check';modelInfo.append(alignmentLink);
 const accuracyLink=document.createElement('a');accuracyLink.href='./ephemeris/2000/accuracy.html';accuracyLink.target='_blank';accuracyLink.rel='noopener';accuracyLink.textContent='Accuracy checks ↗';accuracyLink.className='accuracy-link';modelInfo.append(accuracyLink);
 document.body.classList.add('continuous-calendar');document.querySelector('.time-label span').textContent='JPL MOTION · 2000';showTimeRate();
 const utcInput=document.createElement('input');utcInput.type='time';utcInput.id='calendar-time';utcInput.step='1';utcInput.setAttribute('aria-label','Time in UTC');utcInput.title='UTC time within verified 2000 coverage';utcInput.value=utcDate().toISOString().slice(11,19);utcInput.oninput=()=>{if(utcInput.value)selectDate(dateInputToDay(datePicker.value)+timeFraction())};document.querySelector('.date-control').append(utcInput);
 $('date').setAttribute('aria-label','Select a day in the verified 2000 calendar');$('date').title='Continuous ephemeris coverage: 2000 only';
 orbitGroup.visible=false;$('paths').setAttribute('aria-pressed','true');$('paths').textContent='Orbits on';
 environment.setBelts(false);environment.setDust(false);['belts','dust-gas'].forEach(id=>{$(id).disabled=true;$(id).setAttribute('aria-pressed','false')});$('belts').textContent='Belt particles hidden';$('dust-gas').textContent='Illustrative gas hidden';
 $('scale-mode').textContent=realisticScale?'True distance scale ✓':'True distance scale';
 const exit=document.createElement('button');exit.textContent='Exit calendar';exit.onclick=()=>{const u=new URL(location.href);u.search='?scale=realistic';location.assign(u.href)};document.querySelector('.scene-actions').append(exit);
 modelParagraphs[2].textContent='Calendar mode uses dense NASA/JPL Horizons position and velocity samples with cubic Hermite interpolation for all 35 selectable bodies, limited to 2000. Separate test queries measure interpolation error relative to JPL, not the absolute uncertainty of JPL itself. Source positions are heliocentric in the J2000 ecliptic frame. Illustrative Scale preserves dated directions and radial variation while compressing each orbit and enlarging bodies. True distance scale uses 100 units per AU for distances and nominal radii. Playback and UTC time selection interpolate within the sampled year; no extrapolation is permitted. White paths are complete instantaneous two-body orbit guides fitted to the dated positions and velocities, not forecasts of an exact future trajectory. Moon guides appear when following their planet. The dated objects still use JPL interpolation. Body orientation, lighting and surface effects remain illustrative.';
}

const phonePointer=matchMedia('(pointer:coarse)');
let lastRenderSize='';
function resizeScene(){
 const rect=document.querySelector('#universe').getBoundingClientRect();
 const size=renderResolution(rect.width,rect.height,devicePixelRatio,phonePointer.matches);
 const key=`${size.width}/${size.height}/${size.pixelRatio}`;
 if(key===lastRenderSize)return;
 lastRenderSize=key;
 camera.aspect=size.width/size.height;camera.updateProjectionMatrix();
 renderer.setPixelRatio(size.pixelRatio);renderer.setSize(size.width,size.height);
 composer.setPixelRatio(size.pixelRatio);composer.setSize(size.width,size.height);
}
new ResizeObserver(resizeScene).observe(document.querySelector('#universe'));
window.addEventListener('resize',resizeScene);
window.visualViewport?.addEventListener('resize',resizeScene);
phonePointer.addEventListener('change',resizeScene);
resizeScene();
scene.updateMatrixWorld(true);overview();$('loading').remove();const clock=new THREE.Clock(),v=new THREE.Vector3(),old=new THREE.Vector3(),temp=new THREE.Vector3(),beltUpdateInterval=.25;let beltUpdateElapsed=beltUpdateInterval;let orbitDay=NaN,statsElapsed=0;
document.addEventListener('visibilitychange',()=>clock.start());
function placeLabel(el,position,offset,visible=true){v.copy(position);v.y+=offset;v.project(camera);el.style.display=names&&visible&&v.z<1&&v.z>-1?'block':'none';el.style.transform=`translate(${(v.x*.5+.5)*innerWidth}px,${(-v.y*.5+.5)*innerHeight}px) translate(-50%,-100%)`}
function animate(){requestAnimationFrame(animate);const elapsed=clock.getDelta(),frameDt=elapsed,dt=menu.isOpen||document.hidden?0:frameDt,rate=Number($('time').value);beltUpdateElapsed+=menu.isOpen?0:Math.min(elapsed,.5);const refreshBelts=beltUpdateElapsed>=beltUpdateInterval;if(refreshBelts)beltUpdateElapsed%=beltUpdateInterval;if(!paused){days=Math.min(MAX_DATE_DAYS,days+simulationDelta(dt,rate,false));if(days>=MAX_DATE_DAYS){paused=true;$('play').textContent='▶';$('play').setAttribute('aria-label','Resume orbital movement')}}spinSeconds+=referenceMode&&paused?0:dt;effectTime+=dt*.35;statsElapsed+=dt;old.copy(selectedPosition());
 bodies.forEach((b,i)=>{b.root.position.fromArray(referenceMode?datedPosition(planets[i].name):planetPositionAt(planets[i],i,days));b.model.rotation.y=planetRotationAt(planets[i],days);if(b.model.userData.clouds)b.model.userData.clouds.rotation.y=earthCloudRotationAt(planets[i],days)});
 if(referenceMode)scene.updateMatrixWorld(true);
 moons.forEach(m=>{if(referenceMode)m.node.position.copy(m.plane.worldToLocal(new THREE.Vector3(...datedPosition(m.name))));else m.node.position.fromArray(positionAt(m.orbitData,days,m.phase));m.model.rotation.y=TAU*spinSeconds/180;m.plane.visible=moonsVisible;m.line.visible=!referenceMode&&orbitGroup.visible&&m.parentIndex===selected&&following});environment.belts.visible=environment.beltsOn&&!(following&&selectedAsteroid);asteroids.update(days,spinSeconds);if(referenceMode)asteroids.items.forEach(a=>a.root.position.fromArray(datedPosition(a.name)));solar.update(effectTime);scene.updateMatrixWorld(true);
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
 // Keep depth precision near the selected body without clipping distant orbits.
 const viewDistance=camera.position.distanceTo(controls.target);
 camera.near=Math.max(1e-9,Math.min(.1,viewDistance/1000));camera.updateProjectionMatrix();
 stars.position.copy(camera.position);
 const dayKey=Math.floor(days);if(!referenceMode&&orbitDay!==dayKey){orbitDay=dayKey;bodies.forEach((b,i)=>{const attr=b.line.geometry.attributes.position;for(let j=0;j<=256;j++)attr.setXYZ(j,...planetOrbitAt(planets[i],i,TAU*j/256,days));attr.needsUpdate=true;b.line.geometry.computeBoundingSphere()})}
 if(referenceMode){updateReferenceTrail();if(statsElapsed>.2){updateReferenceStats();statsElapsed=0;}}
 camera.updateMatrixWorld();
 bodies.forEach((b,i)=>placeLabel(b.label,b.root.position,planets[i].radius*1.25));moons.forEach(m=>{m.node.getWorldPosition(temp);placeLabel(m.label,temp,m.radius*1.25,moonsVisible&&m.parentIndex===selected&&following)});placeLabel(sunLabel,new THREE.Vector3(),sunRadius*1.2);asteroids.items.forEach(a=>placeLabel(a.label,a.root.position,a.radius*1.25,!following||selectedAsteroid===a));environmentLabels.forEach(a=>placeLabel(a.label,a.position,1,environment.beltsOn&&!following));updateDateControls();composer.render();}animate();
window.solarSystem={scene,camera,controls,bodies,moons,planets,interactableObjects,asteroids,get days(){return days}};


window.dispatchEvent(new Event('solar-ready'));
