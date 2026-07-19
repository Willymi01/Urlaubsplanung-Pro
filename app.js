const $=id=>document.getElementById(id),clone=o=>JSON.parse(JSON.stringify(o));
const STORE=window.UrlaubsplanerStorage?.PERMANENT_KEY||'urlaubsplaner.data',OLD_STORES=['vacationPlannerV091','vacationPlannerV09','vacationPlannerV08','vacationPlannerV07','vacationPlannerV06','vacationPlannerV05','vacationPlannerV04','vacationPlannerV03','vacationPlannerV02'];
let currentUser=null;
function normalize(raw){const b=clone(window.DEFAULT_DATA),d=raw&&typeof raw==='object'?raw:{};const departments=Array.isArray(d.departments)&&d.departments.length?d.departments:b.departments;const settings={...(b.departmentSettings||{}),...(d.departmentSettings||{})};departments.forEach(x=>{if(settings[x]==null)settings[x]=2});return{users:Array.isArray(d.users)?d.users:b.users,departments,departmentSettings:settings,employees:(Array.isArray(d.employees)?d.employees:b.employees).map(e=>({...e,carryover:Number(e.carryover||0)})),vacations:(Array.isArray(d.vacations)?d.vacations:b.vacations).map(v=>({...v,status:v.status||'Genehmigt',scope:v.scope||'full'})),moves:Array.isArray(d.moves)?d.moves:b.moves}}
function loadState(){try{const raw=window.UrlaubsplanerStorage?.load();return raw?normalize(raw):normalize(window.DEFAULT_DATA)}catch{return normalize(window.DEFAULT_DATA)}}
let state=loadState();
function saveState(){state=window.UrlaubsplanerStorage?.save(state)||state}
function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
function localDate(s){const [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d)}
function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function fmt(s){return localDate(s).toLocaleDateString('de-DE')}
function period(a,b){return `${fmt(a)}–${fmt(b)}`}
function emp(id){return state.employees.find(e=>e.id===Number(id))}
function vacsFor(id){return state.vacations.filter(v=>v.employeeId===Number(id))}
function inRange(d,a,b){return d>=localDate(a)&&d<=localDate(b)}
function easterSunday(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;return new Date(y,mo-1,day)}
function holidayName(date){const md=`${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,fixed={'01-01':'Neujahr','03-08':'Internationaler Frauentag','05-01':'Tag der Arbeit','10-03':'Tag der Deutschen Einheit','12-25':'1. Weihnachtstag','12-26':'2. Weihnachtstag'};if(fixed[md])return fixed[md];const e=easterSunday(date.getFullYear()),diff=Math.round((date-e)/86400000);return({[-2]:'Karfreitag',[1]:'Ostermontag',[39]:'Christi Himmelfahrt',[50]:'Pfingstmontag'})[diff]||''}
function workingDays(a,b){let n=0,d=localDate(a),end=localDate(b);for(;d<=end;d.setDate(d.getDate()+1))if(d.getDay()!==0&&!holidayName(d))n++;return n}
function vacationDays(v){const days=workingDays(v.from,v.to);return v.scope==='full'?days:Math.min(.5,days*.5)}
function countsAgainstVacation(v){return v.type==='Urlaub'}
function moveForVacation(v){
 if(!v)return null;
 if(v.moveInfo)return v.moveInfo;
 const compact=x=>String(x||'').replace(/\s/g,'').replace(/[–—]/g,'-');
 const current=compact(period(v.from,v.to)),fromDE=localDate(v.from).toLocaleDateString('de-DE'),toDE=localDate(v.to).toLocaleDateString('de-DE');
 return [...(state.moves||[])].reverse().find(m=>Number(m.vacationId)===Number(v.id)||(Number(m.employeeId)===Number(v.employeeId)&&(compact(m.newPeriod)===current||compact(m.newPeriod).includes(compact(fromDE))&&compact(m.newPeriod).includes(compact(toDE)))))||(v.moved?{oldPeriod:'Früherer Zeitraum',newPeriod:period(v.from,v.to),reason:v.note||'Verschoben'}:null)
}
function absenceCode(v){return ({Urlaub:'U',Sonderurlaub:'S',Fortbildung:'F',Unbezahlt:'N',Krankheit:'K','Geplanter Freier Tag':'G'}[v.type]||'A')+(v.scope!=='full'?'½':'')+(moveForVacation(v)?'↔':'')}
function vacationTitle(v,date,extra=''){const m=v?moveForVacation(v):null;return [extra,v?.type,v?.status,m?`Verschoben von ${m.oldPeriod} auf ${m.newPeriod}`:'',m?.reason?`Grund: ${m.reason}`:'',v?.note,holidayName(date)].filter(Boolean).join(' · ')}
function statusBadge(s){const c=s==='Genehmigt'?'approved':s==='Beantragt'?'pending':'planned';return `<span class="badge ${c}">${esc(s)}</span>`}
function init(){fillLogin();setDefaults();bind();renderAll()}
function fillLogin(){$('loginName').innerHTML=state.users.map(u=>`<option>${esc(u.name)}</option>`).join('')}
function setDefaults(){const d=new Date(),month=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;$('monthFilter').value=month;$('leaderMonthFilter').value=month;$('yearFilter').value=d.getFullYear();$('weekDate').value=iso(d);$('vacationFrom').value=$('vacationTo').value=iso(d)}
function bind(){
 $('loginButton').onclick=login;$('loginPin').addEventListener('keydown',e=>{if(e.key==='Enter')login()});$('logoutButton').onclick=()=>{$('application').classList.add('hidden');$('loginPage').classList.remove('hidden');$('loginPin').value='';currentUser=null};
 $('navigation').onclick=e=>{const p=e.target.dataset.page;if(!p)return;document.querySelectorAll('#navigation button').forEach(b=>b.classList.toggle('active',b===e.target));document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));$('page-'+p).classList.remove('hidden');renderAll()};
 $('departmentFilter').onchange=()=>renderCalendar();$('yearDepartmentFilter').onchange=renderYear;$('yearFilter').onchange=renderYear;$('yearStatusFilter').onchange=renderYear;$('printYearPlan').onclick=()=>window.print();$('exportYearCsv').onclick=exportYearCsv;$('monthFilter').onchange=()=>{if($('leaderMonthFilter'))$('leaderMonthFilter').value=$('monthFilter').value;renderCalendar();};$('previousMonth').onclick=()=>changeCalendarMonth(-1);$('nextMonth').onclick=()=>changeCalendarMonth(1);$('leaderMonthFilter').onchange=renderLeaders;$('weekDate').onchange=renderWeek;$('showVacationForm').onclick=openNewVacation;$('cancelVacation').onclick=closeVacationForm;$('saveVacation').onclick=saveVacation;
 $('addEmployee').onclick=saveEmployee;$('cancelEmployeeEdit').onclick=clearEmployeeForm;$('addMove').onclick=addMove;$('addDepartment').onclick=addDepartment;
 $('resetData').onclick=resetData;$('backupExport').onclick=exportBackup;$('backupImport').onchange=importBackup;$('exportCsv').onclick=exportCsv;$('exportExcel').onclick=exportMonthExcel;
}
function login(){const u=state.users.find(x=>x.name===$('loginName').value&&x.pin===$('loginPin').value);if(!u){$('loginError').textContent='Name oder PIN ist nicht korrekt.';return}currentUser=u;$('loginError').textContent='';$('loggedInUser').textContent=`${u.name} · ${u.role==='admin'?'Admin':'Leitung'}`;$('loginPage').classList.add('hidden');$('application').classList.remove('hidden');renderAll()}
function renderAll(){fillSelects();renderDashboard();renderEmployees();renderCalendar();renderYear();renderWeek();renderLeaders();renderHistory();renderDepartments()}
function fillSelects(){const deps=state.departments.map(d=>`<option>${esc(d)}</option>`).join(''),cur=$('departmentFilter').value;$('departmentFilter').innerHTML='<option value="__leaders__">Leiterplan (alle Abteilungen)</option>'+deps;if(cur==='__leaders__'||state.departments.includes(cur))$('departmentFilter').value=cur;const ycur=$('yearDepartmentFilter').value;$('yearDepartmentFilter').innerHTML=deps;if(state.departments.includes(ycur))$('yearDepartmentFilter').value=ycur;$('employeeDepartment').innerHTML=deps;const opts=state.employees.map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('');$('moveEmployee').innerHTML=opts;$('employeeSubstitute').innerHTML='<option value="">Keine</option>'+state.employees.map(e=>`<option>${esc(e.name)}</option>`).join('')}
function allDates(vacs){const out=[];for(const v of vacs)for(let d=localDate(v.from),e=localDate(v.to);d<=e;d.setDate(d.getDate()+1))out.push(new Date(d));return out}
function maxOverlap(vacs){let max=0;for(const d of allDates(vacs))max=Math.max(max,vacs.filter(v=>inRange(d,v.from,v.to)&&v.status!=='Geplant').length);return max}
function maxOverlapForDepartment(dep){const ids=state.employees.filter(e=>e.department===dep).map(e=>e.id);return maxOverlap(state.vacations.filter(v=>ids.includes(v.employeeId)))}
function leaderOverlapCount(){const ids=state.employees.filter(e=>e.leader).map(e=>e.id);return maxOverlap(state.vacations.filter(v=>ids.includes(v.employeeId)))}
function bridgeWarnings(v){const result=[];for(let d=localDate(v.from),end=localDate(v.to);d<=end;d.setDate(d.getDate()+1)){const prev=new Date(d);prev.setDate(prev.getDate()-1);const next=new Date(d);next.setDate(next.getDate()+1);if(d.getDay()===1&&holidayName(prev))result.push(`Brückentag nach ${holidayName(prev)}`);if(d.getDay()===5&&holidayName(next))result.push(`Brückentag vor ${holidayName(next)}`)}return [...new Set(result)]}
function changeCalendarMonth(offset){const value=$('monthFilter').value||`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`,p=value.split('-').map(Number),d=new Date(p[0],p[1]-1+offset,1);$('monthFilter').value=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;if($('leaderMonthFilter'))$('leaderMonthFilter').value=$('monthFilter').value;renderCalendar()}
function isoWeek(date){const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1));return Math.ceil((((d-yearStart)/86400000)+1)/7)}
function weekLabel(from,to){const a=isoWeek(localDate(from)),b=isoWeek(localDate(to));return a===b?`KW ${a}`:`KW ${a}–${b}`}

function vacationDaysInYear(v,year){
 if(!countsAgainstVacation(v))return 0;
 const yearStart=new Date(year,0,1),yearEnd=new Date(year,11,31);
 const start=localDate(v.from),end=localDate(v.to);
 if(end<yearStart||start>yearEnd)return 0;
 const clippedStart=start<yearStart?yearStart:start;
 const clippedEnd=end>yearEnd?yearEnd:end;
 const days=workingDays(iso(clippedStart),iso(clippedEnd));
 return v.scope==='full'?days:days*.5;
}

function renderDepartmentVacationSummary(){
 const table=$('departmentVacationSummary');
 if(!table)return;
 const year=new Date().getFullYear();
 if($('departmentVacationYear'))$('departmentVacationYear').textContent=String(year);

 const rows=state.departments.map(department=>{
  const employees=state.employees.filter(e=>e.department===department&&e.active!==false);
  const ids=new Set(employees.map(e=>Number(e.id)));
  const entitlement=employees.reduce((sum,e)=>sum+Number(e.vacationDays||0)+Number(e.carryover||0),0);
  const departmentVacations=state.vacations.filter(v=>ids.has(Number(v.employeeId))&&v.type==='Urlaub');
  const approved=departmentVacations.filter(v=>v.status==='Genehmigt').reduce((sum,v)=>sum+vacationDaysInYear(v,year),0);
  const pending=departmentVacations.filter(v=>v.status==='Beantragt').reduce((sum,v)=>sum+vacationDaysInYear(v,year),0);
  const planned=departmentVacations.filter(v=>v.status==='Geplant').reduce((sum,v)=>sum+vacationDaysInYear(v,year),0);
  const rejected=departmentVacations.filter(v=>v.status==='Abgelehnt').reduce((sum,v)=>sum+vacationDaysInYear(v,year),0);
  const unplanned=Math.max(0,entitlement-approved-pending-planned);
  return{department,employees:employees.length,entitlement,unplanned,pending,approved,rejected,planned};
 });

 const total=rows.reduce((a,r)=>({
  employees:a.employees+r.employees,
  entitlement:a.entitlement+r.entitlement,
  unplanned:a.unplanned+r.unplanned,
  pending:a.pending+r.pending,
  approved:a.approved+r.approved,
  rejected:a.rejected+r.rejected,
  planned:a.planned+r.planned
 }),{employees:0,entitlement:0,unplanned:0,pending:0,approved:0,rejected:0,planned:0});

 const n=value=>Number(value||0).toLocaleString('de-DE',{maximumFractionDigits:1});
 table.innerHTML=`<thead><tr>
  <th>Abteilung</th><th>Mitarbeiter</th><th>Gesamtanspruch</th>
  <th>Noch nicht verplant</th><th>Noch nicht bestätigt</th>
  <th>Genehmigt</th><th>Abgelehnt</th><th>Geplant</th>
 </tr></thead><tbody>
 ${rows.map(r=>`<tr>
  <td><strong>${esc(r.department)}</strong></td>
  <td>${r.employees}</td>
  <td>${n(r.entitlement)}</td>
  <td class="summary-unplanned">${n(r.unplanned)}</td>
  <td class="summary-pending">${n(r.pending)}</td>
  <td class="summary-approved">${n(r.approved)}</td>
  <td class="summary-rejected">${n(r.rejected)}</td>
  <td class="summary-planned">${n(r.planned)}</td>
 </tr>`).join('')}
 <tr class="summary-total">
  <td><strong>Gesamt</strong></td><td>${total.employees}</td><td>${n(total.entitlement)}</td>
  <td>${n(total.unplanned)}</td><td>${n(total.pending)}</td><td>${n(total.approved)}</td>
  <td>${n(total.rejected)}</td><td>${n(total.planned)}</td>
 </tr></tbody>`;
}

function renderDashboard(){
 const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),limit=new Date(today);
 limit.setDate(limit.getDate()+28);
 $('departmentCount').textContent=state.departments.length;
 $('employeeCount').textContent=state.employees.length;
 $('leaderCount').textContent=state.employees.filter(e=>e.leader).length;
 $('plannedDays').textContent=state.vacations.filter(v=>v.status==='Genehmigt'&&countsAgainstVacation(v)).reduce((s,v)=>s+vacationDays(v),0);
 const dateText=today.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
 $('todayLabel').textContent=dateText;
 if($('dashboardDate'))$('dashboardDate').textContent=dateText;
 if($('dashboardWeekday'))$('dashboardWeekday').textContent=today.toLocaleDateString('de-DE',{weekday:'long'});

 const w=[];
 const pending=state.vacations.filter(v=>v.status==='Beantragt').length;
 if(pending){
  w.push(`<div class="warning"><strong>Freigaben:</strong> ${pending} Urlaubsantrag${pending===1?'':'träge'} wartet${pending===1?'':'en'} auf Entscheidung.</div>`);
 }

 state.departments.forEach(dep=>{
  const peak=maxOverlapForDepartment(dep);
  const allowed=Number(state.departmentMaxAway?.[dep]??1);
  if(peak>allowed){
   w.push(`<div class="warning warning-danger"><strong>${esc(dep)} – Grenze überschritten:</strong> Bis zu ${peak} Personen gleichzeitig abwesend. Zulässig sind ${allowed}; die Warnung beginnt bei ${allowed+1}.</div>`);
  }
 });

 const leaderPeak=leaderOverlapCount();
 const leaderAllowed=Number(state.leaderSettings?.maxAway??1);
 if(leaderPeak>leaderAllowed){
  w.push(`<div class="warning warning-danger"><strong>Leiterplan – Grenze überschritten:</strong> Bis zu ${leaderPeak} Leitungen gleichzeitig abwesend. Zulässig sind ${leaderAllowed}; die Warnung beginnt bei ${leaderAllowed+1}.</div>`);
 }

 $('warnings').innerHTML=w.join('')||'<div class="capacity-ok"><strong>Alles in Ordnung:</strong> Keine eingestellte Abwesenheitsgrenze ist überschritten.</div>';

 const rows=state.vacations
  .filter(v=>v.type==='Urlaub'&&v.status!=='Geplant'&&localDate(v.to)>=today&&localDate(v.from)<=limit)
  .sort((a,b)=>localDate(a.from)-localDate(b.from));
 $('upcomingTable').innerHTML='<thead><tr><th>Name</th><th>KW</th><th>Abteilung</th><th>Zeitraum</th><th>Status</th></tr></thead><tbody>'+
  rows.map(v=>{
   const e=emp(v.employeeId),shownFrom=localDate(v.from)<today?iso(today):v.from,shownTo=localDate(v.to)>limit?iso(limit):v.to;
   return `<tr><td><strong>${esc(e?.name)}</strong></td><td>${weekLabel(shownFrom,shownTo)}</td><td>${esc(e?.department)}</td><td>${period(v.from,v.to)}</td><td>${statusBadge(v.status)}</td></tr>`;
  }).join('')+
  (rows.length?'':'<tr><td colspan="5" class="muted">In den nächsten vier Wochen ist kein Urlaub eingetragen.</td></tr>')+
  '</tbody>';
 renderDepartmentVacationSummary();
}
function renderEmployees(){$('employeeListCount').textContent=`${state.employees.length} Mitarbeiter`;$('employeeTable').innerHTML='<thead><tr><th>Name</th><th>Abteilung</th><th>Stunden</th><th>Anspruch</th><th>Übertrag</th><th>Genehmigt</th><th>Rest</th><th>Leiter</th><th>Vertretung</th><th>Aktion</th></tr></thead><tbody>'+state.employees.map(e=>{const planned=vacsFor(e.id).filter(v=>v.status==='Genehmigt'&&countsAgainstVacation(v)).reduce((s,v)=>s+vacationDays(v),0),total=Number(e.vacationDays||0)+Number(e.carryover||0),rest=total-planned;return `<tr><td>${esc(e.name)}</td><td>${esc(e.department)}</td><td>${e.hours}</td><td>${e.vacationDays}</td><td>${e.carryover||0}</td><td>${planned}</td><td class="${rest<0?'negative':'positive'}">${rest}</td><td>${e.leader?'Ja':'Nein'}</td><td>${esc(e.substitute||'–')}</td><td><button class="button tiny" onclick="editEmployee(${e.id})">Bearbeiten</button> <button class="button tiny danger" onclick="deleteEmployee(${e.id})">Löschen</button></td></tr>`}).join('')+'</tbody>'}
function saveEmployee(){const name=$('employeeName').value.trim();if(!name)return alert('Bitte einen Namen eingeben.');const id=Number($('editingEmployeeId').value),obj={name,department:$('employeeDepartment').value,hours:Number($('employeeHours').value),vacationDays:Number($('employeeVacationDays').value),carryover:Number($('employeeCarryover').value||0),leader:$('employeeLeader').checked,substitute:$('employeeSubstitute').value};if(id){const e=emp(id);Object.assign(e,obj)}else state.employees.push({id:Date.now(),...obj});saveState();clearEmployeeForm();renderAll()}
window.editEmployee=id=>{const e=emp(id);if(!e)return;$('editingEmployeeId').value=id;$('employeeName').value=e.name;$('employeeDepartment').value=e.department;$('employeeHours').value=e.hours;$('employeeVacationDays').value=e.vacationDays;$('employeeCarryover').value=e.carryover||0;$('employeeLeader').checked=e.leader;$('employeeSubstitute').value=e.substitute||'';$('addEmployee').textContent='Änderungen speichern';$('cancelEmployeeEdit').classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'})}
function clearEmployeeForm(){$('editingEmployeeId').value='';$('employeeName').value='';$('employeeHours').value=37;$('employeeVacationDays').value=36;$('employeeCarryover').value=0;$('employeeLeader').checked=false;$('employeeSubstitute').value='';$('addEmployee').textContent='Mitarbeiter hinzufügen';$('cancelEmployeeEdit').classList.add('hidden')}
window.deleteEmployee=id=>{if(!confirm('Mitarbeiter und zugehörige Urlaube wirklich löschen?'))return;state.employees=state.employees.filter(e=>e.id!==id);state.vacations=state.vacations.filter(v=>v.employeeId!==id);state.moves=state.moves.filter(m=>m.employeeId!==id);saveState();renderAll()}
function countDepartmentAbsence(dep,date){const ids=state.employees.filter(e=>e.department===dep).map(e=>e.id);return state.vacations.filter(v=>ids.includes(v.employeeId)&&v.status!=='Geplant'&&inRange(date,v.from,v.to)).length}
function renderCalendar(){const dep=$('departmentFilter').value||state.departments[0],leaderMode=dep==='__leaders__',parts=$('monthFilter').value.split('-').map(Number),year=parts[0],month=parts[1],emps=leaderMode?state.employees.filter(e=>e.leader):state.employees.filter(e=>e.department===dep),days=new Date(year,month,0).getDate();$('vacationEmployee').innerHTML=emps.map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('');let h='<thead><tr><th class="employee-name">Mitarbeiter</th>';for(let d=1;d<=days;d++)h+=`<th>${d}</th>`;h+='</tr></thead><tbody>';for(const e of emps){h+=`<tr><td class="employee-name"><strong>${esc(e.name)}</strong>${leaderMode?`<br><small>${esc(e.department)} · Vertretung: ${esc(e.substitute||'Keine')}</small>`:e.leader?' <span class="badge leader-badge">Leiter</span>':''}</td>`;for(let d=1;d<=days;d++){const date=new Date(year,month-1,d),v=vacsFor(e.id).find(x=>inRange(date,x.from,x.to)&&isDisplayAbsenceDay(x,date)),overlap=leaderMode?emps.filter(l=>vacsFor(l.id).some(x=>x.status!=='Geplant'&&inRange(date,x.from,x.to))).length:countDepartmentAbsence(dep,date);let cls=[0,6].includes(date.getDay())?'weekend':'';if(holidayName(date))cls='holiday';if(v)cls=moveForVacation(v)?'moved-cell':v.status==='Beantragt'?'pending-cell':v.status==='Geplant'?'planned-cell':overlap>=3?'critical':'vacation';const code=v?absenceCode(v):'';h+=`<td class="${cls}" title="${esc(vacationTitle(v,date,leaderMode?e.department:''))}">${code}</td>`}h+='</tr>'}$('calendarTable').innerHTML=h+'</tbody>';if(leaderMode){let max=0;for(let d=1;d<=days;d++){const date=new Date(year,month-1,d);max=Math.max(max,emps.filter(l=>vacsFor(l.id).some(x=>x.status!=='Geplant'&&inRange(date,x.from,x.to))).length)}$('calendarWarning').innerHTML=max>=2?`<div class="warning warning-danger"><strong>Leiterüberschneidung:</strong> Bis zu ${max} Leitungen sind gleichzeitig abwesend.</div>`:'<div class="notice"><strong>Leiterbesetzung:</strong> Keine kritischen Überschneidungen im gewählten Monat.</div>';renderVacationList('__leaders__')}else{const m=maxOverlapForDepartment(dep),min=Number(state.departmentSettings?.[dep]??2),total=emps.length,available=total-m,critical=available<min;$('calendarWarning').innerHTML=critical?`<div class="warning warning-danger"><strong>Mindestbesetzung unterschritten:</strong> Bei maximal ${m} Abwesenden bleiben nur ${available} von ${total} Mitarbeitenden verfügbar. Eingestellt sind mindestens ${min}.</div>`:m>=2?`<div class="warning"><strong>Besetzungshinweis:</strong> Bis zu ${m} Mitarbeiter gleichzeitig abwesend; Mindestbesetzung ${min} bleibt erfüllt.</div>`:'';renderVacationList(dep)}}
function renderVacationList(dep){const ids=(dep==='__leaders__'?state.employees.filter(e=>e.leader):state.employees.filter(e=>e.department===dep)).map(e=>e.id),rows=state.vacations.filter(v=>ids.includes(v.employeeId)).sort((a,b)=>localDate(a.from)-localDate(b.from));$('vacationList').innerHTML='<thead><tr><th>Mitarbeiter</th><th>Zeitraum</th><th>Tage</th><th>Umfang</th><th>Art</th><th>Status</th><th>Hinweis</th><th>Aktion</th></tr></thead><tbody>'+rows.map(v=>{const m=moveForVacation(v),bw=bridgeWarnings(v).join(', '),hint=m?`↔ Verschoben von ${m.oldPeriod}; ${m.reason||'ohne Grundangabe'}`:(bw||v.note||'–');return `<tr data-vacation-id="${v.id}"><td>${esc(emp(v.employeeId)?.name)}</td><td>${period(v.from,v.to)}</td><td>${vacationDays(v)}</td><td>${v.scope==='full'?'Ganzer Tag':'Halber Tag'}</td><td>${esc(v.type)}</td><td>${statusBadge(v.status)}</td><td>${esc(hint)}</td><td><button class="button tiny" onclick="editVacation(${v.id})">Verschieben/Bearbeiten</button> ${v.status==='Beantragt'?`<button class="button tiny primary" onclick="approveVacation(${v.id})">Genehmigen</button>`:''} <button class="button tiny danger" onclick="deleteVacation(${v.id})">Löschen</button></td></tr>`}).join('')+'</tbody>'}
function openNewVacation(){$('editingVacationId').value='';$('vacationFormTitle').textContent='Neuen Urlaub eintragen';$('vacationType').value='Urlaub';$('vacationScope').value='full';$('vacationStatus').value='Beantragt';$('vacationNote').value='';$('vacationForm').classList.remove('hidden')}
function closeVacationForm(){$('vacationForm').classList.add('hidden');$('editingVacationId').value=''}
function saveVacation(){const id=Number($('editingVacationId').value),employeeId=Number($('vacationEmployee').value),from=$('vacationFrom').value,to=$('vacationTo').value,type=$('vacationType').value,scope=$('vacationScope').value,status=$('vacationStatus').value,note=$('vacationNote').value.trim();if(!employeeId||!from||!to)return alert('Bitte Mitarbeiter und Zeitraum auswählen.');if(localDate(to)<localDate(from))return alert('Das Enddatum liegt vor dem Startdatum.');const e=emp(employeeId),conflicts=state.vacations.filter(v=>v.id!==id&&emp(v.employeeId)?.department===e.department&&v.status!=='Geplant'&&!(localDate(v.to)<localDate(from)||localDate(v.from)>localDate(to)));if(conflicts.length>=2&&!confirm(`Warnung: In ${e.department} gibt es bereits ${conflicts.length} überschneidende Einträge. Trotzdem speichern?`))return;if(id){const v=state.vacations.find(x=>x.id===id);const old=period(v.from,v.to),changed=v.from!==from||v.to!==to;Object.assign(v,{employeeId,from,to,type,scope,status,note});if(changed){const reason=prompt('Grund für die Verschiebung:','Personelle Abstimmung')||'Nicht angegeben';const initiator=confirm('Wurde die Verschiebung vom Betrieb veranlasst?\nOK = Betrieb, Abbrechen = Mitarbeiter')?'Betrieb':'Mitarbeiter';const move={id:Date.now(),vacationId:v.id,employeeId,oldPeriod:old,newPeriod:period(from,to),reason,initiator};state.moves.push(move);v.moved=true;v.moveInfo=move}}else state.vacations.push({id:Date.now(),employeeId,from,to,type,scope,status,note});saveState();closeVacationForm();renderAll()}
window.editVacation=id=>{const v=state.vacations.find(x=>x.id===id);if(!v)return;$('departmentFilter').value=emp(v.employeeId)?.department||state.departments[0];renderCalendar();$('editingVacationId').value=id;$('vacationEmployee').value=v.employeeId;$('vacationFrom').value=v.from;$('vacationTo').value=v.to;$('vacationType').value=v.type;$('vacationScope').value=v.scope||'full';$('vacationStatus').value=v.status;$('vacationNote').value=v.note||'';$('vacationFormTitle').textContent='Urlaub bearbeiten oder verschieben';$('vacationForm').classList.remove('hidden');$('vacationForm').scrollIntoView({behavior:'smooth'})}
window.approveVacation=id=>{const v=state.vacations.find(x=>x.id===id);if(v){v.status='Genehmigt';saveState();renderAll()}}
window.deleteVacation=id=>{if(!confirm('Urlaubseintrag löschen?'))return;state.vacations=state.vacations.filter(v=>v.id!==id);saveState();renderAll()}

function renderYear(){
 const dep=$('yearDepartmentFilter').value||state.departments[0],year=Number($('yearFilter').value)||new Date().getFullYear(),status=$('yearStatusFilter').value;
 const list=state.employees.filter(e=>e.department===dep),months=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
 const valid=v=>{if(status!=='all'&&v.status!==status)return false;return localDate(v.from).getFullYear()<=year&&localDate(v.to).getFullYear()>=year};
 const monthDays=(employeeId,m)=>vacsFor(employeeId).filter(valid).reduce((sum,v)=>{let start=localDate(v.from),end=localDate(v.to),a=new Date(year,m,1),b=new Date(year,m+1,0);if(end<a||start>b)return sum;const from=iso(start<a?a:start),to=iso(end>b?b:end);return sum+(countsAgainstVacation(v)?workingDays(from,to)*(v.scope==='full'?1:.5):0)},0);
 let totalDays=0,peopleWithAbsence=0;
 let h='<thead><tr><th>Mitarbeiter</th>'+months.map(x=>`<th>${x}</th>`).join('')+'<th>Anspruch</th><th>Übertrag</th><th>Geplant</th><th>Rest</th></tr></thead><tbody>';
 for(const e of list){let yearly=0,has=false;const cells=months.map((_,m)=>{const days=monthDays(e.id,m);yearly+=days;const types=[...new Set(vacsFor(e.id).filter(valid).filter(v=>{const a=new Date(year,m,1),b=new Date(year,m+1,0);return localDate(v.to)>=a&&localDate(v.from)<=b}).filter(v=>!countsAgainstVacation(v)).map(v=>({Sonderurlaub:'S',Fortbildung:'F',Krankheit:'K',Unbezahlt:'N','Geplanter Freier Tag':'G'}[v.type]||'A')))];if(days||types.length)has=true;return `<td class="${days?'year-active':''}">${days?days.toLocaleString('de-DE'):''}${types.length?` <small>${types.join('/')}</small>`:''}</td>`}).join('');
 const entitlement=Number(e.vacationDays||0)+Number(e.carryover||0),rest=entitlement-yearly;totalDays+=yearly;if(has)peopleWithAbsence++;
 h+=`<tr><td><strong>${esc(e.name)}</strong>${e.leader?' <span class="badge leader-badge">Leiter</span>':''}</td>${cells}<td>${e.vacationDays||0}</td><td>${e.carryover||0}</td><td>${yearly.toLocaleString('de-DE')}</td><td class="${rest<0?'negative':'positive'}">${rest.toLocaleString('de-DE')}</td></tr>`;
 }
 $('yearTable').innerHTML=h+'</tbody>';
 const allDepVacs=state.vacations.filter(v=>list.some(e=>e.id===v.employeeId)&&valid(v));
 $('yearSummary').innerHTML=`<article class="metric"><span>Mitarbeiter</span><strong>${list.length}</strong></article><article class="metric"><span>Mit Abwesenheit</span><strong>${peopleWithAbsence}</strong></article><article class="metric"><span>Urlaubstage ${year}</span><strong>${totalDays.toLocaleString('de-DE')}</strong></article><article class="metric"><span>Einträge</span><strong>${allDepVacs.length}</strong></article>`;
 $('yearMonthCards').innerHTML=months.map((name,m)=>{const entries=allDepVacs.filter(v=>localDate(v.to)>=new Date(year,m,1)&&localDate(v.from)<=new Date(year,m+1,0)),ids=new Set(entries.map(v=>v.employeeId)),days=list.reduce((sum,e)=>sum+monthDays(e.id,m),0);return `<article class="month-card"><strong>${name}</strong><span>${days.toLocaleString('de-DE')} Urlaubstage</span><small>${ids.size} Mitarbeiter · ${entries.length} Einträge</small></article>`}).join('');
}
function exportYearCsv(){
 const dep=$('yearDepartmentFilter').value||state.departments[0],year=Number($('yearFilter').value)||new Date().getFullYear(),status=$('yearStatusFilter').value,months=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
 const rows=[['Mitarbeiter','Abteilung',...months,'Jahresanspruch','Übertrag','Urlaub gesamt','Rest']];
 for(const e of state.employees.filter(x=>x.department===dep)){let total=0;const vals=months.map((_,m)=>{let n=0;for(const v of vacsFor(e.id)){if(status!=='all'&&v.status!==status||!countsAgainstVacation(v))continue;let a=new Date(year,m,1),b=new Date(year,m+1,0),start=localDate(v.from),end=localDate(v.to);if(end<a||start>b)continue;n+=workingDays(iso(start<a?a:start),iso(end>b?b:end))*(v.scope==='full'?1:.5)}total+=n;return n});const ent=Number(e.vacationDays||0)+Number(e.carryover||0);rows.push([e.name,dep,...vals,e.vacationDays||0,e.carryover||0,total,ent-total])}
 const csv='\ufeff'+rows.map(r=>r.map(x=>`"${String(x??'').replaceAll('"','""')}"`).join(';')).join('\r\n');download(`Jahresplan-${dep}-${year}.csv`,csv,'text/csv;charset=utf-8')
}

