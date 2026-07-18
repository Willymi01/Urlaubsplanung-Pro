window.DEFAULT_DATA={
  users:[{id:1,name:'Admin',pin:'1234',role:'admin',department:'',active:true,lastLogin:''},{id:2,name:'Marktleitung',pin:'5678',role:'management',department:'',active:true,lastLogin:''},{id:3,name:'Anna Schmidt',pin:'1111',role:'leader',department:'Feinkost',active:true,lastLogin:''},{id:4,name:'Tom Wagner',pin:'2222',role:'leader',department:'Kasse',active:true,lastLogin:''}],
  departments:['Feinkost','Kasse','Getränke','Obst & Gemüse','Molkerei','Backshop','Drogerie','Tiefkühl','Lager','Verwaltung'],
  departmentSettings:{'Feinkost':3,'Kasse':3,'Getränke':2,'Obst & Gemüse':2,'Molkerei':2,'Backshop':2,'Drogerie':1,'Tiefkühl':1,'Lager':2,'Verwaltung':1},
  employees:[
    {id:1,name:'Anna Schmidt',department:'Feinkost',hours:37,vacationDays:36,carryover:0,leader:true,substitute:'Julia Becker'},
    {id:2,name:'Peter Pfehr',department:'Feinkost',hours:37,vacationDays:36,carryover:0,leader:false,substitute:''},
    {id:3,name:'Maria Guhra',department:'Feinkost',hours:30,vacationDays:30,carryover:0,leader:false,substitute:''},
    {id:4,name:'Jan Kullick',department:'Feinkost',hours:37,vacationDays:36,carryover:0,leader:false,substitute:''},
    {id:5,name:'Tom Wagner',department:'Kasse',hours:37,vacationDays:36,carryover:0,leader:true,substitute:'Max Richter'},
    {id:6,name:'Max Richter',department:'Kasse',hours:30,vacationDays:30,carryover:0,leader:false,substitute:''},
    {id:7,name:'Julia Becker',department:'Getränke',hours:37,vacationDays:36,carryover:0,leader:true,substitute:'Peter Hoffmann'},
    {id:8,name:'Peter Hoffmann',department:'Getränke',hours:37,vacationDays:36,carryover:0,leader:false,substitute:''},
    {id:9,name:'Sabine Krüger',department:'Obst & Gemüse',hours:37,vacationDays:36,carryover:0,leader:true,substitute:''},
    {id:10,name:'Murat Yilmaz',department:'Lager',hours:37,vacationDays:36,carryover:0,leader:true,substitute:''}
  ],
  vacations:[
    {id:101,employeeId:1,from:'2027-07-19',to:'2027-07-23',type:'Urlaub',note:'',status:'Genehmigt',scope:'full'},
    {id:102,employeeId:2,from:'2027-07-12',to:'2027-07-16',type:'Urlaub',note:'',status:'Genehmigt',scope:'full'},
    {id:103,employeeId:3,from:'2027-07-19',to:'2027-07-23',type:'Urlaub',note:'',status:'Genehmigt',scope:'full'},
    {id:104,employeeId:5,from:'2027-07-21',to:'2027-07-30',type:'Urlaub',note:'',status:'Genehmigt',scope:'full'},
    {id:105,employeeId:7,from:'2027-08-02',to:'2027-08-13',type:'Urlaub',note:'',status:'Genehmigt',scope:'full'}
  ],
  audit:[{id:301,at:'2026-07-18T08:00:00.000Z',user:'System',action:'Version 0.8 eingerichtet',details:'Benutzerverwaltung und Änderungsprotokoll aktiviert'}],
  moves:[
    {id:201,employeeId:1,oldPeriod:'05.–09.07.2027',newPeriod:'19.–23.07.2027',reason:'Personalmangel',initiator:'Betrieb'},
    {id:202,employeeId:1,oldPeriod:'02.–06.08.2027',newPeriod:'16.–20.08.2027',reason:'Überschneidung',initiator:'Betrieb'},
    {id:203,employeeId:6,oldPeriod:'12.–16.07.2027',newPeriod:'26.–30.07.2027',reason:'Privater Wunsch',initiator:'Mitarbeiter'}
  ]
};
