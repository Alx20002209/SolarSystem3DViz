const el=(tag,text,className)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node};
export function createAtmospherePanel(getName){
 const dialog=document.getElementById('atmosphere-dialog'),content=document.getElementById('atmosphere-content');let dataset;
 document.getElementById('atmosphere-close').onclick=()=>dialog.close();
 document.getElementById('atmosphere-button').onclick=async()=>{
  const name=getName();document.getElementById('atmosphere-title').textContent=name;
  content.replaceChildren(el('p','Loading reference composition…'));dialog.showModal();
  try{
   if(!dataset){const response=await fetch('./atmospheres.json');if(!response.ok)throw Error('Composition unavailable');dataset=await response.json()}
   if(!dialog.open||document.getElementById('atmosphere-title').textContent!==name)return;
   const entry=dataset[name];content.replaceChildren();
   if(!entry){content.append(el('div','Composition not catalogued','chem-kind'),el('p','A verified atmospheric composition entry for this body is not included in this edition. This does not establish that it has no exosphere.'));return}
   content.append(el('div',entry.kind,'chem-kind'),el('p',entry.summary));
   const table=el('table',null,'chem-table');table.append(el('caption',entry.basis));const head=el('thead'),headRow=el('tr');
   for(const title of ['Constituent','Formula','Abundance']){const th=el('th',title);th.scope='col';headRow.append(th)}head.append(headRow);table.append(head);
   const body=el('tbody');for(const values of entry.rows){const row=el('tr');values.forEach(value=>row.append(el('td',value)));body.append(row)}table.append(body);content.append(table);
   if(entry.note)content.append(el('p',entry.note));
   const source=el('a','NASA reference ↗','chem-source');source.href=entry.source;source.target='_blank';source.rel='noopener noreferrer';content.append(source);
   content.append(el('p','Selected constituents only. Rounded estimates may not total 100%. ppm = parts per million. Reference data checked 1 November 2026; not a live measurement.','chem-foot'));
  }catch{content.replaceChildren(el('p','Composition data could not load. Close this panel and try again.'))}
 };
}
