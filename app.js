const $=id=>document.getElementById(id),clone=o=>JSON.parse(JSON.stringify(o));
const STORE='vacationPlannerV091',OLD_STORES=['vacationPlannerV09','vacationPlannerV07','vacationPlannerV06','vacationPlannerV05','vacationPlannerV04','vacationPlannerV03','vacationPlannerV02'];
let currentUser=null;
function normalize(raw){
 const b=clone(window.DEFAULT_DATA),d=raw&&typeof raw==='object'?raw:{};
 const merged={...b,...d};
 merged.users=Array.isArray(d.users)?d.users:b.users;
 merged.departments=Array.isArray(d.departments)&&d.departments.length?d.departments:b.departments;
 merged.departmentSettings={...(b.departmentSettings||{}),...(d.departmentSettings||{})};
 merged.departmentMaxAway={...(b.departmentMaxAway||{}),...(d.departmentMaxAway||{})};
 merged.departmentGroups={...(b.departmentGroups||{}),...(d.departmentGroups||{})};
 merged.departmentGroupIds={...(b.departmentGroupIds||{}),...(d.departmentGroupIds||{})};
 merged.planGroupMaxAway={...(b.planGroupMaxAway||{}),...(d.planGroupMaxAway||{})};
 merged.planGroups=Array.isArray(d.planGroups)?d.planGroups.map(g=>({id:String(g.id||('pg_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7))),name:String(g.name||'').trim(),maxAway:Math.max(0,Number(g.maxAway??2))})).filter(g=>g.name):[];
 merged.employees=(Array.isArray(d.employees)?d.employees:b.employees).map(e=>({...e,carryover:Number(e.carryover||0),planGroupId:String(e.planGroupId||''),departmentHistory:Array.isArray(e.departmentHistory)?e.departmentHistory:[]}));
 merged.vacations=(Array.isArray(d.vacations)?d.vacations:b.vacations).map(v=>({...v,status:v.status||'Genehmigt',scope:v.scope||'full'}));
 merged.moves=Array.isArray(d.moves)?d.moves:b.moves;
 merged.audit=Array.isArray(d.audit)?d.audit:[];
 merged.departments.forEach(x=>{if(merged.departmentSettings[x]==null)merged.departmentSettings[x]=0;if(merged.departmentMaxAway[x]==null)merged.departmentMaxAway[x]=Math.max(0,Number(merged.departmentSettings[x]??1));if(merged.departmentGroupIds[x]==null)merged.departmentGroupIds[x]=''});
 return merged;
}
function loadState(){try{let raw=localStorage.getItem(STORE);if(!raw)for(const k of OLD_STORES){raw=localStorage.getItem(k);if(raw)break}return raw?normalize(JSON.parse(raw)):normalize(window.DEFAULT_DATA)}catch{return normalize(window.DEFAULT_DATA)}}
let state=loadState();
function saveState(){localStorage.setItem(STORE,JSON.stringify(state))}
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
function workingDays(a,b){let n=0,d=localDate(a),end=localDate(b);for(;d<=end;d.setDate(d.getDate()+1))if(![0,6].includes(d.getDay())&&!holidayName(d))n++;return n}
function vacationDays(v){const days=workingDays(v.from,v.to);return v.scope==='full'?days:Math.min(.5,days*.5)}
function countsAgainstVacation(v){return v.type==='Urlaub'}
function moveForVacation(v){
 if(!v)return null;
 if(v.moveInfo)return v.moveInfo;
 const compact=x=>String(x||'').replace(/\s/g,'').replace(/[–—]/g,'-');
 const current=compact(period(v.from,v.to)),fromDE=localDate(v.from).toLocaleDateString('de-DE'),toDE=localDate(v.to).toLocaleDateString('de-DE');
 return [...(state.moves||[])].reverse().find(m=>Number(m.vacationId)===Number(v.id)||(Number(m.employeeId)===Number(v.employeeId)&&(compact(m.newPeriod)===current||compact(m.newPeriod).includes(compact(fromDE))&&compact(m.newPeriod).includes(compact(toDE)))))||(v.moved?{oldPeriod:'Früherer Zeitraum',newPeriod:period(v.from,v.to),reason:v.note||'Verschoben'}:null)
}
function absenceCode(v){return ({Urlaub:'U',Sonderurlaub:'SU',Fortbildung:'S',Unbezahlt:'N',Krankheit:'K','Geplanter Freier Tag':'F'}[v.type]||'A')+(v.scope!=='full'?'½':'')+(moveForVacation(v)?'↔':'')}
function vacationTitle(v,date,extra=''){const m=v?moveForVacation(v):null;return [extra,v?.type,v?.status,m?`Verschoben von ${m.oldPeriod} auf ${m.newPeriod}`:'',m?.reason?`Grund: ${m.reason}`:'',v?.note,holidayName(date)].filter(Boolean).join(' · ')}
function statusBadge(s){const c=s==='Genehmigt'?'approved':s==='Beantragt'?'pending':s==='Abgelehnt'?'rejected':'planned';return `<span class="badge ${c}">${esc(s)}</span>`}
function init(){fillLogin();setDefaults();bind();renderAll()}
function fillLogin(){$('loginName').innerHTML=state.users.map(u=>`<option>${esc(u.name)}</option>`).join('')}
function setDefaults(){const d=new Date(),month=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;$('monthFilter').value=month;$('leaderMonthFilter').value=month;$('yearFilter').value=d.getFullYear();$('weekDate').value=iso(d);$('vacationFrom').value=$('vacationTo').value=iso(d)}
function bind(){
 $('loginButton').onclick=login;$('loginPin').addEventListener('keydown',e=>{if(e.key==='Enter')login()});$('logoutButton').onclick=()=>{$('application').classList.add('hidden');$('loginPage').classList.remove('hidden');$('loginPin').value='';currentUser=null};
 $('navigation').onclick=e=>{const p=e.target.dataset.page;if(!p)return;document.querySelectorAll('#navigation button').forEach(b=>b.classList.toggle('active',b===e.target));document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));$('page-'+p).classList.remove('hidden');renderAll()};
 $('departmentFilter').onchange=renderCalendar;$('yearDepartmentFilter').onchange=renderYear;$('yearFilter').onchange=renderYear;$('yearStatusFilter').onchange=renderYear;$('printYearPlan').onclick=()=>window.print();$('exportYearCsv').onclick=exportYearCsv;$('monthFilter').onchange=()=>{if($('leaderMonthFilter'))$('leaderMonthFilter').value=$('monthFilter').value;renderCalendar();};$('previousMonth').onclick=()=>changeCalendarMonth(-1);$('nextMonth').onclick=()=>changeCalendarMonth(1);$('leaderMonthFilter').onchange=renderLeaders;$('weekDate').onchange=renderWeek;$('showVacationForm').onclick=openNewVacation;$('cancelVacation').onclick=closeVacationForm;$('saveVacation').onclick=saveVacation;
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
function renderDashboard(){const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),limit=new Date(today);limit.setDate(limit.getDate()+28);$('departmentCount').textContent=state.departments.length;$('employeeCount').textContent=state.employees.length;$('leaderCount').textContent=state.employees.filter(e=>e.leader).length;$('plannedDays').textContent=state.vacations.filter(v=>v.status==='Genehmigt'&&countsAgainstVacation(v)).reduce((s,v)=>s+vacationDays(v),0);const dateText=today.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});$('todayLabel').textContent=dateText;if($('dashboardDate'))$('dashboardDate').textContent=dateText;if($('dashboardWeekday'))$('dashboardWeekday').textContent=today.toLocaleDateString('de-DE',{weekday:'long'});const w=[];state.departments.forEach(dep=>{const m=maxOverlapForDepartment(dep);if(m>=2)w.push(`<div class="warning ${m>=3?'warning-danger':''}"><strong>${esc(dep)}:</strong> Bis zu ${m} Personen gleichzeitig abwesend.</div>`)});const l=leaderOverlapCount();if(l>=2)w.push(`<div class="warning warning-danger"><strong>Leiterplan:</strong> Bis zu ${l} Leiter gleichzeitig abwesend.</div>`);const pending=state.vacations.filter(v=>v.status==='Beantragt').length;if(pending)w.unshift(`<div class="warning"><strong>Freigaben:</strong> ${pending} Urlaubsantrag${pending===1?'':'träge'} wartet${pending===1?'':'en'} auf Entscheidung.</div>`);$('warnings').innerHTML=w.join('')||'<div class="warning"><strong>Alles in Ordnung:</strong> Keine kritischen Überschneidungen gefunden.</div>';const rows=state.vacations.filter(v=>v.type==='Urlaub'&&v.status!=='Geplant'&&localDate(v.to)>=today&&localDate(v.from)<=limit).sort((a,b)=>localDate(a.from)-localDate(b.from));$('upcomingTable').innerHTML='<thead><tr><th>Name</th><th>KW</th><th>Abteilung</th><th>Zeitraum</th><th>Status</th></tr></thead><tbody>'+rows.map(v=>{const e=emp(v.employeeId),shownFrom=localDate(v.from)<today?iso(today):v.from,shownTo=localDate(v.to)>limit?iso(limit):v.to;return `<tr><td><strong>${esc(e?.name)}</strong></td><td>${weekLabel(shownFrom,shownTo)}</td><td>${esc(e?.department)}</td><td>${period(v.from,v.to)}</td><td>${statusBadge(v.status)}</td></tr>`}).join('')+(rows.length?'':'<tr><td colspan="5" class="muted">In den nächsten vier Wochen ist kein Urlaub eingetragen.</td></tr>')+'</tbody>'}
function renderEmployees(){$('employeeListCount').textContent=`${state.employees.length} Mitarbeiter`;$('employeeTable').innerHTML='<thead><tr><th>Name</th><th>Abteilung</th><th>Stunden</th><th>Anspruch</th><th>Übertrag</th><th>Genehmigt</th><th>Rest</th><th>Leiter</th><th>Vertretung</th><th>Aktion</th></tr></thead><tbody>'+state.employees.map(e=>{const planned=vacsFor(e.id).filter(v=>v.status==='Genehmigt'&&countsAgainstVacation(v)).reduce((s,v)=>s+vacationDays(v),0),total=Number(e.vacationDays||0)+Number(e.carryover||0),rest=total-planned;return `<tr><td>${esc(e.name)}</td><td>${esc(e.department)}</td><td>${e.hours}</td><td>${e.vacationDays}</td><td>${e.carryover||0}</td><td>${planned}</td><td class="${rest<0?'negative':'positive'}">${rest}</td><td>${e.leader?'Ja':'Nein'}</td><td>${esc(e.substitute||'–')}</td><td><button class="button tiny" onclick="editEmployee(${e.id})">Bearbeiten</button> <button class="button tiny danger" onclick="deleteEmployee(${e.id})">Löschen</button></td></tr>`}).join('')+'</tbody>'}
function saveEmployee(){const name=$('employeeName').value.trim();if(!name)return alert('Bitte einen Namen eingeben.');const id=Number($('editingEmployeeId').value),obj={name,department:$('employeeDepartment').value,hours:Number($('employeeHours').value),vacationDays:Number($('employeeVacationDays').value),carryover:Number($('employeeCarryover').value||0),leader:$('employeeLeader').checked,substitute:$('employeeSubstitute').value};if(id){const e=emp(id);Object.assign(e,obj)}else state.employees.push({id:Date.now(),...obj});saveState();clearEmployeeForm();renderAll()}
window.editEmployee=id=>{const e=emp(id);if(!e)return;$('editingEmployeeId').value=id;$('employeeName').value=e.name;$('employeeDepartment').value=e.department;$('employeeHours').value=e.hours;$('employeeVacationDays').value=e.vacationDays;$('employeeCarryover').value=e.carryover||0;$('employeeLeader').checked=e.leader;$('employeeSubstitute').value=e.substitute||'';$('addEmployee').textContent='Änderungen speichern';$('cancelEmployeeEdit').classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'})}
function clearEmployeeForm(){$('editingEmployeeId').value='';$('employeeName').value='';$('employeeHours').value=37;$('employeeVacationDays').value=36;$('employeeCarryover').value=0;$('employeeLeader').checked=false;$('employeeSubstitute').value='';$('addEmployee').textContent='Mitarbeiter hinzufügen';$('cancelEmployeeEdit').classList.add('hidden')}
window.deleteEmployee=id=>{if(!confirm('Mitarbeiter und zugehörige Urlaube wirklich löschen?'))return;state.employees=state.employees.filter(e=>e.id!==id);state.vacations=state.vacations.filter(v=>v.employeeId!==id);state.moves=state.moves.filter(m=>m.employeeId!==id);saveState();renderAll()}
function countDepartmentAbsence(dep,date){const ids=state.employees.filter(e=>e.department===dep).map(e=>e.id);return state.vacations.filter(v=>ids.includes(v.employeeId)&&v.status!=='Geplant'&&inRange(date,v.from,v.to)).length}
function renderCalendar(){const dep=$('departmentFilter').value||state.departments[0],leaderMode=dep==='__leaders__',parts=$('monthFilter').value.split('-').map(Number),year=parts[0],month=parts[1],emps=leaderMode?state.employees.filter(e=>e.leader):state.employees.filter(e=>e.department===dep),days=new Date(year,month,0).getDate();$('vacationEmployee').innerHTML=emps.map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('');let h='<thead><tr><th class="employee-name">Mitarbeiter</th>';for(let d=1;d<=days;d++)h+=`<th>${d}</th>`;h+='</tr></thead><tbody>';for(const e of emps){h+=`<tr><td class="employee-name"><strong>${esc(e.name)}</strong>${leaderMode?`<br><small>${esc(e.department)} · Vertretung: ${esc(e.substitute||'Keine')}</small>`:e.leader?' <span class="badge leader-badge">Leiter</span>':''}</td>`;for(let d=1;d<=days;d++){const date=new Date(year,month-1,d),v=vacsFor(e.id).find(x=>inRange(date,x.from,x.to)),overlap=leaderMode?emps.filter(l=>vacsFor(l.id).some(x=>x.status!=='Geplant'&&inRange(date,x.from,x.to))).length:countDepartmentAbsence(dep,date);let cls=[0,6].includes(date.getDay())?'weekend':'';if(holidayName(date))cls='holiday';if(v)cls=moveForVacation(v)?'moved-cell':v.status==='Beantragt'?'pending-cell':v.status==='Geplant'?'planned-cell':overlap>=3?'critical':'vacation';const code=v?absenceCode(v):'';h+=`<td class="${cls}" title="${esc(vacationTitle(v,date,leaderMode?e.department:''))}">${code}</td>`}h+='</tr>'}$('calendarTable').innerHTML=h+'</tbody>';if(leaderMode){let max=0;for(let d=1;d<=days;d++){const date=new Date(year,month-1,d);max=Math.max(max,emps.filter(l=>vacsFor(l.id).some(x=>x.status!=='Geplant'&&inRange(date,x.from,x.to))).length)}$('calendarWarning').innerHTML=max>=2?`<div class="warning warning-danger"><strong>Leiterüberschneidung:</strong> Bis zu ${max} Leitungen sind gleichzeitig abwesend.</div>`:'<div class="notice"><strong>Leiterbesetzung:</strong> Keine kritischen Überschneidungen im gewählten Monat.</div>';renderVacationList('__leaders__')}else{const m=maxOverlapForDepartment(dep),min=Number(state.departmentSettings?.[dep]??2),total=emps.length,available=total-m,critical=available<min;$('calendarWarning').innerHTML=critical?`<div class="warning warning-danger"><strong>Mindestbesetzung unterschritten:</strong> Bei maximal ${m} Abwesenden bleiben nur ${available} von ${total} Mitarbeitenden verfügbar. Eingestellt sind mindestens ${min}.</div>`:m>=2?`<div class="warning"><strong>Besetzungshinweis:</strong> Bis zu ${m} Mitarbeiter gleichzeitig abwesend; Mindestbesetzung ${min} bleibt erfüllt.</div>`:'';renderVacationList(dep)}}
function renderVacationList(dep){const ids=(dep==='__leaders__'?state.employees.filter(e=>e.leader):state.employees.filter(e=>e.department===dep)).map(e=>e.id),rows=state.vacations.filter(v=>ids.includes(v.employeeId)).sort((a,b)=>localDate(a.from)-localDate(b.from));$('vacationList').innerHTML='<thead><tr><th>Mitarbeiter</th><th>Zeitraum</th><th>Tage</th><th>Umfang</th><th>Art</th><th>Status</th><th>Hinweis</th><th>Aktion</th></tr></thead><tbody>'+rows.map(v=>{const m=moveForVacation(v),bw=bridgeWarnings(v).join(', '),hint=m?`↔ Verschoben von ${m.oldPeriod}; ${m.reason||'ohne Grundangabe'}`:(bw||v.note||'–');return `<tr><td>${esc(emp(v.employeeId)?.name)}</td><td>${period(v.from,v.to)}</td><td>${vacationDays(v)}</td><td>${v.scope==='full'?'Ganzer Tag':'Halber Tag'}</td><td>${esc(v.type)}</td><td>${statusBadge(v.status)}</td><td>${esc(hint)}</td><td><button class="button tiny" onclick="editVacation(${v.id})">Verschieben/Bearbeiten</button> ${v.status==='Beantragt'?`<button class="button tiny primary" onclick="approveVacation(${v.id})">Genehmigen</button>`:''} <button class="button tiny danger" onclick="deleteVacation(${v.id})">Löschen</button></td></tr>`}).join('')+'</tbody>'}
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
 for(const e of list){let yearly=0,has=false;const cells=months.map((_,m)=>{const days=monthDays(e.id,m);yearly+=days;const types=[...new Set(vacsFor(e.id).filter(valid).filter(v=>{const a=new Date(year,m,1),b=new Date(year,m+1,0);return localDate(v.to)>=a&&localDate(v.from)<=b}).filter(v=>!countsAgainstVacation(v)).map(v=>({Sonderurlaub:'SU',Fortbildung:'S',Krankheit:'K',Unbezahlt:'N','Geplanter Freier Tag':'F'}[v.type]||'A')))];if(days||types.length)has=true;return `<td class="${days?'year-active':''}">${days?days.toLocaleString('de-DE'):''}${types.length?` <small>${types.join('/')}</small>`:''}</td>`}).join('');
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
 for(const e of leaders){h+=`<tr><td class="employee-name"><strong>${esc(e.name)}</strong><br><small>${esc(e.department)} · Vertretung: ${esc(e.substitute||'Keine')}</small></td>`;for(let d=1;d<=days;d++){const date=new Date(year,month-1,d),v=vacsFor(e.id).find(x=>inRange(date,x.from,x.to)),absent=leaders.filter(l=>vacsFor(l.id).some(x=>x.status!=='Geplant'&&inRange(date,x.from,x.to))).length;let cls=[0,6].includes(date.getDay())?'weekend':'';if(holidayName(date))cls='holiday';if(v)cls=moveForVacation(v)?'moved-cell':v.status==='Beantragt'?'pending-cell':v.status==='Geplant'?'planned-cell':absent>=2?'critical':'vacation';const code=v?absenceCode(v):'';h+=`<td class="${cls}" title="${esc(vacationTitle(v,date,e.department))}">${code}</td>`}h+='</tr>'}
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
  for(let d=1;d<=days;d++){const date=new Date(year,month-1,d),cell=row.getCell(d+1),v=vacsFor(e.id).find(x=>inRange(date,x.from,x.to));let fill='FFFFFFFF';
   if([0,6].includes(date.getDay()))fill='FFD6D8D7';if(holidayName(date))fill='FFFFD966';
   if(v){cell.value=absenceCode(v);cell.note=vacationTitle(v,date,leaderMode?e.department:'');cell.font={bold:true,color:{argb:'FF111111'}};fill=moveForVacation(v)?'FFF49ABC':v.status==='Beantragt'?'FFFFD966':v.status==='Geplant'?'FFD9D9D9':v.type==='Krankheit'?'FF9DC3E6':(v.type==='Seminar'||v.type==='Fortbildung')?'FFC9A0DC':v.type==='Geplanter Freier Tag'?'FFD9D9D9':'FFA9D18E'}
   if(!leaderMode&&countDepartmentAbsence(dep,date)>employees.length-Number(state.departmentSettings?.[dep]??2)&&!v)fill='FFF4CCCC';
   cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:fill}};cell.alignment={horizontal:'center',vertical:'middle'};cell.border=excelBorder();
  }
 });
 sheet.getColumn(1).width=leaderMode?34:25;for(let c=2;c<=lastCol;c++)sheet.getColumn(c).width=4.2;
 const legendRow=7+employees.length;sheet.mergeCells(legendRow,1,legendRow,lastCol);const legend=sheet.getCell(legendRow,1);legend.value='Legende: U = Urlaub · S = Sonderurlaub · F = Fortbildung · K = Krankheit · G = Geplanter Freier Tag · ↔ = verschoben';legend.font={italic:true,color:{argb:'FF333333'}};legend.alignment={wrapText:true};legend.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF2F2F2'}};legend.border=excelBorder();sheet.getRow(legendRow).height=30;
 const colors=[['Genehmigt','A9D18E'],['Beantragt','FFD966'],['Verschoben','F49ABC'],['Krankheit','9DC3E6'],['Seminar','C9A0DC'],['Geplanter freier Tag','D9D9D9'],['Kritische Besetzung','F4CCCC']];
 colors.forEach((x,i)=>{const row=sheet.getRow(legendRow+1+i);row.getCell(1).value=x[0];row.getCell(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+x[1]}};row.getCell(1).border=excelBorder();row.getCell(2).value=x[0]});
 sheet.autoFilter={from:{row:5,column:1},to:{row:5,column:lastCol}};
 sheet.pageSetup={orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:.25,right:.25,top:.5,bottom:.5,header:.2,footer:.2},printTitlesRow:'1:5',printArea:`A1:${lastLetter}${legendRow+colors.length}`};sheet.headerFooter.oddFooter='&LUrlaubsplaner Berlin&CSeite &P von &N&R&D';
 try{const buffer=await workbook.xlsx.writeBuffer(),blob=new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Monatsplan-${safeFileName(leaderMode?'Leiterplan':dep)}-${year}-${String(month).padStart(2,'0')}.xlsx`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}catch(err){console.error(err);alert('Die Excel-Datei konnte nicht erstellt werden.')}
}
function excelColumnName(n){let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s}
function excelBorder(){return{top:{style:'thin',color:{argb:'FF999999'}},left:{style:'thin',color:{argb:'FF999999'}},bottom:{style:'thin',color:{argb:'FF999999'}},right:{style:'thin',color:{argb:'FF999999'}}}}
function safeFileName(s){return String(s||'Plan').replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,'-')}

function exportCsv(){const dep=$('departmentFilter').value,ids=state.employees.filter(e=>e.department===dep).map(e=>e.id),rows=[['Mitarbeiter','Abteilung','Von','Bis','Urlaubstage','Umfang','Art','Status','Notiz']];state.vacations.filter(v=>ids.includes(v.employeeId)).forEach(v=>rows.push([emp(v.employeeId)?.name,dep,v.from,v.to,vacationDays(v),v.scope==='full'?'Ganzer Tag':'Halber Tag',v.type,v.status,v.note]));const csv='\ufeff'+rows.map(r=>r.map(x=>`"${String(x??'').replaceAll('"','""')}"`).join(';')).join('\r\n');download(`Urlaubsplan-${dep}.csv`,csv,'text/csv;charset=utf-8')}
function resetData(){if(!confirm('Alle lokalen Änderungen löschen und Testdaten wiederherstellen?'))return;state=normalize(window.DEFAULT_DATA);OLD_STORES.forEach(k=>localStorage.removeItem(k));saveState();fillLogin();clearEmployeeForm();renderAll();$('backupStatus').textContent='Testdaten wurden wiederhergestellt.'}

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
 addAudit(action,details);localStorage.setItem(STORE,JSON.stringify(state));
}
function fillLogin(){
 const active=state.users.filter(u=>u.active!==false);
 $('loginName').innerHTML=active.map(u=>`<option>${esc(u.name)}</option>`).join('');
}
function roleLabel(r){return({admin:'Administrator',management:'Marktleitung',leader:'Abteilungsleitung',deputy:'Stellvertretung'})[r]||r}
function login(){
 const u=state.users.find(x=>x.active!==false&&x.name===$('loginName').value&&x.pin===$('loginPin').value);
 if(!u){$('loginError').textContent='Name oder PIN ist nicht korrekt oder das Konto ist deaktiviert.';return}
 currentUser=u;u.lastLogin=new Date().toISOString();addAudit('Anmeldung',roleLabel(u.role));localStorage.setItem(STORE,JSON.stringify(state));
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


/* Version 0.9: optionale Server-Synchronisierung */
const SYNC_STORE='vacationPlannerSyncV09';
let syncConfig=loadSyncConfig();
let syncTimer=null;
function loadSyncConfig(){
 try{const c=JSON.parse(localStorage.getItem(SYNC_STORE)||'{}');return{endpoint:c.endpoint||'',token:c.token||'',auto:c.auto===true,deviceId:c.deviceId||createDeviceId(),pending:Number(c.pending||0),lastSync:c.lastSync||'',status:c.status||'local'}}catch{return{endpoint:'',token:'',auto:false,deviceId:createDeviceId(),pending:0,lastSync:'',status:'local'}}
}
function createDeviceId(){return 'GERAET-'+Math.random().toString(36).slice(2,8).toUpperCase()+'-'+Date.now().toString(36).toUpperCase()}
function saveSyncConfig(){localStorage.setItem(SYNC_STORE,JSON.stringify(syncConfig))}
function normalizeEndpoint(value){return String(value||'').trim().replace(/\/+$/,'')}
function syncHeaders(){const h={'Content-Type':'application/json'};if(syncConfig.token)h.Authorization='Bearer '+syncConfig.token;return h}
function setSyncMessage(text,ok=null){if(!$('syncMessage'))return;$('syncMessage').textContent=text;$('syncMessage').classList.toggle('warning-danger',ok===false)}
function renderSync(){
 if(!$('syncEndpoint'))return;
 $('syncEndpoint').value=syncConfig.endpoint;$('syncToken').value=syncConfig.token;$('syncAuto').checked=syncConfig.auto;
 $('syncDeviceShort').textContent=syncConfig.deviceId.replace('GERAET-','').slice(0,12);
 $('syncPendingCount').textContent=syncConfig.pending;
 $('syncLastTime').textContent=syncConfig.lastSync?new Date(syncConfig.lastSync).toLocaleString('de-DE'):'Nie';
 const online=syncConfig.status==='online',configured=!!syncConfig.endpoint;
 $('syncStatusText').textContent=online?'Verbunden':configured?'Nicht geprüft':'Lokal';
 const b=$('syncConnectionBadge');b.textContent=online?'Server verbunden':configured?'Server eingerichtet':'Lokalbetrieb';b.className='badge '+(online?'sync-online':configured?'pending':'planned');
}
function bindV09(){
 $('saveSyncSettings')?.addEventListener('click',saveSyncSettings);
 $('testSyncConnection')?.addEventListener('click',testSyncConnection);
 $('pushSync')?.addEventListener('click',pushSync);
 $('pullSync')?.addEventListener('click',pullSync);
}
function saveSyncSettings(){syncConfig.endpoint=normalizeEndpoint($('syncEndpoint').value);syncConfig.token=$('syncToken').value.trim();syncConfig.auto=$('syncAuto').checked;syncConfig.status=syncConfig.endpoint?'unknown':'local';saveSyncConfig();renderSync();setSyncMessage(syncConfig.endpoint?'Synchronisierungseinstellungen gespeichert.':'Lokaler Betrieb gespeichert.',true)}
async function testSyncConnection(){
 saveSyncSettings();if(!syncConfig.endpoint)return setSyncMessage('Bitte zuerst eine Backend-Adresse eintragen.',false);
 setSyncMessage('Verbindung wird geprüft …');
 try{const r=await fetch(syncConfig.endpoint+'/health',{headers:syncHeaders()});if(!r.ok)throw new Error('HTTP '+r.status);const info=await r.json();syncConfig.status='online';saveSyncConfig();renderSync();setSyncMessage('Verbindung erfolgreich: '+(info.name||'Urlaubsplaner-Backend')+'.',true)}catch(e){syncConfig.status='offline';saveSyncConfig();renderSync();setSyncMessage('Verbindung fehlgeschlagen: '+e.message,false)}
}
async function pushSync(){
 saveSyncSettings();if(!syncConfig.endpoint)return setSyncMessage('Kein Backend eingerichtet.',false);
 setSyncMessage('Daten werden übertragen …');
 try{const payload={schemaVersion:9,deviceId:syncConfig.deviceId,updatedAt:new Date().toISOString(),state};const r=await fetch(syncConfig.endpoint+'/api/state',{method:'PUT',headers:syncHeaders(),body:JSON.stringify(payload)});if(!r.ok)throw new Error('HTTP '+r.status);const info=await r.json();syncConfig.pending=0;syncConfig.lastSync=info.updatedAt||new Date().toISOString();syncConfig.status='online';saveSyncConfig();addAudit('Synchronisierung','Daten zum Server gesendet');localStorage.setItem(STORE,JSON.stringify(state));renderAll();setSyncMessage('Daten wurden erfolgreich zum Server gesendet.',true)}catch(e){syncConfig.status='offline';saveSyncConfig();renderSync();setSyncMessage('Senden fehlgeschlagen: '+e.message,false)}
}
async function pullSync(){
 saveSyncSettings();if(!syncConfig.endpoint)return setSyncMessage('Kein Backend eingerichtet.',false);
 if(syncConfig.pending>0&&!confirm(`${syncConfig.pending} lokale Änderung(en) wurden noch nicht gesendet. Serverdaten trotzdem laden und lokal überschreiben?`))return;
 setSyncMessage('Serverdaten werden geladen …');
 try{const r=await fetch(syncConfig.endpoint+'/api/state',{headers:syncHeaders()});if(r.status===404)return setSyncMessage('Auf dem Server liegt noch kein Datenstand. Bitte zuerst „Daten zum Server senden“ verwenden.',false);if(!r.ok)throw new Error('HTTP '+r.status);const payload=await r.json();if(!payload.state)throw new Error('Ungültige Serverantwort');state=normalize(payload.state);syncConfig.pending=0;syncConfig.lastSync=payload.updatedAt||new Date().toISOString();syncConfig.status='online';saveSyncConfig();addAudit('Synchronisierung','Daten vom Server geladen');localStorage.setItem(STORE,JSON.stringify(state));fillLogin();renderAll();setSyncMessage('Serverdaten wurden erfolgreich geladen.',true)}catch(e){syncConfig.status='offline';saveSyncConfig();renderSync();setSyncMessage('Laden fehlgeschlagen: '+e.message,false)}
}
function scheduleAutoSync(){if(!syncConfig.auto||!syncConfig.endpoint)return;clearTimeout(syncTimer);syncTimer=setTimeout(()=>pushSync(),1200)}
const saveStateV08=saveState;
saveState=function(action='Daten geändert',details=''){
 syncConfig.pending+=1;saveSyncConfig();saveStateV08(action,details);renderSync();scheduleAutoSync();
};
const renderAllV08=renderAll;
renderAll=function(){renderAllV08();renderSync()};
const bindV08Complete=bind;
bind=function(){bindV08Complete();bindV09()};

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
state=normalize(state);localStorage.setItem(STORE,JSON.stringify(state));

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
   const date=new Date(year,month-1,d),v=vacsFor(e.id).find(x=>inRange(date,x.from,x.to));let cls=[0,6].includes(date.getDay())?'weekend':'';if(holidayName(date))cls='holiday';
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
  for(const e of employees){if(groupMode&&e.department!==lastDep){rows.push(`<row r="${r}">${xlsxCell('A'+r,`${e.department} · Mindestbesetzung ${state.departmentSettings[e.department]??2}`,8)}</row>`);r++;lastDep=e.department}let cells=xlsxCell('A'+r,leaderMode?`${e.name} · ${e.department}${e.keyLeader?' · Schlüssel-Leitung':''}`:e.name,0);for(let d=1;d<=days;d++){const date=new Date(year,month-1,d),v=vacsFor(e.id).find(x=>inRange(date,x.from,x.to));let st=[0,6].includes(date.getDay())?6:0;if(holidayName(date))st=7;if(v)st=moveForVacation(v)?4:v.status==='Beantragt'?3:v.type==='Krankheit'?5:v.status==='Geplant'?6:2;cells+=xlsxCell(excelColumnName(d+1)+r,v?absenceCode(v):'',st)}rows.push(`<row r="${r}">${cells}</row>`);r++}
  rows.push(`<row r="${r}">${xlsxCell('A'+r,'Legende: U Urlaub · K Krankheit · S Seminar · F geplanter freier Tag · ↔ verschoben · 🔑 Schlüssel-Leitung',2)}</row>`);
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
state=normalize(state);localStorage.setItem(STORE,JSON.stringify(state));

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
 $('vacationList').innerHTML='<thead><tr><th>Mitarbeiter</th><th>Zeitraum</th><th>Tage</th><th>Umfang</th><th>Art</th><th>Status</th><th>Hinweis</th><th>Aktion</th></tr></thead><tbody>'+rows.map(v=>{const m=moveForVacation(v),near=nearbyHolidayWarnings(v),bw=bridgeWarnings(v),holidayHint=[...near,...bw],hint=m?`↔ Verschoben von ${m.oldPeriod}; ${m.reason||'ohne Grundangabe'}`:(holidayHint.length?`⚠ ${holidayHint.join('; ')}`:(v.note||'–'));return `<tr><td>${esc(emp(v.employeeId)?.name)}</td><td>${period(v.from,v.to)}</td><td>${vacationDays(v)}</td><td>${v.scope==='full'?'Ganzer Tag':'Halber Tag'}</td><td>${esc(v.type)}</td><td>${statusBadge(v.status)}</td><td class="${holidayHint.length?'holiday-hint':''}">${esc(hint)}</td><td><button class="button tiny" onclick="editVacation(${v.id})">Verschieben/Bearbeiten</button> ${v.status==='Beantragt'?`<button class="button tiny primary" onclick="approveVacation(${v.id})">Genehmigen</button>`:''} <button class="button tiny danger" onclick="deleteVacation(${v.id})">Löschen</button></td></tr>`}).join('')+'</tbody>';
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
   const date=new Date(year,month-1,d),v=vacsFor(e.id).find(x=>inRange(date,x.from,x.to)),hn=holidayName(date),sun=date.getDay()===0;
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
 if(leaderMode){let bad=0,maxSeen=0;for(let d=1;d<=days;d++){const dt=new Date(year,month-1,d),away=state.employees.filter(x=>x.leader).filter(x=>vacsFor(x.id).some(v=>activeAbsence(v)&&inRange(dt,v.from,v.to))).length;maxSeen=Math.max(maxSeen,away);if(away>Number(state.leaderSettings.maxAway||0))bad++}$('calendarWarning').innerHTML=`${bad?`<div class="warning warning-danger"><strong>Maximale Leiter-Abwesenheit überschritten:</strong> an ${bad} Tag(en). Erlaubt sind maximal ${state.leaderSettings.maxAway} gleichzeitig abwesende Leitungen.</div>`:`<div class="notice"><strong>Leiterplan:</strong> Maximal ${maxSeen} gleichzeitig abwesend; erlaubt sind ${state.leaderSettings.maxAway}.</div>`}${holidays.length?`<div class="holiday-list"><strong>Feiertage:</strong> ${holidays.map(esc).join(' · ')}</div>`:''}`;renderVacationList('__leaders__')}
 else {const warnings=deps.map(dep=>{let max=0,bad=0;for(let d=1;d<=days;d++){const away=departmentAwayCount(dep,new Date(year,month-1,d));max=Math.max(max,away);if(away>Number(state.departmentMaxAway?.[dep]??1))bad++}return bad?`${dep}: an ${bad} Tag(en) über Maximum ${state.departmentMaxAway[dep]} (Spitze ${max})`:''}).filter(Boolean);$('calendarWarning').innerHTML=`${warnings.length?`<div class="warning warning-danger"><strong>Zu viele Urlauber:</strong> ${warnings.map(esc).join(' · ')}</div>`:''}${holidays.length?`<div class="holiday-list"><strong>Feiertage:</strong> ${holidays.map(esc).join(' · ')}</div>`:''}`;renderVacationList(choice)}
};