function renderWeek(){const selected=localDate($('weekDate').value),day=(selected.getDay()+6)%7,monday=new Date(selected);monday.setDate(selected.getDate()-day);const dates=Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(monday.getDate()+i);return d});$('weekSummary').innerHTML=`<div class="notice">Woche ${dates[0].toLocaleDateString('de-DE')} bis ${dates[6].toLocaleDateString('de-DE')}</div>`;let h='<thead><tr><th>Abteilung</th>'+dates.map(d=>`<th>${d.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'})}</th>`).join('')+'</tr></thead><tbody>';for(const dep of state.departments){h+=`<tr><td>${esc(dep)}</td>`;for(const d of dates){const names=state.vacations.filter(v=>v.status!=='Geplant'&&inRange(d,v.from,v.to)&&emp(v.employeeId)?.department===dep).map(v=>emp(v.employeeId)?.name);h+=`<td class="${names.length>=3?'critical':names.length?'vacation':''}">${names.map(esc).join('<br>')||'–'}</td>`}h+='</tr>'}$('weekTable').innerHTML=h+'</tbody>'}
function renderLeaders(){
 const leaders=state.employees.filter(e=>e.leader),parts=($('leaderMonthFilter').value||$('monthFilter').value).split('-').map(Number),year=parts[0],month=parts[1],days=new Date(year,month,0).getDate();
 let h='<thead><tr><th class="employee-name">Leitung / Abteilung</th>';
 for(let d=1;d<=days;d++)h+=`<th>${d}</th>`;
 h+='</tr></thead><tbody>';
 for(const e of leaders){h+=`<tr><td class="employee-name"><strong>${esc(e.name)}</strong><br><small>${esc(e.department)} · Vertretung: ${esc(e.substitute||'Keine')}</small></td>`;for(let d=1;d<=days;d++){const date=new Date(year,month-1,d),v=vacsFor(e.id).find(x=>inRange(date,x.from,x.to)&&isDisplayAbsenceDay(x,date)),absent=leaders.filter(l=>vacsFor(l.id).some(x=>x.status!=='Geplant'&&inRange(date,x.from,x.to))).length;let cls=[0,6].includes(date.getDay())?'weekend':'';if(holidayName(date))cls='holiday';if(v)cls=moveForVacation(v)?'moved-cell':v.status==='Beantragt'?'pending-cell':v.status==='Geplant'?'planned-cell':absent>=2?'critical':'vacation';const code=v?absenceCode(v):'';h+=`<td class="${cls}" title="${esc(vacationTitle(v,date,e.department))}">${code}</td>`}h+='</tr>'}
 $('leaderCalendar').innerHTML=h+'</tbody>';
 let overlapDays=[];for(let d=1;d<=days;d++){const date=new Date(year,month-1,d),names=leaders.filter(l=>vacsFor(l.id).some(v=>v.status!=='Geplant'&&inRange(date,v.from,v.to))).map(l=>l.name);if(names.length>=2)overlapDays.push({date,names})}
 $('leaderMonthSummary').innerHTML=overlapDays.length?`<div class="warning warning-danger"><strong>Leiterüberschneidungen:</strong> ${overlapDays.length} Tag${overlapDays.length===1?'':'e'} im gewählten Monat mit mindestens zwei abwesenden Leitungen.</div>`:'<div class="notice"><strong>Leiterbesetzung:</strong> Im gewählten Monat gibt es keine kritischen Überschneidungen.</div>';
 const now=new Date();$('leaderTable').innerHTML='<thead><tr><th>Name</th><th>Abteilung</th><th>Vertretung</th><th>Nächste Abwesenheit</th><th>Status</th></tr></thead><tbody>'+leaders.map(e=>{const v=vacsFor(e.id).filter(x=>localDate(x.to)>=now).sort((a,b)=>localDate(a.from)-localDate(b.from))[0];return `<tr><td>${esc(e.name)}</td><td>${esc(e.department)}</td><td>${esc(e.substitute||'Keine')}</td><td>${v?period(v.from,v.to):'–'}</td><td>${v?statusBadge(v.status):'<span class="badge">Anwesend</span>'}</td></tr>`}).join('')+'</tbody>';
 const m=leaderOverlapCount();$('leaderWarnings').innerHTML=m>=2?`<div class="warning warning-danger"><strong>Gesamtwarnung:</strong> Im gesamten Datenbestand sind bis zu ${m} Leiter gleichzeitig abwesend.</div>`:'<div class="warning"><strong>Gesamtübersicht:</strong> Keine kritische Leiterüberschneidung.</div>'
}
function addMove(){const employeeId=Number($('moveEmployee').value),oldPeriod=$('moveOld').value.trim(),newPeriod=$('moveNew').value.trim(),reason=$('moveReason').value.trim(),initiator=$('moveInitiator').value;if(!employeeId||!oldPeriod||!newPeriod)return alert('Bitte Mitarbeiter sowie alten und neuen Zeitraum angeben.');state.moves.push({id:Date.now(),employeeId,oldPeriod,newPeriod,reason:reason||'Nicht angegeben',initiator});saveState();$('moveOld').value=$('moveNew').value=$('moveReason').value='';renderHistory()}
function renderHistory(){$('historyTable').innerHTML='<thead><tr><th>Mitarbeiter</th><th>Alter Zeitraum</th><th>Neuer Zeitraum</th><th>Grund</th><th>Veranlasst durch</th></tr></thead><tbody>'+state.moves.map(m=>`<tr><td>${esc(emp(m.employeeId)?.name)}</td><td>${esc(m.oldPeriod)}</td><td>${esc(m.newPeriod)}</td><td>${esc(m.reason)}</td><td>${esc(m.initiator)}</td></tr>`).join('')+'</tbody>';const counts={};state.moves.filter(m=>m.initiator==='Betrieb').forEach(m=>counts[m.employeeId]=(counts[m.employeeId]||0)+1);$('fairnessWarnings').innerHTML=Object.entries(counts).filter(([,n])=>n>=2).map(([id,n])=>`<div class="warning"><strong>Fairness:</strong> ${esc(emp(id)?.name)} wurde bereits ${n}-mal betrieblich verschoben.</div>`).join('')}
function renderDepartments(){$('departmentTable').innerHTML='<thead><tr><th>Abteilung</th><th>Mindestbesetzung</th><th>Mitarbeiter</th><th>Leiter</th><th>Aktion</th></tr></thead><tbody>'+state.departments.map((d,i)=>{const es=state.employees.filter(e=>e.department===d),min=Number(state.departmentSettings?.[d]??2);return `<tr><td>${esc(d)}</td><td>${min}</td><td>${es.length}</td><td>${esc(es.filter(e=>e.leader).map(e=>e.name).join(', ')||'–')}</td><td><button class="button tiny" onclick="renameDepartment(${i})">Umbenennen</button> <button class="button tiny" onclick="editDepartmentMinimum(${i})">Mindestbesetzung</button> <button class="button tiny danger" onclick="deleteDepartment(${i})">Löschen</button></td></tr>`}).join('')+'</tbody>'}
function addDepartment(){const name=$('newDepartment').value.trim();if(!name)return alert('Bitte einen Namen eingeben.');if(state.departments.includes(name))return alert('Diese Abteilung existiert bereits.');state.departments.push(name);state.departmentSettings[name]=Math.max(0,Number($('newDepartmentMin').value||0));$('newDepartment').value='';saveState();renderAll()}
window.renameDepartment=i=>{const old=state.departments[i],name=prompt('Neuer Name der Abteilung:',old)?.trim();if(!name||name===old)return;if(state.departments.includes(name))return alert('Der Name existiert bereits.');state.departments[i]=name;state.employees.filter(e=>e.department===old).forEach(e=>e.department=name);state.departmentSettings[name]=state.departmentSettings[old]??2;delete state.departmentSettings[old];saveState();renderAll()}
window.editDepartmentMinimum=i=>{const d=state.departments[i],current=Number(state.departmentSettings?.[d]??2),value=prompt(`Mindestbesetzung für „${d}“:`,current);if(value===null)return;const n=Number(value);if(!Number.isFinite(n)||n<0)return alert('Bitte eine gültige Zahl ab 0 eingeben.');state.departmentSettings[d]=Math.floor(n);saveState();renderAll()}
window.deleteDepartment=i=>{const d=state.departments[i];if(state.departments.length<=1)return alert('Die letzte Abteilung kann nicht gelöscht werden.');const assigned=state.employees.filter(e=>e.department===d),targets=state.departments.filter(x=>x!==d);let target='';if(assigned.length){target=prompt(`${assigned.length} Mitarbeiter sind „${d}“ zugeordnet. Gib die Zielabteilung für die Übertragung ein:

${targets.join(', ')}`,targets[0])?.trim()||'';if(!targets.includes(target))return alert('Löschen abgebrochen: Die Zielabteilung wurde nicht gefunden.')}if(!confirm(`Abteilung „${d}“ wirklich löschen?${assigned.length?`
${assigned.length} Mitarbeiter werden nach „${target}“ verschoben.`:''}`))return;assigned.forEach(e=>e.department=target);state.departments.splice(i,1);delete state.departmentSettings[d];saveState();renderAll()}
function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function exportBackup(){download(`Urlaubsplaner-Sicherung-${iso(new Date())}.json`,JSON.stringify(state,null,2),'application/json');$('backupStatus').textContent='Sicherung wurde erstellt.'}
function importBackup(e){const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{state=normalize(JSON.parse(r.result));saveState();fillLogin();renderAll();$('backupStatus').textContent='Sicherung erfolgreich importiert.'}catch{$('backupStatus').textContent='Ungültige Sicherungsdatei.'}};r.readAsText(file)}

