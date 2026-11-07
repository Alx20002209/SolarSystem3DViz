import {loadEphemeris} from './ephemeris.js';
import {distanceRows} from './distance-table.js';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
$('date').value=params.get('date')||'2000-01-01';$('at').value=params.get('at')||'12:00:00';$('mode').value=params.get('scale')==='realistic'?'realistic':'illustrative';
try{
 const [calendar,planets,moons,asteroids]=await Promise.all([loadEphemeris(),...['planets.json','moons.json','named-asteroids.json'].map(p=>fetch(p).then(r=>{if(!r.ok)throw Error(p);return r.json()}))]);
 const format=(v,d=2)=>v===null?'N/A':v.toLocaleString('en-US',{maximumFractionDigits:d});
 function render(){
 const instant=Date.parse($('date').value+'T'+$('at').value+'Z'),day=(instant-Date.UTC(2000,0,1,12))/86400000;
 if(!Number.isFinite(day)||day<-.5||day>=365.5){$('status').textContent='Choose a valid UTC date and time within 2000.';$('rows').replaceChildren();return;}
 const real=$('mode').value==='realistic',rows=distanceRows(calendar,planets,moons,asteroids,day,real);$('rows').replaceChildren();
 for(const r of rows){const tr=document.createElement('tr'),name=document.createElement('td'),link=document.createElement('a');link.textContent=r.name;link.href=r.source;link.target='_blank';link.rel='noopener';name.append(link);tr.append(name);
 for(const value of [r.center,format(r.referenceKm),format(r.realKm),format(r.sunKm),format(r.displayUnits,6),format(r.kmPerUnit),format(r.physicalRadiusKm),format(r.displayRadius,9),format(r.physicalRadiusKm/r.displayRadius)]){const td=document.createElement('td');td.textContent=value;tr.append(td)}$('rows').append(tr)}
 $('status').textContent=rows.length+' objects | '+new Date(instant).toISOString().replace('T',' ').replace('.000Z',' UTC');
 $('explanation').textContent=real?'True distance scale: one linear factor for distances and nominal body radii: 1 scene unit = 1,495,978.707 km (100 units = 1 AU).':'Illustrative scale: each orbit has a different compression factor, and bodies are enlarged independently. This is not a uniformly scaled miniature. Both factors are shown below.';
 const u=new URL(location.href);u.searchParams.set('date',$('date').value);u.searchParams.set('at',$('at').value);u.searchParams.set('scale',$('mode').value);history.replaceState(null,'',u);
 const back=new URL('./',location.href);back.search='?calendar=2000&date='+$('date').value+'&at='+$('at').value+(real?'&scale=realistic':'');$('back').href=back;
 }
 for(const id of ['date','at','mode'])$(id).addEventListener('change',render);render();
}catch(error){$('status').textContent='Could not load the distance data. Reload to retry.';console.error(error)}