renderDepartments=function(){
 $('leaderMinimum').value=state.leaderSettings.maxAway;$('keyLeaderMinimum').value=state.leaderSettings.keyMinimum;
 $('departmentTable').innerHTML='<thead><tr><th>Abteilung</th><th>Plan-Gruppe</th><th>Max. Urlauber</th><th>Mitarbeiter</th><th>Leiter</th><th>Aktion</th></tr></thead><tbody>'+state.departments.map((d,i)=>{const es=state.employees.filter(e=>e.department===d),max=Number(state.departmentMaxAway?.[d]??1),group=state.departmentGroups?.[d]||'–';return `<tr><td>${esc(d)}</td><td>${esc(group)}</td><td>${max}</td><td>${es.length}</td><td>${esc(es.filter(e=>e.leader).map(e=>e.name+(e.keyLeader?' 🔑':'')).join(', ')||'–')}</td><td><button class="button tiny" onclick="renameDepartment(${i})">Umbenennen</button> <button class="button tiny" onclick="editDepartmentGroup(${i})">Plan-Gruppe</button> <button class="button tiny" onclick="editDepartmentMaximum(${i})">Max. Urlauber</button> <button class="button tiny danger" onclick="deleteDepartment(${i})">Löschen</button></td></tr>`}).join('')+'</tbody>';
};
window.editDepartmentMaximum=i=>{const d=state.departments[i],current=Number(state.departmentMaxAway?.[d]??1),value=prompt(`Maximal gleichzeitig abwesende Urlauber für „${d}“:`,current);if(value===null)return;const n=Number(value);if(!Number.isFinite(n)||n<0)return alert('Bitte eine gültige Zahl ab 0 eingeben.');state.departmentMaxAway[d]=Math.floor(n);saveState('Maximale Urlauber geändert',`${d}: ${n}`);renderAll()};
addDepartment=function(){const name=$('newDepartment').value.trim();if(!name)return alert('Bitte einen Namen eingeben.');if(state.departments.includes(name))return alert('Diese Abteilung existiert bereits.');state.departments.push(name);state.departmentSettings[name]=0;state.departmentMaxAway[name]=Math.max(0,Number($('newDepartmentMin').value||1));state.departmentGroups[name]=$('newDepartmentGroup').value.trim();$('newDepartment').value='';$('newDepartmentGroup').value='';saveState('Abteilung angelegt',name);renderAll()};
saveLeaderMinimums=function(){state.leaderSettings.maxAway=Math.max(0,Math.floor(Number($('leaderMinimum').value||0)));state.leaderSettings.keyMinimum=Math.max(0,Math.floor(Number($('keyLeaderMinimum').value||0)));saveState('Leiterregeln geändert',`max. ${state.leaderSettings.maxAway} abwesend, mindestens ${state.leaderSettings.keyMinimum} Schlüssel-Leiter anwesend`);renderAll()};
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
state=normalize(state);localStorage.setItem(STORE,JSON.stringify(state));

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
  $('calendarWarning').innerHTML=`${bad?`<div class="warning warning-danger"><strong>Plan-Gruppe ${esc(g)}:</strong> An ${bad} Tag(en) sind mehr als ${maxAllowed} Urlauber gleichzeitig abwesend (Spitze ${peak}).</div>`:`<div class="notice"><strong>Plan-Gruppe ${esc(g)}:</strong> Maximal ${peak} gleichzeitig abwesend; erlaubt sind ${maxAllowed}.</div>`}${existing}`;
 }
};

