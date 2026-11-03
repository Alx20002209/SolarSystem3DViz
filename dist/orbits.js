export const TAU = Math.PI * 2;
export const AU_KM = 149597870.7;

export function eccentricAnomaly(mean, e) {
  const M = ((mean % TAU) + TAU) % TAU;
  let E = M;
  for (let i=0;i<12;i++) {
    const delta = (E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
    E -= delta;
    if (Math.abs(delta)<1e-13) break;
  }
  return E;
}

export function positionAt(p, days, phase=0) {
  const E = eccentricAnomaly(days/p.period*TAU+phase,p.e);
  const z=p.orbit*Math.sqrt(1-p.e*p.e)*Math.sin(E);
  const i=p.inclination*Math.PI/180;
  return [p.orbit*(Math.cos(E)-p.e), z*Math.sin(i),z*Math.cos(i)];
}

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

function planetPositionFromElements(index, T, meanAnomaly=null) {
  const [a0,aRate,e0,eRate,i0,iRate,l0,lRate,peri0,periRate,node0,nodeRate]=planetaryElements[index];
  const a=a0+aRate*T,e=e0+eRate*T,i=(i0+iRate*T)*Math.PI/180;
  const peri=(peri0+periRate*T)*Math.PI/180,node=(node0+nodeRate*T)*Math.PI/180;
  const longitude=(l0+lRate*T)*Math.PI/180;
  const anomaly=meanAnomaly??(((longitude-peri+Math.PI)%(TAU)+TAU)%(TAU)-Math.PI);
  const E=eccentricAnomaly(anomaly,e),x=a*(Math.cos(E)-e),y=a*Math.sqrt(1-e*e)*Math.sin(E),w=peri-node;
  const cw=Math.cos(w),sw=Math.sin(w),cn=Math.cos(node),sn=Math.sin(node),ci=Math.cos(i),si=Math.sin(i);
  return [
    (cw*cn-sw*sn*ci)*x+(-sw*cn-cw*sn*ci)*y,
    (cw*sn+sw*cn*ci)*x+(-sw*sn+cw*cn*ci)*y,
    sw*si*x+cw*si*y
  ];
}

export function planetHeliocentricAt(index, days) {
  return planetPositionFromElements(index, days/36525);
}

export function planetPositionAt(p,index,days) {
  const [x,y,z]=planetHeliocentricAt(index,days);
  const scale=p.orbit/planetaryElements[index][0];
  return [x*scale,z*scale,y*scale];
}

export function planetOrbitAt(p,index,meanAnomaly) {
  const [x,y,z]=planetPositionFromElements(index,0,meanAnomaly);
  const scale=p.orbit/planetaryElements[index][0];
  return [x*scale,z*scale,y*scale];
}

function dot(a,b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
function cross(a,b) {
  return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
}
function magnitude(a) { return Math.sqrt(dot(a,a)); }
function scaled(a,s) { return [a[0]*s,a[1]*s,a[2]*s]; }
function add(a,b) { return [a[0]+b[0],a[1]+b[1],a[2]+b[2]]; }
function positiveAngle(angle) { return (angle%TAU+TAU)%TAU; }

function elementsFromState(state) {
  const r=state.positionKm,v=state.velocityKmS,mu=state.muKm3S2;
  const rLength=magnitude(r),h=cross(r,v),hLength=magnitude(h);
  const n=[-h[1],h[0],0],nLength=magnitude(n);
  const eccentricityVector=add(scaled(cross(v,h),1/mu),scaled(r,-1/rLength));
  const e=magnitude(eccentricityVector);
  const a=1/(2/rLength-dot(v,v)/mu);
  const inclination=Math.acos(h[2]/hLength);
  const node=positiveAngle(Math.atan2(n[1],n[0]));
  const argumentOfPeriapsis=positiveAngle(Math.atan2(
    dot(cross(n,eccentricityVector),scaled(h,1/hLength))/nLength,
    dot(n,eccentricityVector)/nLength
  ));
  const trueAnomaly=Math.atan2(
    dot(cross(eccentricityVector,r),scaled(h,1/hLength))/(e*rLength),
    dot(eccentricityVector,r)/(e*rLength)
  );
  const eccentric=2*Math.atan2(
    Math.sqrt(1-e)*Math.sin(trueAnomaly/2),
    Math.sqrt(1+e)*Math.cos(trueAnomaly/2)
  );
  return {a,e,inclination,node,argumentOfPeriapsis,meanAnomaly:eccentric-e*Math.sin(eccentric)};
}

function positionFromElements(elements, meanAnomaly) {
  const {a,e,inclination,node,argumentOfPeriapsis}=elements;
  const E=eccentricAnomaly(meanAnomaly,e);
  const x=a*(Math.cos(E)-e),y=a*Math.sqrt(1-e*e)*Math.sin(E);
  const w=argumentOfPeriapsis,co=Math.cos(node),so=Math.sin(node);
  const cw=Math.cos(w),sw=Math.sin(w),ci=Math.cos(inclination),si=Math.sin(inclination);
  return [
    (cw*co-sw*so*ci)*x+(-sw*co-cw*so*ci)*y,
    (cw*so+sw*co*ci)*x+(-sw*so+cw*co*ci)*y,
    sw*si*x+cw*si*y
  ];
}

function meanAnomalyFromPosition(elements, position) {
  const {a,e,inclination,node,argumentOfPeriapsis}=elements;
  const w=argumentOfPeriapsis,co=Math.cos(node),so=Math.sin(node);
  const cw=Math.cos(w),sw=Math.sin(w),ci=Math.cos(inclination),si=Math.sin(inclination);
  const x=(cw*co-sw*so*ci)*position[0]+(cw*so+sw*co*ci)*position[1]+sw*si*position[2];
  const y=(-sw*co-cw*so*ci)*position[0]+(-sw*so+cw*co*ci)*position[1]+cw*si*position[2];
  const E=Math.atan2(y/(a*Math.sqrt(1-e*e)),x/a+e);
  return positiveAngle(E-e*Math.sin(E));
}

export function createSatelliteOrbit(state, displayRadius) {
  const elements=elementsFromState(state),scale=displayRadius/elements.a;
  let meanMotion=TAU/state.periodDays;
  if(state.calibration){
    if(!Number.isFinite(state.epochTdbJulianDate)||!Number.isFinite(state.calibration.julianDateTdb))throw new TypeError('Satellite calibration requires an epoch and calibration Julian date');
    const calibrationDays=state.calibration.julianDateTdb-state.epochTdbJulianDate;
    const target=meanAnomalyFromPosition(elements,state.calibration.positionKm);
    const nominal=meanMotion*calibrationDays;
    const turns=Math.round((elements.meanAnomaly+nominal-target)/TAU);
    meanMotion=(target+turns*TAU-elements.meanAnomaly)/calibrationDays;
  }
  return {
    elements,
    periodDays:TAU/meanMotion,
    meanMotion,
    positionKmAt(days) {
      return positionFromElements(elements,elements.meanAnomaly+meanMotion*days);
    },
    positionAt(days) {
      const [x,y,z]=this.positionKmAt(days);
      return [x*scale,z*scale,y*scale];
    },
    orbitAt(meanAnomaly) {
      const [x,y,z]=positionFromElements(elements,meanAnomaly);
      return [x*scale,z*scale,y*scale];
    }
  };
}
