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
import {positionAt,planetPositionAt,TAU} from './orbits.js';
import {enhancePlanet,enhanceMoon} from './materials.js';
import {createAsteroids} from './asteroids.js';
import {createEnvironment} from './environment.js';
import {createSun,createStars} from './effects.js';
const $=id=>document.getElementById(id);
const modelInfo=$('model-info'),modelParagraphs=modelInfo.querySelectorAll('p');
modelParagraphs[2].textContent="Planet positions for selected dates use JPL's approximate Keplerian elements valid from 1800 through 2050; this is not a high-precision Horizons ephemeris. Display distances and sizes are compressed. Moon orbital phases and orientations remain illustrative. Surface spin uses an independent, gentle visual clock: one turn every 2–6 minutes, even when orbital movement is paused or set to zero.";
modelParagraphs[3].textContent='22 selected moons are included: Earth’s Moon, Phobos and Deimos, the four Galilean moons, seven major Saturnian moons, the five major Uranian moons, and Triton, Proteus and Nereid. This is not every known moon. Moon periods and eccentricities use JPL mean elements; starting phases and orientations are simplified. The date slider selects a UTC day; the speed control advances planet and moon orbits on one simulation clock. Pause freezes both orbital clocks. Moon surfaces turn illustratively every three minutes, independently of orbital phase.';
const ephemerisLink=document.createElement('a');ephemerisLink.href='https://ssd.jpl.nasa.gov/planets/approx_pos.html';ephemerisLink.target='_blank';ephemerisLink.rel='noopener';ephemerisLink.textContent='JPL approximate planetary positions ↗';modelInfo.insertBefore(ephemerisLink,modelInfo.querySelector('a'));
export const interactableObjects=[];
const menu=createMenu();
createAtmospherePanel(()=>$('planet-name').textContent);
async function data(file){const r=await fetch(file);if(!r.ok)throw Error(file+' could not load');return r.json()}
const [planets,moonData,environmentData,environmentSources]=await Promise.all([data('./planets.json'),data('./moons.json'),data('./environment-data.json'),data('./environment-sources.json')]);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x000000);
const camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.05,2000);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
$('universe').append(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=.5;controls.maxDistance=340;controls.maxPolarAngle=Math.PI*.98;
// A display-balanced point light keeps the compressed outer planets readable.
scene.add(new THREE.AmbientLight(0xffffff,.16));const light=new THREE.PointLight(0xfff4e5,3.5,0,0);scene.add(light);
const solar=createSun(scene);createStars(scene);
const renderTarget=new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType,samples:4});const composer=new EffectComposer(renderer,renderTarget);composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.25,.15,1.15);composer.addPass(bloom);composer.addPass(new OutputPass());
const orbitGroup=new THREE.Group();scene.add(orbitGroup);const bodies=[],moons=[];
const DAY_MS=86400000,J2000_MS=Date.UTC(2000,0,1,12),MIN_DATE_DAYS=Math.round((Date.UTC(1800,0,1,12)-J2000_MS)/DAY_MS),MAX_DATE_DAYS=Math.round((Date.UTC(2050,11,31,12)-J2000_MS)/DAY_MS);
let selected=2,selectedMoon=null,selectedAsteroid=null,following=false,paused=false,days=Math.max(MIN_DATE_DAYS,Math.min(MAX_DATE_DAYS,(Date.now()-J2000_MS)/DAY_MS)),spinSeconds=0,effectTime=0,names=true,moonsVisible=true;
const dateSlider=$('date'),dateOutput=$('date-output'),dateFormatter=new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
dateSlider.min=String(MIN_DATE_DAYS);dateSlider.max=String(MAX_DATE_DAYS);dateSlider.value=String(Math.round(days));days=Number(dateSlider.value);
function updateDateLabel(){const day=Math.round(days),value=String(day);if(dateSlider.value!==value)dateSlider.value=value;const label=dateFormatter.format(new Date(J2000_MS+day*DAY_MS));if(dateOutput.textContent!==label)dateOutput.textContent=label}
let cameraFlight=null;
const loader=new GLTFLoader();
function pickMeshes(model,onClick){model.traverse(o=>{if(o.isMesh){o.userData.onClick=onClick;interactableObjects.push(o)}})}
function label(name,type='planet-label'){const el=document.createElement('div');el.className=type;el.textContent=name.toUpperCase();$('labels').append(el);return el}
function orbit(p,phase=0,planetIndex=null){const pts=[];for(let j=0;j<=256;j++)pts.push(new THREE.Vector3(...(planetIndex===null?positionAt(p,p.period*j/256,phase):planetPositionAt(p,planetIndex,p.period*j/256))));return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.32}))}
try{
 await Promise.all(planets.map(async(p,i)=>{const gltf=await loader.loadAsync(`./assets/${p.name.toLowerCase()}.glb`);const root=new THREE.Group(),tilt=new THREE.Group(),model=gltf.scene;root.add(tilt);tilt.add(model);tilt.rotation.z=THREE.MathUtils.degToRad(p.tilt);scene.add(root);enhancePlanet(p,model,tilt);pickMeshes(model,()=>selectPlanet(i));const line=orbit(p,0,i);orbitGroup.add(line);bodies[i]={root,tilt,model,label:label(p.name),phase:i*.72};root.position.fromArray(planetPositionAt(p,i,days));}));
 await Promise.all(moonData.map(async(m,index)=>{
  const parentIndex=planets.findIndex(p=>p.name===m.parent),p=planets[parentIndex],asset=await loader.loadAsync(`./assets/${m.name.toLowerCase()}.glb`);
    const plane=new THREE.Group();bodies[parentIndex].root.add(plane);if(m.parent!=='Earth'&&m.name!=='Nereid')plane.rotation.z=THREE.MathUtils.degToRad(p.tilt);
  const orbitData={...m,orbit:Math.max(m.orbit,p.radius*1.8/(1-m.e))};const node=new THREE.Group();node.add(asset.scene);plane.add(node);
  enhanceMoon(m,asset.scene,node);
    const line=orbit(orbitData);line.material.opacity=.2;plane.add(line);const item={...m,orbitData,parentIndex,node,plane,line,model:asset.scene,label:label(m.name,'planet-label moon-label'),phase:index*1.3};moons[index]=item;node.position.fromArray(positionAt(orbitData,days,item.phase));pickMeshes(asset.scene,()=>selectMoon(item));
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
 else{title=p.name;$('category').textContent=`0${selected+1} / ${selected<4?'TERRESTRIAL WORLD':selected<6?'GAS GIANT':'ICE GIANT'}`;$('description').textContent=p.description;infoFields(['MEAN DISTANCE FROM SUN','MEAN ORBITAL SPEED','ONE ORBIT','SIDEREAL ROTATION'],[`${p.distance.toLocaleString()} <small>million km</small>`,`${p.speed.toFixed(1)} <small>km / s</small>`,`${p.period.toLocaleString()} <small>Earth days</small>`,`${Math.abs(p.rotation).toLocaleString()} <small>h${p.rotation<0?' · retrograde':''}</small>`]);}
 const source=$('surface-source');source.hidden=!selectedMoon&&!selectedAsteroid;if(selectedAsteroid){source.href=selectedAsteroid.source;source.textContent='Object facts & source'}else if(selectedMoon){source.href=selectedMoon.surfaceSource;source.textContent='Surface imagery & provenance ↗'}
 $('planet-name').textContent=title;$('focus').innerHTML=`${following?'Following':'Follow'} ${title} <span>↗</span>`;
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
renderer.domElement.addEventListener('pointerdown',cancelFlight,{capture:true});
renderer.domElement.addEventListener('wheel',cancelFlight,{capture:true,passive:true});

for(const [i,p] of [[-1,{name:'Sun',color:'#ff9b35'}],...planets.map((p,i)=>[i,p])]){const button=document.createElement('button');button.dataset.index=i;button.innerHTML=`<span class="dot" style="background:${p.color}"></span>${p.name}`;button.onclick=()=>selectPlanet(i);$('planet-nav').append(button)}
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down;
renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5){down=null;return}down=null;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const visible=interactableObjects.filter(o=>{let p=o;while(p){if(!p.visible)return false;p=p.parent}return true});raycaster.intersectObjects(visible,false)[0]?.object.userData.onClick?.()});
function overview(top=false){cancelFlight();following=false;controls.minDistance=.5;camera.position.set(top?0:102,top?205:125,top?.01:140);if(innerWidth<650)camera.position.multiplyScalar(1.3);controls.target.set(0,0,0);controls.update();showDetails()}
$('home').onclick=()=>overview();$('top').onclick=()=>overview(true);$('focus').onclick=()=>focus();
$('play').onclick=()=>{paused=!paused;$('play').textContent=paused?'▶':'Ⅱ';$('play').setAttribute('aria-label',paused?'Resume orbital movement':'Pause orbital movement')};$('time').oninput=()=>{$('time-output').textContent=`${$('time').value} days / sec`};dateSlider.oninput=()=>{days=Number(dateSlider.value);paused=true;$('play').textContent='▶';$('play').setAttribute('aria-label','Resume orbital movement');updateDateLabel()};
$('paths').onclick=()=>{orbitGroup.visible=!orbitGroup.visible;$('paths').textContent=`Orbits ${orbitGroup.visible?'on':'off'}`;$('paths').setAttribute('aria-pressed',orbitGroup.visible)};
$('names').onclick=()=>{names=!names;$('names').textContent=`Labels ${names?'on':'off'}`;$('names').setAttribute('aria-pressed',names)};
$('moons').onclick=()=>{moonsVisible=!moonsVisible;if(!moonsVisible&&selectedMoon)selectPlanet(selected);$('moons').textContent=`Moons ${moonsVisible?'on':'off'}`;$('moons').setAttribute('aria-pressed',moonsVisible)};
$('belts').onclick=()=>{environment.setBelts(!environment.beltsOn);$('belts').textContent=`Belts ${environment.beltsOn?'on':'off'}`;$('belts').setAttribute('aria-pressed',environment.beltsOn)};
$('dust-gas').onclick=()=>{environment.setDust(!environment.dustOn);$('dust-gas').textContent=`Dust / gas ${environment.dustOn?'on':'off'}`;$('dust-gas').setAttribute('aria-pressed',environment.dustOn)};
$('environment-info').onclick=()=>$('environment-dialog').showModal();$('close-environment').onclick=()=>$('environment-dialog').close();
for(const item of environmentSources){const section=document.createElement('section');section.className='source-item';const heading=document.createElement('h3');heading.textContent=item.title;const placement=document.createElement('strong');placement.textContent=item.placement;const note=document.createElement('p');note.textContent=item.note;const link=document.createElement('a');link.href=item.url;link.target='_blank';link.rel='noopener';link.textContent='Read the scientific source ↗';section.append(heading,placement,note,link);$('environment-sources').append(section)}
$('about').onclick=()=>$('model-info').showModal();$('close-about').onclick=()=>$('model-info').close();
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight)});
scene.updateMatrixWorld(true);overview();$('loading').remove();const clock=new THREE.Clock(),v=new THREE.Vector3(),old=new THREE.Vector3(),temp=new THREE.Vector3();
function placeLabel(el,position,offset,visible=true){v.copy(position);v.y+=offset;v.project(camera);el.style.display=names&&visible&&v.z<1&&v.z>-1?'block':'none';el.style.transform=`translate(${(v.x*.5+.5)*innerWidth}px,${(-v.y*.5+.5)*innerHeight}px) translate(-50%,-100%)`}
function animate(){requestAnimationFrame(animate);const frameDt=Math.min(clock.getDelta(),.05),dt=menu.isOpen?0:frameDt,rate=Number($('time').value);if(!paused){days=Math.min(MAX_DATE_DAYS,days+dt*rate);if(days>=MAX_DATE_DAYS){paused=true;$('play').textContent='▶';$('play').setAttribute('aria-label','Resume orbital movement')}}spinSeconds+=dt;effectTime+=dt*.35;old.copy(selectedPosition());
 bodies.forEach((b,i)=>{b.root.position.fromArray(planetPositionAt(planets[i],i,days));b.model.rotation.y=TAU*spinSeconds/Math.min(360,Math.max(120,180*Math.sqrt(Math.abs(planets[i].rotation)/23.9)));if(b.model.userData.clouds)b.model.userData.clouds.rotation.y=b.model.rotation.y*1.035});
 moons.forEach(m=>{m.node.position.fromArray(positionAt(m.orbitData,days,m.phase));m.model.rotation.y=TAU*spinSeconds/180;m.plane.visible=moonsVisible;m.line.visible=orbitGroup.visible&&m.parentIndex===selected&&following});environment.belts.visible=environment.beltsOn&&!(following&&selectedAsteroid);asteroids.update(days,spinSeconds);solar.update(effectTime);scene.updateMatrixWorld(true);
 for(const b of beltObstacles){b.node.getWorldPosition(obstaclePosition);b.x=obstaclePosition.x;b.y=obstaclePosition.y;b.z=obstaclePosition.z;}
 environment.update(days,spinSeconds,beltObstacles);
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
 bodies.forEach((b,i)=>placeLabel(b.label,b.root.position,planets[i].radius+1));moons.forEach(m=>{m.node.getWorldPosition(temp);placeLabel(m.label,temp,m.radius+.2,moonsVisible&&m.parentIndex===selected&&following&&camera.position.distanceTo(temp)<55)});placeLabel(sunLabel,new THREE.Vector3(),3.6);asteroids.items.forEach(a=>placeLabel(a.label,a.root.position,a.radius+.4,!following||selectedAsteroid===a));environmentLabels.forEach(a=>placeLabel(a.label,a.position,1,environment.beltsOn&&!following));updateDateLabel();composer.render();}animate();
window.solarSystem={scene,camera,controls,bodies,moons,planets,interactableObjects,asteroids,get days(){return days}};