function pdfEscape(s){return String(s??'').replace(/[\\()]/g,'\\$&').replace(/[äÄ]/g,m=>m==='ä'?'ae':'Ae').replace(/[öÖ]/g,m=>m==='ö'?'oe':'Oe').replace(/[üÜ]/g,m=>m==='ü'?'ue':'Ue').replace(/ß/g,'ss').replace(/[↔🔑]/g,'')}
function exportMonthPdf(){
 try{
  const choice=$('departmentFilter').value||state.departments[0],leaderMode=choice==='__leaders__',deps=selectedDepartments(choice),parts=$('monthFilter').value.split('-').map(Number),year=parts[0],month=parts[1],days=new Date(year,month,0).getDate();
  const emps=(leaderMode?state.employees.filter(e=>e.leader):state.employees.filter(e=>deps.includes(e.department))).sort((a,b)=>a.department.localeCompare(b.department,'de')||a.name.localeCompare(b.name,'de'));
  const title=leaderMode?'Leiterplan':String(choice).startsWith('__group__:')?`Plan-Gruppe ${choice.slice(10)}`:choice;
  const W=842,H=595,left=28,top=545,nameW=145,cellW=(W-left-18-nameW)/days,rowH=18;let pages=[],content=[],y=top;
  const txt=(x,y,size,text)=>content.push(`BT /F1 ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${pdfEscape(text)}) Tj ET`);
  const rect=(x,y,w,h,gray=0.92)=>content.push(`${gray} g ${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f 0 G ${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re S`);
  const header=()=>{txt(left,H-25,15,`Urlaubsplan - ${title} - ${String(month).padStart(2,'0')}/${year}`);y=top;rect(left,y-rowH,nameW,rowH,.85);txt(left+3,y-13,8,'Mitarbeiter');for(let d=1;d<=days;d++){rect(left+nameW+(d-1)*cellW,y-rowH,cellW,rowH,.9);txt(left+nameW+(d-1)*cellW+1,y-13,6,String(d))}y-=rowH};
  const finish=()=>{pages.push(content.join('\n'));content=[]};header();let lastDep='';
  for(const e of emps){if(y<45){finish();header()}if(deps.length>1&&e.department!==lastDep){rect(left,y-rowH,W-left-18,rowH,.78);txt(left+3,y-13,8,`${e.department} - max. ${state.departmentMaxAway?.[e.department]??1}`);y-=rowH;lastDep=e.department}rect(left,y-rowH,nameW,rowH,.97);txt(left+3,y-13,7,leaderMode?`${e.name} (${e.department})`:e.name);for(let d=1;d<=days;d++){const date=new Date(year,month-1,d),v=vacsFor(e.id).find(x=>inRange(date,x.from,x.to));let shade=date.getDay()===0?.72:holidayName(date)?.82:.98;if(v)shade=moveForVacation(v)?.75:v.status==='Beantragt'?.86:.9;rect(left+nameW+(d-1)*cellW,y-rowH,cellW,rowH,shade);if(v)txt(left+nameW+(d-1)*cellW+1,y-13,6,absenceCode(v))}y-=rowH}
  txt(left,22,7,'U=Urlaub  K=Krankheit  S=Seminar  F=Geplanter freier Tag  rosa=verschoben');finish();
  const objects=[];objects[1]='<< /Type /Catalog /Pages 2 0 R >>';const pageIds=[],contentIds=[];let id=3;for(let i=0;i<pages.length;i++){pageIds.push(id++);contentIds.push(id++)}const fontId=id++;objects[2]=`<< /Type /Pages /Kids [${pageIds.map(x=>x+' 0 R').join(' ')}] /Count ${pages.length} >>`;objects[fontId]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';for(let i=0;i<pages.length;i++){objects[pageIds[i]]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`;objects[contentIds[i]]=`<< /Length ${pages[i].length} >>\nstream\n${pages[i]}\nendstream`}
  let pdf='%PDF-1.4\n',offsets=[0];for(let i=1;i<objects.length;i++){offsets[i]=pdf.length;pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`}const xref=pdf.length;pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';pdf+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const blob=new Blob([pdf],{type:'application/pdf'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Monatsplan-${safeFileName(title)}-${year}-${String(month).padStart(2,'0')}.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
 }catch(err){console.error(err);alert('PDF-Export fehlgeschlagen: '+(err?.message||err))}
}
setTimeout(()=>{if($('exportPdf'))$('exportPdf').onclick=exportMonthPdf;renderAll()},0);

/* Version 1.4: robuste Plan-Gruppen, reine Max-Urlauber-Logik und reparierter PDF-Export */
function normalizeGroupName(value){return String(value||'').trim().toLocaleLowerCase('de-DE')}
planGroupsFromState=function(s){
 const map=new Map();
 s.departments.forEach(dep=>{const raw=String(s.departmentGroups?.[dep]||'').trim();if(raw&&!map.has(normalizeGroupName(raw)))map.set(normalizeGroupName(raw),raw)});
 return [...map.values()].sort((a,b)=>a.localeCompare(b,'de'));
};
planGroups=function(){return planGroupsFromState(state)};
selectedDepartments=function(value){
 if(value==='__leaders__')return [];
 if(String(value).startsWith('__group__:')){
  const wanted=normalizeGroupName(String(value).slice(10));
  return state.departments.filter(dep=>normalizeGroupName(state.departmentGroups?.[dep])===wanted);
 }
 return state.departments.includes(value)?[value]:[];
};
function employeesForSelection(choice){
 if(choice==='__leaders__')return state.employees.filter(e=>e.leader);
 const deps=selectedDepartments(choice);
 return state.employees.filter(e=>deps.includes(e.department));
}
function maxAwayForDepartment(dep){return Math.max(0,Number(state.departmentMaxAway?.[dep]??1))}
function maxAwayForGroup(group){
 const exact=planGroups().find(g=>normalizeGroupName(g)===normalizeGroupName(group));
 return Math.max(0,Number(state.planGroupMaxAway?.[exact]??state.planGroupMaxAway?.[group]??1));
}
function activeVacationForLimit(v){return v&&v.type==='Urlaub'&&!['Geplant','Abgelehnt'].includes(v.status)}
function departmentVacationAwayCount(dep,date){return state.employees.filter(e=>e.department===dep).filter(e=>vacsFor(e.id).some(v=>activeVacationForLimit(v)&&inRange(date,v.from,v.to))).length}
function groupVacationAwayCount(group,date){const deps=selectedDepartments('__group__:'+group);return state.employees.filter(e=>deps.includes(e.department)).filter(e=>vacsFor(e.id).some(v=>activeVacationForLimit(v)&&inRange(date,v.from,v.to))).length}

renderCalendar=function(){
 const choice=$('departmentFilter').value||state.departments[0],leaderMode=choice==='__leaders__',groupMode=String(choice).startsWith('__group__:'),groupName=groupMode?String(choice).slice(10):'',deps=selectedDepartments(choice),parts=$('monthFilter').value.split('-').map(Number),year=parts[0],month=parts[1],days=new Date(year,month,0).getDate();
 const emps=employeesForSelection(choice).sort((a,b)=>leaderMode?a.name.localeCompare(b.name,'de'):deps.indexOf(a.department)-deps.indexOf(b.department)||a.name.localeCompare(b.name,'de'));
 $('vacationEmployee').innerHTML=emps.map(e=>`<option value="${e.id}">${esc(e.name)}${groupMode?' · '+esc(e.department):''}</option>`).join('');
 let h='<thead><tr><th class="employee-name">Mitarbeiter</th>';
 for(let d=1;d<=days;d++){const date=new Date(year,month-1,d),hn=holidayName(date),sun=date.getDay()===0,wd=['So','Mo','Di','Mi','Do','Fr','Sa'][date.getDay()];h+=`<th class="${sun?'sunday-header':''} ${hn?'holiday-header':''}" title="${esc(hn||wd)}"><span>${d}</span><small>${hn?esc(hn):wd}</small></th>`}h+='</tr></thead><tbody>';
 if(!emps.length){h+=`<tr><td colspan="${days+1}" class="empty-plan"><strong>Keine Mitarbeiter gefunden.</strong><br><small>Prüfe unter „Abteilungen“, ob die Abteilungen der Plan-Gruppe „${esc(groupName)}“ zugeordnet sind und ob die Mitarbeiter genau diesen Abteilungen zugewiesen wurden.</small></td></tr>`}
 let lastDep='';
 for(const e of emps){
  if(groupMode&&e.department!==lastDep){h+=`<tr class="department-separator"><td colspan="${days+1}"><strong>${esc(e.department)}</strong> · maximal ${maxAwayForDepartment(e.department)} Urlauber gleichzeitig</td></tr>`;lastDep=e.department}
  h+=`<tr><td class="employee-name"><strong>${esc(e.name)}</strong>${leaderMode?`<br><small>${esc(e.department)} · ${e.keyLeader?'🔑 Schlüssel-Leitung · ':''}Vertretung: ${esc(e.substitute||'Keine')}</small>`:e.leader?` <span class="badge leader-badge">Leiter${e.keyLeader?' 🔑':''}</span>`:''}</td>`;
  for(let d=1;d<=days;d++){
   const date=new Date(year,month-1,d),v=vacsFor(e.id).find(x=>inRange(date,x.from,x.to)),hn=holidayName(date),sun=date.getDay()===0;
   let cls=sun?'sunday':'';if(hn)cls='holiday';
   let critical=false;
   if(leaderMode){const away=state.employees.filter(x=>x.leader).filter(x=>vacsFor(x.id).some(a=>activeVacationForLimit(a)&&inRange(date,a.from,a.to))).length;critical=away>Number(state.leaderSettings.maxAway||0)}
   else critical=departmentVacationAwayCount(e.department,date)>maxAwayForDepartment(e.department)||(groupMode&&groupVacationAwayCount(groupName,date)>maxAwayForGroup(groupName));
   if(v)cls=moveForVacation(v)?'moved-cell':v.status==='Beantragt'?'pending-cell':v.status==='Geplant'?'planned-cell':critical?'critical vacation-entry':'vacation';else if(critical)cls=(cls?cls+' ':'')+'critical-day';
   h+=`<td class="${cls}" title="${esc(vacationTitle(v,date,leaderMode?e.department:''))}">${v?absenceCode(v):''}</td>`;
  }
  h+='</tr>';
 }
 $('calendarTable').innerHTML=h+'</tbody>';
 const holidays=[];for(let d=1;d<=days;d++){const dt=new Date(year,month-1,d),name=holidayName(dt);if(name)holidays.push(`${d}.${month}. ${name}`)}
 const notices=[];
 if(leaderMode){let bad=0,peak=0;for(let d=1;d<=days;d++){const dt=new Date(year,month-1,d),away=state.employees.filter(x=>x.leader).filter(x=>vacsFor(x.id).some(v=>activeVacationForLimit(v)&&inRange(dt,v.from,v.to))).length;peak=Math.max(peak,away);if(away>Number(state.leaderSettings.maxAway||0))bad++}notices.push(bad?`<div class="warning warning-danger"><strong>Zu viele Leitungen im Urlaub:</strong> an ${bad} Tag(en) über dem Maximum ${state.leaderSettings.maxAway} (Spitze ${peak}).</div>`:`<div class="notice"><strong>Leiterplan:</strong> Maximal ${peak} gleichzeitig im Urlaub; erlaubt sind ${state.leaderSettings.maxAway}.</div>`)}
 else {
  deps.forEach(dep=>{let bad=0,peak=0;for(let d=1;d<=days;d++){const n=departmentVacationAwayCount(dep,new Date(year,month-1,d));peak=Math.max(peak,n);if(n>maxAwayForDepartment(dep))bad++}if(bad)notices.push(`<div class="warning warning-danger"><strong>${esc(dep)}:</strong> an ${bad} Tag(en) mehr als ${maxAwayForDepartment(dep)} Urlauber gleichzeitig (Spitze ${peak}).</div>`)});
  if(groupMode){let bad=0,peak=0;for(let d=1;d<=days;d++){const n=groupVacationAwayCount(groupName,new Date(year,month-1,d));peak=Math.max(peak,n);if(n>maxAwayForGroup(groupName))bad++}notices.unshift(bad?`<div class="warning warning-danger"><strong>Plan-Gruppe ${esc(groupName)}:</strong> an ${bad} Tag(en) mehr als ${maxAwayForGroup(groupName)} Urlauber gleichzeitig (Spitze ${peak}).</div>`:`<div class="notice"><strong>Plan-Gruppe ${esc(groupName)}:</strong> ${emps.length} Mitarbeiter aus ${deps.length} Abteilungen · Maximum ${maxAwayForGroup(groupName)} Urlauber.</div>`)}
 }
 if(holidays.length)notices.push(`<div class="holiday-list"><strong>Feiertage:</strong> ${holidays.map(esc).join(' · ')}</div>`);
 $('calendarWarning').innerHTML=notices.join('');
 renderVacationList(choice);
};

function pdfAscii(s){return String(s??'').replace(/[\\()]/g,'\\$&').replace(/ä/g,'ae').replace(/Ä/g,'Ae').replace(/ö/g,'oe').replace(/Ö/g,'Oe').replace(/ü/g,'ue').replace(/Ü/g,'Ue').replace(/ß/g,'ss').replace(/↔/g,'<->').replace(/🔑/g,'Schluessel')}
function pdfRgb(hex){const n=parseInt(hex.replace('#',''),16);return[((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255]}
function exportMonthPdf(){
 try{
  const choice=$('departmentFilter').value||state.departments[0],leaderMode=choice==='__leaders__',groupMode=String(choice).startsWith('__group__:'),groupName=groupMode?String(choice).slice(10):'',deps=selectedDepartments(choice),[year,month]=$('monthFilter').value.split('-').map(Number),days=new Date(year,month,0).getDate();
  const emps=employeesForSelection(choice).sort((a,b)=>leaderMode?a.name.localeCompare(b.name,'de'):deps.indexOf(a.department)-deps.indexOf(b.department)||a.name.localeCompare(b.name,'de'));
  const title=leaderMode?'Leiterplan':groupMode?`Plan-Gruppe ${groupName}`:choice,monthNames=['Januar','Februar','Maerz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const W=842,H=595,left=24,right=18,top=530,nameW=155,rowH=20,cellW=(W-left-right-nameW)/days;let streams=[],ops=[],y=top,lastDep='';
  const setFill=hex=>{const [r,g,b]=pdfRgb(hex);ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`)};
  const setStroke=hex=>{const [r,g,b]=pdfRgb(hex);ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`)};
  const rect=(x,y,w,h,fill='#ffffff')=>{setFill(fill);setStroke('#666666');ops.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re B`)};
  const text=(x,y,size,value,color='#111111')=>{setFill(color);ops.push(`BT /F1 ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${pdfAscii(value)}) Tj ET`)};
  const pageHeader=()=>{text(left,H-24,16,`Urlaubsplan - ${title} - ${monthNames[month-1]} ${year}`,'#111111');text(left,H-40,8,`Erstellt am ${new Date().toLocaleDateString('de-DE')}`,'#555555');y=top;rect(left,y-rowH,nameW,rowH,'#d9d9d9');text(left+4,y-14,8,'Mitarbeiter');for(let d=1;d<=days;d++){const dt=new Date(year,month-1,d),fill=holidayName(dt)?'#f6d74a':dt.getDay()===0?'#777777':'#e9e9e9';rect(left+nameW+(d-1)*cellW,y-rowH,cellW,rowH,fill);text(left+nameW+(d-1)*cellW+1.4,y-12,5.8,String(d),dt.getDay()===0?'#ffffff':'#111111')}y-=rowH};
  const finishPage=()=>{text(left,20,7,'U=Urlaub  K=Krankheit  S=Seminar  F=Geplanter freier Tag  U<->=verschoben');streams.push(ops.join('\n'));ops=[];lastDep=''};
  pageHeader();
  if(!emps.length){rect(left,y-rowH,W-left-right,rowH,'#f3f3f3');text(left+4,y-14,8,'Keine Mitarbeiter in dieser Auswahl gefunden.');y-=rowH}
  for(const e of emps){
   if(y<55){finishPage();pageHeader()}
   if(groupMode&&e.department!==lastDep){rect(left,y-rowH,W-left-right,rowH,'#4a4a4a');text(left+4,y-14,8,`${e.department} - max. ${maxAwayForDepartment(e.department)} Urlauber`,'#ffffff');y-=rowH;lastDep=e.department}
   rect(left,y-rowH,nameW,rowH,'#f7f7f7');text(left+4,y-14,7.2,leaderMode?`${e.name} (${e.department})`:e.name);
   for(let d=1;d<=days;d++){
    const dt=new Date(year,month-1,d),v=vacsFor(e.id).find(x=>inRange(dt,x.from,x.to));let fill=dt.getDay()===0?'#777777':holidayName(dt)?'#f6d74a':'#ffffff',color=dt.getDay()===0?'#ffffff':'#111111';
    if(v){if(moveForVacation(v))fill='#ee8fb5';else if(v.status==='Beantragt')fill='#f3cd45';else if(v.type==='Krankheit')fill='#9ec5e8';else if((v.type==='Seminar'||v.type==='Fortbildung'))fill='#c9a3df';else if(v.type==='Geplanter Freier Tag'||v.status==='Geplant')fill='#c8c8c8';else fill='#a8ce8a';color='#111111'}
    rect(left+nameW+(d-1)*cellW,y-rowH,cellW,rowH,fill);if(v)text(left+nameW+(d-1)*cellW+1,y-13,5.5,absenceCode(v),color)
   }
   y-=rowH;
  }
  finishPage();
  const objects=[];objects[1]='<< /Type /Catalog /Pages 2 0 R >>';const pageIds=[],contentIds=[];let id=3;for(let i=0;i<streams.length;i++){pageIds.push(id++);contentIds.push(id++)}const fontId=id++;objects[2]=`<< /Type /Pages /Kids [${pageIds.map(x=>x+' 0 R').join(' ')}] /Count ${streams.length} >>`;objects[fontId]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';for(let i=0;i<streams.length;i++){objects[pageIds[i]]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`;objects[contentIds[i]]=`<< /Length ${streams[i].length} >>\nstream\n${streams[i]}\nendstream`}
  let pdf='%PDF-1.4\n',offsets=[0];for(let i=1;i<objects.length;i++){offsets[i]=pdf.length;pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`}const xref=pdf.length;pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';pdf+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const blob=new Blob([pdf],{type:'application/pdf'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Monatsplan-${safeFileName(title)}-${year}-${String(month).padStart(2,'0')}.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000)
 }catch(err){console.error(err);alert('PDF-Export fehlgeschlagen: '+(err?.message||err))}
}

setTimeout(()=>{if($('exportPdf'))$('exportPdf').onclick=exportMonthPdf;fillSelects();renderAll()},0);

/* Version 1.5: stabile Plan-Gruppen-IDs und neue Abwesenheitskürzel */
(function(){
 const normalizeV15Base=normalize;
 normalize=function(d){
  const n=normalizeV15Base(d);
  n.vacations=(n.vacations||[]).map(v=>({...v,type:(v.type==='Seminar'||v.type==='Fortbildung')?'Seminar':v.type}));
  n.planGroups=Array.isArray(n.planGroups)?n.planGroups.map(g=>({id:String(g.id),name:String(g.name||'').trim(),maxAway:Math.max(0,Number(g.maxAway??1))})).filter(g=>g.name):[];
  n.departmentGroupIds={...(n.departmentGroupIds||{})};
  const oldNames={...(n.departmentGroups||{})};
  const byName=new Map(n.planGroups.map(g=>[normalizeGroupName(g.name),g]));
  n.departments.forEach(dep=>{
   let gid=n.departmentGroupIds[dep];
   if(gid&&!n.planGroups.some(g=>g.id===String(gid)))gid='';
   if(!gid){const old=String(oldNames[dep]||'').trim();if(old){const key=normalizeGroupName(old);let g=byName.get(key);if(!g){g={id:'pg_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7),name:old,maxAway:Math.max(0,Number(n.planGroupMaxAway?.[old]??1))};n.planGroups.push(g);byName.set(key,g)}gid=g.id}}
   n.departmentGroupIds[dep]=gid||'';
  });
  return n;
 };
 state=normalize(state);localStorage.setItem(STORE,JSON.stringify(state));

 function groupById(id){return state.planGroups.find(g=>g.id===String(id))}
 function departmentsForGroupId(id){return state.departments.filter(dep=>String(state.departmentGroupIds?.[dep]||'')===String(id))}
 planGroups=function(){return state.planGroups.map(g=>g.name).sort((a,b)=>a.localeCompare(b,'de'))};
 groupOptionValue=function(g){const obj=typeof g==='string'?state.planGroups.find(x=>x.name===g):g;return obj?`__groupid__:${obj.id}`:''};
 selectedDepartments=function(value){if(value==='__leaders__')return[];if(String(value).startsWith('__groupid__:'))return departmentsForGroupId(String(value).slice(12));if(String(value).startsWith('__group__:')){const name=String(value).slice(10),g=state.planGroups.find(x=>normalizeGroupName(x.name)===normalizeGroupName(name));return g?departmentsForGroupId(g.id):[]}return[value]};
 maxAwayForGroup=function(group){const g=String(group).startsWith('pg_')?groupById(group):state.planGroups.find(x=>normalizeGroupName(x.name)===normalizeGroupName(group));return Math.max(0,Number(g?.maxAway??1))};
 groupVacationAwayCount=function(group,date){const g=String(group).startsWith('pg_')?groupById(group):state.planGroups.find(x=>normalizeGroupName(x.name)===normalizeGroupName(group));const deps=g?departmentsForGroupId(g.id):[];return state.employees.filter(e=>deps.includes(e.department)).filter(e=>vacsFor(e.id).some(v=>activeVacationForLimit(v)&&inRange(date,v.from,v.to))).length};

 absenceCode=function(v){return ({Urlaub:'U',Sonderurlaub:'SU',Seminar:'S',Fortbildung:'S',Unbezahlt:'N',Krankheit:'K','Geplanter Freier Tag':'F'}[v.type]||'A')+(v.scope!=='full'?'½':'')+(moveForVacation(v)?'↔':'')};

 const fillSelectsV15Base=fillSelects;
 fillSelects=function(){
  fillSelectsV15Base();
  const cur=$('departmentFilter').value,ycur=$('yearDepartmentFilter').value;
  const groupOpts=state.planGroups.slice().sort((a,b)=>a.name.localeCompare(b.name,'de')).map(g=>`<option value="__group__:${esc(g.name)}">Plan-Gruppe: ${esc(g.name)}</option>`).join('');
  const depOpts=state.departments.map(d=>`<option value="${esc(d)}">${esc(d)}</option>`).join('');
  $('departmentFilter').innerHTML='<option value="__leaders__">Leiterplan (alle Abteilungen)</option>'+groupOpts+depOpts;
  const valid=['__leaders__',...state.planGroups.map(g=>`__group__:${g.name}`),...state.departments];$('departmentFilter').value=valid.includes(cur)?cur:(state.departments[0]||'');
  $('yearDepartmentFilter').innerHTML=groupOpts+depOpts;$('yearDepartmentFilter').value=valid.includes(ycur)&&ycur!=='__leaders__'?ycur:(state.departments[0]||'');
  if($('newDepartmentGroup'))$('newDepartmentGroup').innerHTML='<option value="">Keine Plan-Gruppe</option>'+state.planGroups.slice().sort((a,b)=>a.name.localeCompare(b.name,'de')).map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('');
 };

 addDepartment=function(){
  const name=$('newDepartment').value.trim();if(!name)return alert('Bitte einen Namen eingeben.');if(state.departments.includes(name))return alert('Diese Abteilung existiert bereits.');
  let groupId=$('newDepartmentGroup')?.value||'',newGroupName=$('newPlanGroupName')?.value.trim()||'';
  if(newGroupName){let existing=state.planGroups.find(g=>normalizeGroupName(g.name)===normalizeGroupName(newGroupName));if(!existing){existing={id:'pg_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7),name:newGroupName,maxAway:1};state.planGroups.push(existing)}groupId=existing.id}
  state.departments.push(name);state.departmentSettings[name]=0;state.departmentMaxAway[name]=Math.max(0,Number($('newDepartmentMin').value||1));state.departmentGroupIds[name]=groupId;state.departmentGroups[name]=groupById(groupId)?.name||'';
  $('newDepartment').value='';if($('newPlanGroupName'))$('newPlanGroupName').value='';saveState('Abteilung angelegt',`${name}${groupId?' · Plan-Gruppe '+groupById(groupId).name:''}`);renderAll()
 };

 window.editDepartmentGroup=i=>{
  const dep=state.departments[i],current=state.departmentGroupIds?.[dep]||'';
  const options=['0 = Keine Plan-Gruppe',...state.planGroups.map((g,idx)=>`${idx+1} = ${g.name}`),'N = Neue Plan-Gruppe'].join('\n');
  const answer=prompt(`Plan-Gruppe für „${dep}“ auswählen:\n${options}`,current?String(state.planGroups.findIndex(g=>g.id===current)+1):'0');if(answer===null)return;
  let id='';if(answer.toUpperCase()==='N'){const name=prompt('Name der neuen Plan-Gruppe:','');if(!name?.trim())return;let g=state.planGroups.find(x=>normalizeGroupName(x.name)===normalizeGroupName(name));if(!g){g={id:'pg_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7),name:name.trim(),maxAway:1};state.planGroups.push(g)}id=g.id}else{const idx=Number(answer)-1;if(Number(answer)>0&&state.planGroups[idx])id=state.planGroups[idx].id}
  state.departmentGroupIds[dep]=id;state.departmentGroups[dep]=groupById(id)?.name||'';saveState('Plan-Gruppe geändert',`${dep}: ${groupById(id)?.name||'keine'}`);renderAll()
 };

 window.editPlanGroupMaximum=idOrName=>{let g=groupById(idOrName)||state.planGroups.find(x=>x.name===idOrName);if(!g)return;const value=prompt(`Maximal gleichzeitig abwesende Urlauber in der gesamten Plan-Gruppe „${g.name}“:`,g.maxAway);if(value===null)return;const n=Number(value);if(!Number.isFinite(n)||n<0)return alert('Bitte eine gültige Zahl ab 0 eingeben.');g.maxAway=Math.floor(n);state.planGroupMaxAway[g.name]=g.maxAway;saveState('Plan-Gruppen-Maximum geändert',`${g.name}: ${g.maxAway}`);renderAll()};

 const renderDepartmentsV15Base=renderDepartments;
 renderDepartments=function(){
  renderDepartmentsV15Base();
  const box=$('planGroupSettings');if(box)box.innerHTML=`<h3>Plan-Gruppen</h3><p class="muted">Plan-Gruppen werden direkt bei der Abteilung ausgewählt. Die Zuordnung wird intern über eine feste ID gespeichert.</p><div class="table-wrapper"><table><thead><tr><th>Plan-Gruppe</th><th>Abteilungen</th><th>Max. Urlauber gesamt</th><th>Aktion</th></tr></thead><tbody>${state.planGroups.map(g=>`<tr><td><strong>${esc(g.name)}</strong></td><td>${esc(departmentsForGroupId(g.id).join(', ')||'–')}</td><td>${g.maxAway}</td><td><button class="button tiny" onclick="editPlanGroupMaximum('${esc(g.id)}')">Maximum ändern</button></td></tr>`).join('')||'<tr><td colspan="4" class="muted">Noch keine Plan-Gruppe angelegt.</td></tr>'}</tbody></table></div>`;
 };

 const exportMonthExcelV15Base=exportMonthExcel;
 exportMonthExcel=async function(){return exportMonthExcelV15Base()};

 // Replace remaining visible legend text and type labels at runtime.
 setTimeout(()=>{
  document.querySelectorAll('.muted').forEach(el=>{el.innerHTML=el.innerHTML.replace(/S = Sonderurlaub/g,'SU = Sonderurlaub').replace(/F = Fortbildung/g,'S = Seminar').replace(/G = Geplanter Freier Tag/g,'F = Geplanter Freier Tag')});
 },0);

 fillSelects();renderAll();
})();

/* Version 1.6: stabile Gruppenanzeige und sofortiger Monatsplan-Render */
(function(){
 const departmentKey=value=>String(value||'').trim().toLocaleLowerCase('de-DE').replace(/\s+/g,' ');
 const canonicalDepartment=value=>state.departments.find(dep=>departmentKey(dep)===departmentKey(value))||String(value||'').trim();

 // Bestehende Mitarbeiter-Abteilungsnamen auf die tatsächlich vorhandene Abteilung normalisieren.
 state.employees.forEach(employee=>{employee.department=canonicalDepartment(employee.department)});
 // Verwaiste Gruppen-IDs anhand der alten Namenszuordnung reparieren.
 state.departments.forEach(dep=>{
  const currentId=String(state.departmentGroupIds?.[dep]||'');
  if(currentId&&state.planGroups.some(group=>String(group.id)===currentId))return;
  const oldName=String(state.departmentGroups?.[dep]||'').trim();
  if(!oldName){state.departmentGroupIds[dep]='';return}
  let group=state.planGroups.find(item=>normalizeGroupName(item.name)===normalizeGroupName(oldName));
  if(!group){group={id:'pg_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8),name:oldName,maxAway:Math.max(0,Number(state.planGroupMaxAway?.[oldName]??1))};state.planGroups.push(group)}
  state.departmentGroupIds[dep]=group.id;
 });
 localStorage.setItem(STORE,JSON.stringify(state));

 function groupObjectFromChoice(choice){
  const value=String(choice||'');
  if(value.startsWith('__groupid__:'))return state.planGroups.find(g=>String(g.id)===value.slice(12));
  if(value.startsWith('__group__:'))return state.planGroups.find(g=>normalizeGroupName(g.name)===normalizeGroupName(value.slice(10)));
  return null;
 }
 function departmentsInGroup(group){
  if(!group)return[];
  const byId=state.departments.filter(dep=>String(state.departmentGroupIds?.[dep]||'')===String(group.id));
  if(byId.length)return byId;
  return state.departments.filter(dep=>normalizeGroupName(state.departmentGroups?.[dep])===normalizeGroupName(group.name));
 }
 selectedDepartments=function(value){
  if(value==='__leaders__')return[];
  const group=groupObjectFromChoice(value);
  if(group)return departmentsInGroup(group);
  const dep=canonicalDepartment(value);
  return state.departments.includes(dep)?[dep]:[];
 };
 employeesForSelection=function(choice){
  if(choice==='__leaders__')return state.employees.filter(e=>e.leader);
  const depKeys=new Set(selectedDepartments(choice).map(departmentKey));
  return state.employees.filter(e=>depKeys.has(departmentKey(e.department)));
 };
 groupVacationAwayCount=function(groupOrChoice,date){
  const group=String(groupOrChoice).startsWith('__')?groupObjectFromChoice(groupOrChoice):state.planGroups.find(g=>String(g.id)===String(groupOrChoice)||normalizeGroupName(g.name)===normalizeGroupName(groupOrChoice));
  const depKeys=new Set(departmentsInGroup(group).map(departmentKey));
  return state.employees.filter(e=>depKeys.has(departmentKey(e.department))).filter(e=>vacsFor(e.id).some(v=>activeVacationForLimit(v)&&inRange(date,v.from,v.to))).length;
 };
 maxAwayForGroup=function(groupOrChoice){
  const group=String(groupOrChoice).startsWith('__')?groupObjectFromChoice(groupOrChoice):state.planGroups.find(g=>String(g.id)===String(groupOrChoice)||normalizeGroupName(g.name)===normalizeGroupName(groupOrChoice));
  return Math.max(0,Number(group?.maxAway??1));
 };

 fillSelects=function(){
  const currentDepartment=$('departmentFilter')?.value||'';
  const currentYear=$('yearDepartmentFilter')?.value||'';
  const depOptions=state.departments.map(dep=>`<option value="${esc(dep)}">${esc(dep)}</option>`).join('');
  const groupOptions=state.planGroups.slice().sort((a,b)=>a.name.localeCompare(b.name,'de')).map(group=>`<option value="__groupid__:${esc(group.id)}">Plan-Gruppe: ${esc(group.name)}</option>`).join('');
  if($('departmentFilter')){
   $('departmentFilter').innerHTML='<option value="__leaders__">Leiterplan (alle Abteilungen)</option>'+groupOptions+depOptions;
   const values=['__leaders__',...state.planGroups.map(g=>`__groupid__:${g.id}`),...state.departments];
   let desired=currentDepartment;
   if(String(desired).startsWith('__group__:')){const g=groupObjectFromChoice(desired);desired=g?`__groupid__:${g.id}`:''}
   $('departmentFilter').value=values.includes(desired)?desired:(state.departments[0]||'__leaders__');
  }
  if($('yearDepartmentFilter')){
   $('yearDepartmentFilter').innerHTML=groupOptions+depOptions;
   const values=[...state.planGroups.map(g=>`__groupid__:${g.id}`),...state.departments];
   let desired=currentYear;
   if(String(desired).startsWith('__group__:')){const g=groupObjectFromChoice(desired);desired=g?`__groupid__:${g.id}`:''}
   $('yearDepartmentFilter').value=values.includes(desired)?desired:(state.departments[0]||'');
  }
  if($('employeeDepartment'))$('employeeDepartment').innerHTML=depOptions;
  if($('moveEmployee'))$('moveEmployee').innerHTML=state.employees.map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('');
  if($('employeeSubstitute'))$('employeeSubstitute').innerHTML='<option value="">Keine</option>'+state.employees.map(e=>`<option>${esc(e.name)}</option>`).join('');
  if($('newDepartmentGroup'))$('newDepartmentGroup').innerHTML='<option value="">Keine Plan-Gruppe</option>'+state.planGroups.slice().sort((a,b)=>a.name.localeCompare(b.name,'de')).map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('');
 };

 const renderCalendarV16Base=renderCalendar;
 renderCalendar=function(){
  // Leere/ungültige Monatswerte verhindern einen halbfertigen ersten Render.
  if(!$('monthFilter').value){const now=new Date();$('monthFilter').value=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`}
  renderCalendarV16Base();
  const choice=$('departmentFilter').value,group=groupObjectFromChoice(choice);
  if(!group)return;
  const deps=departmentsInGroup(group),employees=employeesForSelection(choice);
  // Der Basiskalender kennt alte Gruppen-Namenswerte. Bei ID-Werten wird hier erneut stabil aufgebaut.
  const [year,month]=$('monthFilter').value.split('-').map(Number),days=new Date(year,month,0).getDate();
  let html='<thead><tr><th class="employee-name">Mitarbeiter</th>';
  for(let day=1;day<=days;day++){
   const date=new Date(year,month-1,day),holiday=holidayName(date),weekday=['So','Mo','Di','Mi','Do','Fr','Sa'][date.getDay()];
   html+=`<th class="${date.getDay()===0?'sunday-header':''} ${holiday?'holiday-header':''}" title="${esc(holiday||weekday)}"><span>${day}</span><small>${holiday?esc(holiday):weekday}</small></th>`;
  }
  html+='</tr></thead><tbody>';
  if(!employees.length)html+=`<tr><td colspan="${days+1}" class="empty-plan"><strong>Keine Mitarbeiter gefunden.</strong><br><small>Zur Gruppe gehören: ${esc(deps.join(', ')||'keine Abteilung')}. Prüfe die Abteilungszuordnung in der Mitarbeiterverwaltung.</small></td></tr>`;
  let lastDepartment='';
  employees.sort((a,b)=>deps.map(departmentKey).indexOf(departmentKey(a.department))-deps.map(departmentKey).indexOf(departmentKey(b.department))||a.name.localeCompare(b.name,'de')).forEach(employee=>{
   const dep=canonicalDepartment(employee.department);
   if(dep!==lastDepartment){html+=`<tr class="department-separator"><td colspan="${days+1}"><strong>${esc(dep)}</strong> · maximal ${maxAwayForDepartment(dep)} Urlauber gleichzeitig</td></tr>`;lastDepartment=dep}
   html+=`<tr><td class="employee-name"><strong>${esc(employee.name)}</strong>${employee.leader?` <span class="badge leader-badge">Leiter${employee.keyLeader?' 🔑':''}</span>`:''}</td>`;
   for(let day=1;day<=days;day++){
    const date=new Date(year,month-1,day),vacation=vacsFor(employee.id).find(v=>inRange(date,v.from,v.to)),holiday=holidayName(date),critical=departmentVacationAwayCount(dep,date)>maxAwayForDepartment(dep)||groupVacationAwayCount(group.id,date)>maxAwayForGroup(group.id);
    let className=date.getDay()===0?'sunday':'';if(holiday)className='holiday';
    if(vacation)className=moveForVacation(vacation)?'moved-cell':vacation.status==='Beantragt'?'pending-cell':vacation.status==='Geplant'?'planned-cell':critical?'critical vacation-entry':'vacation';else if(critical)className=(className?className+' ':'')+'critical-day';
    html+=`<td class="${className}" title="${esc(vacationTitle(vacation,date,dep))}">${vacation?absenceCode(vacation):''}</td>`;
   }
   html+='</tr>';
  });
  $('calendarTable').innerHTML=html+'</tbody>';
  const notices=[];let bad=0,peak=0;
  for(let day=1;day<=days;day++){const count=groupVacationAwayCount(group.id,new Date(year,month-1,day));peak=Math.max(peak,count);if(count>maxAwayForGroup(group.id))bad++}
  notices.push(bad?`<div class="warning warning-danger"><strong>Plan-Gruppe ${esc(group.name)}:</strong> an ${bad} Tag(en) mehr als ${maxAwayForGroup(group.id)} Urlauber gleichzeitig (Spitze ${peak}).</div>`:`<div class="notice"><strong>Plan-Gruppe ${esc(group.name)}:</strong> ${employees.length} Mitarbeiter aus ${deps.length} Abteilungen · Maximum ${maxAwayForGroup(group.id)} Urlauber.</div>`);
  deps.forEach(dep=>{let depBad=0,depPeak=0;for(let day=1;day<=days;day++){const count=departmentVacationAwayCount(dep,new Date(year,month-1,day));depPeak=Math.max(depPeak,count);if(count>maxAwayForDepartment(dep))depBad++}if(depBad)notices.push(`<div class="warning warning-danger"><strong>${esc(dep)}:</strong> an ${depBad} Tag(en) mehr als ${maxAwayForDepartment(dep)} Urlauber gleichzeitig (Spitze ${depPeak}).</div>`)});
  const holidays=[];for(let day=1;day<=days;day++){const date=new Date(year,month-1,day),name=holidayName(date);if(name)holidays.push(`${day}.${month}. ${name}`)}if(holidays.length)notices.push(`<div class="holiday-list"><strong>Feiertage:</strong> ${holidays.map(esc).join(' · ')}</div>`);
  $('calendarWarning').innerHTML=notices.join('');
  renderVacationList(choice);
 };

 // Beim Seitenwechsel den Monatsplan nach dem Sichtbarwerden nochmals zeichnen.
 const navigation=$('navigation');
 if(navigation)navigation.addEventListener('click',event=>{
  if(!event.target.dataset.page)return;
  requestAnimationFrame(()=>{fillSelects();if(event.target.dataset.page==='calendar')renderCalendar();else renderAll()});
 });
 if($('departmentFilter'))$('departmentFilter').addEventListener('change',()=>requestAnimationFrame(renderCalendar));

 // Sofortiger sauberer Erst-Render und Cache-unabhängiges Neuzeichnen nach Laden.
 requestAnimationFrame(()=>{fillSelects();renderAll();requestAnimationFrame(renderCalendar)});
})();

