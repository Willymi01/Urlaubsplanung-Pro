(function(){
  'use strict';
  const PERMANENT_KEY='urlaubsplaner.data';
  const META_KEY='urlaubsplaner.meta';
  const LEGACY_KEYS=[
    'vacationPlannerV091','vacationPlannerV09','vacationPlannerV08','vacationPlannerV07',
    'vacationPlannerV06','vacationPlannerV05','vacationPlannerV04','vacationPlannerV03','vacationPlannerV02',
    'urlaubEmployees','urlaubVacations'
  ];
  function parse(value){try{return value?JSON.parse(value):null}catch{return null}}
  function score(data){
    if(!data||typeof data!=='object')return -1;
    const arr=k=>Array.isArray(data[k])?data[k].length:0;
    const obj=k=>data[k]&&typeof data[k]==='object'&&!Array.isArray(data[k])?Object.keys(data[k]).length:0;
    return arr('employees')*20+arr('vacations')*15+arr('users')*8+arr('moves')*5+arr('audit')+
      obj('departmentGroups')*30+obj('planGroupMaxAway')*20+obj('departmentMaxAway')*5+arr('departments')*3;
  }
  function candidates(){
    const out=[];
    const permanent=parse(localStorage.getItem(PERMANENT_KEY));
    if(permanent)out.push({key:PERMANENT_KEY,data:permanent,score:score(permanent)+100000});
    for(const key of LEGACY_KEYS){const data=parse(localStorage.getItem(key));if(data)out.push({key,data,score:score(data)});}
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!key||key===PERMANENT_KEY||!/(vacationPlanner|urlaubsplaner)/i.test(key))continue;
      const data=parse(localStorage.getItem(key));
      if(data&&!out.some(x=>x.key===key))out.push({key,data,score:score(data)});
    }
    return out.sort((a,b)=>b.score-a.score);
  }
  function load(){
    const list=candidates();
    const chosen=list[0]||null;
    if(chosen&&chosen.key!==PERMANENT_KEY){
      localStorage.setItem(PERMANENT_KEY,JSON.stringify(chosen.data));
      localStorage.setItem(META_KEY,JSON.stringify({migratedAt:new Date().toISOString(),migratedFrom:chosen.key}));
    }
    return chosen?.data||null;
  }
  function save(data){
    const payload={...data,schemaVersion:2,lastSavedAt:new Date().toISOString()};
    localStorage.setItem(PERMANENT_KEY,JSON.stringify(payload));
    localStorage.setItem(META_KEY,JSON.stringify({lastSavedAt:payload.lastSavedAt,key:PERMANENT_KEY}));
    return payload;
  }
  function meta(){return parse(localStorage.getItem(META_KEY))||{};}
  function removeLegacy(){for(const key of LEGACY_KEYS)localStorage.removeItem(key);}
  function exportPayload(data){return {format:'Urlaubsplaner-Backup',schemaVersion:2,exportedAt:new Date().toISOString(),data};}
  function importPayload(raw){
    const parsed=typeof raw==='string'?parse(raw):raw;
    if(!parsed)throw new Error('Ungültige Sicherungsdatei.');
    const data=parsed.format==='Urlaubsplaner-Backup'?parsed.data:parsed;
    if(!data||typeof data!=='object')throw new Error('Keine gültigen Urlaubsplaner-Daten gefunden.');
    save(data);return data;
  }
  window.UrlaubsplanerStorage={PERMANENT_KEY,load,save,meta,removeLegacy,exportPayload,importPayload,candidates};
})();
