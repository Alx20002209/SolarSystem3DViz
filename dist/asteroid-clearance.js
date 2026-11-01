// Conservative geometric clearance for illustrative belt particles (not impact physics).
export function clearanceScale(x,y,z,radius,obstacles){
 let scale=1;
 for(const b of obstacles){const gap=Math.hypot(x-b.x,y-b.y,z-b.z)-b.radius-radius-.15;if(gap<=0)return 0;const t=Math.min(1,gap/.6);scale=Math.min(scale,t*t*(3-2*t));}
 return scale;
}
export function createRockGrid(cellSize=1){
 const cells=new Map();
 return {accept(x,y,z,radius){
  const ix=Math.floor(x/cellSize),iy=Math.floor(y/cellSize),iz=Math.floor(z/cellSize),reach=Math.ceil((radius+.25)/cellSize);
  for(let dx=-reach;dx<=reach;dx++)for(let dy=-reach;dy<=reach;dy++)for(let dz=-reach;dz<=reach;dz++){
   const list=cells.get(`${ix+dx},${iy+dy},${iz+dz}`);if(list)for(const a of list)if(Math.hypot(x-a.x,y-a.y,z-a.z)<radius+a.radius+.025)return false;
  }
  const key=`${ix},${iy},${iz}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push({x,y,z,radius});return true;
 }};
}