async function exportMonthExcel(){
 if(typeof ExcelJS==='undefined')return alert('Die Excel-Komponente konnte nicht geladen werden. Bitte prüfe die Internetverbindung und lade die Seite neu.');
 const dep=$('departmentFilter').value||state.departments[0],leaderMode=dep==='__leaders__';
 const [year,month]=$('monthFilter').value.split('-').map(Number),days=new Date(year,month,0).getDate();
 const employees=leaderMode?state.employees.filter(e=>e.leader):state.employees.filter(e=>e.department===dep);
 const monthNames=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
 const workbook=new ExcelJS.Workbook();workbook.creator='Urlaubsplaner Berlin';workbook.created=new Date();
 const sheet=workbook.addWorksheet('Monatsplan',{views:[{state:'frozen',xSplit:1,ySplit:5}]});
 const lastCol=days+1,lastLetter=excelColumnName(lastCol);
 sheet.mergeCells(`A1:${lastLetter}1`);sheet.getCell('A1').value=`Urlaubsplan – ${leaderMode?'Leiterplan (alle Abteilungen)':dep}`;
 sheet.getCell('A1').font={bold:true,size:18,color:{argb:'FFFFFFFF'}};sheet.getCell('A1').alignment={horizontal:'left',vertical:'middle'};sheet.getCell('A1').fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF252A28'}};sheet.getRow(1).height=30;
 sheet.mergeCells(`A2:${lastLetter}2`);sheet.getCell('A2').value=`${monthNames[month-1]} ${year} · Erstellt am ${new Date().toLocaleDateString('de-DE')}`;sheet.getCell('A2').font={italic:true,color:{argb:'FFD9D9D9'}};sheet.getCell('A2').fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF252A28'}};
 sheet.mergeCells(`A3:${lastLetter}3`);sheet.getCell('A3').value=leaderMode?'Alle Abteilungsleitungen und hinterlegte Vertretungen':`Mindestbesetzung: ${Number(state.departmentSettings?.[dep]??2)} Mitarbeitende`;sheet.getCell('A3').font={bold:true,color:{argb:'FF222222'}};sheet.getCell('A3').fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFD500'}};
 const header=sheet.getRow(5);header.getCell(1).value='Mitarbeiter';
 for(let d=1;d<=days;d++){const date=new Date(year,month-1,d),cell=header.getCell(d+1);cell.value=d;cell.note=[date.toLocaleDateString('de-DE',{weekday:'long'}),holidayName(date)].filter(Boolean).join(' · ')}
 header.font={bold:true,color:{argb:'FFFFFFFF'}};header.alignment={horizontal:'center',vertical:'middle'};header.height=28;header.eachCell(c=>{c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF3A403D'}};c.border=excelBorder()});
 employees.forEach((e,index)=>{const row=sheet.getRow(6+index);row.getCell(1).value=leaderMode?`${e.name}\n${e.department} · Vertretung: ${e.substitute||'Keine'}`:e.name;row.getCell(1).alignment={wrapText:true,vertical:'middle'};row.height=leaderMode?34:24;row.getCell(1).border=excelBorder();
  for(let d=1;d<=days;d++){const date=new Date(year,month-1,d),cell=row.getCell(d+1),v=vacsFor(e.id).find(x=>inRange(date,x.from,x.to)&&isDisplayAbsenceDay(x,date));let fill='FFFFFFFF';
   if([0,6].includes(date.getDay()))fill='FFD6D8D7';if(holidayName(date))fill='FFFFD966';
   if(v){cell.value=absenceCode(v);cell.note=vacationTitle(v,date,leaderMode?e.department:'');cell.font={bold:true,color:{argb:'FF111111'}};fill=moveForVacation(v)?'FFF49ABC':v.status==='Beantragt'?'FFFFD966':v.status==='Geplant'?'FFD9D9D9':v.type==='Krankheit'?'FF9DC3E6':v.type==='Fortbildung'?'FFC9A0DC':v.type==='Geplanter Freier Tag'?'FFD9D9D9':'FFA9D18E'}
   if(!leaderMode&&countDepartmentAbsence(dep,date)>employees.length-Number(state.departmentSettings?.[dep]??2)&&!v)fill='FFF4CCCC';
   cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:fill}};cell.alignment={horizontal:'center',vertical:'middle'};cell.border=excelBorder();
  }
 });
 sheet.getColumn(1).width=leaderMode?34:25;for(let c=2;c<=lastCol;c++)sheet.getColumn(c).width=4.2;
 const legendRow=7+employees.length;sheet.mergeCells(legendRow,1,legendRow,lastCol);const legend=sheet.getCell(legendRow,1);legend.value='Legende: U = Urlaub · S = Sonderurlaub · F = Fortbildung · K = Krankheit · G = Geplanter Freier Tag · ↔ = verschoben';legend.font={italic:true,color:{argb:'FF333333'}};legend.alignment={wrapText:true};legend.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF2F2F2'}};legend.border=excelBorder();sheet.getRow(legendRow).height=30;
 const colors=[['Genehmigt','A9D18E'],['Beantragt','FFD966'],['Verschoben','F49ABC'],['Krankheit','9DC3E6'],['Fortbildung','C9A0DC'],['Geplanter freier Tag','D9D9D9'],['Kritische Besetzung','F4CCCC']];
 colors.forEach((x,i)=>{const row=sheet.getRow(legendRow+1+i);row.getCell(1).value=x[0];row.getCell(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+x[1]}};row.getCell(1).border=excelBorder();row.getCell(2).value=x[0]});
 sheet.autoFilter={from:{row:5,column:1},to:{row:5,column:lastCol}};
 sheet.pageSetup={orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:.25,right:.25,top:.5,bottom:.5,header:.2,footer:.2},printTitlesRow:'1:5',printArea:`A1:${lastLetter}${legendRow+colors.length}`};sheet.headerFooter.oddFooter='&LUrlaubsplaner Berlin&CSeite &P von &N&R&D';
 try{const buffer=await workbook.xlsx.writeBuffer(),blob=new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Monatsplan-${safeFileName(leaderMode?'Leiterplan':dep)}-${year}-${String(month).padStart(2,'0')}.xlsx`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}catch(err){console.error(err);alert('Die Excel-Datei konnte nicht erstellt werden.')}
}
function excelColumnName(n){let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s}
function excelBorder(){return{top:{style:'thin',color:{argb:'FF999999'}},left:{style:'thin',color:{argb:'FF999999'}},bottom:{style:'thin',color:{argb:'FF999999'}},right:{style:'thin',color:{argb:'FF999999'}}}}
function safeFileName(s){return String(s||'Plan').replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,'-')}

function exportCsv(){const dep=$('departmentFilter').value,ids=state.employees.filter(e=>e.department===dep).map(e=>e.id),rows=[['Mitarbeiter','Abteilung','Von','Bis','Urlaubstage','Umfang','Art','Status','Notiz']];state.vacations.filter(v=>ids.includes(v.employeeId)).forEach(v=>rows.push([emp(v.employeeId)?.name,dep,v.from,v.to,vacationDays(v),v.scope==='full'?'Ganzer Tag':'Halber Tag',v.type,v.status,v.note]));const csv='\ufeff'+rows.map(r=>r.map(x=>`"${String(x??'').replaceAll('"','""')}"`).join(';')).join('\r\n');download(`Urlaubsplan-${dep}.csv`,csv,'text/csv;charset=utf-8')}
function resetData(){if(!confirm('Alle lokalen Änderungen löschen und Testdaten wiederherstellen?'))return;state=normalize(window.DEFAULT_DATA);saveState('Testdaten wiederhergestellt','Lokale Arbeitsdaten wurden bewusst zurückgesetzt.');fillLogin();clearEmployeeForm();renderAll();$('backupStatus').textContent='Testdaten wurden wiederhergestellt.'}

/* Version 0.8: Benutzer, Rollen und Änderungsprotokoll */
function normalize(raw){
 const b=clone(window.DEFAULT_DATA),d=raw&&typeof raw==='object'?raw:{};
 const departments=Array.isArray(d.departments)&&d.departments.length?d.departments:b.departments;
 const settings={...(b.departmentSettings||{}),...(d.departmentSettings||{})};departments.forEach(x=>{if(settings[x]==null)settings[x]=2});
 const users=(Array.isArray(d.users)&&d.users.length?d.users:b.users).map((u,i)=>({id:Number(u.id||Date.now()+i),name:u.name||'Benutzer',pin:String(u.pin||'1234'),role:u.role||'leader',department:u.department||'',active:u.active!==false,lastLogin:u.lastLogin||''}));
 return{users,departments,departmentSettings:settings,employees:(Array.isArray(d.employees)?d.employees:b.employees).map(e=>({...e,carryover:Number(e.carryover||0),active:e.active!==false,entryDate:e.entryDate||'',exitDate:e.exitDate||''})),vacations:(Array.isArray(d.vacations)?d.vacations:b.vacations).map(v=>({...v,status:v.status||'Genehmigt',scope:v.scope||'full',createdBy:v.createdBy||'',updatedBy:v.updatedBy||''})),moves:Array.isArray(d.moves)?d.moves:b.moves,audit:Array.isArray(d.audit)?d.audit:[]}
}
function addAudit(action,details=''){
 if(!state.audit)state.audit=[];
 state.audit.unshift({id:Date.now()+Math.random(),at:new Date().toISOString(),user:currentUser?.name||'System',action,details});
 state.audit=state.audit.slice(0,1000);
}
function saveState(action='Daten geändert',details=''){
 addAudit(action,details);state=window.UrlaubsplanerStorage?.save(state)||state;updateStorageInfo();
}
function fillLogin(){
 const active=state.users.filter(u=>u.active!==false);
 $('loginName').innerHTML=active.map(u=>`<option>${esc(u.name)}</option>`).join('');
}
function roleLabel(r){return({admin:'Administrator',management:'Marktleitung',leader:'Abteilungsleitung',deputy:'Stellvertretung'})[r]||r}
function login(){
 const u=state.users.find(x=>x.active!==false&&x.name===$('loginName').value&&x.pin===$('loginPin').value);
 if(!u){$('loginError').textContent='Name oder PIN ist nicht korrekt oder das Konto ist deaktiviert.';return}
 currentUser=u;u.lastLogin=new Date().toISOString();addAudit('Anmeldung',roleLabel(u.role));state=window.UrlaubsplanerStorage?.save(state)||state;updateStorageInfo();
 $('loginError').textContent='';$('loggedInUser').textContent=`${u.name} · ${roleLabel(u.role)}`;$('loginPage').classList.add('hidden');$('application').classList.remove('hidden');applyPermissions();renderAll()
}
function applyPermissions(){
 document.querySelectorAll('[data-admin-only="true"]').forEach(el=>el.classList.toggle('hidden',currentUser?.role!=='admin'));
 const dep=currentUser?.department;
 if(dep&&['leader','deputy'].includes(currentUser.role)){
  ['departmentFilter','yearDepartmentFilter'].forEach(id=>{if($(id)){$(id).value=dep;$(id).disabled=true}})
 }else ['departmentFilter','yearDepartmentFilter'].forEach(id=>{if($(id))$(id).disabled=false});
}
function renderAll(){fillSelects();applyPermissions();renderDashboard();renderEmployees();renderCalendar();renderYear();renderWeek();renderLeaders();renderHistory();renderDepartments();renderUsers();renderAudit()}
function bindV08(){
 if($('saveUser'))$('saveUser').onclick=saveUser;
 if($('cancelUserEdit'))$('cancelUserEdit').onclick=clearUserForm;
 if($('changePin'))$('changePin').onclick=changeOwnPin;
 if($('auditSearch'))$('auditSearch').oninput=renderAudit;
 if($('exportAudit'))$('exportAudit').onclick=exportAuditCsv;
}
function clearUserForm(){['editingUserId','userName','userPin'].forEach(id=>$(id).value='');$('userRole').value='leader';$('userDepartment').value='';$('userActive').checked=true;$('cancelUserEdit').classList.add('hidden');$('saveUser').textContent='Benutzer speichern'}
function saveUser(){
 if(currentUser?.role!=='admin')return alert('Nur Administratoren dürfen Benutzer verwalten.');
 const id=Number($('editingUserId').value),name=$('userName').value.trim(),pin=$('userPin').value.trim(),role=$('userRole').value,department=$('userDepartment').value,active=$('userActive').checked;
 if(!name)return alert('Bitte einen Namen eingeben.');if(!id&&pin.length<4)return alert('Bitte eine PIN mit mindestens 4 Zeichen eingeben.');
 if(state.users.some(u=>u.name.toLowerCase()===name.toLowerCase()&&u.id!==id))return alert('Dieser Benutzername existiert bereits.');
 if(id){const u=state.users.find(x=>x.id===id);if(!u)return;Object.assign(u,{name,role,department,active});if(pin)u.pin=pin;saveState('Benutzer bearbeitet',`${name} · ${roleLabel(role)} · ${active?'aktiv':'deaktiviert'}`)}
 else{state.users.push({id:Date.now(),name,pin,role,department,active,lastLogin:''});saveState('Benutzer angelegt',`${name} · ${roleLabel(role)}`)}
 fillLogin();clearUserForm();renderUsers();
}
window.editUser=id=>{if(currentUser?.role!=='admin')return;const u=state.users.find(x=>x.id===Number(id));if(!u)return;$('editingUserId').value=u.id;$('userName').value=u.name;$('userPin').value='';$('userRole').value=u.role;$('userDepartment').value=u.department||'';$('userActive').checked=u.active!==false;$('cancelUserEdit').classList.remove('hidden');$('saveUser').textContent='Änderungen speichern'}
window.deleteUser=id=>{if(currentUser?.role!=='admin')return;const u=state.users.find(x=>x.id===Number(id));if(!u)return;if(u.id===currentUser.id)return alert('Das aktuell angemeldete Konto kann nicht gelöscht werden.');if(state.users.filter(x=>x.role==='admin'&&x.active!==false).length<=1&&u.role==='admin')return alert('Der letzte aktive Administrator kann nicht gelöscht werden.');if(!confirm(`Benutzer „${u.name}“ wirklich löschen?`))return;state.users=state.users.filter(x=>x.id!==u.id);saveState('Benutzer gelöscht',u.name);fillLogin();renderUsers()}
function renderUsers(){
 if(!$('userTable'))return;
 $('userDepartment').innerHTML='<option value="">Alle / keine feste Abteilung</option>'+state.departments.map(d=>`<option>${esc(d)}</option>`).join('');
 $('userCount').textContent=`${state.users.length} Benutzer`;
 $('userTable').innerHTML='<thead><tr><th>Name</th><th>Rolle</th><th>Abteilung</th><th>Status</th><th>Letzte Anmeldung</th><th>Aktionen</th></tr></thead><tbody>'+state.users.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(roleLabel(u.role))}</td><td>${esc(u.department||'Alle')}</td><td><span class="badge ${u.active!==false?'approved':'planned'}">${u.active!==false?'Aktiv':'Deaktiviert'}</span></td><td>${u.lastLogin?new Date(u.lastLogin).toLocaleString('de-DE'):'–'}</td><td><button class="button tiny" onclick="editUser(${u.id})">Bearbeiten</button> <button class="button tiny danger" onclick="deleteUser(${u.id})">Löschen</button></td></tr>`).join('')+'</tbody>';
}
function changeOwnPin(){const old=$('oldPin').value,newPin=$('newPin').value;if(!currentUser)return;if(old!==currentUser.pin){$('pinStatus').textContent='Die bisherige PIN ist nicht korrekt.';return}if(newPin.length<4){$('pinStatus').textContent='Die neue PIN muss mindestens 4 Zeichen lang sein.';return}currentUser.pin=newPin;saveState('PIN geändert','Eigenes Konto');$('oldPin').value=$('newPin').value='';$('pinStatus').textContent='PIN wurde geändert.'}
function renderAudit(){if(!$('auditTable'))return;const q=($('auditSearch')?.value||'').toLowerCase(),rows=(state.audit||[]).filter(a=>`${a.user} ${a.action} ${a.details}`.toLowerCase().includes(q));$('auditTable').innerHTML='<thead><tr><th>Zeitpunkt</th><th>Benutzer</th><th>Aktion</th><th>Details</th></tr></thead><tbody>'+rows.map(a=>`<tr><td>${new Date(a.at).toLocaleString('de-DE')}</td><td>${esc(a.user)}</td><td>${esc(a.action)}</td><td>${esc(a.details||'–')}</td></tr>`).join('')+'</tbody>'}
function exportAuditCsv(){const rows=[['Zeitpunkt','Benutzer','Aktion','Details'],...(state.audit||[]).map(a=>[new Date(a.at).toLocaleString('de-DE'),a.user,a.action,a.details])];const csv='\ufeff'+rows.map(r=>r.map(x=>`"${String(x??'').replaceAll('"','""')}"`).join(';')).join('\r\n');download(`Aenderungsprotokoll-${iso(new Date())}.csv`,csv,'text/csv;charset=utf-8')}
const originalBind=bind;bind=function(){originalBind();bindV08()};


/* Version 4.1: Supabase-Synchronisierung */
const SYNC_STORE='urlaubsplaner.supabase.config';
const WORKSPACE_ID='edeka-urlaubsplaner';
let syncConfig=loadSyncConfig();
let syncTimer=null;
function loadSyncConfig(){
 try{const c=JSON.parse(localStorage.getItem(SYNC_STORE)||'{}');return{endpoint:c.endpoint||'',token:c.token||'',accessCode:c.accessCode||'',auto:c.auto!==false,deviceId:c.deviceId||createDeviceId(),pending:Number(c.pending||0),lastSync:c.lastSync||'',status:c.status||'local',revision:Number(c.revision||0)}}catch{return{endpoint:'',token:'',accessCode:'',auto:true,deviceId:createDeviceId(),pending:0,lastSync:'',status:'local',revision:0}}
}
function createDeviceId(){return 'GERAET-'+Math.random().toString(36).slice(2,8).toUpperCase()+'-'+Date.now().toString(36).toUpperCase()}
function saveSyncConfig(){localStorage.setItem(SYNC_STORE,JSON.stringify(syncConfig))}
function normalizeEndpoint(value){return String(value||'').trim().replace(/\/+$/,'')}
function supabaseHeaders(){return{'Content-Type':'application/json','apikey':syncConfig.token,'Authorization':'Bearer '+syncConfig.token}}
function setSyncMessage(text,ok=null){if(!$('syncMessage'))return;$('syncMessage').textContent=text;$('syncMessage').classList.toggle('warning-danger',ok===false)}
function renderSync(){
 const online=syncConfig.status==='online',configured=!!(syncConfig.endpoint&&syncConfig.token&&syncConfig.accessCode);
 const endpointEl=$('syncEndpoint'),tokenEl=$('syncToken'),codeEl=$('syncAccessCode'),autoEl=$('syncAuto');
 if(endpointEl){
  endpointEl.value=syncConfig.endpoint;
  if(tokenEl)tokenEl.value=syncConfig.token;
  if(codeEl)codeEl.value=syncConfig.accessCode;
  if(autoEl)autoEl.checked=syncConfig.auto!==false;
  if($('syncDeviceShort'))$('syncDeviceShort').textContent=syncConfig.deviceId.replace('GERAET-','').slice(0,12);
  if($('syncPendingCount'))$('syncPendingCount').textContent=syncConfig.pending;
  if($('syncLastTime'))$('syncLastTime').textContent=syncConfig.lastSync?new Date(syncConfig.lastSync).toLocaleString('de-DE'):'Nie';
  if($('syncStatusText'))$('syncStatusText').textContent=online?'Verbunden':configured?'Nicht geprüft':'Nicht eingerichtet';
  const b=$('syncConnectionBadge');if(b){b.textContent=online?'Supabase verbunden':configured?'Supabase eingerichtet':'Supabase nicht eingerichtet';b.className='badge '+(online?'sync-online':configured?'pending':'planned')}
 }
 const lamp=$('globalSyncLamp'),lampText=$('globalSyncLampText');
 if(lamp&&lampText){
  const pending=Number(syncConfig.pending||0);
  let mode='local',text=configured?'Verbindung wird geprüft':'Supabase nicht eingerichtet';
  if(!navigator.onLine){mode='offline';text='Offline – lokal';}
  else if(window.__urlaubAutoSyncBusy===true){mode='syncing';text='Synchronisiere …';}
  else if(syncConfig.status==='conflict'){mode='warning';text='Konflikt';}
  else if(online&&pending===0){mode='online';text='Online – aktuell';}
  else if(online&&pending>0){mode='warning';text=`${pending} Änderung${pending===1?'':'en'} offen`;}
  else if(configured){mode='warning';text='Verbindung wird geprüft';}
  lamp.className='sync-lamp sync-lamp-'+mode;
  lampText.textContent=text;
  lamp.title=syncConfig.lastSync?'Letzte Synchronisierung: '+new Date(syncConfig.lastSync).toLocaleString('de-DE'):text;
 }
}
function bindV09(){$('saveSyncSettings')?.addEventListener('click',saveSyncSettings);$('testSyncConnection')?.addEventListener('click',testSyncConnection);$('pushSync')?.addEventListener('click',()=>pushSync(true));$('pullSync')?.addEventListener('click',()=>pullSync(true));}
function saveSyncSettings(){syncConfig.endpoint=normalizeEndpoint($('syncEndpoint').value);syncConfig.token=$('syncToken').value.trim();syncConfig.accessCode=($('syncAccessCode')?.value||'').trim();syncConfig.auto=$('syncAuto').checked;syncConfig.status=syncConfig.endpoint?'unknown':'local';saveSyncConfig();renderSync();setSyncMessage(syncConfig.endpoint?'Supabase-Einstellungen gespeichert.':'Lokaler Betrieb gespeichert.',true)}
async function rpc(name,args){const r=await fetch(`${syncConfig.endpoint}/rest/v1/rpc/${name}`,{method:'POST',headers:supabaseHeaders(),body:JSON.stringify(args),cache:'no-store'});let data=null;try{data=await r.json()}catch{}if(!r.ok)throw new Error(data?.message||data?.error||`HTTP ${r.status}`);return data}
function validateCloudConfig(){if(!syncConfig.endpoint||!syncConfig.token||!syncConfig.accessCode){setSyncMessage('Bitte Projekt-URL, Publishable Key und Zugriffscode eintragen.',false);return false}if(syncConfig.accessCode.length<8){setSyncMessage('Der gemeinsame Zugriffscode muss mindestens 8 Zeichen lang sein.',false);return false}return true}
async function testSyncConnection(){saveSyncSettings();if(!validateCloudConfig())return;setSyncMessage('Verbindung wird geprüft …');try{const info=await rpc('initialize_workspace',{p_workspace_id:WORKSPACE_ID,p_access_code:syncConfig.accessCode});syncConfig.status='online';syncConfig.revision=Number(info?.revision||syncConfig.revision||0);saveSyncConfig();renderSync();setSyncMessage('Supabase-Verbindung erfolgreich.',true)}catch(e){syncConfig.status='offline';saveSyncConfig();renderSync();setSyncMessage('Verbindung fehlgeschlagen: '+e.message,false)}}
async function pushSync(manual=false){
 saveSyncSettings();if(!validateCloudConfig())return false;
 if(manual&&!confirm(`Vollständigen Datenstand zu Supabase senden?\n\n${state.employees.length} Mitarbeiter\n${state.vacations.length} Abwesenheiten\nPlan-Gruppen und alle Grenzwerte werden mitgespeichert.`))return false;
 setSyncMessage('Daten werden zu Supabase übertragen …');
 try{await rpc('initialize_workspace',{p_workspace_id:WORKSPACE_ID,p_access_code:syncConfig.accessCode});const info=await rpc('save_app_state',{p_workspace_id:WORKSPACE_ID,p_access_code:syncConfig.accessCode,p_base_revision:Number(syncConfig.revision||0),p_device_id:syncConfig.deviceId,p_payload:state});syncConfig.pending=0;syncConfig.revision=Number(info?.revision||0);syncConfig.lastSync=info?.updated_at||new Date().toISOString();syncConfig.status='online';saveSyncConfig();addAudit('Synchronisierung','Daten zu Supabase gesendet');localStorage.setItem(STORE,JSON.stringify(state));renderAll();setSyncMessage('Daten wurden vollständig in Supabase gespeichert.',true);return true}catch(e){syncConfig.status=e.message.includes('REVISION_CONFLICT')?'conflict':'offline';saveSyncConfig();renderSync();setSyncMessage(e.message.includes('REVISION_CONFLICT')?'Speicherkonflikt: Ein anderer PC hat inzwischen gespeichert. Bitte zuerst Daten aus Supabase laden.':'Senden fehlgeschlagen: '+e.message,false);return false}}
async function pullSync(manual=false){
 saveSyncSettings();if(!validateCloudConfig())return false;if(syncConfig.pending>0&&manual&&!confirm(`${syncConfig.pending} lokale Änderung(en) sind noch nicht synchronisiert. Supabase-Daten trotzdem laden und lokal überschreiben?`))return false;setSyncMessage('Daten werden aus Supabase geladen …');
 try{const payload=await rpc('get_app_state',{p_workspace_id:WORKSPACE_ID,p_access_code:syncConfig.accessCode});if(!payload?.payload){setSyncMessage('In Supabase liegt noch kein Datenstand. Bitte zuerst lokale Daten senden.',false);return false}state=normalize(payload.payload);syncConfig.pending=0;syncConfig.revision=Number(payload.revision||0);syncConfig.lastSync=payload.updated_at||new Date().toISOString();syncConfig.status='online';saveSyncConfig();addAudit('Synchronisierung','Daten aus Supabase geladen');localStorage.setItem(STORE,JSON.stringify(state));fillLogin();renderAll();setSyncMessage('Aktueller Supabase-Datenstand wurde geladen.',true);return true}catch(e){syncConfig.status='offline';saveSyncConfig();renderSync();setSyncMessage('Laden fehlgeschlagen: '+e.message,false);return false}}
function scheduleAutoSync(){if(!syncConfig.auto||!syncConfig.endpoint)return;clearTimeout(syncTimer);syncTimer=setTimeout(()=>pushSync(false),900)}
const saveStateV08=saveState;saveState=function(action='Daten geändert',details=''){syncConfig.pending+=1;saveSyncConfig();saveStateV08(action,details);renderSync();scheduleAutoSync();};
const renderAllV08=renderAll;renderAll=function(){renderAllV08();renderSync()};
const bindV08Complete=bind;bind=function(){bindV08Complete();bindV09()};

/* Installierbare PWA */
let deferredInstallPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;const b=$('installAppButton');if(b)b.classList.remove('hidden')});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;const b=$('installAppButton');if(b)b.classList.add('hidden')});
window.addEventListener('DOMContentLoaded',()=>{$('installAppButton')?.addEventListener('click',async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$('installAppButton')?.classList.add('hidden')})});

