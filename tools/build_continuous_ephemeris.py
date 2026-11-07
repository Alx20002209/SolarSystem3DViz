import json,math,struct,urllib.request,urllib.parse,time,hashlib,datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'dist'
OUT=ROOT/'ephemeris/2000';OUT.mkdir(parents=True,exist_ok=True)
base=json.loads((ROOT/'calendar-2000.json').read_text())
moons={m['name']:m['parent'] for m in json.loads((ROOT/'moons.json').read_text())}
ids={b['name']:b['id'] for b in base['bodies']}
steps={'Sun':1440,'Mercury':360,'Venus':720,'Earth':360,'Mars':360,'Jupiter':360,'Saturn':720,'Uranus':720,'Neptune':720,'Moon':360,'Phobos':10,'Deimos':30,'Io':30,'Europa':60,'Ganymede':120,'Callisto':180,'Mimas':15,'Enceladus':30,'Tethys':30,'Dione':60,'Rhea':120,'Titan':240,'Iapetus':720,'Ariel':30,'Umbriel':60,'Titania':120,'Oberon':240,'Miranda':30,'Triton':120,'Proteus':30,'Nereid':360,'Ceres':1440,'Vesta':1440,'Pallas':1440,'Hygiea':1440}
AGENT='OrbitalAtlas/1.0 (https://github.com/Alx20002209/SolarSystem3DViz)'
manifest={'version':1,'source':'NASA/JPL Horizons','coverageStart':'2000-01-01T00:00:00Z','coverageEnd':'2001-01-01T00:00:00Z','startDay':-.5,'endDay':365.5,'frame':'ICRF / ecliptic J2000','timeScale':'UT','units':'km, km/s','encoding':'little-endian float64; records X,Y,Z,VX,VY,VZ','interpolation':'cubic Hermite using position and velocity','bodies':[],'validation':{'method':'Independent Horizons queries at 36 non-grid times per body, distributed through 2000. Errors relative to Horizons, not absolute physical uncertainty.','toleranceKm':1}}
def query(params):
 url='https://ssd.jpl.nasa.gov/api/horizons.api?'+urllib.parse.urlencode(params)
 for attempt in range(3):
  try:
   req=urllib.request.Request(url,headers={'User-Agent':AGENT});r=json.load(urllib.request.urlopen(req,timeout=120))
   assert r.get('signature',{}).get('version')=='1.2',('API version changed',r.get('signature'))
   s=r.get('result','');assert '$$SOE' in s,r.get('error',s[-500:])
   rows=[]
   for line in s.split('$$SOE')[1].split('$$EOE')[0].strip().splitlines():
    f=[v.strip() for v in line.split(',')];rows.append([float(f[0]),*map(float,f[2:8])])
   return rows,url,next((l.strip() for l in s.splitlines() if l.startswith('Target body name:')),'')
  except Exception:
   if attempt==2:raise
   time.sleep(2**(attempt+1))
def interpolate(rows,jd,step):
 index=min(len(rows)-2,max(0,int((jd-rows[0][0])*86400/step)));a,b=rows[index],rows[index+1];t=(jd-a[0])*86400/step;t=max(0,min(1,t));t2=t*t;t3=t2*t
 pos=[(2*t3-3*t2+1)*a[i+1]+(t3-2*t2+t)*step*a[i+4]+(-2*t3+3*t2)*b[i+1]+(t3-t2)*step*b[i+4] for i in range(3)]
 vel=[(6*t2-6*t)/step*a[i+1]+(3*t2-4*t+1)*a[i+4]+(-6*t2+6*t)/step*b[i+1]+(3*t2-2*t)*b[i+4] for i in range(3)]
 return pos,vel
for body in base['bodies']:
 name=body['name'];parent=moons.get(name);center=ids[parent] if parent else '0';minutes=steps[name]
 params=dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(body['query']).query));params.update(CENTER="'500@"+center+"'",START_TIME="'2000-01-01 00:00'",STOP_TIME="'2001-01-01 00:00'")
 for refinement in range(3):
  params['STEP_SIZE']="'"+str(minutes)+" m'"
  rows,url,target=query(params);step=minutes*60
  assert len(rows)==int(366*86400/step)+1,(name,len(rows))
  assert all(abs(row[0]-(2451544.5+i*step/86400))<1e-8 and all(math.isfinite(x) for x in row) for i,row in enumerate(rows))
  # Three interior fractions in each of twelve intervals across the year.
  times=[]
  for month in range(12):
   day=(datetime.datetime(2000,month+1,15)-datetime.datetime(2000,1,1)).days
   idx=int(day*86400/step)
   times.extend(rows[idx][0]+f*step/86400 for f in [.211,.5,.789])
  validation=dict(params);[validation.pop(k,None) for k in ['START_TIME','STOP_TIME','STEP_SIZE']];validation['TLIST']="'"+' '.join(f'{t:.10f}' for t in times)+"'"
  truths,truthurl,_=query(validation);errors=[];verrors=[];checks=[]
  for truth in truths:
   pos,vel=interpolate(rows,truth[0],step);error=math.dist(pos,truth[1:4]);verror=math.dist(vel,truth[4:7]);errors.append(error);verrors.append(verror);checks.append({'day':truth[0]-2451545,'positionKm':truth[1:4],'velocityKmS':truth[4:7]})
  if max(errors)<=1:break
  print('REFINE',name,minutes,'minutes; error',max(errors),'km',flush=True);minutes//=2
 assert max(errors)<=1,(name,max(errors))
 filename=name.lower()+'.bin';content=b''.join(struct.pack('<6d',*r[1:]) for r in rows);(OUT/filename).write_bytes(content)
 meta={'name':name,'id':ids[name],'parent':parent,'file':filename,'stepSeconds':step,'count':len(rows),'query':url,'target':target,'sha256':hashlib.sha256(content).hexdigest(),'validationMaxKm':max(errors),'validationMaxKmS':max(verrors),'validationQuery':truthurl,'validationSamples':checks}
 manifest['bodies'].append(meta);(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
 print('PASS',name,len(rows),'samples;',round(max(errors),6),'km max tested error',flush=True)
manifest['validation']['maxKm']=max(b['validationMaxKm'] for b in manifest['bodies']);manifest['validation']['maxKmS']=max(b['validationMaxKmS'] for b in manifest['bodies']);manifest['validation']['checkCount']=sum(len(b['validationSamples']) for b in manifest['bodies']);manifest['complete']=True
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2));print('COMPLETE',len(manifest['bodies']),'bodies',manifest['validation'],flush=True)
