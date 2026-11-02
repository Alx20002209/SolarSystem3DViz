const footer=document.querySelector('footer');
const detail=document.querySelector('#detail');
const actions=document.querySelector('.scene-actions');
const mobile=matchMedia('(max-width:650px), (max-height:500px) and (max-width:950px)');
let pending=false;
function updateLayout(){
 pending=false;
 document.documentElement.style.setProperty('--dock-height',`${Math.ceil(footer.getBoundingClientRect().height)}px`);
 const camera=window.solarSystem?.camera;
 if(!camera)return;
 if(!mobile.matches){camera.zoom=1;camera.clearViewOffset();return;}
 const top=document.querySelector('header').getBoundingClientRect().bottom;
 const landscape=innerWidth>innerHeight;
 const bottom=detail.hidden||landscape?actions.getBoundingClientRect().top:detail.getBoundingClientRect().top;
 const centerX=landscape&&!detail.hidden?Math.max(80,detail.getBoundingClientRect().left)/2:innerWidth/2;
 // Aim into the visible scene above the mobile panels, not behind them.
 const available=Math.max(40,bottom-top);
 const center=top+available/2;
 camera.zoom=Math.min(1,available/(innerHeight*.32));
 camera.setViewOffset(innerWidth,innerHeight,innerWidth/2-centerX,innerHeight/2-center,innerWidth,innerHeight);
}
function schedule(){if(!pending){pending=true;requestAnimationFrame(updateLayout);}}
const observer=new ResizeObserver(schedule);
[footer,detail,actions].forEach(el=>observer.observe(el));
new MutationObserver(schedule).observe(detail,{attributes:true,attributeFilter:['hidden']});
window.addEventListener('resize',schedule);
window.addEventListener('solar-ready',schedule);
mobile.addEventListener('change',schedule);
schedule();
