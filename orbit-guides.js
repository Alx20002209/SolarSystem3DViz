// Instantaneous two-body guides from dated JPL states, not future ephemerides.
// GM values: https://ssd.jpl.nasa.gov/astro_par.html (DE440 system masses).
export const GM={Sun:132712440041.279419,Mercury:22031.868551,Venus:324858.592,Earth:398600.435507,Moon:4902.800118,Mars:42828.375816,Jupiter:126712764.1,Saturn:37940584.8418,Uranus:5794556.4,Neptune:6836527.10058};
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],mul=(a,k)=>a.map(v=>v*k);
export function orbitGuide(position,velocity,mu,segments=256){
 const radius=Math.hypot(...position),h=cross(position,velocity),hn=Math.hypot(...h),rhat=mul(position,1/radius),normal=mul(h,1/hn),tangent=cross(normal,rhat),ev=cross(velocity,h).map((v,i)=>v/mu-rhat[i]),e=Math.hypot(...ev),p=hn*hn/mu;
 if(!(radius>0&&hn>0&&mu>0&&e<1))return [];
 const points=[];for(let i=0;i<segments;i++){const angle=2*Math.PI*i/segments,dir=rhat.map((v,k)=>v*Math.cos(angle)+tangent[k]*Math.sin(angle));points.push(mul(dir,p/(1+dot(ev,dir))))}points.push([...points[0]]);return points;
}
