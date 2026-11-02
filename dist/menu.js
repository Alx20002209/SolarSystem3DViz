export function createMenu(){
 const $=id=>document.getElementById(id),dialog=$('pause-menu'),audio=$('background-music');
 let settings={music:true,volume:.18};
 try{const saved=JSON.parse(localStorage.getItem('orbital-audio')||'{}');if(typeof saved.music==='boolean')settings.music=saved.music;if(Number.isFinite(saved.volume))settings.volume=Math.max(0,Math.min(1,saved.volume));}catch{}
 audio.volume=settings.volume;audio.loop=true;
 const save=()=>{try{localStorage.setItem('orbital-audio',JSON.stringify(settings))}catch{}};
 const status=text=>{$('music-status').textContent=text};
 function sync(){ $('music-enabled').checked=settings.music;$('music-volume').value=Math.round(settings.volume*100);$('volume-value').textContent=Math.round(settings.volume*100)+'%'; }
 async function play(){if(!settings.music)return;try{await audio.play();status('Playing: Lightless Dawn');}catch(error){status(error.name==='NotAllowedError'?'Press Play music to start.':'Music could not play. Press Play music to retry.');}}
 function main(){ $('menu-main').hidden=false;$('menu-settings').hidden=true;$('menu-title').textContent='Take a moment.'; }
 function resume(){dialog.close();main();}
 function open(){main();if(!dialog.open)dialog.showModal();}
 $('menu-button').onclick=open;$('menu-resume').onclick=resume;
 $('menu-settings-button').onclick=()=>{$('menu-main').hidden=true;$('menu-settings').hidden=false;$('menu-title').textContent='Settings';$('music-enabled').focus();};
 $('settings-back').onclick=()=>{main();$('menu-settings-button').focus();};
 $('music-enabled').onchange=()=>{settings.music=$('music-enabled').checked;save();if(settings.music)play();else{audio.pause();status('Music off');}};
 $('music-volume').oninput=()=>{settings.volume=Number($('music-volume').value)/100;audio.volume=settings.volume;sync();save();};
 $('music-start').onclick=()=>{settings.music=true;sync();save();play();};
 audio.addEventListener('error',()=>status('Music unavailable. Press Play music to retry.'));
 dialog.addEventListener('cancel',e=>{e.preventDefault();if(!$('menu-settings').hidden){main();$('menu-settings-button').focus();}else resume();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.repeat&&!document.querySelector('dialog[open]')){e.preventDefault();open();}});
 // Browser-approved audio begins only after an explicit user gesture.
 const unlock=()=>{if(settings.music&&audio.paused)play();document.removeEventListener('pointerdown',unlock);document.removeEventListener('keydown',unlock);};
 document.addEventListener('pointerdown',unlock);document.addEventListener('keydown',unlock);
 sync();status(settings.music?'Music starts with your first interaction.':'Music off');
 return {get isOpen(){return dialog.open}};
}