/* Version 1.7: direkte Mitarbeiter-Zuordnung zu Plan-Gruppen */
(function(){
 const V17_GROUP_PREFIX='__employee_group__:';
 const originalNormalizeV17=normalize;
 normalize=function(data){
  const normalized=originalNormalizeV17(data);
  normalized.employees=(normalized.employees||[]).map(employee=>{
   const copy={...employee};
   copy.planGroupId=String(copy.planGroupId||'');
   const rawDepartment=String(copy.department||'').trim();
   if(!copy.planGroupId){
    let group=null;
    if(rawDepartment.startsWith(V17_GROUP_PREFIX))group=normalized.planGroups?.find(item=>String(item.id)===rawDepartment.slice(V17_GROUP_PREFIX.length));
    if(!group&&/^Plan-Gruppe\s*:/i.test(rawDepartment)){const name=rawDepartment.replace(/^Plan-Gruppe\s*:/i,'').trim();group=normalized.planGroups?.find(item=>normalizeGroupName(item.name)===normalizeGroupName(name));}
    if(!group)group=normalized.planGroups?.find(item=>normalizeGroupName(item.name)===normalizeGroupName(rawDepartment));
    if(group){copy.planGroupId=String(group.id);copy.department='';}
   }
   return copy;
  });
  return normalized;
 };
 state=normalize(state);localStorage.setItem(STORE,JSON.stringify(state));

 function v17GroupById(id){return state.planGroups.find(group=>String(group.id)===String(id))}
 function v17GroupForEmployee(employee){
  if(!employee)return null;
  if(employee.planGroupId){const direct=v17GroupById(employee.planGroupId);if(direct)return direct;}
  const raw=String(employee.department||'').trim();
  if(raw.startsWith(V17_GROUP_PREFIX))return v17GroupById(raw.slice(V17_GROUP_PREFIX.length));
  if(/^Plan-Gruppe\s*:/i.test(raw)){const name=raw.replace(/^Plan-Gruppe\s*:/i,'').trim();return state.planGroups.find(group=>normalizeGroupName(group.name)===normalizeGroupName(name));}
  return state.planGroups.find(group=>normalizeGroupName(group.name)===normalizeGroupName(raw))||null;
 }
 function v17EmployeeDepartmentKey(employee){return departmentKey(employee?.department||'')}
 function v17DepartmentBelongsToAnyGroup(department){
  const depKey=departmentKey(department);
  return state.planGroups.some(group=>departmentsInGroup(group).some(dep=>departmentKey(dep)===depKey));
 }
 function v17EmployeesForGroup(group){
  if(!group)return[];
  const memberKeys=new Set(departmentsInGroup(group).map(departmentKey));
  return state.employees.filter(employee=>{
   const direct=v17GroupForEmployee(employee);
   if(direct&&String(direct.id)===String(group.id))return true;
   return memberKeys.has(v17EmployeeDepartmentKey(employee));
  });
 }
 function v17EmployeeLabel(employee){
  const group=v17GroupForEmployee(employee);
  return group?`Plan-Gruppe: ${group.name}`:(employee.department||'Keine Zuordnung');
 }

 const oldEmployeesForSelection=employeesForSelection;
 employeesForSelection=function(choice){
  if(choice==='__leaders__')return state.employees.filter(employee=>employee.leader);
  const group=groupObjectFromChoice(choice);
  if(group)return v17EmployeesForGroup(group);
  const selected=selectedDepartments(choice);
  const keys=new Set(selected.map(departmentKey));
  return state.employees.filter(employee=>!v17GroupForEmployee(employee)&&keys.has(v17EmployeeDepartmentKey(employee)));
 };

 const oldFillSelectsV17=fillSelects;
 fillSelects=function(){
  oldFillSelectsV17();
  const currentCalendar=$('departmentFilter')?.value||'';
  const currentYear=$('yearDepartmentFilter')?.value||'';
  const groupOptions=state.planGroups.slice().sort((a,b)=>a.name.localeCompare(b.name,'de')).map(group=>`<option value="__groupid__:${esc(group.id)}">Plan-Gruppe: ${esc(group.name)}</option>`).join('');
  const visibleDepartments=state.departments.filter(department=>!v17DepartmentBelongsToAnyGroup(department));
  const calendarDepartmentOptions=visibleDepartments.map(department=>`<option value="${esc(department)}">${esc(department)}</option>`).join('');
  if($('departmentFilter')){
   $('departmentFilter').innerHTML='<option value="__leaders__">Leiterplan (alle Abteilungen)</option>'+groupOptions+calendarDepartmentOptions;
   const valid=['__leaders__',...state.planGroups.map(group=>`__groupid__:${group.id}`),...visibleDepartments];
   let desired=currentCalendar;
   if(String(desired).startsWith('__group__:')){const group=groupObjectFromChoice(desired);desired=group?`__groupid__:${group.id}`:'';}
   if(!valid.includes(desired)){
    const oldDepartment=canonicalDepartment(desired),group=state.planGroups.find(item=>departmentsInGroup(item).some(dep=>departmentKey(dep)===departmentKey(oldDepartment)));
    desired=group?`__groupid__:${group.id}`:(visibleDepartments[0]||'__leaders__');
   }
   $('departmentFilter').value=desired;
  }
  if($('yearDepartmentFilter')){
   $('yearDepartmentFilter').innerHTML=groupOptions+calendarDepartmentOptions;
   const valid=[...state.planGroups.map(group=>`__groupid__:${group.id}`),...visibleDepartments];
   let desired=currentYear;
   if(String(desired).startsWith('__group__:')){const group=groupObjectFromChoice(desired);desired=group?`__groupid__:${group.id}`:'';}
   if(!valid.includes(desired))desired=valid[0]||'';
   $('yearDepartmentFilter').value=desired;
  }
  if($('employeeDepartment')){
   const currentEmployeeValue=$('employeeDepartment').value;
   const employeeGroupOptions=state.planGroups.slice().sort((a,b)=>a.name.localeCompare(b.name,'de')).map(group=>`<option value="${V17_GROUP_PREFIX}${esc(group.id)}">Plan-Gruppe: ${esc(group.name)}</option>`).join('');
   const allDepartmentOptions=state.departments.map(department=>`<option value="${esc(department)}">${esc(department)}</option>`).join('');
   $('employeeDepartment').innerHTML='<option value="">Bitte auswählen</option>'+employeeGroupOptions+allDepartmentOptions;
   if([...$('employeeDepartment').options].some(option=>option.value===currentEmployeeValue))$('employeeDepartment').value=currentEmployeeValue;
  }
 };

 saveEmployee=function(){
  const name=$('employeeName').value.trim();if(!name)return alert('Bitte einen Namen eingeben.');
  const selection=$('employeeDepartment').value;if(!selection)return alert('Bitte eine Abteilung oder Plan-Gruppe auswählen.');
  const isGroup=selection.startsWith(V17_GROUP_PREFIX),planGroupId=isGroup?selection.slice(V17_GROUP_PREFIX.length):'',department=isGroup?'':selection;
  const id=Number($('editingEmployeeId').value),obj={name,department,planGroupId,hours:Number($('employeeHours').value),vacationDays:Number($('employeeVacationDays').value),carryover:Number($('employeeCarryover').value||0),leader:$('employeeLeader').checked,keyLeader:$('employeeKeyLeader')?.checked||false,substitute:$('employeeSubstitute').value};
  if(obj.keyLeader)obj.leader=true;
  if(id){const employee=emp(id);Object.assign(employee,obj)}else state.employees.push({id:Date.now(),...obj});
  saveState('Mitarbeiter gespeichert',`${name} · ${isGroup?'Plan-Gruppe '+(v17GroupById(planGroupId)?.name||''):department}`);clearEmployeeForm();renderAll();
 };

 window.editEmployee=function(id){
  const employee=emp(id);if(!employee)return;
  $('editingEmployeeId').value=id;$('employeeName').value=employee.name;fillSelects();
  const group=v17GroupForEmployee(employee);$('employeeDepartment').value=group?V17_GROUP_PREFIX+group.id:employee.department;
  $('employeeHours').value=employee.hours;$('employeeVacationDays').value=employee.vacationDays;$('employeeCarryover').value=employee.carryover||0;$('employeeLeader').checked=employee.leader;if($('employeeKeyLeader'))$('employeeKeyLeader').checked=employee.keyLeader||false;$('employeeSubstitute').value=employee.substitute||'';$('addEmployee').textContent='Änderungen speichern';$('cancelEmployeeEdit').classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'});
 };

 const oldRenderEmployeesV17=renderEmployees;
 renderEmployees=function(){
  oldRenderEmployeesV17();
  const table=$('employeeTable');if(!table)return;
  table.innerHTML='<thead><tr><th>Name</th><th>Zuordnung</th><th>Stunden</th><th>Urlaubskonto</th><th>Leiter</th><th>Vertretung</th><th></th></tr></thead><tbody>'+state.employees.map(employee=>{const used=usedDays(employee.id),entitlement=Number(employee.vacationDays||0)+Number(employee.carryover||0),remaining=entitlement-used;return `<tr><td>${esc(employee.name)}</td><td>${esc(v17EmployeeLabel(employee))}</td><td>${employee.hours}</td><td>Anspruch ${employee.vacationDays||0} + Übertrag ${employee.carryover||0} · Verplant ${used} · <strong>Rest ${remaining}</strong></td><td>${employee.leader?'Ja'+(employee.keyLeader?' 🔑':''):'Nein'}</td><td>${esc(employee.substitute||'–')}</td><td><button class="button tiny" onclick="editEmployee(${employee.id})">Bearbeiten</button> <button class="icon-button" onclick="deleteEmployee(${employee.id})">🗑️</button></td></tr>`}).join('')+'</tbody>';
 };

 const oldRenderCalendarV17=renderCalendar;
 renderCalendar=function(){
  oldRenderCalendarV17();
  const choice=$('departmentFilter').value,group=groupObjectFromChoice(choice);if(!group)return;
  const employees=v17EmployeesForGroup(group),deps=departmentsInGroup(group),[year,month]=$('monthFilter').value.split('-').map(Number),days=new Date(year,month,0).getDate();
  let html='<thead><tr><th class="employee-name">Mitarbeiter</th>';
  for(let day=1;day<=days;day++){const date=new Date(year,month-1,day),holiday=holidayName(date),weekday=['So','Mo','Di','Mi','Do','Fr','Sa'][date.getDay()];html+=`<th class="${date.getDay()===0?'sunday-header':''} ${holiday?'holiday-header':''}" title="${esc(holiday||weekday)}"><span>${day}</span><small>${holiday?esc(holiday):weekday}</small></th>`;}html+='</tr></thead><tbody>';
  if(!employees.length)html+=`<tr><td colspan="${days+1}" class="empty-plan"><strong>Keine Mitarbeiter gefunden.</strong><br><small>Ordne Mitarbeiter in der Mitarbeiterverwaltung direkt der Plan-Gruppe „${esc(group.name)}“ oder einer Mitgliedsabteilung zu.</small></td></tr>`;
  const depOrder=new Map(deps.map((dep,index)=>[departmentKey(dep),index]));
  employees.sort((a,b)=>{const ga=v17GroupForEmployee(a),gb=v17GroupForEmployee(b),ia=ga?deps.length:(depOrder.get(v17EmployeeDepartmentKey(a))??deps.length+1),ib=gb?deps.length:(depOrder.get(v17EmployeeDepartmentKey(b))??deps.length+1);return ia-ib||a.name.localeCompare(b.name,'de')});
  let lastSection='';
  employees.forEach(employee=>{const directGroup=v17GroupForEmployee(employee),section=directGroup?'Direkt der Plan-Gruppe zugeordnet':canonicalDepartment(employee.department);if(section!==lastSection){html+=`<tr class="department-separator"><td colspan="${days+1}"><strong>${esc(section)}</strong>${directGroup?'':` · maximal ${maxAwayForDepartment(section)} Urlauber gleichzeitig`}</td></tr>`;lastSection=section;}html+=`<tr><td class="employee-name"><strong>${esc(employee.name)}</strong>${employee.leader?` <span class="badge leader-badge">Leiter${employee.keyLeader?' 🔑':''}</span>`:''}</td>`;for(let day=1;day<=days;day++){const date=new Date(year,month-1,day),vacation=vacsFor(employee.id).find(v=>inRange(date,v.from,v.to)),holiday=holidayName(date),critical=groupVacationAwayCount(group.id,date)>maxAwayForGroup(group.id)||(!directGroup&&departmentVacationAwayCount(section,date)>maxAwayForDepartment(section));let className=date.getDay()===0?'sunday':'';if(holiday)className='holiday';if(vacation)className=moveForVacation(vacation)?'moved-cell':vacation.status==='Beantragt'?'pending-cell':vacation.status==='Geplant'?'planned-cell':critical?'critical vacation-entry':'vacation';else if(critical)className=(className?className+' ':'')+'critical-day';html+=`<td class="${className}" title="${esc(vacationTitle(vacation,date,directGroup?group.name:section))}">${vacation?absenceCode(vacation):''}</td>`;}html+='</tr>';});
  $('calendarTable').innerHTML=html+'</tbody>';
  let peak=0,bad=0;for(let day=1;day<=days;day++){const count=groupVacationAwayCount(group.id,new Date(year,month-1,day));peak=Math.max(peak,count);if(count>maxAwayForGroup(group.id))bad++;}
  const messages=[bad?`<div class="warning warning-danger"><strong>Plan-Gruppe ${esc(group.name)}:</strong> an ${bad} Tag(en) mehr als ${maxAwayForGroup(group.id)} Urlauber gleichzeitig (Spitze ${peak}).</div>`:`<div class="notice"><strong>Plan-Gruppe ${esc(group.name)}:</strong> ${employees.length} Mitarbeiter · ${deps.length} Mitgliedsabteilungen · Maximum ${maxAwayForGroup(group.id)} Urlauber.</div>`];
  const holidays=[];for(let day=1;day<=days;day++){const date=new Date(year,month-1,day),name=holidayName(date);if(name)holidays.push(`${day}.${month}. ${name}`)}if(holidays.length)messages.push(`<div class="holiday-list"><strong>Feiertage:</strong> ${holidays.map(esc).join(' · ')}</div>`);
  $('calendarWarning').innerHTML=messages.join('');renderVacationList(choice);
 };

 groupVacationAwayCount=function(groupOrChoice,date){
  const group=String(groupOrChoice).startsWith('__')?groupObjectFromChoice(groupOrChoice):state.planGroups.find(item=>String(item.id)===String(groupOrChoice)||normalizeGroupName(item.name)===normalizeGroupName(groupOrChoice));
  return v17EmployeesForGroup(group).filter(employee=>vacsFor(employee.id).some(vacation=>activeVacationForLimit(vacation)&&inRange(date,vacation.from,vacation.to))).length;
 };

 saveState('Version 1.7 migriert','Direkte Plan-Gruppen-Zuordnung für Mitarbeiter aktiviert');
 requestAnimationFrame(()=>{fillSelects();renderAll();});
})();

