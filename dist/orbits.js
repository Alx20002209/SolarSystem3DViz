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
  return [p.orbit*(Math.cos(E)-p.e), z*Math.sin(i),z*Math.cos(i)];
}