init();

/* Version 1.1: lokaler XLSX-Export, Leiter-Mindestbesetzung, Schlüssel-Leitung und Plan-Gruppen */
const normalizeV11Base=normalize;
normalize=function(raw){
 const n=normalizeV11Base(raw),d=raw&&typeof raw==='object'?raw:{};
 n.departmentGroups={...(d.departmentGroups||{})};
 n.departments.forEach(dep=>{if(n.departmentGroups[dep]==null)n.departmentGroups[dep]=''});
 n.leaderSettings={minimum:Math.max(0,Number(d.leaderSettings?.minimum??1)),keyMinimum:Math.max(0,Number(d.leaderSettings?.keyMinimum??1))};
 n.employees=n.employees.map(e=>({...e,keyLeader:e.keyLeader===true}));
 return n;
};
state=normalize(state);state=window.UrlaubsplanerStorage?.save(state)||state;

function planGroups(){return [...new Set(state.departments.map(d=>state.departmentGroups?.[d]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'de'))}
function selectedDepartments(value){if(value==='__leaders__')return [];if(String(value).startsWith('__group__:')){const g=value.slice(10);return state.departments.filter(d=>state.departmentGroups?.[d]===g)}return [value]}
function groupOptionValue(g){return `__group__:${g}`}

const fillSelectsV10=fillSelects;
fillSelects=function(){
 const cur=$('departmentFilter').value,ycur=$('yearDepartmentFilter').value;
 fillSelectsV10();
 const groups=planGroups();
 const groupOpts=groups.map(g=>`<option value="${esc(groupOptionValue(g))}">Plan-Gruppe: ${esc(g)}</option>`).join('');
 const depOpts=state.departments.map(d=>`<option>${esc(d)}</option>`).join('');
 $('departmentFilter').innerHTML='<option value="__leaders__">Leiterplan (alle Abteilungen)</option>'+groupOpts+depOpts;
 const valid=['__leaders__',...groups.map(groupOptionValue),...state.departments];$('departmentFilter').value=valid.includes(cur)?cur:(state.departments[0]||'');
 $('yearDepartmentFilter').innerHTML=groupOpts+depOpts;$('yearDepartmentFilter').value=[...groups.map(groupOptionValue),...state.departments].includes(ycur)?ycur:(state.departments[0]||'');
};

function leaderDayStats(date){const leaders=state.employees.filter(e=>e.leader),present=leaders.filter(e=>!vacsFor(e.id).some(v=>v.status!=='Geplant'&&inRange(date,v.from,v.to))),keyPresent=present.filter(e=>e.keyLeader);return{total:leaders.length,present:present.length,keyPresent:keyPresent.length}}

renderCalendar=function(){
 const choice=$('departmentFilter').value||state.departments[0],leaderMode=choice==='__leaders__',deps=selectedDepartments(choice),groupMode=deps.length>1,parts=$('monthFilter').value.split('-').map(Number),year=parts[0],month=parts[1],days=new Date(year,month,0).getDate();
 const emps=leaderMode?state.employees.filter(e=>e.leader):state.employees.filter(e=>deps.includes(e.department));
 $('vacationEmployee').innerHTML=emps.map(e=>`<option value="${e.id}">${esc(e.name)}${groupMode?' · '+esc(e.department):''}</option>`).join('');
 let h='<thead><tr><th class="employee-name">Mitarbeiter</th>';for(let d=1;d<=days;d++)h+=`<th>${d}</th>`;h+='</tr></thead><tbody>';
 let lastDep='';
 for(const e of emps.sort((a,b)=>deps.indexOf(a.department)-deps.indexOf(b.department)||a.name.localeCompare(b.name,'de'))){
  if(groupMode&&e.department!==lastDep){h+=`<tr class="department-separator"><td colspan="${days+1}"><strong>${esc(e.department)}</strong> · Mindestbesetzung ${Number(state.departmentSettings?.[e.department]??2)}</td></tr>`;lastDep=e.department}
  h+=`<tr><td class="employee-name"><strong>${esc(e.name)}</strong>${leaderMode?`<br><small>${esc(e.department)} · ${e.keyLeader?'🔑 Schlüssel-Leitung · ':''}Vertretung: ${esc(e.substitute||'Keine')}</small>`:e.leader?` <span class="badge leader-badge">Leiter${e.keyLeader?' 🔑':''}</span>`:''}</td>`;
  for(let d=1;d<=days;d++){
   const date=new Date(year,month-1,d),v=vacsFor(e.id).find(x=>inRange(date,x.from,x.to)&&isDisplayAbsenceDay(x,date));let cls=[0,6].includes(date.getDay())?'weekend':'';if(holidayName(date))cls='holiday';
   let critical=false;
   if(leaderMode){const st=leaderDayStats(date);critical=st.present<Number(state.leaderSettings.minimum||0)||st.keyPresent<Number(state.leaderSettings.keyMinimum||0)}
   else {const total=state.employees.filter(x=>x.department===e.department).length,abs=countDepartmentAbsence(e.department,date),min=Number(state.departmentSettings?.[e.department]??2);critical=total-abs<min}
   if(v)cls=moveForVacation(v)?'moved-cell':v.status==='Beantragt'?'pending-cell':v.status==='Geplant'?'planned-cell':critical?'critical':'vacation';else if(critical)cls='critical';
   h+=`<td class="${cls}" title="${esc(vacationTitle(v,date,leaderMode?e.department:''))}">${v?absenceCode(v):''}</td>`
  }h+='</tr>'
 }
 $('calendarTable').innerHTML=h+'</tbody>';
 if(leaderMode){let bad=0,keyBad=0;for(let d=1;d<=days;d++){const st=leaderDayStats(new Date(year,month-1,d));if(st.present<Number(state.leaderSettings.minimum||0))bad++;if(st.keyPresent<Number(state.leaderSettings.keyMinimum||0))keyBad++}$('calendarWarning').innerHTML=(bad||keyBad)?`<div class="warning warning-danger"><strong>Leiterbesetzung:</strong> ${bad} Tag(e) unter Mindestbesetzung, ${keyBad} Tag(e) ohne ausreichende Schlüssel-Leitung. Eingestellt: ${state.leaderSettings.minimum} Leitung(en), davon ${state.leaderSettings.keyMinimum} mit Schlüssel.</div>`:'<div class="notice"><strong>Leiterbesetzung:</strong> Mindestbesetzung und Schlüsselbesetzung sind im Monat erfüllt.</div>';renderVacationList('__leaders__')}
 else {const warnings=deps.map(dep=>{const es=state.employees.filter(e=>e.department===dep),m=maxOverlapForDepartment(dep),min=Number(state.departmentSettings?.[dep]??2),available=es.length-m;return available<min?`${dep}: nur ${available} von ${es.length} verfügbar (Minimum ${min})`:''}).filter(Boolean);$('calendarWarning').innerHTML=warnings.length?`<div class="warning warning-danger"><strong>Mindestbesetzung:</strong> ${warnings.map(esc).join(' · ')}</div>`:'';renderVacationList(choice)}
};

const renderEmployeesV10=renderEmployees;
renderEmployees=function(){renderEmployeesV10();const table=$('employeeTable');if(table){table.querySelector('thead tr').insertAdjacentHTML('beforeend','<th>Schlüssel</th>');table.querySelectorAll('tbody tr').forEach((tr,i)=>tr.insertAdjacentHTML('beforeend',`<td>${state.employees[i]?.keyLeader?'🔑 Ja':'–'}</td>`))}}
saveEmployee=function(){const name=$('employeeName').value.trim();if(!name)return alert('Bitte einen Namen eingeben.');const id=Number($('editingEmployeeId').value),obj={name,department:$('employeeDepartment').value,hours:Number($('employeeHours').value),vacationDays:Number($('employeeVacationDays').value),carryover:Number($('employeeCarryover').value||0),leader:$('employeeLeader').checked,keyLeader:$('employeeKeyLeader').checked,substitute:$('employeeSubstitute').value};if(obj.keyLeader)obj.leader=true;if(id){const e=emp(id);Object.assign(e,obj)}else state.employees.push({id:Date.now(),...obj});saveState('Mitarbeiter gespeichert',name);clearEmployeeForm();renderAll()}
window.editEmployee=id=>{const e=emp(id);if(!e)return;$('editingEmployeeId').value=id;$('employeeName').value=e.name;$('employeeDepartment').value=e.department;$('employeeHours').value=e.hours;$('employeeVacationDays').value=e.vacationDays;$('employeeCarryover').value=e.carryover||0;$('employeeLeader').checked=e.leader;$('employeeKeyLeader').checked=e.keyLeader===true;$('employeeSubstitute').value=e.substitute||'';$('addEmployee').textContent='Änderungen speichern';$('cancelEmployeeEdit').classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'})}
clearEmployeeForm=function(){$('editingEmployeeId').value='';$('employeeName').value='';$('employeeHours').value=37;$('employeeVacationDays').value=36;$('employeeCarryover').value=0;$('employeeLeader').checked=false;$('employeeKeyLeader').checked=false;$('employeeSubstitute').value='';$('addEmployee').textContent='Mitarbeiter hinzufügen';$('cancelEmployeeEdit').classList.add('hidden')}

renderDepartments=function(){
 $('leaderMinimum').value=state.leaderSettings.minimum;$('keyLeaderMinimum').value=state.leaderSettings.keyMinimum;
 $('departmentTable').innerHTML='<thead><tr><th>Abteilung</th><th>Plan-Gruppe</th><th>Mindestbesetzung</th><th>Mitarbeiter</th><th>Leiter</th><th>Aktion</th></tr></thead><tbody>'+state.departments.map((d,i)=>{const es=state.employees.filter(e=>e.department===d),min=Number(state.departmentSettings?.[d]??2),group=state.departmentGroups?.[d]||'–';return `<tr><td>${esc(d)}</td><td>${esc(group)}</td><td>${min}</td><td>${es.length}</td><td>${esc(es.filter(e=>e.leader).map(e=>e.name+(e.keyLeader?' 🔑':'')).join(', ')||'–')}</td><td><button class="button tiny" onclick="renameDepartment(${i})">Umbenennen</button> <button class="button tiny" onclick="editDepartmentGroup(${i})">Plan-Gruppe</button> <button class="button tiny" onclick="editDepartmentMinimum(${i})">Mindestbesetzung</button> <button class="button tiny danger" onclick="deleteDepartment(${i})">Löschen</button></td></tr>`}).join('')+'</tbody>'
};
const addDepartmentV10=addDepartment;
addDepartment=function(){const name=$('newDepartment').value.trim();if(!name)return alert('Bitte einen Namen eingeben.');if(state.departments.includes(name))return alert('Diese Abteilung existiert bereits.');state.departments.push(name);state.departmentSettings[name]=Math.max(0,Number($('newDepartmentMin').value||0));state.departmentGroups[name]=$('newDepartmentGroup').value.trim();$('newDepartment').value='';$('newDepartmentGroup').value='';saveState('Abteilung angelegt',name);renderAll()}
window.editDepartmentGroup=i=>{const d=state.departments[i],value=prompt(`Plan-Gruppe für „${d}“ (leer = keine Gruppe):`,state.departmentGroups?.[d]||'');if(value===null)return;state.departmentGroups[d]=value.trim();saveState('Plan-Gruppe geändert',`${d}: ${value.trim()||'keine'}`);renderAll()}
function saveLeaderMinimums(){state.leaderSettings.minimum=Math.max(0,Math.floor(Number($('leaderMinimum').value||0)));state.leaderSettings.keyMinimum=Math.max(0,Math.floor(Number($('keyLeaderMinimum').value||0)));saveState('Leiterbesetzung geändert',`${state.leaderSettings.minimum} Leiter, ${state.leaderSettings.keyMinimum} Schlüssel-Leiter`);renderAll()}

// Echter XLSX-Export ohne CDN oder Internetverbindung.
function xmlEscape(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0}
function u16(n){return new Uint8Array([n&255,(n>>>8)&255])}function u32(n){return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255])}
function concatBytes(parts){const n=parts.reduce((s,p)=>s+p.length,0),out=new Uint8Array(n);let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out}
function zipStore(files){const te=new TextEncoder(),locals=[],centrals=[];let offset=0;for(const [name,text] of Object.entries(files)){const nb=te.encode(name),data=te.encode(text),crc=crc32(data),local=concatBytes([u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(nb.length),u16(0),nb,data]);locals.push(local);centrals.push(concatBytes([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(nb.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),nb]));offset+=local.length}const central=concatBytes(centrals),body=concatBytes(locals);return concatBytes([body,central,u32(0x06054b50),u16(0),u16(0),u16(centrals.length),u16(centrals.length),u32(central.length),u32(body.length),u16(0)])}
function xlsxCell(ref,value,style=0){return `<c r="${ref}" t="inlineStr" s="${style}"><is><t>${xmlEscape(value)}</t></is></c>`}
exportMonthExcel=async function(){
 const btn=$('exportExcel');btn.disabled=true;const old=btn.textContent;btn.textContent='Excel wird erstellt …';
 try{
  const choice=$('departmentFilter').value||state.departments[0],leaderMode=choice==='__leaders__',deps=selectedDepartments(choice),groupMode=deps.length>1,[year,month]=$('monthFilter').value.split('-').map(Number),days=new Date(year,month,0).getDate();
  const employees=(leaderMode?state.employees.filter(e=>e.leader):state.employees.filter(e=>deps.includes(e.department))).sort((a,b)=>deps.indexOf(a.department)-deps.indexOf(b.department)||a.name.localeCompare(b.name,'de'));
  const rows=[];let r=1;const title=leaderMode?'Leiterplan (alle Abteilungen)':groupMode?`Plan-Gruppe ${state.departmentGroups[deps[0]]}`:choice;
  rows.push(`<row r="${r}">${xlsxCell('A'+r,`Urlaubsplan – ${title}`,1)}</row>`);r++;
  rows.push(`<row r="${r}">${xlsxCell('A'+r,`${String(month).padStart(2,'0')}/${year} · Erstellt am ${new Date().toLocaleDateString('de-DE')}`,2)}</row>`);r++;
  let header=xlsxCell('A'+r,'Mitarbeiter / Abteilung',1);for(let d=1;d<=days;d++)header+=xlsxCell(excelColumnName(d+1)+r,d,1);rows.push(`<row r="${r}">${header}</row>`);r++;
  let lastDep='';
  for(const e of employees){if(groupMode&&e.department!==lastDep){rows.push(`<row r="${r}">${xlsxCell('A'+r,`${e.department} · Mindestbesetzung ${state.departmentSettings[e.department]??2}`,8)}</row>`);r++;lastDep=e.department}let cells=xlsxCell('A'+r,leaderMode?`${e.name} · ${e.department}${e.keyLeader?' · Schlüssel-Leitung':''}`:e.name,0);for(let d=1;d<=days;d++){const date=new Date(year,month-1,d),v=vacsFor(e.id).find(x=>inRange(date,x.from,x.to)&&isDisplayAbsenceDay(x,date));let st=[0,6].includes(date.getDay())?6:0;if(holidayName(date))st=7;if(v)st=moveForVacation(v)?4:v.status==='Beantragt'?3:v.type==='Krankheit'?5:v.status==='Geplant'?6:2;cells+=xlsxCell(excelColumnName(d+1)+r,v?absenceCode(v):'',st)}rows.push(`<row r="${r}">${cells}</row>`);r++}
  rows.push(`<row r="${r}">${xlsxCell('A'+r,'Legende: U Urlaub · K Krankheit · F Fortbildung · G geplanter freier Tag · ↔ verschoben · 🔑 Schlüssel-Leitung',2)}</row>`);
  const last=excelColumnName(days+1),sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${last}${r}"/><sheetViews><sheetView workbookViewId="0"><pane xSplit="1" ySplit="3" topLeftCell="B4" activePane="bottomRight" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="34" customWidth="1"/><col min="2" max="${days+1}" width="4.2" customWidth="1"/></cols><sheetData>${rows.join('')}</sheetData><mergeCells count="3"><mergeCell ref="A1:${last}1"/><mergeCell ref="A2:${last}2"/><mergeCell ref="A${r}:${last}${r}"/></mergeCells><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font><font><i/><color rgb="FF666666"/><sz val="10"/><name val="Calibri"/></font></fonts><fills count="10"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF303532"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFA9D18E"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFD966"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF49ABC"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF9DC3E6"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9D9D9"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFE699"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF5B605D"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FF999999"/></left><right style="thin"><color rgb="FF999999"/></right><top style="thin"><color rgb="FF999999"/></top><bottom style="thin"><color rgb="FF999999"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="9"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0"/><xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="0" fillId="7" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="0" fillId="8" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="1" fillId="9" borderId="1" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const files={'[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>','_rels/.rels':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>','xl/workbook.xml':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Monatsplan" sheetId="1" r:id="rId1"/></sheets></workbook>','xl/_rels/workbook.xml.rels':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>','xl/worksheets/sheet1.xml':sheet,'xl/styles.xml':styles};
  const blob=new Blob([zipStore(files)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Monatsplan-${safeFileName(title)}-${year}-${String(month).padStart(2,'0')}.xlsx`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
 }catch(err){console.error(err);alert('Excel-Export fehlgeschlagen: '+(err?.message||err))}finally{btn.disabled=false;btn.textContent=old}
};

// Nach dem ursprünglichen init die neuen Bedienelemente verbinden.
setTimeout(()=>{if($('saveLeaderMinimums'))$('saveLeaderMinimums').onclick=saveLeaderMinimums;if($('exportExcel'))$('exportExcel').onclick=exportMonthExcel;renderAll()},0);

/* Version 1.2: maximale Urlauber, Feiertagsnamen, Samstag normal, Sonntag hervorgehoben */
const normalizeV12Base=normalize;
normalize=function(raw){
 const n=normalizeV12Base(raw),d=raw&&typeof raw==='object'?raw:{};
 n.departmentMaxAway={...(d.departmentMaxAway||{})};
 n.departments.forEach(dep=>{
  if(n.departmentMaxAway[dep]==null){
   const total=n.employees.filter(e=>e.department===dep).length;
   const oldMin=Number(n.departmentSettings?.[dep]??Math.max(0,total-1));
   n.departmentMaxAway[dep]=Math.max(0,total-oldMin)||1;
  }
 });
 n.leaderSettings.maxAway=Math.max(0,Number(d.leaderSettings?.maxAway??n.leaderSettings?.maxAway??1));
 return n;
};
state=normalize(state);state=window.UrlaubsplanerStorage?.save(state)||state;

function activeAbsence(v){return v&&v.status!=='Geplant'}
function departmentAwayCount(dep,date){return state.employees.filter(e=>e.department===dep).filter(e=>vacsFor(e.id).some(v=>activeAbsence(v)&&inRange(date,v.from,v.to))).length}
function nearbyHolidayWarnings(v){
 if(!v||v.type!=='Urlaub')return [];
 const start=localDate(v.from),end=localDate(v.to),found=[];
 for(let offset=1;offset<=2;offset++){
  const before=new Date(start);before.setDate(before.getDate()-offset);
  const after=new Date(end);after.setDate(after.getDate()+offset);
  const bn=holidayName(before),an=holidayName(after);
  if(bn)found.push(`${bn} (${before.toLocaleDateString('de-DE')}) ${offset} Tag${offset===1?'':'e'} vor Urlaubsbeginn`);
  if(an)found.push(`${an} (${after.toLocaleDateString('de-DE')}) ${offset} Tag${offset===1?'':'e'} nach Urlaubsende`);
 }
 return [...new Set(found)];
}

const vacationTitleV12Base=vacationTitle;
vacationTitle=function(v,date,extra=''){
 const base=vacationTitleV12Base(v,date,extra),near=nearbyHolidayWarnings(v);
 return [base,near.length?`Feiertagshinweis: ${near.join('; ')}`:''].filter(Boolean).join(' · ');
};

renderVacationList=function(choice){
 const deps=selectedDepartments(choice),ids=(choice==='__leaders__'?state.employees.filter(e=>e.leader):state.employees.filter(e=>deps.includes(e.department))).map(e=>e.id),rows=state.vacations.filter(v=>ids.includes(v.employeeId)).sort((a,b)=>localDate(a.from)-localDate(b.from));
 $('vacationList').innerHTML='<thead><tr><th>Mitarbeiter</th><th>Zeitraum</th><th>Tage</th><th>Umfang</th><th>Art</th><th>Status</th><th>Hinweis</th><th>Aktion</th></tr></thead><tbody>'+rows.map(v=>{const m=moveForVacation(v),near=nearbyHolidayWarnings(v),bw=bridgeWarnings(v),holidayHint=[...near,...bw],hint=m?`↔ Verschoben von ${m.oldPeriod}; ${m.reason||'ohne Grundangabe'}`:(holidayHint.length?`⚠ ${holidayHint.join('; ')}`:(v.note||'–'));return `<tr data-vacation-id="${v.id}"><td>${esc(emp(v.employeeId)?.name)}</td><td>${period(v.from,v.to)}</td><td>${vacationDays(v)}</td><td>${v.scope==='full'?'Ganzer Tag':'Halber Tag'}</td><td>${esc(v.type)}</td><td>${statusBadge(v.status)}</td><td class="${holidayHint.length?'holiday-hint':''}">${esc(hint)}</td><td><button class="button tiny" onclick="editVacation(${v.id})">Verschieben/Bearbeiten</button> ${v.status==='Beantragt'?`<button class="button tiny primary" onclick="approveVacation(${v.id})">Genehmigen</button>`:''} <button class="button tiny danger" onclick="deleteVacation(${v.id})">Löschen</button></td></tr>`}).join('')+'</tbody>';
};

renderCalendar=function(){
 const choice=$('departmentFilter').value||state.departments[0],leaderMode=choice==='__leaders__',deps=selectedDepartments(choice),groupMode=deps.length>1,parts=$('monthFilter').value.split('-').map(Number),year=parts[0],month=parts[1],days=new Date(year,month,0).getDate();
 const emps=(leaderMode?state.employees.filter(e=>e.leader):state.employees.filter(e=>deps.includes(e.department))).sort((a,b)=>leaderMode?a.name.localeCompare(b.name,'de'):deps.indexOf(a.department)-deps.indexOf(b.department)||a.name.localeCompare(b.name,'de'));
 $('vacationEmployee').innerHTML=emps.map(e=>`<option value="${e.id}">${esc(e.name)}${groupMode?' · '+esc(e.department):''}</option>`).join('');
 let h='<thead><tr><th class="employee-name">Mitarbeiter</th>';
 for(let d=1;d<=days;d++){const date=new Date(year,month-1,d),hn=holidayName(date),sun=date.getDay()===0;h+=`<th class="${sun?'sunday-header':''} ${hn?'holiday-header':''}" title="${esc(hn)}">${d}${hn?`<small>${esc(hn)}</small>`:''}</th>`}h+='</tr></thead><tbody>';
 let lastDep='';
 for(const e of emps){
  if(groupMode&&e.department!==lastDep){h+=`<tr class="department-separator"><td colspan="${days+1}"><strong>${esc(e.department)}</strong> · maximal ${Number(state.departmentMaxAway?.[e.department]??1)} gleichzeitig abwesend</td></tr>`;lastDep=e.department}
  h+=`<tr><td class="employee-name"><strong>${esc(e.name)}</strong>${leaderMode?`<br><small>${esc(e.department)} · ${e.keyLeader?'🔑 Schlüssel-Leitung · ':''}Vertretung: ${esc(e.substitute||'Keine')}</small>`:e.leader?` <span class="badge leader-badge">Leiter${e.keyLeader?' 🔑':''}</span>`:''}</td>`;
  for(let d=1;d<=days;d++){
   const date=new Date(year,month-1,d),v=vacsFor(e.id).find(x=>inRange(date,x.from,x.to)&&isDisplayAbsenceDay(x,date)),hn=holidayName(date),sun=date.getDay()===0;
   let cls=sun?'sunday':'';if(hn)cls='holiday';
   let critical=false;
   if(leaderMode){const absent=state.employees.filter(x=>x.leader).filter(x=>vacsFor(x.id).some(a=>activeAbsence(a)&&inRange(date,a.from,a.to))).length;critical=absent>Number(state.leaderSettings.maxAway||0)}
   else critical=departmentAwayCount(e.department,date)>Number(state.departmentMaxAway?.[e.department]??1);
   if(v)cls=moveForVacation(v)?'moved-cell':v.status==='Beantragt'?'pending-cell':v.status==='Geplant'?'planned-cell':critical?'critical vacation-entry':'vacation';
   else if(critical)cls=(cls?cls+' ':'')+'critical-day';
   h+=`<td class="${cls}" title="${esc(vacationTitle(v,date,leaderMode?e.department:''))}">${v?absenceCode(v):''}</td>`;
  }h+='</tr>';
 }
 $('calendarTable').innerHTML=h+'</tbody>';
 const holidays=[];for(let d=1;d<=days;d++){const dt=new Date(year,month-1,d),name=holidayName(dt);if(name)holidays.push(`${d}.${month}. ${name}`)}
 if(leaderMode){let bad=0,maxSeen=0;for(let d=1;d<=days;d++){const dt=new Date(year,month-1,d),away=state.employees.filter(x=>x.leader).filter(x=>vacsFor(x.id).some(v=>activeAbsence(v)&&inRange(dt,v.from,v.to))).length;maxSeen=Math.max(maxSeen,away);if(away>Number(state.leaderSettings.maxAway||0))bad++}const allowed=Number(state.leaderSettings.maxAway||0),capacity=bad?`<div class="warning warning-danger"><strong>Leiter-Grenze überschritten:</strong> An ${bad} Tag(en) sind mehr als ${allowed} Leitungen gleichzeitig abwesend (Spitze ${maxSeen}). Die Warnung beginnt bei ${allowed+1}.</div>`:`<div class="capacity-ok"><strong>Leiterbesetzung in Ordnung:</strong> Höchstens ${maxSeen} gleichzeitig abwesend. Zulässig sind bis zu ${allowed}; eine Warnung erscheint erst ab ${allowed+1}.</div>`;$('calendarWarning').innerHTML=`${capacity}${holidays.length?`<div class="holiday-list"><strong>Feiertage:</strong> ${holidays.map(esc).join(' · ')}</div>`:''}`;renderVacationList('__leaders__')}
 else {const warnings=deps.map(dep=>{let max=0,bad=0;for(let d=1;d<=days;d++){const away=departmentAwayCount(dep,new Date(year,month-1,d));max=Math.max(max,away);if(away>Number(state.departmentMaxAway?.[dep]??1))bad++}return bad?`${dep}: an ${bad} Tag(en) über Maximum ${state.departmentMaxAway[dep]} (Spitze ${max})`:''}).filter(Boolean);$('calendarWarning').innerHTML=`${warnings.length?`<div class="warning warning-danger"><strong>Zu viele Urlauber:</strong> ${warnings.map(esc).join(' · ')}</div>`:''}${holidays.length?`<div class="holiday-list"><strong>Feiertage:</strong> ${holidays.map(esc).join(' · ')}</div>`:''}`;renderVacationList(choice)}
};

renderDepartments=function(){
 $('leaderMinimum').value=state.leaderSettings.maxAway;$('keyLeaderMinimum').value=state.leaderSettings.keyMinimum;
 $('departmentTable').innerHTML='<thead><tr><th>Abteilung</th><th>Plan-Gruppe</th><th>Max. Urlauber</th><th>Mitarbeiter</th><th>Leiter</th><th>Aktion</th></tr></thead><tbody>'+state.departments.map((d,i)=>{const es=state.employees.filter(e=>e.department===d),max=Number(state.departmentMaxAway?.[d]??1),group=state.departmentGroups?.[d]||'–';return `<tr><td>${esc(d)}</td><td>${esc(group)}</td><td>${max}</td><td>${es.length}</td><td>${esc(es.filter(e=>e.leader).map(e=>e.name+(e.keyLeader?' 🔑':'')).join(', ')||'–')}</td><td><button class="button tiny" onclick="renameDepartment(${i})">Umbenennen</button> <button class="button tiny" onclick="editDepartmentGroup(${i})">Plan-Gruppe</button> <button class="button tiny" onclick="editDepartmentMaximum(${i})">Max. Urlauber</button> <button class="button tiny danger" onclick="deleteDepartment(${i})">Löschen</button></td></tr>`}).join('')+'</tbody>';
};
window.editDepartmentMaximum=i=>{const d=state.departments[i],current=Number(state.departmentMaxAway?.[d]??1),value=prompt(`Maximal gleichzeitig abwesende Urlauber für „${d}“:`,current);if(value===null)return;const n=Number(value);if(!Number.isFinite(n)||n<0)return alert('Bitte eine gültige Zahl ab 0 eingeben.');state.departmentMaxAway[d]=Math.floor(n);saveState('Maximale Urlauber geändert',`${d}: ${n}`);renderAll()};
addDepartment=function(){const name=$('newDepartment').value.trim();if(!name)return alert('Bitte einen Namen eingeben.');if(state.departments.includes(name))return alert('Diese Abteilung existiert bereits.');state.departments.push(name);state.departmentSettings[name]=0;state.departmentMaxAway[name]=Math.max(0,Number($('newDepartmentMin').value||1));state.departmentGroups[name]=$('newDepartmentGroup').value.trim();$('newDepartment').value='';$('newDepartmentGroup').value='';saveState('Abteilung angelegt',name);renderAll()};
saveLeaderMinimums=function(){state.leaderSettings.maxAway=Math.max(0,Math.floor(Number($('leaderMinimum').value||0)));state.leaderSettings.keyMinimum=Math.max(0,Math.floor(Number($('keyLeaderMinimum').value||0)));saveState('Leiterregeln geändert',`max. ${state.leaderSettings.maxAway} abwesend, mindestens ${state.leaderSettings.keyMinimum} Schlüssel-Leiter anwesend`);renderAll()};

// v1.5.1: Der Handler ruft immer die aktuellste Kalenderfunktion auf.
// Dadurch werden Sonntage und Feiertage sofort nach einem Abteilungswechsel neu markiert.
if($('departmentFilter'))$('departmentFilter').onchange=()=>renderCalendar();
setTimeout(()=>{renderAll()},0);

/* Version 1.3: Jahres-Feiertagsregel, Plan-Gruppen-Maximum und direkter PDF-Export */
const normalizeV13Base=normalize;
normalize=function(raw){
 const n=normalizeV13Base(raw),d=raw&&typeof raw==='object'?raw:{};
 n.planGroupMaxAway={...(d.planGroupMaxAway||{})};
 planGroupsFromState(n).forEach(g=>{if(n.planGroupMaxAway[g]==null)n.planGroupMaxAway[g]=Math.max(1,...n.departments.filter(dep=>(n.departmentGroups?.[dep]||'').trim()===g).map(dep=>Number(n.departmentMaxAway?.[dep]??1)))});
 return n;
};
function planGroupsFromState(s){return [...new Set(s.departments.map(d=>(s.departmentGroups?.[d]||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'de'))}
planGroups=function(){return planGroupsFromState(state)};
selectedDepartments=function(value){if(value==='__leaders__')return [];if(String(value).startsWith('__group__:')){const g=value.slice(10);return state.departments.filter(d=>(state.departmentGroups?.[d]||'').trim()===g)}return [value]};
state=normalize(state);state=window.UrlaubsplanerStorage?.save(state)||state;

function holidaysLinkedToVacation(v){
 if(!v||v.type!=='Urlaub')return [];
 const start=localDate(v.from),end=localDate(v.to),map=new Map();
 const scanStart=new Date(start);scanStart.setDate(scanStart.getDate()-2);
 const scanEnd=new Date(end);scanEnd.setDate(scanEnd.getDate()+2);
 for(let d=new Date(scanStart);d<=scanEnd;d.setDate(d.getDate()+1)){
  const name=holidayName(d);if(name)map.set(iso(d),`${name} (${d.toLocaleDateString('de-DE')})`);
 }
 return [...map.entries()].map(([date,label])=>({date,label}));
}
function annualEmployeeHolidayInfo(employeeId,year){
 const map=new Map();
 state.vacations.filter(v=>v.employeeId===employeeId&&v.type==='Urlaub'&&localDate(v.from).getFullYear()===year).forEach(v=>holidaysLinkedToVacation(v).forEach(h=>map.set(h.date,h.label)));
 return {count:map.size,labels:[...map.values()]};
}
nearbyHolidayWarnings=function(v){
 if(!v||v.type!=='Urlaub')return [];
 const annual=annualEmployeeHolidayInfo(v.employeeId,localDate(v.from).getFullYear());
 if(annual.count<=2)return [];
 return holidaysLinkedToVacation(v).map(h=>`${h.label} liegt im Urlaub oder höchstens 2 Tage davor/danach`);
};

const fillSelectsV13Base=fillSelects;
fillSelects=function(){
 fillSelectsV13Base();
 const cur=$('departmentFilter').value,ycur=$('yearDepartmentFilter').value,groups=planGroups();
 const groupOpts=groups.map(g=>`<option value="${esc(groupOptionValue(g))}">Plan-Gruppe: ${esc(g)}</option>`).join('');
 const depOpts=state.departments.map(d=>`<option value="${esc(d)}">${esc(d)}</option>`).join('');
 $('departmentFilter').innerHTML='<option value="__leaders__">Leiterplan (alle Abteilungen)</option>'+groupOpts+depOpts;
 const valid=['__leaders__',...groups.map(groupOptionValue),...state.departments];$('departmentFilter').value=valid.includes(cur)?cur:(groups.length?groupOptionValue(groups[0]):state.departments[0]||'');
 $('yearDepartmentFilter').innerHTML=groupOpts+depOpts;$('yearDepartmentFilter').value=[...groups.map(groupOptionValue),...state.departments].includes(ycur)?ycur:(groups.length?groupOptionValue(groups[0]):state.departments[0]||'');
};

const renderDepartmentsV13Base=renderDepartments;
renderDepartments=function(){
 renderDepartmentsV13Base();
 const groups=planGroups(),host=$('departmentTable')?.closest('.table-wrapper')||$('departmentTable')?.parentElement;
 let box=$('planGroupSettings');if(!box&&host){box=document.createElement('div');box.id='planGroupSettings';box.className='subpanel';host.parentElement.insertBefore(box,host)}
 if(box)box.innerHTML=`<h3>Plan-Gruppen</h3><p class="muted">Das Gruppenmaximum gilt zusätzlich zu den einzelnen Abteilungsgrenzen.</p><div class="table-wrapper"><table><thead><tr><th>Plan-Gruppe</th><th>Abteilungen</th><th>Max. Urlauber gesamt</th><th>Aktion</th></tr></thead><tbody>${groups.map(g=>`<tr><td><strong>${esc(g)}</strong></td><td>${esc(state.departments.filter(d=>(state.departmentGroups?.[d]||'').trim()===g).join(', '))}</td><td>${Number(state.planGroupMaxAway?.[g]??1)}</td><td><button class="button tiny" onclick="editPlanGroupMaximum('${esc(g).replace(/'/g,"&#39;")}')">Maximum ändern</button></td></tr>`).join('')||'<tr><td colspan="4" class="muted">Noch keine Plan-Gruppe angelegt.</td></tr>'}</tbody></table></div>`;
};
window.editPlanGroupMaximum=g=>{const current=Number(state.planGroupMaxAway?.[g]??1),value=prompt(`Maximal gleichzeitig abwesende Urlauber in der gesamten Plan-Gruppe „${g}“:`,current);if(value===null)return;const n=Number(value);if(!Number.isFinite(n)||n<0)return alert('Bitte eine gültige Zahl ab 0 eingeben.');state.planGroupMaxAway[g]=Math.floor(n);saveState('Plan-Gruppen-Maximum geändert',`${g}: ${n}`);renderAll()};

function groupAwayCount(group,date){const deps=state.departments.filter(d=>(state.departmentGroups?.[d]||'').trim()===group);return state.employees.filter(e=>deps.includes(e.department)).filter(e=>vacsFor(e.id).some(v=>activeAbsence(v)&&inRange(date,v.from,v.to))).length}
const renderCalendarV13Base=renderCalendar;
renderCalendar=function(){
 renderCalendarV13Base();
 const choice=$('departmentFilter').value,parts=$('monthFilter').value.split('-').map(Number),year=parts[0],month=parts[1],days=new Date(year,month,0).getDate();
 if(String(choice).startsWith('__group__:')){
  const g=choice.slice(10),maxAllowed=Number(state.planGroupMaxAway?.[g]??1);let bad=0,peak=0;
  for(let d=1;d<=days;d++){const n=groupAwayCount(g,new Date(year,month-1,d));peak=Math.max(peak,n);if(n>maxAllowed)bad++}
  const existing=$('calendarWarning').innerHTML;
  $('calendarWarning').innerHTML=`${bad?`<div class="warning warning-danger"><strong>Plan-Gruppe ${esc(g)} – Grenze überschritten:</strong> An ${bad} Tag(en) sind mehr als ${maxAllowed} Personen gleichzeitig abwesend (Spitze ${peak}). Die Warnung beginnt bei ${maxAllowed+1}.</div>`:`<div class="capacity-ok"><strong>Plan-Gruppe ${esc(g)} in Ordnung:</strong> Höchstens ${peak} gleichzeitig abwesend. Zulässig sind bis zu ${maxAllowed}; eine Warnung erscheint erst ab ${maxAllowed+1}.</div>`}${existing}`;
 }
};

function pdfEscape(s){return String(s??'').replace(/[\\()]/g,'\\$&').replace(/[äÄ]/g,m=>m==='ä'?'ae':'Ae').replace(/[öÖ]/g,m=>m==='ö'?'oe':'Oe').replace(/[üÜ]/g,m=>m==='ü'?'ue':'Ue').replace(/ß/g,'ss').replace(/[↔🔑]/g,'')}

function exportMonthPdf(){
 try{
  const choice=$('departmentFilter').value||state.departments[0],leaderMode=choice==='__leaders__',deps=selectedDepartments(choice),parts=$('monthFilter').value.split('-').map(Number),year=parts[0],month=parts[1],days=new Date(year,month,0).getDate();
  const emps=(leaderMode?state.employees.filter(e=>e.leader):state.employees.filter(e=>deps.includes(e.department))).sort((a,b)=>a.department.localeCompare(b.department,'de')||a.name.localeCompare(b.name,'de'));
  const title=leaderMode?'Leiterplan':String(choice).startsWith('__group__:')?`Plan-Gruppe ${choice.slice(10)}`:choice;
  const W=842,H=595,left=28,top=535,nameW=150,cellW=(W-left-18-nameW)/days,rowH=18;
  let pages=[],content=[],y=top,pageNumber=1;

  const rgb=(r,g,b)=>`${(r/255).toFixed(3)} ${(g/255).toFixed(3)} ${(b/255).toFixed(3)}`;
  const txt=(x,y,size,text,color=[24,27,26],bold=false)=>content.push(`${rgb(...color)} rg BT /${bold?'F2':'F1'} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${pdfEscape(text)}) Tj ET`);
  const rect=(x,y,w,h,fill=[255,255,255],stroke=[86,92,89])=>content.push(`${rgb(...fill)} rg ${rgb(...stroke)} RG ${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re B`);
  const footer=()=>{
   txt(left,18,7,'U Urlaub  |  S Sonderurlaub  |  F Fortbildung  |  K Krankheit  |  G Geplanter freier Tag',[70,75,73]);
   txt(W-115,18,7,`Seite ${pageNumber}  |  ${new Date().toLocaleDateString('de-DE')}`,[70,75,73]);
  };
  const header=()=>{
   rect(left,H-43,W-left-18,30,[0,80,164],[247,209,23]);
   txt(left+10,H-34,15,`Urlaubsplan - ${title} - ${String(month).padStart(2,'0')}/${year}`,[255,255,255],true);
   y=top;
   rect(left,y-rowH,nameW,rowH,[247,209,23],[0,80,164]);
   txt(left+4,y-13,8,'Mitarbeiter',[20,24,23],true);
   for(let d=1;d<=days;d++){
    const date=new Date(year,month-1,d);
    const fill=holidayName(date)?[185,143,18]:date.getDay()===0?[78,82,80]:[230,235,232];
    const color=(holidayName(date)||date.getDay()===0)?[255,255,255]:[20,24,23];
    rect(left+nameW+(d-1)*cellW,y-rowH,cellW,rowH,fill,[90,96,93]);
    txt(left+nameW+(d-1)*cellW+1,y-13,6,String(d),color,true);
   }
   y-=rowH;
  };
  const finish=()=>{footer();pages.push(content.join('\n'));content=[];pageNumber++};

  header();
  let lastDep='';
  for(const e of emps){
   if(y<48){finish();header()}
   if(deps.length>1&&e.department!==lastDep){
    rect(left,y-rowH,W-left-18,rowH,[0,80,164],[247,209,23]);
    txt(left+4,y-13,8,`${e.department} - max. ${state.departmentMaxAway?.[e.department]??1}`,[255,255,255],true);
    y-=rowH;
    lastDep=e.department;
   }
   rect(left,y-rowH,nameW,rowH,[244,246,245],[90,96,93]);
   txt(left+4,y-13,7,leaderMode?`${e.name} (${e.department})`:e.name,[20,24,23],true);
   for(let d=1;d<=days;d++){
    const date=new Date(year,month-1,d);
    const v=vacsFor(e.id).find(x=>inRange(date,x.from,x.to)&&isDisplayAbsenceDay(x,date));
    let fill=date.getDay()===0?[92,96,94]:holidayName(date)?[185,143,18]:[255,255,255];
    let textColor=(date.getDay()===0||holidayName(date))?[255,255,255]:[20,24,23];
    if(v){
     const moved=Boolean(moveForVacation(v));
     const palette={
      Urlaub:[159,196,126],
      Krankheit:[198,60,69],
      Fortbildung:[95,155,211],
      Sonderurlaub:[235,161,73],
      Unbezahlt:[168,139,180],
      'Geplanter Freier Tag':[184,187,185]
     };
     fill=moved?[234,130,171]:(v.status==='Beantragt'?[240,200,61]:(palette[v.type]||[159,196,126]));
     textColor=[18,22,20];
    }
    rect(left+nameW+(d-1)*cellW,y-rowH,cellW,rowH,fill,[90,96,93]);
    if(v)txt(left+nameW+(d-1)*cellW+1,y-13,6,absenceCode(v),textColor,true);
   }
   y-=rowH;
  }

  finish();

  const objects=[];objects[1]='<< /Type /Catalog /Pages 2 0 R >>';
  const pageIds=[],contentIds=[];let id=3;
  for(let i=0;i<pages.length;i++){pageIds.push(id++);contentIds.push(id++)}
  const fontId=id++,boldFontId=id++;
  objects[2]=`<< /Type /Pages /Kids [${pageIds.map(x=>x+' 0 R').join(' ')}] /Count ${pages.length} >>`;
  objects[fontId]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[boldFontId]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
  for(let i=0;i<pages.length;i++){
   objects[pageIds[i]]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`;
   objects[contentIds[i]]=`<< /Length ${pages[i].length} >>\nstream\n${pages[i]}\nendstream`;
  }
  let pdf='%PDF-1.4\n',offsets=[0];
  for(let i=1;i<objects.length;i++){offsets[i]=pdf.length;pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`}
  const xref=pdf.length;
  pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for(let i=1;i<objects.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
  pdf+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  const blob=new Blob([pdf],{type:'application/pdf'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`Monatsplan-${safeFileName(title)}-${year}-${String(month).padStart(2,'0')}.pdf`;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
 }catch(err){
  console.error(err);
  alert('PDF-Export fehlgeschlagen: '+(err?.message||err));
 }
}

setTimeout(()=>{if($('exportPdf'))$('exportPdf').onclick=exportMonthPdf;renderAll()},0);


/* Version 1.5: Urlaubsberechnung und Rollenrechte */
function isDisplayAbsenceDay(v,date){
 if(!v)return false;
 if(v.type!=='Urlaub')return true;
 return date.getDay()!==0&&!holidayName(date);
}
function canApproveOrReject(){return ['admin','management'].includes(currentUser?.role)}
function canMoveVacation(v){
 if(!currentUser||!v)return false;
 if(['admin','management'].includes(currentUser.role))return true;
 if(currentUser.role==='leader'){
  const e=emp(v.employeeId);
  return !currentUser.department||e?.department===currentUser.department;
 }
 return false;
}
function canDeleteVacation(v){return canMoveVacation(v)}
function permissionSummary(role){
 const map={
  admin:'Alle Bereiche; Benutzer und Abteilungen verwalten; Urlaub erfassen, verschieben, genehmigen, ablehnen und löschen; alle Exporte und Protokolle.',
  management:'Alle Abteilungen sehen; Urlaub erfassen, verschieben, genehmigen und ablehnen; Abteilungen verwalten; Exporte und Protokolle.',
  leader:'Eigene Abteilung sehen und verwalten; Urlaub erfassen und verschieben; keine Genehmigung oder Ablehnung.',
  deputy:'Eigene Abteilung ansehen und Urlaub erfassen; keine Verschiebung, Genehmigung oder Ablehnung.'
 };
 return map[role]||'Keine Beschreibung';
}
function renderRolePermissionLegend(){
 const el=$('rolePermissionLegend');if(!el)return;
 const rows=[
  ['Benutzer verwalten','✓','–','–','–'],
  ['Abteilungen verwalten','✓','✓','–','–'],
  ['Urlaub erfassen','✓','✓','Eigene Abteilung','Eigene Abteilung'],
  ['Urlaub verschieben','✓','✓','Eigene Abteilung','–'],
  ['Urlaub genehmigen','✓','✓','–','–'],
  ['Urlaub ablehnen','✓','✓','–','–'],
  ['Urlaub löschen','✓','✓','Eigene Abteilung','–'],
  ['Alle Abteilungen sehen','✓','✓','–','–'],
  ['PDF / Excel exportieren','✓','✓','Eigene Abteilung','–'],
  ['Änderungsprotokoll sehen','✓','✓','Eigene Abteilung','–']
 ];
 el.innerHTML='<thead><tr><th>Funktion</th><th>Administrator</th><th>Marktleitung</th><th>Abteilungsleitung</th><th>Stellvertretung</th></tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map((x,i)=>`<td${i===0?' class="permission-name"':''}>${esc(x)}</td>`).join('')+'</tr>').join('')+'</tbody>';
}
const renderUsersV15Base=renderUsers;
renderUsers=function(){
 renderUsersV15Base();
 const table=$('userTable');
 if(table){
  const head=table.querySelector('thead tr');if(head&&!head.querySelector('.permission-col'))head.insertAdjacentHTML('beforeend','<th class="permission-col">Berechtigungen</th>');
  table.querySelectorAll('tbody tr').forEach((tr,i)=>{if(!tr.querySelector('.permission-col'))tr.insertAdjacentHTML('beforeend',`<td class="permission-col"><small>${esc(permissionSummary(state.users[i]?.role))}</small></td>`)});
 }
 renderRolePermissionLegend();
};
const renderAllV15Base=renderAll;
renderAll=function(){renderAllV15Base();renderRolePermissionLegend()};
window.approveVacation=function(id){
 if(!canApproveOrReject())return alert('Nur Administratoren und Marktleitung dürfen Urlaub genehmigen.');
 const v=state.vacations.find(x=>x.id===Number(id));if(!v)return;
 v.status='Genehmigt';saveState('Urlaub genehmigt',`${emp(v.employeeId)?.name||''} · ${period(v.from,v.to)}`);renderAll();
};
window.rejectVacation=function(id){
 if(!canApproveOrReject())return alert('Nur Administratoren und Marktleitung dürfen Urlaub ablehnen.');
 const v=state.vacations.find(x=>x.id===Number(id));if(!v)return;
 const reason=prompt(v.status==='Genehmigt'?'Grund für das Zurücknehmen der Genehmigung:':'Grund für die Ablehnung:','');if(reason===null)return;const finalReason=reason.trim()||'Kein Grund angegeben';
 v.status='Abgelehnt';v.rejectionReason=finalReason;saveState('Urlaub abgelehnt',`${emp(v.employeeId)?.name||''} · ${period(v.from,v.to)} · ${finalReason}`);renderAll();
};
const editVacationV15Base=window.editVacation;
window.editVacation=function(id){const v=state.vacations.find(x=>x.id===Number(id));if(!canMoveVacation(v))return alert('Urlaub verschieben dürfen nur Administrator, Marktleitung und die zuständige Abteilungsleitung.');editVacationV15Base(id)};
const deleteVacationV15Base=window.deleteVacation;
window.deleteVacation=function(id){const v=state.vacations.find(x=>x.id===Number(id));if(!canDeleteVacation(v))return alert('Diesen Urlaub darfst du nicht löschen.');deleteVacationV15Base(id)};
renderVacationList=function(choice){
 const deps=selectedDepartments(choice),ids=(choice==='__leaders__'?state.employees.filter(e=>e.leader):state.employees.filter(e=>deps.includes(e.department))).map(e=>e.id),rows=state.vacations.filter(v=>ids.includes(v.employeeId)).sort((a,b)=>localDate(a.from)-localDate(b.from));
 $('vacationList').innerHTML='<thead><tr><th>Mitarbeiter</th><th>Zeitraum</th><th>Tage</th><th>Umfang</th><th>Art</th><th>Status</th><th>Hinweis</th><th>Aktion</th></tr></thead><tbody>'+rows.map(v=>{const m=moveForVacation(v),near=nearbyHolidayWarnings(v),bw=bridgeWarnings(v),holidayHint=[...near,...bw],hint=m?`↔ Verschoben von ${m.oldPeriod}; ${m.reason||'ohne Grundangabe'}`:(v.status==='Abgelehnt'?`Abgelehnt: ${v.rejectionReason||'ohne Grundangabe'}`:(holidayHint.length?`⚠ ${holidayHint.join('; ')}`:(v.note||'–')));const actions=[];if(canMoveVacation(v))actions.push(`<button class="button tiny" onclick="editVacation(${v.id})">Verschieben/Bearbeiten</button>`);if(v.status==='Beantragt'&&canApproveOrReject())actions.push(`<button class="button tiny primary" onclick="approveVacation(${v.id})">Genehmigen</button>`);if((v.status==='Beantragt'||v.status==='Genehmigt')&&canApproveOrReject())actions.push(`<button class="button tiny danger" onclick="rejectVacation(${v.id})">Ablehnen</button>`);if(canDeleteVacation(v))actions.push(`<button class="button tiny danger" onclick="deleteVacation(${v.id})">Löschen</button>`);return `<tr data-vacation-id="${v.id}"><td>${esc(emp(v.employeeId)?.name)}</td><td>${period(v.from,v.to)}</td><td>${vacationDays(v)}</td><td>${v.scope==='full'?'Ganzer Tag':'Halber Tag'}</td><td>${esc(v.type)}</td><td>${statusBadge(v.status)}</td><td class="${holidayHint.length?'holiday-hint':''}">${esc(hint)}</td><td>${actions.join(' ')||'<span class="muted">Nur Ansicht</span>'}</td></tr>`}).join('')+'</tbody>';
};
const statusBadgeV15Base=statusBadge;
statusBadge=function(s){if(s==='Abgelehnt')return '<span class="badge rejected">Abgelehnt</span>';return statusBadgeV15Base(s)};

// v1.5.1: Der Handler ruft immer die aktuellste Kalenderfunktion auf.
// Dadurch werden Sonntage und Feiertage sofort nach einem Abteilungswechsel neu markiert.
if($('departmentFilter'))$('departmentFilter').onchange=()=>renderCalendar();
setTimeout(()=>{renderAll()},0);


/* Version 1.5.2: Kalender-Markierungen nach Abteilungswechsel zuverlässig neu anwenden */
function refreshCalendarSpecialDays(){
 const table=$('calendarTable'),monthInput=$('monthFilter');
 if(!table||!monthInput||!monthInput.value)return;
 const parts=monthInput.value.split('-').map(Number),year=parts[0],month=parts[1];
 const headers=[...table.querySelectorAll('thead th')].slice(1);
 headers.forEach((th,index)=>{
  const date=new Date(year,month-1,index+1),holiday=holidayName(date),sunday=date.getDay()===0;
  th.classList.toggle('sunday-header',sunday);
  th.classList.toggle('holiday-header',Boolean(holiday));
  th.title=holiday||date.toLocaleDateString('de-DE',{weekday:'long'});
  const existing=th.querySelector('small');
  if(holiday){
   if(existing)existing.textContent=holiday;
   else th.insertAdjacentHTML('beforeend',`<small>${esc(holiday)}</small>`);
  }else if(existing)existing.remove();
 });
 [...table.querySelectorAll('tbody tr')].forEach(row=>{
  if(row.classList.contains('department-separator'))return;
  const cells=[...row.querySelectorAll('td')].slice(1);
  cells.forEach((cell,index)=>{
   const date=new Date(year,month-1,index+1),holiday=holidayName(date),sunday=date.getDay()===0;
   cell.classList.toggle('sunday',sunday);
   cell.classList.toggle('holiday',Boolean(holiday));
   const hasAbsence=['vacation','pending-cell','planned-cell','moved-cell','critical'].some(c=>cell.classList.contains(c));
   if(!hasAbsence)cell.title=holiday||date.toLocaleDateString('de-DE',{weekday:'long'});
  });
 });
}
const renderCalendarV152Base=renderCalendar;
renderCalendar=function(){
 renderCalendarV152Base();
 refreshCalendarSpecialDays();
 requestAnimationFrame(refreshCalendarSpecialDays);
};
if($('departmentFilter'))$('departmentFilter').onchange=()=>renderCalendar();
if($('monthFilter'))$('monthFilter').onchange=()=>{if($('leaderMonthFilter'))$('leaderMonthFilter').value=$('monthFilter').value;renderCalendar()};
setTimeout(()=>{renderCalendar()},0);


/* Version 2.0: update-sichere, dauerhafte Datenspeicherung */
function normalizeV2Data(raw){
 const d=raw&&typeof raw==='object'?raw:{};
 const defaults=clone(window.DEFAULT_DATA||{});
 const departments=Array.isArray(d.departments)&&d.departments.length?[...d.departments]:[...(defaults.departments||[])];
 const result={
  ...defaults,...d,
  schemaVersion:2,
  users:Array.isArray(d.users)?d.users:(defaults.users||[]),
  departments,
  employees:Array.isArray(d.employees)?d.employees:(defaults.employees||[]),
  vacations:Array.isArray(d.vacations)?d.vacations:(defaults.vacations||[]),
  moves:Array.isArray(d.moves)?d.moves:(defaults.moves||[]),
  audit:Array.isArray(d.audit)?d.audit:(defaults.audit||[]),
  departmentSettings:{...(defaults.departmentSettings||{}),...(d.departmentSettings||{})},
  departmentMaxAway:{...(defaults.departmentMaxAway||{}),...(d.departmentMaxAway||{})},
  departmentGroups:{...(defaults.departmentGroups||{}),...(d.departmentGroups||{})},
  planGroupMaxAway:{...(defaults.planGroupMaxAway||{}),...(d.planGroupMaxAway||{})},
  leaderSettings:{maxAway:1,keyMinimum:0,...(defaults.leaderSettings||{}),...(d.leaderSettings||{})},
  syncConfig:{...(d.syncConfig||{})}
 };
 departments.forEach(dep=>{
  if(result.departmentSettings[dep]==null)result.departmentSettings[dep]=0;
  if(result.departmentMaxAway[dep]==null)result.departmentMaxAway[dep]=1;
  if(result.departmentGroups[dep]==null)result.departmentGroups[dep]='';
 });
 result.employees=result.employees.map(e=>({...e,carryover:Number(e.carryover||0),active:e.active!==false,keyLeader:e.keyLeader===true}));
 result.vacations=result.vacations.map(v=>({...v,status:v.status||'Genehmigt',scope:v.scope||'full'}));
 const groups=[...new Set(departments.map(dep=>String(result.departmentGroups[dep]||'').trim()).filter(Boolean))];
 groups.forEach(group=>{if(result.planGroupMaxAway[group]==null)result.planGroupMaxAway[group]=1;});
 return result;
}
function updateStorageInfo(){
 const el=$('storageInfo');if(!el)return;
 const meta=window.UrlaubsplanerStorage?.meta?.()||{};
 const groups=[...new Set(Object.values(state.departmentGroups||{}).filter(Boolean))].length;
 el.innerHTML=`Letzte Speicherung: <strong>${meta.lastSavedAt?new Date(meta.lastSavedAt).toLocaleString('de-DE'):'noch nicht gespeichert'}</strong> · ${state.employees.length} Mitarbeiter · ${state.vacations.length} Abwesenheiten · ${groups} Plan-Gruppe(n).<br><small>Die Daten bleiben bei Updates erhalten, solange dieselbe GitHub-Pages-Adresse und derselbe Browser verwendet werden.</small>`;
}
function migrateToV2(){
 const raw=window.UrlaubsplanerStorage?.load?.()||state||window.DEFAULT_DATA;
 state=normalizeV2Data(raw);
 state=window.UrlaubsplanerStorage?.save(state)||state;
 updateStorageInfo();
}
const exportBackupV2Base=typeof exportBackup==='function'?exportBackup:null;
exportBackup=function(){
 const payload=window.UrlaubsplanerStorage?.exportPayload(state)||state;
 download(`Urlaubsplaner-Sicherung-${iso(new Date())}.json`,JSON.stringify(payload,null,2),'application/json');
 if($('backupStatus'))$('backupStatus').textContent='Sicherung mit Mitarbeitern, Urlauben, Abteilungen und Plan-Gruppen wurde erstellt.';
};
importBackup=function(event){
 const file=event.target.files?.[0];if(!file)return;
 const reader=new FileReader();reader.onload=()=>{try{const imported=window.UrlaubsplanerStorage.importPayload(reader.result);state=normalizeV2Data(imported);state=window.UrlaubsplanerStorage.save(state);fillLogin();renderAll();updateStorageInfo();$('backupStatus').textContent='Sicherung erfolgreich importiert.'}catch(err){$('backupStatus').textContent=err.message||'Import fehlgeschlagen.'}finally{event.target.value=''}};reader.readAsText(file);
};
const renderAllV2Base=renderAll;
renderAll=function(){renderAllV2Base();updateStorageInfo()};
migrateToV2();
if($('backupExport'))$('backupExport').onclick=exportBackup;
if($('backupImport'))$('backupImport').onchange=importBackup;
setTimeout(()=>{renderAll();updateStorageInfo()},0);


/* Version 2.1: Feiertage klarer vom Urlaub absetzen */
function applyHolidayColumnDesign(){
 const table=$('calendarTable'),monthInput=$('monthFilter');
 if(!table||!monthInput||!monthInput.value)return;
 const [year,month]=monthInput.value.split('-').map(Number);
 const headers=[...table.querySelectorAll('thead th')].slice(1);
 headers.forEach((th,index)=>{
  const date=new Date(year,month-1,index+1),name=holidayName(date),isHoliday=Boolean(name);
  th.classList.toggle('holiday-column',isHoliday);
  th.classList.toggle('holiday-header',isHoliday);
  if(isHoliday){
   th.title=`${name} · gesetzlicher Feiertag in Berlin`;
   let star=th.querySelector('.holiday-star');
   if(!star){star=document.createElement('span');star.className='holiday-star';star.textContent='★';th.prepend(star)}
   let label=th.querySelector('small');
   if(!label){label=document.createElement('small');th.appendChild(label)}
   label.textContent=name;
  }else{
   th.querySelector('.holiday-star')?.remove();
  }
 });
 [...table.querySelectorAll('tbody tr')].forEach(row=>{
  if(row.classList.contains('department-separator'))return;
  [...row.querySelectorAll('td')].slice(1).forEach((cell,index)=>{
   const date=new Date(year,month-1,index+1),name=holidayName(date),isHoliday=Boolean(name);
   cell.classList.toggle('holiday-column',isHoliday);
   if(isHoliday){
    const hasAbsence=['vacation','pending-cell','planned-cell','moved-cell','critical'].some(c=>cell.classList.contains(c));
    if(!hasAbsence)cell.classList.add('holiday');
    cell.title=[cell.title,name,'Gesetzlicher Feiertag – zählt nicht als Urlaubstag'].filter(Boolean).join(' · ');
   }
  });
 });
 const holidayList=document.querySelector('.holiday-list');
 if(holidayList){
  const matches=[...holidayList.textContent.matchAll(/(\d{1,2}\.\d{1,2}\.\s+[^·]+)/g)].map(m=>m[1].trim());
  if(matches.length)holidayList.innerHTML=`<strong>Feiertage im Monat:</strong><div class="holiday-chips">${matches.map(x=>`<span class="holiday-chip">★ ${esc(x)}</span>`).join('')}</div>`;
 }
}
const renderCalendarV21Base=renderCalendar;
renderCalendar=function(){
 renderCalendarV21Base();
 applyHolidayColumnDesign();
 requestAnimationFrame(applyHolidayColumnDesign);
};
if($('departmentFilter'))$('departmentFilter').onchange=()=>renderCalendar();
if($('monthFilter'))$('monthFilter').onchange=()=>{if($('leaderMonthFilter'))$('leaderMonthFilter').value=$('monthFilter').value;renderCalendar()};
setTimeout(()=>renderCalendar(),0);


/* Version 4.6: automatische Supabase-Synchronisierung mit sicherem App-Start */
const APP_VERSION='5.4.0';
let autoSyncTimer=null;
let autoPushTimer=null;
let autoSyncBusy=false;
let autoSyncLastCheck=0;
let initialCloudLoadDone=false;
let automaticSyncStarted=false;

function recoverCloudConfigFromForm(){
 const endpoint=normalizeEndpoint($('syncEndpoint')?.value||'');
 const token=String($('syncToken')?.value||'').trim();
 const accessCode=String($('syncAccessCode')?.value||'').trim();
 let changed=false;
 if(!syncConfig.endpoint&&endpoint){syncConfig.endpoint=endpoint;changed=true}
 if(!syncConfig.token&&token){syncConfig.token=token;changed=true}
 if(!syncConfig.accessCode&&accessCode){syncConfig.accessCode=accessCode;changed=true}
 if(changed){syncConfig.auto=true;syncConfig.status='unknown';saveSyncConfig()}
 return changed;
}
function cloudConfigured(){
 recoverCloudConfigFromForm();
 return Boolean(syncConfig.endpoint && syncConfig.token && syncConfig.accessCode);
}

async function automaticPull({force=false,startup=false}={}){
 if(autoSyncBusy || !cloudConfigured() || !navigator.onLine)return false;
 if(!startup && !force && Number(syncConfig.pending||0)>0)return automaticPush();

 autoSyncBusy=true;
 window.__urlaubAutoSyncBusy=true;
 renderSync();
 autoSyncLastCheck=Date.now();
 try{
  setSyncMessage(startup?'Supabase-Daten werden beim Start geladen …':'Neue Supabase-Daten werden geprüft …',true);
  const remote=await rpc('get_app_state',{
   p_workspace_id:WORKSPACE_ID,
   p_access_code:syncConfig.accessCode
  });

  if(!remote?.payload){
   syncConfig.status='online';
   syncConfig.lastSync=new Date().toISOString();
   saveSyncConfig();
   renderSync();
   setSyncMessage('Supabase ist verbunden, enthält aber noch keinen Datenstand.',false);
   initialCloudLoadDone=true;
   return false;
  }

  const remoteRevision=Number(remote.revision||0);
  const localRevision=Number(syncConfig.revision||0);
  if(startup || force || remoteRevision>localRevision){
   state=normalize(remote.payload);
   syncConfig.pending=0;
   syncConfig.revision=remoteRevision;
   syncConfig.lastSync=remote.updated_at||new Date().toISOString();
   syncConfig.status='online';
   saveSyncConfig();
   state=window.UrlaubsplanerStorage?.save(state)||state;
   localStorage.setItem(STORE,JSON.stringify(state));
   fillLogin();
   renderAll();
   setSyncMessage('Supabase-Daten wurden automatisch geladen.',true);
  }else{
   syncConfig.status='online';
   syncConfig.lastSync=remote.updated_at||syncConfig.lastSync||new Date().toISOString();
   saveSyncConfig();
   renderSync();
   setSyncMessage('Daten sind aktuell.',true);
  }
  initialCloudLoadDone=true;
  return true;
 }catch(e){
  syncConfig.status='offline';
  saveSyncConfig();
  renderSync();
  setSyncMessage('Automatisches Laden fehlgeschlagen: '+String(e?.message||e),false);
  return false;
 }finally{
  autoSyncBusy=false;
  window.__urlaubAutoSyncBusy=false;
  renderSync();
 }
}

async function automaticPush(){
 if(autoSyncBusy || !cloudConfigured() || !navigator.onLine)return false;
 autoSyncBusy=true;
 window.__urlaubAutoSyncBusy=true;
 renderSync();
 try{
  setSyncMessage('Änderungen werden automatisch gespeichert …',true);
  await rpc('initialize_workspace',{
   p_workspace_id:WORKSPACE_ID,
   p_access_code:syncConfig.accessCode
  });
  const info=await rpc('save_app_state',{
   p_workspace_id:WORKSPACE_ID,
   p_access_code:syncConfig.accessCode,
   p_base_revision:Number(syncConfig.revision||0),
   p_device_id:syncConfig.deviceId,
   p_payload:state
  });
  syncConfig.pending=0;
  syncConfig.revision=Number(info?.revision||0);
  syncConfig.lastSync=info?.updated_at||new Date().toISOString();
  syncConfig.status='online';
  saveSyncConfig();
  renderSync();
  setSyncMessage('Automatisch in Supabase gespeichert.',true);
  return true;
 }catch(e){
  const msg=String(e?.message||e);
  if(msg.includes('REVISION_CONFLICT')){
   autoSyncBusy=false;
   window.__urlaubAutoSyncBusy=false;
   renderSync();
   return automaticPull({force:true});
  }
  syncConfig.status='offline';
  saveSyncConfig();
  renderSync();
  setSyncMessage('Automatisches Speichern fehlgeschlagen: '+msg,false);
  return false;
 }finally{
  autoSyncBusy=false;
  window.__urlaubAutoSyncBusy=false;
  renderSync();
 }
}

function startAutomaticSync(){
 clearInterval(autoSyncTimer);
 if(!cloudConfigured())return;
 automaticSyncStarted=true;
 syncConfig.auto=true;
 saveSyncConfig();
 if($('syncAuto'))$('syncAuto').checked=true;
 setTimeout(()=>automaticPull({startup:true}),250);
 autoSyncTimer=setInterval(()=>automaticPull(),30000);
}

const saveSyncSettingsBaseV46=saveSyncSettings;
saveSyncSettings=function(){
 saveSyncSettingsBaseV46();
 if(cloudConfigured()){
  syncConfig.auto=true;
  saveSyncConfig();
  renderSync();
  startAutomaticSync();
 }else{
  automaticSyncStarted=false;
  clearInterval(autoSyncTimer);
 }
};

scheduleAutoSync=function(){
 if(!cloudConfigured())return;
 syncConfig.auto=true;
 saveSyncConfig();
 clearTimeout(autoPushTimer);
 autoPushTimer=setTimeout(()=>automaticPush(),650);
};

window.addEventListener('online',()=>automaticPull({startup:!initialCloudLoadDone}));
window.addEventListener('focus',()=>{
 if(Date.now()-autoSyncLastCheck>2000)automaticPull({startup:!initialCloudLoadDone});
});
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='visible'&&Date.now()-autoSyncLastCheck>2000){
  automaticPull({startup:!initialCloudLoadDone});
 }
});

/* Start both for normal browser pages and already-installed PWA windows. */
function bootAutomaticSync(){
 recoverCloudConfigFromForm();
 renderSync();
 if(!cloudConfigured())return;
 if(!automaticSyncStarted||!autoSyncTimer)startAutomaticSync();
}
if(document.readyState==='complete')setTimeout(bootAutomaticSync,0);
else window.addEventListener('load',bootAutomaticSync,{once:true});
[250,1000,2500,5000,9000].forEach(delay=>setTimeout(bootAutomaticSync,delay));
setInterval(()=>{
 bootAutomaticSync();
 if(cloudConfigured()&&!autoSyncBusy&&Date.now()-autoSyncLastCheck>45000)automaticPull({startup:!initialCloudLoadDone});
},15000);

/* Version 4.6: PDF-Fix, eindeutige Grenzwerte und wiederhergestelltes AutoSync */

/* Version 5.0: Abteilungs-Dashboard, farbiger PDF-Export und globale Statuslampe */

/* Version 5.1: AutoSync-Startfehler durch Statuslampen-TDZ behoben */


/* Version 5.2: robuste Kalenderdekoration und AutoSync-Wächter */
function decorateCalendarSpecialDaysV52(){
 const table=$('calendarTable'),monthInput=$('monthFilter');
 if(!table||!monthInput?.value)return;
 const [year,month]=monthInput.value.split('-').map(Number);
 const weekdays=['So','Mo','Di','Mi','Do','Fr','Sa'];
 const headers=[...table.querySelectorAll('thead tr:first-child th')].slice(1);
 headers.forEach((th,index)=>{
  const date=new Date(year,month-1,index+1),sunday=date.getDay()===0,holiday=holidayName(date);
  th.classList.toggle('v52-sunday-column',sunday);
  th.classList.toggle('v52-holiday-column',Boolean(holiday));
  th.dataset.weekday=weekdays[date.getDay()];
  let wd=th.querySelector('.v52-weekday');
  if(!wd){wd=document.createElement('span');wd.className='v52-weekday';th.appendChild(wd)}
  wd.textContent=weekdays[date.getDay()];
  th.title=holiday?`${holiday} · gesetzlicher Feiertag in Berlin`:date.toLocaleDateString('de-DE',{weekday:'long'});
 });
 [...table.querySelectorAll('tbody tr')].forEach(row=>{
  if(row.classList.contains('department-separator'))return;
  [...row.querySelectorAll('td')].slice(1).forEach((cell,index)=>{
   const date=new Date(year,month-1,index+1),sunday=date.getDay()===0,holiday=holidayName(date);
   cell.classList.toggle('v52-sunday-column',sunday);
   cell.classList.toggle('v52-holiday-column',Boolean(holiday));
   if(!cell.title||!cell.textContent.trim())cell.title=holiday||date.toLocaleDateString('de-DE',{weekday:'long'});
  });
 });
}
const renderCalendarV52Base=renderCalendar;
renderCalendar=function(){
 renderCalendarV52Base();
 decorateCalendarSpecialDaysV52();
 requestAnimationFrame(decorateCalendarSpecialDaysV52);
 setTimeout(decorateCalendarSpecialDaysV52,50);
};
if($('departmentFilter'))$('departmentFilter').onchange=()=>renderCalendar();
if($('monthFilter'))$('monthFilter').onchange=()=>{if($('leaderMonthFilter'))$('leaderMonthFilter').value=$('monthFilter').value;renderCalendar()};
const calendarObserverV52=new MutationObserver(()=>requestAnimationFrame(decorateCalendarSpecialDaysV52));
if($('calendarTable'))calendarObserverV52.observe($('calendarTable'),{childList:true,subtree:true});
window.addEventListener('online',bootAutomaticSync);
setTimeout(()=>{decorateCalendarSpecialDaysV52();bootAutomaticSync()},100);


/* Version 5.3: Dashboard-Reihenfolge und monatsbezogene Urlaubsliste */
renderVacationList=function(choice){
 const monthValue=$('monthFilter')?.value;
 const fallback=new Date();
 const [year,month]=monthValue?monthValue.split('-').map(Number):[fallback.getFullYear(),fallback.getMonth()+1];
 const monthStart=new Date(year,month-1,1),monthEnd=new Date(year,month,0,23,59,59,999);
 const deps=selectedDepartments(choice);
 const employees=choice==='__leaders__'?state.employees.filter(e=>e.leader):state.employees.filter(e=>deps.includes(e.department));
 const ids=new Set(employees.map(e=>Number(e.id)));
 const rows=state.vacations
  .filter(v=>ids.has(Number(v.employeeId))&&localDate(v.from)<=monthEnd&&localDate(v.to)>=monthStart)
  .sort((a,b)=>localDate(a.from)-localDate(b.from)||String(emp(a.employeeId)?.name||'').localeCompare(String(emp(b.employeeId)?.name||''),'de'));
 const monthLabel=monthStart.toLocaleDateString('de-DE',{month:'long',year:'numeric'});
 if($('vacationListMonth'))$('vacationListMonth').textContent=monthLabel;
 if($('vacationListCount'))$('vacationListCount').textContent=`${rows.length} Eintrag${rows.length===1?'':'e'}`;
 const head='<thead><tr><th>Mitarbeiter</th><th>Zeitraum</th><th>Tage</th><th>Umfang</th><th>Art</th><th>Status</th><th>Hinweis</th><th>Aktion</th></tr></thead>';
 if(!rows.length){
  $('vacationList').innerHTML=head+`<tbody><tr><td colspan="8" class="empty-state">Keine Urlaubseinträge für ${esc(monthLabel)} in der gewählten Abteilung.</td></tr></tbody>`;
  return;
 }
 $('vacationList').innerHTML=head+'<tbody>'+rows.map(v=>{
  const m=moveForVacation(v),near=nearbyHolidayWarnings(v),bw=bridgeWarnings(v),holidayHint=[...near,...bw];
  const hint=m?`↔ Verschoben von ${m.oldPeriod}; ${m.reason||'ohne Grundangabe'}`:(v.status==='Abgelehnt'?`Abgelehnt: ${v.rejectionReason||'ohne Grundangabe'}`:(holidayHint.length?`⚠ ${holidayHint.join('; ')}`:(v.note||'–')));
  const actions=[];
  if(canMoveVacation(v))actions.push(`<button class="button tiny" onclick="editVacation(${v.id})">Verschieben/Bearbeiten</button>`);
  if(v.status==='Beantragt'&&canApproveOrReject())actions.push(`<button class="button tiny primary" onclick="approveVacation(${v.id})">Genehmigen</button>`);
  if((v.status==='Beantragt'||v.status==='Genehmigt')&&canApproveOrReject())actions.push(`<button class="button tiny danger" onclick="rejectVacation(${v.id})">Ablehnen</button>`);
  if(canDeleteVacation(v))actions.push(`<button class="button tiny danger" onclick="deleteVacation(${v.id})">Löschen</button>`);
  return `<tr data-vacation-id="${v.id}"><td>${esc(emp(v.employeeId)?.name)}</td><td>${period(v.from,v.to)}</td><td>${vacationDays(v)}</td><td>${v.scope==='full'?'Ganzer Tag':'Halber Tag'}</td><td>${esc(v.type)}</td><td>${statusBadge(v.status)}</td><td class="${holidayHint.length?'holiday-hint':''}">${esc(hint)}</td><td>${actions.join(' ')||'<span class="muted">Nur Ansicht</span>'}</td></tr>`;
 }).join('')+'</tbody>';
};
const renderCalendarV53Base=renderCalendar;
renderCalendar=function(){
 renderCalendarV53Base();
 const choice=$('departmentFilter')?.value||state.departments[0];
 renderVacationList(choice);
};
if($('departmentFilter'))$('departmentFilter').onchange=()=>renderCalendar();
if($('monthFilter'))$('monthFilter').onchange=()=>{if($('leaderMonthFilter'))$('leaderMonthFilter').value=$('monthFilter').value;renderCalendar()};
setTimeout(()=>renderCalendar(),0);


/* Version 5.4: Dashboard-Sprungziele und ruhigere Synchronisierung */
function openAppPageV54(page){
 document.querySelectorAll('#navigation button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
 document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));
 const target=$('page-'+page);if(target)target.classList.remove('hidden');
}
function monthValueFromDateV54(value){
 const d=typeof value==='string'?localDate(value):value;
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function peakDateV54(employeeIds,allowed){
 const ids=new Set(employeeIds.map(Number));
 const relevant=state.vacations.filter(v=>ids.has(Number(v.employeeId))&&v.status!=='Geplant');
 const dates=allDates(relevant).sort((a,b)=>a-b);
 for(const date of dates){
  const count=relevant.filter(v=>inRange(date,v.from,v.to)&&isDisplayAbsenceDay(v,date)).length;
  if(count>allowed)return date;
 }
 return dates[0]||new Date();
}
window.jumpToMonthPlanV54=function({department,date,vacationId,day}={}){
 openAppPageV54('calendar');
 if(department&&$('departmentFilter'))$('departmentFilter').value=department;
 if(date&&$('monthFilter'))$('monthFilter').value=monthValueFromDateV54(date);
 if($('leaderMonthFilter')&&$('monthFilter'))$('leaderMonthFilter').value=$('monthFilter').value;
 renderCalendar();
 requestAnimationFrame(()=>{
  const panel=$('page-calendar');
  panel?.scrollIntoView({behavior:'smooth',block:'start'});
  setTimeout(()=>{
   let target=null;
   if(vacationId)target=document.querySelector(`#vacationList tr[data-vacation-id="${vacationId}"]`);
   if(!target&&day){
    const header=[...document.querySelectorAll('#calendarTable thead th')].find((th,i)=>i===Number(day));
    target=header||null;
   }
   if(target){target.classList.add('v54-jump-highlight');target.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>target.classList.remove('v54-jump-highlight'),2600)}
  },180);
 });
};
const renderDashboardV54Base=renderDashboard;
renderDashboard=function(){
 renderDashboardV54Base();
 const warningBox=$('warnings');if(!warningBox)return;
 const cards=[];
 const pendingRows=state.vacations.filter(v=>v.status==='Beantragt').sort((a,b)=>localDate(a.from)-localDate(b.from));
 if(pendingRows.length){
  const first=pendingRows[0],e=emp(first.employeeId);
  cards.push(`<div class="warning v54-warning-row"><span><strong>Freigaben:</strong> ${pendingRows.length} Urlaubsantrag${pendingRows.length===1?'':'träge'} wartet${pendingRows.length===1?'':'en'} auf Entscheidung.</span><button class="button tiny v54-jump-button" onclick='jumpToMonthPlanV54(${JSON.stringify({department:e?.department||state.departments[0],date:first.from,vacationId:first.id})})'>Im Monatsplan anzeigen</button></div>`);
 }
 state.departments.forEach(dep=>{
  const allowed=Number(state.departmentMaxAway?.[dep]??1),ids=state.employees.filter(e=>e.department===dep).map(e=>e.id),date=peakDateV54(ids,allowed);
  const peak=maxOverlapForDepartment(dep);
  if(peak>allowed)cards.push(`<div class="warning warning-danger v54-warning-row"><span><strong>${esc(dep)} – Grenze überschritten:</strong> Bis zu ${peak} Personen gleichzeitig abwesend. Zulässig sind ${allowed}; die Warnung beginnt bei ${allowed+1}.</span><button class="button tiny v54-jump-button" onclick='jumpToMonthPlanV54(${JSON.stringify({department:dep,date:iso(date),day:date.getDate()})})'>Im Monatsplan anzeigen</button></div>`);
 });
 const leaderAllowed=Number(state.leaderSettings?.maxAway??1),leaderIds=state.employees.filter(e=>e.leader).map(e=>e.id),leaderPeak=leaderOverlapCount();
 if(leaderPeak>leaderAllowed){const date=peakDateV54(leaderIds,leaderAllowed);cards.push(`<div class="warning warning-danger v54-warning-row"><span><strong>Leiterplan – Grenze überschritten:</strong> Bis zu ${leaderPeak} Leitungen gleichzeitig abwesend. Zulässig sind ${leaderAllowed}; die Warnung beginnt bei ${leaderAllowed+1}.</span><button class="button tiny v54-jump-button" onclick='jumpToMonthPlanV54(${JSON.stringify({department:'__leaders__',date:iso(date),day:date.getDate()})})'>Im Monatsplan anzeigen</button></div>`)}
 warningBox.innerHTML=cards.join('')||'<div class="capacity-ok"><strong>Alles in Ordnung:</strong> Keine eingestellte Abwesenheitsgrenze ist überschritten.</div>';
};
setTimeout(()=>renderDashboard(),0);