/* Version 1.8: Abteilung als Stammdatum, automatische Plan-Gruppe und datierte Abteilungswechsel */
(function(){
 const V18_START='2000-01-01';
 const key=value=>String(value||'').trim().toLocaleLowerCase('de-DE').replace(/\s+/g,' ');
 const isoDay=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
 const dayBefore=value=>{const d=localDate(value);d.setDate(d.getDate()-1);return isoDay(d)};
 const monthBounds=(year,month)=>({start:new Date(year,month-1,1),end:new Date(year,month,0)});
 const groupForDepartment=department=>{
  const canonical=state.departments.find(dep=>key(dep)===key(department));if(!canonical)return null;
  const id=String(state.departmentGroupIds?.[canonical]||'');
  if(id){const direct=state.planGroups.find(group=>String(group.id)===id);if(direct)return direct}
  const oldName=String(state.departmentGroups?.[canonical]||'').trim();
  return oldName?state.planGroups.find(group=>normalizeGroupName(group.name)===normalizeGroupName(oldName))||null:null;
 };
 const groupDepartments=group=>{
  if(!group)return[];
  const byId=state.departments.filter(dep=>String(state.departmentGroupIds?.[dep]||'')===String(group.id));
  if(byId.length)return byId;
  return state.departments.filter(dep=>normalizeGroupName(state.departmentGroups?.[dep])===normalizeGroupName(group.name));
 };
 const groupFromChoice=choice=>{
  const value=String(choice||'');
  if(value.startsWith('__groupid__:'))return state.planGroups.find(group=>String(group.id)===value.slice(12))||null;
  if(value.startsWith('__group__:'))return state.planGroups.find(group=>normalizeGroupName(group.name)===normalizeGroupName(value.slice(10)))||null;
  return null;
 };
 function normalizeAssignments(employee){
  let items=Array.isArray(employee.departmentHistory)?employee.departmentHistory:[];
  items=items.map(item=>({department:String(item.department||'').trim(),from:String(item.from||V18_START),to:String(item.to||'')})).filter(item=>item.department);
  if(!items.length&&employee.department)items=[{department:String(employee.department).trim(),from:V18_START,to:''}];
  items.sort((a,b)=>a.from.localeCompare(b.from));
  // Bereiche lückenlos und ohne Überlappung halten.
  for(let i=0;i<items.length-1;i++)if(!items[i].to||items[i].to>=items[i+1].from)items[i].to=dayBefore(items[i+1].from);
  if(items.length)items[items.length-1].to='';
  employee.departmentHistory=items;
  if(items.length)employee.department=items[items.length-1].department;
  employee.planGroupId='';
  return items;
 }
 state.employees.forEach(employee=>{
  // Alte direkte Gruppen-Zuordnungen auf eine echte Mitgliedsabteilung migrieren.
  if(!employee.department&&employee.planGroupId){const group=state.planGroups.find(item=>String(item.id)===String(employee.planGroupId)),deps=groupDepartments(group);if(deps.length)employee.department=deps[0]}
  normalizeAssignments(employee);
 });
 localStorage.setItem(STORE,JSON.stringify(state));

 function departmentAt(employee,date){
  if(!employee)return'';
  const iso=typeof date==='string'?date:isoDay(date);
  const history=normalizeAssignments(employee);
  const match=[...history].reverse().find(item=>item.from<=iso&&(!item.to||item.to>=iso));
  return match?.department||employee.department||'';
 }
 function belongsToDepartmentOn(employee,department,date){return key(departmentAt(employee,date))===key(department)}
 function belongsToGroupOn(employee,group,date){const dep=departmentAt(employee,date);return groupDepartments(group).some(item=>key(item)===key(dep))}
 function assignedAnyDay(employee,predicate,year,month){const {start,end}=monthBounds(year,month);for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1))if(predicate(employee,new Date(d)))return true;return false}
 function employeeGroupLabel(employee){const group=groupForDepartment(employee.department);return group?group.name:'Keine Plan-Gruppe'}
 function updatePlanGroupDisplay(){const dep=$('employeeDepartment')?.value||'';const group=groupForDepartment(dep);if($('employeePlanGroupDisplay'))$('employeePlanGroupDisplay').value=group?group.name:'Keine Plan-Gruppe'}
 function historyLabel(employee){const history=normalizeAssignments(employee);if(history.length<2)return'';return history.map(item=>`${item.department} ab ${localDate(item.from).toLocaleDateString('de-DE')}${item.to?' bis '+localDate(item.to).toLocaleDateString('de-DE'):''}`).join(' · ')}

 // Nur reale Abteilungen auswählbar. Die Plan-Gruppe wird automatisch von der Abteilung abgeleitet.
 const fillSelectsV18Base=fillSelects;
 fillSelects=function(){
  fillSelectsV18Base();
  if($('employeeDepartment')){
   const current=$('employeeDepartment').value;
   $('employeeDepartment').innerHTML='<option value="">Bitte Abteilung auswählen</option>'+state.departments.map(dep=>`<option value="${esc(dep)}">${esc(dep)}</option>`).join('');
   if(state.departments.some(dep=>dep===current))$('employeeDepartment').value=current;
   updatePlanGroupDisplay();
  }
  // Im Monatsplan gruppierte Einzelabteilungen ausblenden.
  const groupedKeys=new Set(state.planGroups.flatMap(group=>groupDepartments(group)).map(key));
  const visible=state.departments.filter(dep=>!groupedKeys.has(key(dep)));
  const groupOptions=state.planGroups.slice().sort((a,b)=>a.name.localeCompare(b.name,'de')).map(group=>`<option value="__groupid__:${esc(group.id)}">Plan-Gruppe: ${esc(group.name)}</option>`).join('');
  if($('departmentFilter')){
   const wanted=$('departmentFilter').value;
   $('departmentFilter').innerHTML='<option value="__leaders__">Leiterplan (alle Abteilungen)</option>'+groupOptions+visible.map(dep=>`<option value="${esc(dep)}">${esc(dep)}</option>`).join('');
   const options=[...$('departmentFilter').options].map(option=>option.value);
   if(options.includes(wanted))$('departmentFilter').value=wanted;else $('departmentFilter').value=options[1]||'__leaders__';
  }
  if($('yearDepartmentFilter')){
   const wanted=$('yearDepartmentFilter').value;
   $('yearDepartmentFilter').innerHTML=groupOptions+visible.map(dep=>`<option value="${esc(dep)}">${esc(dep)}</option>`).join('');
   const options=[...$('yearDepartmentFilter').options].map(option=>option.value);$('yearDepartmentFilter').value=options.includes(wanted)?wanted:(options[0]||'');
  }
 };
 if($('employeeDepartment'))$('employeeDepartment').addEventListener('change',updatePlanGroupDisplay);

 saveEmployee=function(){
  const name=$('employeeName').value.trim(),department=$('employeeDepartment').value;if(!name)return alert('Bitte einen Namen eingeben.');if(!department)return alert('Bitte eine Abteilung auswählen.');
  const id=Number($('editingEmployeeId').value),transferDate=$('employeeTransferDate')?.value||'';
  const common={name,hours:Number($('employeeHours').value),vacationDays:Number($('employeeVacationDays').value),carryover:Number($('employeeCarryover').value||0),leader:$('employeeLeader').checked,keyLeader:$('employeeKeyLeader')?.checked||false,substitute:$('employeeSubstitute').value};if(common.keyLeader)common.leader=true;
  if(id){
   const employee=emp(id);normalizeAssignments(employee);const previous=employee.department;
   if(key(previous)!==key(department)){
    if(!transferDate)return alert('Bitte für den Abteilungswechsel das Datum „gültig ab“ angeben.');
    const last=employee.departmentHistory[employee.departmentHistory.length-1];
    if(last&&transferDate<=last.from)return alert('Das Wechsel-Datum muss nach dem Beginn der aktuellen Zuordnung liegen.');
    if(last)last.to=dayBefore(transferDate);
    employee.departmentHistory.push({department,from:transferDate,to:''});
   }
   Object.assign(employee,common,{department,planGroupId:''});normalizeAssignments(employee);
  }else{
   state.employees.push({id:Date.now(),...common,department,planGroupId:'',departmentHistory:[{department,from:V18_START,to:''}]});
  }
  saveState('Mitarbeiter gespeichert',`${name} · ${department}${transferDate?' ab '+transferDate:''}`);clearEmployeeForm();renderAll();
 };

 window.editEmployee=function(id){
  const employee=emp(id);if(!employee)return;normalizeAssignments(employee);$('editingEmployeeId').value=id;$('employeeName').value=employee.name;fillSelects();$('employeeDepartment').value=employee.department;updatePlanGroupDisplay();$('employeeTransferDate').value='';$('employeeHours').value=employee.hours;$('employeeVacationDays').value=employee.vacationDays;$('employeeCarryover').value=employee.carryover||0;$('employeeLeader').checked=employee.leader;if($('employeeKeyLeader'))$('employeeKeyLeader').checked=employee.keyLeader||false;$('employeeSubstitute').value=employee.substitute||'';$('addEmployee').textContent='Änderungen speichern';$('cancelEmployeeEdit').classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'});
 };
 const clearEmployeeFormV18Base=clearEmployeeForm;
 clearEmployeeForm=function(){clearEmployeeFormV18Base();if($('employeeTransferDate'))$('employeeTransferDate').value='';updatePlanGroupDisplay()};

 renderEmployees=function(){
  $('employeeListCount').textContent=`${state.employees.length} Mitarbeiter`;
  $('employeeTable').innerHTML='<thead><tr><th>Name</th><th>Aktuelle Abteilung / Plan-Gruppe</th><th>Stunden</th><th>Urlaubskonto</th><th>Leiter</th><th>Vertretung</th><th>Aktion</th></tr></thead><tbody>'+state.employees.map(employee=>{const used=usedDays(employee.id),entitlement=Number(employee.vacationDays||0)+Number(employee.carryover||0),remaining=entitlement-used,history=historyLabel(employee);return `<tr><td>${esc(employee.name)}${history?`<div class="transfer-history">${esc(history)}</div>`:''}</td><td><strong>${esc(employee.department||'–')}</strong><br><small>${esc(employeeGroupLabel(employee))}</small></td><td>${employee.hours}</td><td>Anspruch ${employee.vacationDays||0} + Übertrag ${employee.carryover||0} · Verplant ${used} · <strong>Rest ${remaining}</strong></td><td>${employee.leader?'Ja'+(employee.keyLeader?' 🔑':''):'Nein'}</td><td>${esc(employee.substitute||'–')}</td><td><button class="button tiny" onclick="editEmployee(${employee.id})">Bearbeiten</button> <button class="icon-button" onclick="deleteEmployee(${employee.id})">🗑️</button></td></tr>`}).join('')+'</tbody>';
 };

 // Datumsabhängige Auswahl: Ein Wechsel wird ab seinem Gültigkeitsdatum im passenden Plan sichtbar.
 employeesForSelection=function(choice){
  if(choice==='__leaders__')return state.employees.filter(employee=>employee.leader);
  const group=groupFromChoice(choice),[year,month]=($('monthFilter')?.value||`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`).split('-').map(Number);
  if(group)return state.employees.filter(employee=>assignedAnyDay(employee,(e,date)=>belongsToGroupOn(e,group,date),year,month));
  return state.employees.filter(employee=>assignedAnyDay(employee,(e,date)=>belongsToDepartmentOn(e,choice,date),year,month));
 };
 departmentVacationAwayCount=function(department,date){return state.employees.filter(employee=>belongsToDepartmentOn(employee,department,date)).filter(employee=>vacsFor(employee.id).some(vacation=>activeVacationForLimit(vacation)&&inRange(date,vacation.from,vacation.to))).length};
 groupVacationAwayCount=function(groupOrChoice,date){const group=String(groupOrChoice).startsWith('__')?groupFromChoice(groupOrChoice):state.planGroups.find(item=>String(item.id)===String(groupOrChoice)||normalizeGroupName(item.name)===normalizeGroupName(groupOrChoice));if(!group)return 0;return state.employees.filter(employee=>belongsToGroupOn(employee,group,date)).filter(employee=>vacsFor(employee.id).some(vacation=>activeVacationForLimit(vacation)&&inRange(date,vacation.from,vacation.to))).length};

 renderCalendar=function(){
  if(!$('monthFilter').value){const now=new Date();$('monthFilter').value=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`}
  const choice=$('departmentFilter').value,[year,month]=$('monthFilter').value.split('-').map(Number),days=new Date(year,month,0).getDate(),leaderMode=choice==='__leaders__',group=groupFromChoice(choice),employees=employeesForSelection(choice);
  $('vacationEmployee').innerHTML=employees.map(employee=>`<option value="${employee.id}">${esc(employee.name)}</option>`).join('');
  let html='<thead><tr><th class="employee-name">Mitarbeiter</th>';for(let day=1;day<=days;day++){const date=new Date(year,month-1,day),holiday=holidayName(date),weekday=['So','Mo','Di','Mi','Do','Fr','Sa'][date.getDay()];html+=`<th class="${date.getDay()===0?'sunday-header':''} ${holiday?'holiday-header':''}" title="${esc(holiday||weekday)}"><span>${day}</span><small>${holiday?esc(holiday):weekday}</small></th>`}html+='</tr></thead><tbody>';
  if(!employees.length)html+=`<tr><td colspan="${days+1}" class="empty-plan"><strong>Keine Mitarbeiter gefunden.</strong><br><small>${group?'Prüfe die Abteilungen der Plan-Gruppe und die datierten Mitarbeiter-Zuordnungen.':'Prüfe die Abteilungszuordnung der Mitarbeiter.'}</small></td></tr>`;
  const sections=group?groupDepartments(group):[];let lastSection='';
  employees.sort((a,b)=>a.name.localeCompare(b.name,'de')).forEach(employee=>{
   const firstDate=new Date(year,month-1,1),section=leaderMode?'':group?(departmentAt(employee,firstDate)||departmentAt(employee,new Date(year,month,days))):choice;
   if(group&&section!==lastSection){html+=`<tr class="department-separator"><td colspan="${days+1}"><strong>${esc(section)}</strong> · maximal ${maxAwayForDepartment(section)} Urlauber gleichzeitig</td></tr>`;lastSection=section}
   html+=`<tr><td class="employee-name"><strong>${esc(employee.name)}</strong>${employee.leader?` <span class="badge leader-badge">Leiter${employee.keyLeader?' 🔑':''}</span>`:''}${normalizeAssignments(employee).length>1?'<span class="department-transfer-note">Abteilungswechsel</span>':''}${leaderMode?`<br><small>${esc(departmentAt(employee,firstDate)||employee.department)} · Vertretung: ${esc(employee.substitute||'Keine')}</small>`:''}</td>`;
   for(let day=1;day<=days;day++){
    const date=new Date(year,month-1,day),dep=departmentAt(employee,date),assigned=leaderMode?true:group?belongsToGroupOn(employee,group,date):belongsToDepartmentOn(employee,choice,date),vacation=assigned?vacsFor(employee.id).find(v=>inRange(date,v.from,v.to)):null,holiday=holidayName(date);
    let cls=!assigned?'assignment-inactive':date.getDay()===0?'sunday':'';if(assigned&&holiday)cls='holiday';
    const critical=assigned&&!leaderMode&&(group?groupVacationAwayCount(group.id,date)>maxAwayForGroup(group.id)||departmentVacationAwayCount(dep,date)>maxAwayForDepartment(dep):departmentVacationAwayCount(choice,date)>maxAwayForDepartment(choice));
    if(vacation)cls=moveForVacation(vacation)?'moved-cell':vacation.status==='Beantragt'?'pending-cell':vacation.status==='Geplant'?'planned-cell':critical?'critical vacation-entry':'vacation';else if(critical)cls=(cls?cls+' ':'')+'critical-day';
    html+=`<td class="${cls}" title="${assigned?esc(vacationTitle(vacation,date,dep)):esc('Noch nicht / nicht mehr dieser Abteilung zugeordnet')}">${vacation?absenceCode(vacation):''}</td>`;
   }
   html+='</tr>';
  });
  $('calendarTable').innerHTML=html+'</tbody>';
  const notices=[];
  if(leaderMode){let peak=0;for(let day=1;day<=days;day++){const date=new Date(year,month-1,day);peak=Math.max(peak,employees.filter(employee=>vacsFor(employee.id).some(v=>activeVacationForLimit(v)&&inRange(date,v.from,v.to))).length)}notices.push(peak>maxAwayForLeaders()?`<div class="warning warning-danger"><strong>Leiterüberschneidung:</strong> Bis zu ${peak} Leitungen gleichzeitig abwesend.</div>`:'<div class="notice"><strong>Leiterplan:</strong> Keine Überschreitung im gewählten Monat.</div>')}
  else if(group){let bad=0,peak=0;for(let day=1;day<=days;day++){const count=groupVacationAwayCount(group.id,new Date(year,month-1,day));peak=Math.max(peak,count);if(count>maxAwayForGroup(group.id))bad++}notices.push(bad?`<div class="warning warning-danger"><strong>Plan-Gruppe ${esc(group.name)}:</strong> an ${bad} Tag(en) über dem Maximum von ${maxAwayForGroup(group.id)} (Spitze ${peak}).</div>`:`<div class="notice"><strong>Plan-Gruppe ${esc(group.name)}:</strong> ${employees.length} Mitarbeiter aus ${groupDepartments(group).length} Abteilungen · Maximum ${maxAwayForGroup(group.id)} Urlauber.</div>`)}
  else{let peak=0,bad=0;for(let day=1;day<=days;day++){const count=departmentVacationAwayCount(choice,new Date(year,month-1,day));peak=Math.max(peak,count);if(count>maxAwayForDepartment(choice))bad++}if(bad)notices.push(`<div class="warning warning-danger"><strong>${esc(choice)}:</strong> an ${bad} Tag(en) über dem Maximum von ${maxAwayForDepartment(choice)} (Spitze ${peak}).</div>`)}
  const holidays=[];for(let day=1;day<=days;day++){const date=new Date(year,month-1,day),name=holidayName(date);if(name)holidays.push(`${day}.${month}. ${name}`)}if(holidays.length)notices.push(`<div class="holiday-list"><strong>Feiertage:</strong> ${holidays.map(esc).join(' · ')}</div>`);
  $('calendarWarning').innerHTML=notices.join('');renderVacationList(choice);
 };

 // Urlaubsbearbeitung öffnet den Plan, in dem die Person zum Beginn des Eintrags geführt wird.
 window.editVacation=function(id){const vacation=state.vacations.find(item=>item.id===id);if(!vacation)return;const employee=emp(vacation.employeeId),dep=departmentAt(employee,vacation.from),group=groupForDepartment(dep);fillSelects();$('departmentFilter').value=group?`__groupid__:${group.id}`:dep;renderCalendar();$('editingVacationId').value=id;$('vacationEmployee').value=vacation.employeeId;$('vacationFrom').value=vacation.from;$('vacationTo').value=vacation.to;$('vacationType').value=vacation.type;$('vacationScope').value=vacation.scope||'full';$('vacationStatus').value=vacation.status;$('vacationNote').value=vacation.note||'';$('vacationFormTitle').textContent='Urlaub bearbeiten oder verschieben';$('vacationForm').classList.remove('hidden');$('vacationForm').scrollIntoView({behavior:'smooth'})};

 saveState('Version 1.8 migriert','Automatische Plan-Gruppen-Anzeige und datierte Abteilungswechsel aktiviert');
 requestAnimationFrame(()=>{fillSelects();renderAll();requestAnimationFrame(renderCalendar)});
})();

/* Version 1.9: stabile Plan-Gruppen-/Abteilungszuordnung, datierte Wechsel und PWA */
(function(){
 const V19_START='2000-01-01';
 const norm=value=>String(value||'').trim().toLocaleLowerCase('de-DE').replace(/\s+/g,' ');
 const dateIso=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
 const previousDay=value=>{const date=localDate(value);date.setDate(date.getDate()-1);return dateIso(date)};
 const groupById=id=>(state.planGroups||[]).find(group=>String(group.id)===String(id))||null;
 const canonicalDepartment=value=>(state.departments||[]).find(dep=>norm(dep)===norm(value))||String(value||'').trim();
 const departmentsOfGroup=group=>{
  if(!group)return[];
  const explicit=(state.departments||[]).filter(dep=>String(state.departmentGroupIds?.[dep]||'')===String(group.id));
  if(explicit.length)return explicit;
  return (state.departments||[]).filter(dep=>norm(state.departmentGroups?.[dep])===norm(group.name));
 };
 const groupForDepartment=department=>{
  const dep=canonicalDepartment(department);if(!dep)return null;
  const id=String(state.departmentGroupIds?.[dep]||'');
  if(id&&groupById(id))return groupById(id);
  const legacy=String(state.departmentGroups?.[dep]||'').trim();
  return legacy?(state.planGroups||[]).find(group=>norm(group.name)===norm(legacy))||null:null;
 };
 const groupFromChoice=choice=>{
  const value=String(choice||'');
  if(value.startsWith('__groupid__:'))return groupById(value.slice(12));
  if(value.startsWith('__group__:'))return (state.planGroups||[]).find(group=>norm(group.name)===norm(value.slice(10)))||null;
  return null;
 };
 function normalizeHistory(employee){
  let history=Array.isArray(employee.departmentHistory)?employee.departmentHistory:[];
  history=history.map(item=>{
   const department=canonicalDepartment(item.department||employee.department||'');
   const inferred=groupForDepartment(department);
   return{department,planGroupId:String(item.planGroupId||inferred?.id||''),from:String(item.from||V19_START),to:String(item.to||'')};
  }).filter(item=>item.department);
  if(!history.length&&employee.department){const department=canonicalDepartment(employee.department),group=employee.planGroupId?groupById(employee.planGroupId):groupForDepartment(department);history=[{department,planGroupId:String(group?.id||''),from:V19_START,to:''}]}
  history.sort((a,b)=>a.from.localeCompare(b.from));
  for(let i=0;i<history.length-1;i++)if(!history[i].to||history[i].to>=history[i+1].from)history[i].to=previousDay(history[i+1].from);
  if(history.length)history[history.length-1].to='';
  employee.departmentHistory=history;
  if(history.length){const current=history[history.length-1];employee.department=current.department;employee.planGroupId=current.planGroupId||''}
  return history;
 }
 function assignmentAt(employee,date){
  const isoValue=typeof date==='string'?date:dateIso(date),history=normalizeHistory(employee);
  const item=[...history].reverse().find(entry=>entry.from<=isoValue&&(!entry.to||entry.to>=isoValue));
  if(item)return item;
  const department=canonicalDepartment(employee.department),group=employee.planGroupId?groupById(employee.planGroupId):groupForDepartment(department);
  return{department,planGroupId:String(group?.id||''),from:V19_START,to:''};
 }
 function assignmentBelongsToGroup(assignment,group){
  if(!assignment||!group)return false;
  if(String(assignment.planGroupId||'')===String(group.id))return true;
  return departmentsOfGroup(group).some(dep=>norm(dep)===norm(assignment.department));
 }
 function employeeInGroupDuringMonth(employee,group,year,month){
  const end=new Date(year,month,0);for(let date=new Date(year,month-1,1);date<=end;date.setDate(date.getDate()+1))if(assignmentBelongsToGroup(assignmentAt(employee,new Date(date)),group))return true;return false;
 }
 function employeeInDepartmentDuringMonth(employee,department,year,month){
  const end=new Date(year,month,0);for(let date=new Date(year,month-1,1);date<=end;date.setDate(date.getDate()+1))if(norm(assignmentAt(employee,new Date(date)).department)===norm(department))return true;return false;
 }
 function currentEmployeeGroup(employee){const assignment=assignmentAt(employee,new Date());return groupById(assignment.planGroupId)||groupForDepartment(assignment.department)}
 function groupOptionHtml(){return '<option value="">Keine Plan-Gruppe</option>'+(state.planGroups||[]).slice().sort((a,b)=>a.name.localeCompare(b.name,'de')).map(group=>`<option value="${esc(group.id)}">${esc(group.name)}</option>`).join('')}
 function departmentOptionHtml(groupId,current=''){
  const group=groupById(groupId),departments=group?departmentsOfGroup(group):(state.departments||[]);
  const options=departments.map(dep=>`<option value="${esc(dep)}">${esc(dep)}</option>`).join('');
  return '<option value="">Bitte Abteilung auswählen</option>'+options+(current&&!departments.some(dep=>norm(dep)===norm(current))?`<option value="${esc(current)}">${esc(current)} (bisher)</option>`:'');
 }
 function refreshEmployeeDepartmentOptions(preserve=true){
  if(!$('employeeDepartment')||!$('employeePlanGroup'))return;
  const current=preserve?$('employeeDepartment').value:'';
  $('employeeDepartment').innerHTML=departmentOptionHtml($('employeePlanGroup').value,current);
  if(current&&[...$('employeeDepartment').options].some(option=>option.value===current))$('employeeDepartment').value=current;
 }
 function selectAutomaticGroupForDepartment(){
  if(!$('employeePlanGroup')||!$('employeeDepartment'))return;
  const group=groupForDepartment($('employeeDepartment').value);
  if(group&&[...$('employeePlanGroup').options].some(option=>option.value===String(group.id))){$('employeePlanGroup').value=String(group.id);refreshEmployeeDepartmentOptions(true)}
 }
 state.employees.forEach(normalizeHistory);localStorage.setItem(STORE,JSON.stringify(state));

 const baseFillSelectsV19=fillSelects;
 fillSelects=function(){
  baseFillSelectsV19();
  if($('employeePlanGroup')){
   const currentGroup=$('employeePlanGroup').value;
   $('employeePlanGroup').innerHTML=groupOptionHtml();
   if([...$('employeePlanGroup').options].some(option=>option.value===currentGroup))$('employeePlanGroup').value=currentGroup;
   refreshEmployeeDepartmentOptions(true);
  }
  const groupedDepartments=new Set((state.planGroups||[]).flatMap(group=>departmentsOfGroup(group)).map(norm));
  const visibleDepartments=(state.departments||[]).filter(dep=>!groupedDepartments.has(norm(dep)));
  const groups=(state.planGroups||[]).slice().sort((a,b)=>a.name.localeCompare(b.name,'de'));
  const options='<option value="__leaders__">Leiterplan (alle Abteilungen)</option>'+groups.map(group=>`<option value="__groupid__:${esc(group.id)}">Plan-Gruppe: ${esc(group.name)}</option>`).join('')+visibleDepartments.map(dep=>`<option value="${esc(dep)}">${esc(dep)}</option>`).join('');
  if($('departmentFilter')){
   const current=$('departmentFilter').value;$('departmentFilter').innerHTML=options;
   const values=[...$('departmentFilter').options].map(option=>option.value);$('departmentFilter').value=values.includes(current)?current:(groups[0]?`__groupid__:${groups[0].id}`:(visibleDepartments[0]||'__leaders__'));
  }
 };

 if($('employeePlanGroup'))$('employeePlanGroup').addEventListener('change',()=>refreshEmployeeDepartmentOptions(false));
 if($('employeeDepartment'))$('employeeDepartment').addEventListener('change',selectAutomaticGroupForDepartment);

 saveEmployee=function(){
  const name=$('employeeName').value.trim(),department=canonicalDepartment($('employeeDepartment').value),planGroupId=String($('employeePlanGroup')?.value||'');
  if(!name)return alert('Bitte einen Namen eingeben.');if(!department)return alert('Bitte eine Abteilung auswählen.');
  const group=groupById(planGroupId);if(group&&!departmentsOfGroup(group).some(dep=>norm(dep)===norm(department)))return alert(`Die Abteilung „${department}“ gehört nicht zur Plan-Gruppe „${group.name}“.`);
  const id=Number($('editingEmployeeId').value),transferDate=String($('employeeTransferDate')?.value||''),common={name,hours:Number($('employeeHours').value),vacationDays:Number($('employeeVacationDays').value),carryover:Number($('employeeCarryover').value||0),leader:$('employeeLeader').checked,keyLeader:$('employeeKeyLeader')?.checked||false,substitute:$('employeeSubstitute').value};if(common.keyLeader)common.leader=true;
  if(id){
   const employee=emp(id);if(!employee)return;
   Object.assign(employee,common);const history=normalizeHistory(employee),current=history[history.length-1];
   const changed=norm(current?.department)!==norm(department)||String(current?.planGroupId||'')!==planGroupId;
   if(changed&&transferDate){if(current)current.to=previousDay(transferDate);history.push({department,planGroupId,from:transferDate,to:''})}
   else if(changed&&current){current.department=department;current.planGroupId=planGroupId}
   employee.departmentHistory=history;employee.department=department;employee.planGroupId=planGroupId;normalizeHistory(employee);
  }else state.employees.push({id:Date.now(),...common,department,planGroupId,departmentHistory:[{department,planGroupId,from:V19_START,to:''}]});
  saveState('Mitarbeiter gespeichert',`${name} · ${department}${group?' · Plan-Gruppe '+group.name:''}`);clearEmployeeForm();renderAll();
 };

 window.editEmployee=function(id){
  const employee=emp(id);if(!employee)return;const assignment=assignmentAt(employee,new Date());
  $('editingEmployeeId').value=id;$('employeeName').value=employee.name;fillSelects();
  if($('employeePlanGroup'))$('employeePlanGroup').value=String(assignment.planGroupId||groupForDepartment(assignment.department)?.id||'');refreshEmployeeDepartmentOptions(false);$('employeeDepartment').value=assignment.department;
  $('employeeTransferDate').value='';$('employeeHours').value=employee.hours;$('employeeVacationDays').value=employee.vacationDays;$('employeeCarryover').value=employee.carryover||0;$('employeeLeader').checked=employee.leader;if($('employeeKeyLeader'))$('employeeKeyLeader').checked=employee.keyLeader||false;$('employeeSubstitute').value=employee.substitute||'';$('addEmployee').textContent='Änderungen speichern';$('cancelEmployeeEdit').classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'});
 };

 const baseClearEmployeeFormV19=clearEmployeeForm;
 clearEmployeeForm=function(){baseClearEmployeeFormV19();if($('employeePlanGroup'))$('employeePlanGroup').value='';refreshEmployeeDepartmentOptions(false);if($('employeeTransferDate'))$('employeeTransferDate').value=''};

 renderEmployees=function(){
  $('employeeListCount').textContent=`${state.employees.length} Mitarbeiter`;
  $('employeeTable').innerHTML='<thead><tr><th>Name</th><th>Abteilung</th><th>Plan-Gruppe</th><th>Stunden</th><th>Urlaubskonto</th><th>Leiter</th><th>Vertretung</th><th>Aktion</th></tr></thead><tbody>'+state.employees.map(employee=>{const assignment=assignmentAt(employee,new Date()),group=groupById(assignment.planGroupId)||groupForDepartment(assignment.department),used=usedDays(employee.id),entitlement=Number(employee.vacationDays||0)+Number(employee.carryover||0),remaining=entitlement-used,history=normalizeHistory(employee);const historyText=history.length>1?history.map(item=>`${item.department}${item.planGroupId&&groupById(item.planGroupId)?' / '+groupById(item.planGroupId).name:''} ab ${fmt(item.from)}${item.to?' bis '+fmt(item.to):''}`).join(' · '):'';return `<tr><td>${esc(employee.name)}${historyText?`<div class="transfer-history">${esc(historyText)}</div>`:''}</td><td><strong>${esc(assignment.department||'–')}</strong></td><td>${esc(group?.name||'–')}</td><td>${employee.hours}</td><td>Anspruch ${employee.vacationDays||0} + Übertrag ${employee.carryover||0} · Verplant ${used} · <strong>Rest ${remaining}</strong></td><td>${employee.leader?'Ja'+(employee.keyLeader?' 🔑':''):'Nein'}</td><td>${esc(employee.substitute||'–')}</td><td><button class="button tiny" onclick="editEmployee(${employee.id})">Bearbeiten</button> <button class="icon-button" onclick="deleteEmployee(${employee.id})">🗑️</button></td></tr>`}).join('')+'</tbody>';
 };

 employeesForSelection=function(choice){
  if(choice==='__leaders__')return state.employees.filter(employee=>employee.leader);
  const [year,month]=($('monthFilter').value||'').split('-').map(Number),group=groupFromChoice(choice);
  if(group)return state.employees.filter(employee=>employeeInGroupDuringMonth(employee,group,year,month));
  return state.employees.filter(employee=>employeeInDepartmentDuringMonth(employee,choice,year,month));
 };
 departmentVacationAwayCount=function(department,date){return state.employees.filter(employee=>norm(assignmentAt(employee,date).department)===norm(department)).filter(employee=>vacsFor(employee.id).some(vacation=>activeVacationForLimit(vacation)&&inRange(date,vacation.from,vacation.to))).length};
 groupVacationAwayCount=function(groupOrChoice,date){const group=String(groupOrChoice).startsWith('__')?groupFromChoice(groupOrChoice):groupById(groupOrChoice)||(state.planGroups||[]).find(item=>norm(item.name)===norm(groupOrChoice));if(!group)return 0;return state.employees.filter(employee=>assignmentBelongsToGroup(assignmentAt(employee,date),group)).filter(employee=>vacsFor(employee.id).some(vacation=>activeVacationForLimit(vacation)&&inRange(date,vacation.from,vacation.to))).length};

 renderCalendar=function(){
  if(!$('monthFilter').value){const now=new Date();$('monthFilter').value=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`}
  const choice=$('departmentFilter').value,[year,month]=$('monthFilter').value.split('-').map(Number),days=new Date(year,month,0).getDate(),leaderMode=choice==='__leaders__',group=groupFromChoice(choice),employees=employeesForSelection(choice);
  $('vacationEmployee').innerHTML=employees.map(employee=>`<option value="${employee.id}">${esc(employee.name)}</option>`).join('');
  let html='<thead><tr><th class="employee-name">Mitarbeiter</th>';for(let day=1;day<=days;day++){const date=new Date(year,month-1,day),holiday=holidayName(date),weekday=['So','Mo','Di','Mi','Do','Fr','Sa'][date.getDay()];html+=`<th class="${date.getDay()===0?'sunday-header':''} ${holiday?'holiday-header':''}" title="${esc(holiday||weekday)}"><span>${day}</span><small>${holiday?esc(holiday):weekday}</small></th>`}html+='</tr></thead><tbody>';
  if(!employees.length)html+=`<tr><td colspan="${days+1}" class="empty-plan"><strong>Keine Mitarbeiter gefunden.</strong><br><small>${group?'Ordne den Mitarbeitern eine Mitgliedsabteilung und die Plan-Gruppe zu.':'Prüfe die Abteilungszuordnung.'}</small></td></tr>`;
  let lastSection='';employees.sort((a,b)=>a.name.localeCompare(b.name,'de')).forEach(employee=>{
   const first=assignmentAt(employee,new Date(year,month-1,1)),last=assignmentAt(employee,new Date(year,month,days)),section=leaderMode?'':group?(first.department||last.department):choice;
   if(group&&section!==lastSection){html+=`<tr class="department-separator"><td colspan="${days+1}"><strong>${esc(section)}</strong> · maximal ${maxAwayForDepartment(section)} Urlauber gleichzeitig</td></tr>`;lastSection=section}
   html+=`<tr><td class="employee-name"><strong>${esc(employee.name)}</strong>${employee.leader?` <span class="badge leader-badge">Leiter${employee.keyLeader?' 🔑':''}</span>`:''}${normalizeHistory(employee).length>1?'<span class="department-transfer-note">Abteilungswechsel</span>':''}${leaderMode?`<br><small>${esc(first.department)} · Vertretung: ${esc(employee.substitute||'Keine')}</small>`:''}</td>`;
   for(let day=1;day<=days;day++){const date=new Date(year,month-1,day),assignment=assignmentAt(employee,date),assigned=leaderMode?true:group?assignmentBelongsToGroup(assignment,group):norm(assignment.department)===norm(choice),vacation=assigned?vacsFor(employee.id).find(item=>inRange(date,item.from,item.to)):null,holiday=holidayName(date);let cls=!assigned?'assignment-inactive':date.getDay()===0?'sunday':'';if(assigned&&holiday)cls='holiday';const critical=assigned&&!leaderMode&&(group?groupVacationAwayCount(group.id,date)>maxAwayForGroup(group.id)||departmentVacationAwayCount(assignment.department,date)>maxAwayForDepartment(assignment.department):departmentVacationAwayCount(choice,date)>maxAwayForDepartment(choice));if(vacation)cls=moveForVacation(vacation)?'moved-cell':vacation.status==='Beantragt'?'pending-cell':vacation.status==='Geplant'?'planned-cell':critical?'critical vacation-entry':'vacation';else if(critical)cls=(cls?cls+' ':'')+'critical-day';html+=`<td class="${cls}" title="${assigned?esc(vacationTitle(vacation,date,assignment.department)):esc('Zu diesem Zeitpunkt nicht diesem Plan zugeordnet')}">${vacation?absenceCode(vacation):''}</td>`}html+='</tr>';
  });$('calendarTable').innerHTML=html+'</tbody>';
  const notices=[];if(leaderMode){let peak=0;for(let day=1;day<=days;day++){const date=new Date(year,month-1,day);peak=Math.max(peak,employees.filter(employee=>vacsFor(employee.id).some(vacation=>activeVacationForLimit(vacation)&&inRange(date,vacation.from,vacation.to))).length)}if(peak>maxAwayForLeaders())notices.push(`<div class="warning warning-danger"><strong>Leiterüberschneidung:</strong> Bis zu ${peak} Leitungen gleichzeitig abwesend.</div>`)}else if(group){let bad=0,peak=0;for(let day=1;day<=days;day++){const count=groupVacationAwayCount(group.id,new Date(year,month-1,day));peak=Math.max(peak,count);if(count>maxAwayForGroup(group.id))bad++}notices.push(bad?`<div class="warning warning-danger"><strong>Plan-Gruppe ${esc(group.name)}:</strong> an ${bad} Tag(en) über Maximum ${maxAwayForGroup(group.id)} (Spitze ${peak}).</div>`:`<div class="notice"><strong>Plan-Gruppe ${esc(group.name)}:</strong> ${employees.length} Mitarbeiter aus ${departmentsOfGroup(group).length} Abteilungen · Maximum ${maxAwayForGroup(group.id)} Urlauber.</div>`)}
  const holidays=[];for(let day=1;day<=days;day++){const date=new Date(year,month-1,day),name=holidayName(date);if(name)holidays.push(`${day}.${month}. ${name}`)}if(holidays.length)notices.push(`<div class="holiday-list"><strong>Feiertage:</strong> ${holidays.map(esc).join(' · ')}</div>`);$('calendarWarning').innerHTML=notices.join('');renderVacationList(choice);
 };

 renderVacationList=function(choice){const group=groupFromChoice(choice),employees=choice==='__leaders__'?state.employees.filter(employee=>employee.leader):group?state.employees.filter(employee=>{const vacationMonth=$('monthFilter').value.split('-').map(Number);return employeeInGroupDuringMonth(employee,group,vacationMonth[0],vacationMonth[1])}):employeesForSelection(choice),ids=new Set(employees.map(employee=>employee.id)),rows=state.vacations.filter(vacation=>ids.has(vacation.employeeId)).sort((a,b)=>localDate(a.from)-localDate(b.from));$('vacationList').innerHTML='<thead><tr><th>Mitarbeiter</th><th>Zeitraum</th><th>Tage</th><th>Umfang</th><th>Art</th><th>Status</th><th>Hinweis</th><th>Aktion</th></tr></thead><tbody>'+rows.map(vacation=>{const move=moveForVacation(vacation),hint=move?`↔ Verschoben von ${move.oldPeriod}; ${move.reason||'ohne Grundangabe'}`:(vacation.note||'–');return `<tr><td>${esc(emp(vacation.employeeId)?.name)}</td><td>${period(vacation.from,vacation.to)}</td><td>${vacationDays(vacation)}</td><td>${vacation.scope==='full'?'Ganzer Tag':'Halber Tag'}</td><td>${esc(vacation.type)}</td><td>${statusBadge(vacation.status)}</td><td>${esc(hint)}</td><td><button class="button tiny" onclick="editVacation(${vacation.id})">Verschieben/Bearbeiten</button> ${vacation.status==='Beantragt'?`<button class="button tiny primary" onclick="approveVacation(${vacation.id})">Genehmigen</button>`:''} <button class="button tiny danger" onclick="deleteVacation(${vacation.id})">Löschen</button></td></tr>`}).join('')+'</tbody>'};

 // PWA-Installation auf Desktop/Android.
 let installPrompt=null;const installButton=$('installAppButton');
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;if(installButton)installButton.classList.remove('hidden')});
 if(installButton)installButton.addEventListener('click',async()=>{if(!installPrompt)return alert('Die Installation ist in diesem Browser momentan nicht verfügbar. In Chrome oder Edge kann die App außerdem über das Symbol in der Adresszeile installiert werden.');installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;installButton.classList.add('hidden')});
 window.addEventListener('appinstalled',()=>{if(installButton)installButton.classList.add('hidden')});
 if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(error=>console.warn('Service Worker:',error)));

 saveState('Version 2.0 migriert','Separate Plan-Gruppen-Auswahl, stabile Monatspläne und Desktop-Installation aktiviert');
 requestAnimationFrame(()=>{fillSelects();renderAll();requestAnimationFrame(renderCalendar)});
})();


