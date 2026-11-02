import {UNITS_PER_AU} from './scale.js';
export const TAU = Math.PI * 2;
export function eccentricAnomaly(mean, e) {
  let E = mean % TAU;
  for (let i=0;i<10;i++) E -= (E-e*Math.sin(E)-mean%TAU)/(1-e*Math.cos(E));
  return E;
}
export function positionAt(p, days, phase=0) {
  const E = eccentricAnomaly(days/p.period*TAU+phase,p.e);
  const z=p.orbit*Math.sqrt(1-p.e*p.e)*Math.sin(E);
  const i=p.inclination*Math.PI/180;
  return [p.orbit*(Math.cos(E)-p.e), z*Math.sin(i),-z*Math.cos(i)];
}

// JPL ecliptic coordinates map to Three.js as (x,z,-y), preserving handedness.
const planetaryElements = [
  [.38709927,.00000037,.20563593,.00001906,7.00497902,-.00594749,252.25032350,149472.67411175,77.45779628,.16047689,48.33076593,-.12534081],
  [.72333566,.00000390,.00677672,-.00004107,3.39467605,-.00078890,181.97909950,58517.81538729,131.60246718,.00268329,76.67984255,-.27769418],
  [1.00000261,.00000562,.01671123,-.00004392,-.00001531,-.01294668,100.46457166,35999.37244981,102.93768193,.32327364,0,0],
  [1.52371034,.00001847,.09339410,.00007882,1.84969142,-.00813131,-4.55343205,19140.30268499,-23.94362959,.44441088,49.55953891,-.29257343],
  [5.20288700,-.00011607,.04838624,-.00013253,1.30439695,-.00183714,34.39644051,3034.74612775,14.72847983,.21252668,100.47390909,.20469106],
  [9.53667594,-.00125060,.05386179,-.00050991,2.48599187,.00193609,49.95424423,1222.49362201,92.59887831,-.41897216,113.66242448,-.28867794],
  [19.18916464,-.00196176,.04725744,-.00004397,.77263783,-.00242939,313.23810451,428.48202785,170.95427630,.40805281,74.01692503,.04240589],
  [30.06992276,.00026291,.00859048,.00005105,1.77004347,.00035372,-55.12002969,218.45945325,44.96476227,-.32241464,131.78422574,-.00508664]
];

function planetPositionFromElements(p, index, T, meanAnomaly=null) {
  const [a0,aRate,e0,eRate,i0,iRate,l0,lRate,peri0,periRate,node0,nodeRate]=planetaryElements[index];
  const a=a0+aRate*T,e=e0+eRate*T,i=(i0+iRate*T)*Math.PI/180;
  const peri=(peri0+periRate*T)*Math.PI/180,node=(node0+nodeRate*T)*Math.PI/180;
  const longitude=(l0+lRate*T)*Math.PI/180;
  const anomaly=meanAnomaly??(((longitude-peri+Math.PI)%(TAU)+TAU)%(TAU)-Math.PI);
  const E=eccentricAnomaly(anomaly,e),x=a*(Math.cos(E)-e),y=a*Math.sqrt(1-e*e)*Math.sin(E),w=peri-node;
  const cw=Math.cos(w),sw=Math.sin(w),cn=Math.cos(node),sn=Math.sin(node),ci=Math.cos(i),si=Math.sin(i);
  const scale=p.unitsPerAU??p.orbit/a0;
  return [
    ((cw*cn-sw*sn*ci)*x+(-sw*cn-cw*sn*ci)*y)*scale,
    (sw*si*x+cw*si*y)*scale,
    -((cw*sn+sw*cn*ci)*x+(-sw*sn+cw*cn*ci)*y)*scale
  ];
}

export function planetPositionAt(p,index,days) {
  return planetPositionFromElements(p,index,days/36525);
}

export function planetOrbitAt(p,index,meanAnomaly,days=0) {
  return planetPositionFromElements(p,index,days/36525,meanAnomaly);
}