/* Version 2.0: dauerhafte Plan-Gruppen, Ablehnung und Rollenlegende */
(()=>{
 const createId=()=>`pg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
 function v20GroupById(id){return (state.planGroups||[]).find(g=>String(g.id)===String(id))||null}
 function v20GroupForDepartment(dep){const canonical=(state.departments||[]).find(d=>norm(d)===norm(dep))||dep;const id=String(state.departmentGroupIds?.[canonical]||'');if(id&&v20GroupById(id))return v20GroupById(id);const legacy=String(state.departmentGroups?.[canonical]||'').trim();return legacy?(state.planGroups||[]).find(g=>norm(g.name)===norm(legacy))||null:null}
 function v20Persist(){localStorage.setItem(STORE,JSON.stringify(state))}
 function v20EnsureGroups(){
  state.planGroups=Array.isArray(state.planGroups)?state.planGroups:[];state.departmentGroupIds=state.departmentGroupIds||{};state.departmentGroups=state.departmentGroups||{};
  for(const dep of state.departments||[]){let id=String(state.departmentGroupIds[dep]||'');if(id&&!v20GroupById(id))id='';const legacy=String(state.departmentGroups[dep]||'').trim();if(!id&&legacy){let g=state.planGroups.find(x=>norm(x.name)===norm(legacy));if(!g){g={id:createId(),name:legacy,maxAway:Math.max(0,Number(state.planGroupMaxAway?.[legacy]??2))};state.planGroups.push(g)}id=g.id}state.departmentGroupIds[dep]=id;state.departmentGroups[dep]=v20GroupById(id)?.name||''}
  for(const e of state.employees||[]){const g=v20GroupForDepartment(e.department);if(!e.planGroupId&&g)e.planGroupId=g.id;if(Array.isArray(e.departmentHistory))e.departmentHistory=e.departmentHistory.map(h=>({...h,planGroupId:String(h.planGroupId||v20GroupForDepartment(h.department)?.id||'')}))}
  v20Persist();
 }
 v20EnsureGroups();

 function createStandalonePlanGroup(){const name=$('standalonePlanGroupName')?.value.trim(),max=Math.max(0,Number($('standalonePlanGroupMax')?.value||2));if(!name)return alert('Bitte einen Namen für die Plan-Gruppe eingeben.');if((state.planGroups||[]).some(g=>norm(g.name)===norm(name)))return alert('Diese Plan-Gruppe existiert bereits.');const group={id:createId(),name,maxAway:max};state.planGroups.push(group);state.planGroupMaxAway=state.planGroupMaxAway||{};state.planGroupMaxAway[name]=max;saveState('Plan-Gruppe angelegt',`${name} · Maximum ${max}`);if($('standalonePlanGroupName'))$('standalonePlanGroupName').value='';fillSelects();renderAll()}
 if($('createPlanGroup'))$('createPlanGroup').onclick=createStandalonePlanGroup;

 const priorFill=fillSelects;fillSelects=function(){v20EnsureGroups();priorFill();const opts='<option value="">Keine Plan-Gruppe</option>'+(state.planGroups||[]).slice().sort((a,b)=>a.name.localeCompare(b.name,'de')).map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('');if($('employeePlanGroup')){const cur=$('employeePlanGroup').value;$('employeePlanGroup').innerHTML=opts;if([...$('employeePlanGroup').options].some(o=>o.value===cur))$('employeePlanGroup').value=cur}if($('newDepartmentGroup')){const cur=$('newDepartmentGroup').value;$('newDepartmentGroup').innerHTML=opts;if([...$('newDepartmentGroup').options].some(o=>o.value===cur))$('newDepartmentGroup').value=cur}};

 const priorAddDepartment=addDepartment;addDepartment=function(){const before=(state.planGroups||[]).length;priorAddDepartment();v20EnsureGroups();if((state.planGroups||[]).length!==before||$('newDepartmentGroup')){fillSelects();renderDepartments();v20Persist()}};

 window.rejectVacation=function(id){const v=state.vacations.find(x=>x.id===Number(id));if(!v)return;const reason=prompt('Grund für die Ablehnung / erforderliche Verschiebung:','Überschneidung oder Besetzungsgrenze');if(reason===null)return;v.status='Abgelehnt';v.note=`Muss verschoben werden${reason.trim()?': '+reason.trim():''}`;saveState('Urlaub abgelehnt',`${emp(v.employeeId)?.name||''} · ${period(v.from,v.to)} · ${reason||'ohne Grund'}`);renderAll()};
 const priorApprove=window.approveVacation;window.approveVacation=function(id){const v=state.vacations.find(x=>x.id===Number(id));if(v){v.note=String(v.note||'').replace(/^Muss verschoben werden:?\s*/i,'')}return priorApprove(id)};

 const priorRenderVacationList=renderVacationList;renderVacationList=function(choice){priorRenderVacationList(choice);const rows=$('vacationList')?.querySelectorAll('tbody tr')||[];const group=groupFromChoice(choice),employees=choice==='__leaders__'?state.employees.filter(e=>e.leader):group?employeesForSelection(choice):employeesForSelection(choice),ids=new Set(employees.map(e=>e.id)),vacations=state.vacations.filter(v=>ids.has(v.employeeId)).sort((a,b)=>localDate(a.from)-localDate(b.from));rows.forEach((row,i)=>{const v=vacations[i],cell=row.lastElementChild;if(!v||!cell)return;if(v.status!=='Abgelehnt'){const reject=document.createElement('button');reject.className='button tiny reject';reject.textContent='Ablehnen';reject.onclick=()=>window.rejectVacation(v.id);cell.insertBefore(reject,cell.querySelector('.danger'))}else{row.classList.add('rejected-row')}})};

 const priorRenderCalendar=renderCalendar;renderCalendar=function(){priorRenderCalendar();const choice=$('departmentFilter')?.value,employees=employeesForSelection(choice),[year,month]=($('monthFilter')?.value||'').split('-').map(Number),days=new Date(year,month,0).getDate();const bodyRows=[...($('calendarTable')?.querySelectorAll('tbody tr')||[])].filter(r=>!r.classList.contains('department-separator'));let idx=0;for(const e of employees.sort((a,b)=>a.name.localeCompare(b.name,'de'))){const row=bodyRows[idx++];if(!row)continue;for(let d=1;d<=days;d++){const cell=row.children[d],date=new Date(year,month-1,d),v=vacsFor(e.id).find(x=>inRange(date,x.from,x.to));if(v?.status==='Abgelehnt'){cell.className='rejected-cell';cell.textContent=absenceCode(v);cell.title=vacationTitle(v,date)+' · Muss verschoben werden'}}}};

 const oldRenderDepartments=renderDepartments;renderDepartments=function(){v20EnsureGroups();oldRenderDepartments();if($('planGroupSettings')){const groups=state.planGroups||[];$('planGroupSettings').innerHTML=`<h3>Plan-Gruppen</h3><p class="muted">Plan-Gruppen bleiben dauerhaft gespeichert. Ordne anschließend jeder Abteilung über „Plan-Gruppe“ eine Gruppe zu.</p><div class="table-wrapper"><table><thead><tr><th>Plan-Gruppe</th><th>Abteilungen</th><th>Max. Urlauber gesamt</th><th>Aktion</th></tr></thead><tbody>${groups.map(g=>`<tr><td><strong>${esc(g.name)}</strong></td><td>${esc((state.departments||[]).filter(d=>String(state.departmentGroupIds?.[d]||'')===String(g.id)).join(', ')||'Noch keine Abteilung')}</td><td>${g.maxAway}</td><td><button class="button tiny" onclick="editPlanGroupMaximum('${esc(g.id)}')">Maximum ändern</button> <button class="button tiny danger" onclick="deletePlanGroupV20('${esc(g.id)}')">Löschen</button></td></tr>`).join('')||'<tr><td colspan="4" class="muted">Noch keine Plan-Gruppe angelegt.</td></tr>'}</tbody></table></div>`}};
 window.deletePlanGroupV20=function(id){const g=v20GroupById(id);if(!g)return;const deps=(state.departments||[]).filter(d=>String(state.departmentGroupIds?.[d]||'')===String(id));if(deps.length)return alert(`Die Plan-Gruppe ist noch diesen Abteilungen zugeordnet: ${deps.join(', ')}. Bitte zuerst die Zuordnung entfernen.`);if(!confirm(`Plan-Gruppe „${g.name}“ wirklich löschen?`))return;state.planGroups=state.planGroups.filter(x=>String(x.id)!==String(id));saveState('Plan-Gruppe gelöscht',g.name);fillSelects();renderAll()};

 requestAnimationFrame(()=>{fillSelects();renderAll();requestAnimationFrame(renderCalendar)});
})();

/* Version 2.1: stabile Plan-Gruppen, Rollenfreigabe und Urlaubsaktionen */
(()=>{
 const PLAN_GROUP_STORE='vacationPlannerPlanGroupsV21';
 const canDecideVacation=()=>['admin','management'].includes(currentUser?.role);
 const v21Id=()=>`pg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,9)}`;
 const v21Norm=value=>String(value||'').trim().toLocaleLowerCase('de-DE').replace(/\s+/g,' ');

 function readPlanGroupBackup(){
  try{return JSON.parse(localStorage.getItem(PLAN_GROUP_STORE)||'{}')}catch{return{}}
 }
 function writePlanGroupBackup(){
  localStorage.setItem(PLAN_GROUP_STORE,JSON.stringify({
   planGroups:Array.isArray(state.planGroups)?state.planGroups:[],
   departmentGroupIds:state.departmentGroupIds||{},
   departmentGroups:state.departmentGroups||{},
   planGroupMaxAway:state.planGroupMaxAway||{}
  }));
 }
 function mergePlanGroupBackup(){
  const backup=readPlanGroupBackup();
  state.planGroups=Array.isArray(state.planGroups)?state.planGroups:[];
  if(Array.isArray(backup.planGroups)){
   for(const incoming of backup.planGroups){
    if(!incoming?.name)continue;
    let group=state.planGroups.find(item=>String(item.id)===String(incoming.id)||v21Norm(item.name)===v21Norm(incoming.name));
    if(group)Object.assign(group,{name:String(incoming.name).trim(),maxAway:Math.max(0,Number(incoming.maxAway??group.maxAway??2))});
    else state.planGroups.push({id:String(incoming.id||v21Id()),name:String(incoming.name).trim(),maxAway:Math.max(0,Number(incoming.maxAway??2))});
   }
  }
  state.departmentGroupIds={...(backup.departmentGroupIds||{}),...(state.departmentGroupIds||{})};
  state.departmentGroups={...(backup.departmentGroups||{}),...(state.departmentGroups||{})};
  state.planGroupMaxAway={...(backup.planGroupMaxAway||{}),...(state.planGroupMaxAway||{})};
  // IDs und sichtbare Namen konsistent halten.
  for(const department of state.departments||[]){
   let id=String(state.departmentGroupIds[department]||'');
   let group=state.planGroups.find(item=>String(item.id)===id);
   if(!group){
    const legacy=String(state.departmentGroups[department]||'').trim();
    group=legacy?state.planGroups.find(item=>v21Norm(item.name)===v21Norm(legacy)):null;
    id=group?String(group.id):'';
   }
   state.departmentGroupIds[department]=id;
   state.departmentGroups[department]=group?.name||'';
  }
  writePlanGroupBackup();
  localStorage.setItem(STORE,JSON.stringify(state));
 }
 mergePlanGroupBackup();

 // Jede normale Speicherung sichert die Plan-Gruppen zusätzlich separat.
 const saveStateBeforeV21=saveState;
 saveState=function(action='Daten geändert',details=''){
  const result=saveStateBeforeV21(action,details);
  writePlanGroupBackup();
  return result;
 };

 function createPlanGroupV21(){
  const name=$('standalonePlanGroupName')?.value.trim();
  const maxAway=Math.max(0,Math.floor(Number($('standalonePlanGroupMax')?.value||2)));
  if(!name)return alert('Bitte einen Namen für die Plan-Gruppe eingeben.');
  if((state.planGroups||[]).some(group=>v21Norm(group.name)===v21Norm(name)))return alert('Diese Plan-Gruppe existiert bereits.');
  state.planGroups.push({id:v21Id(),name,maxAway});
  state.planGroupMaxAway=state.planGroupMaxAway||{};
  state.planGroupMaxAway[name]=maxAway;
  writePlanGroupBackup();
  saveState('Plan-Gruppe angelegt',`${name} · Maximum ${maxAway}`);
  $('standalonePlanGroupName').value='';
  fillSelects();renderDepartments();renderAll();
  alert(`Die Plan-Gruppe „${name}“ wurde gespeichert.`);
 }
 const oldCreate=$('createPlanGroup');
 if(oldCreate){
  const fresh=oldCreate.cloneNode(true);oldCreate.replaceWith(fresh);fresh.addEventListener('click',createPlanGroupV21);
 }

 // Auswahlfelder nach jeder Darstellung erneut aus dem dauerhaften Gruppenbestand füllen.
 const fillSelectsBeforeV21=fillSelects;
 fillSelects=function(){
  mergePlanGroupBackup();
  fillSelectsBeforeV21();
  const options='<option value="">Keine Plan-Gruppe</option>'+(state.planGroups||[]).slice().sort((a,b)=>a.name.localeCompare(b.name,'de')).map(group=>`<option value="${esc(group.id)}">${esc(group.name)}</option>`).join('');
  for(const id of ['employeePlanGroup','newDepartmentGroup']){
   const select=$(id);if(!select)continue;const current=select.value;select.innerHTML=options;if([...select.options].some(option=>option.value===current))select.value=current;
  }
 };

 function vacationsForChoice(choice){
  const group=typeof groupFromChoice==='function'?groupFromChoice(choice):null;
  let employees=[];
  if(choice==='__leaders__')employees=state.employees.filter(employee=>employee.leader);
  else if(group){
   const [year,month]=($('monthFilter')?.value||'').split('-').map(Number);
   employees=state.employees.filter(employee=>typeof employeeInGroupDuringMonth==='function'?employeeInGroupDuringMonth(employee,group,year,month):String(employee.planGroupId||'')===String(group.id));
  }else employees=typeof employeesForSelection==='function'?employeesForSelection(choice):state.employees.filter(employee=>employee.department===choice);
  const ids=new Set(employees.map(employee=>Number(employee.id)));
  return state.vacations.filter(vacation=>ids.has(Number(vacation.employeeId))).sort((a,b)=>localDate(a.from)-localDate(b.from));
 }

 // Die Liste wird vollständig neu erzeugt, damit Aktionen immer dem richtigen Urlaub zugeordnet sind.
 renderVacationList=function(choice){
  const rows=vacationsForChoice(choice);
  const decide=canDecideVacation();
  $('vacationList').innerHTML='<thead><tr><th>Mitarbeiter</th><th>Zeitraum</th><th>Tage</th><th>Umfang</th><th>Art</th><th>Status</th><th>Hinweis</th><th>Aktion</th></tr></thead><tbody>'+rows.map(vacation=>{
   const move=moveForVacation(vacation);
   const holidayHints=typeof nearbyHolidayWarnings==='function'?[...nearbyHolidayWarnings(vacation),...(typeof bridgeWarnings==='function'?bridgeWarnings(vacation):[])]:[];
   const hint=move?`↔ Verschoben von ${move.oldPeriod}; ${move.reason||'ohne Grundangabe'}`:(holidayHints.length?`⚠ ${holidayHints.join('; ')}`:(vacation.note||'–'));
   let actions=`<button class="button tiny" onclick="editVacation(${vacation.id})">Verschieben/Bearbeiten</button>`;
   if(decide&&vacation.status==='Beantragt')actions+=` <button class="button tiny primary" onclick="approveVacation(${vacation.id})">Genehmigen</button> <button class="button tiny reject" onclick="rejectVacation(${vacation.id})">Ablehnen</button>`;
   else if(decide&&vacation.status==='Genehmigt')actions+=` <button class="button tiny reject" onclick="rejectVacation(${vacation.id})">Ablehnen</button>`;
   actions+=` <button class="button tiny danger" onclick="deleteVacation(${vacation.id})">Löschen</button>`;
   return `<tr class="${vacation.status==='Abgelehnt'?'rejected-row':''}"><td>${esc(emp(vacation.employeeId)?.name||'Unbekannt')}</td><td>${period(vacation.from,vacation.to)}</td><td>${vacationDays(vacation)}</td><td>${vacation.scope==='full'?'Ganzer Tag':'Halber Tag'}</td><td>${esc(vacation.type)}</td><td>${statusBadge(vacation.status)}</td><td>${esc(hint)}</td><td>${actions}</td></tr>`;
  }).join('')+'</tbody>';
 };

 window.approveVacation=function(id){
  if(!canDecideVacation())return alert('Nur Administratoren und die Marktleitung dürfen Urlaube genehmigen.');
  const vacation=state.vacations.find(item=>Number(item.id)===Number(id));if(!vacation)return;
  vacation.status='Genehmigt';vacation.note=String(vacation.note||'').replace(/^Muss verschoben werden:?\s*/i,'');
  saveState('Urlaub genehmigt',`${emp(vacation.employeeId)?.name||''} · ${period(vacation.from,vacation.to)}`);renderAll();
 };
 window.rejectVacation=function(id){
  if(!canDecideVacation())return alert('Nur Administratoren und die Marktleitung dürfen Urlaube ablehnen.');
  const vacation=state.vacations.find(item=>Number(item.id)===Number(id));if(!vacation)return;
  const reason=prompt('Grund für die Ablehnung / erforderliche Verschiebung:','Überschneidung oder Urlauber-Limit');if(reason===null)return;
  vacation.status='Abgelehnt';vacation.note=`Muss verschoben werden${reason.trim()?': '+reason.trim():''}`;
  saveState('Urlaub abgelehnt',`${emp(vacation.employeeId)?.name||''} · ${period(vacation.from,vacation.to)} · ${reason||'ohne Grund'}`);renderAll();
 };

 // Robuste Bearbeitung: Auswahl setzen, Mitarbeiteroption sicher ergänzen und Formular sichtbar machen.
 window.editVacation=function(id){
  const vacation=state.vacations.find(item=>Number(item.id)===Number(id));if(!vacation)return alert('Der Urlaubseintrag wurde nicht gefunden.');
  const employee=emp(vacation.employeeId);if(!employee)return alert('Der zugehörige Mitarbeiter wurde nicht gefunden.');
  let department=employee.department;
  if(typeof departmentAt==='function')department=departmentAt(employee,vacation.from)||department;
  const group=typeof groupForDepartment==='function'?groupForDepartment(department):null;
  const preferred=group?`__groupid__:${group.id}`:department;
  fillSelects();
  const filter=$('departmentFilter');
  if(filter){
   const candidates=[preferred,group?`__group__:${group.name}`:'',department].filter(Boolean);
   const found=candidates.find(value=>[...filter.options].some(option=>option.value===value));
   if(found)filter.value=found;
  }
  renderCalendar();
  const employeeSelect=$('vacationEmployee');
  if(employeeSelect&&![...employeeSelect.options].some(option=>Number(option.value)===Number(employee.id))){
   const option=document.createElement('option');option.value=employee.id;option.textContent=employee.name;employeeSelect.appendChild(option);
  }
  if(employeeSelect)employeeSelect.value=String(employee.id);
  $('editingVacationId').value=String(vacation.id);
  $('vacationFrom').value=vacation.from;$('vacationTo').value=vacation.to;$('vacationType').value=vacation.type;$('vacationScope').value=vacation.scope||'full';$('vacationStatus').value=vacation.status||'Beantragt';$('vacationNote').value=vacation.note||'';
  $('vacationFormTitle').textContent='Urlaub bearbeiten oder verschieben';$('vacationForm').classList.remove('hidden');
  requestAnimationFrame(()=>$('vacationForm').scrollIntoView({behavior:'smooth',block:'start'}));
 };

 // Monatsplan nach Rollenwechsel/Navigation zuverlässig aktualisieren.
 const renderAllBeforeV21=renderAll;
 renderAll=function(){mergePlanGroupBackup();renderAllBeforeV21();if($('departmentFilter'))renderVacationList($('departmentFilter').value)};

 mergePlanGroupBackup();fillSelects();renderAll();
})();
