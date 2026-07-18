window.DEFAULT_DATA = {
  users: [
    { name: 'Admin', pin: '1234', role: 'admin' },
    { name: 'Anna Schmidt', pin: '1234', role: 'leader' },
    { name: 'Tom Wagner', pin: '1234', role: 'leader' }
  ],
  departments: ['Feinkost','Kasse','Getränke','Obst & Gemüse','Molkerei','Backshop','Drogerie','Tiefkühl','Lager','Verwaltung'],
  employees: [
    {id:1,name:'Anna Schmidt',department:'Feinkost',hours:37,vacationDays:36,leader:true,substitute:'Julia Becker'},
    {id:2,name:'Peter Pfehr',department:'Feinkost',hours:37,vacationDays:36,leader:false,substitute:''},
    {id:3,name:'Maria Guhra',department:'Feinkost',hours:37,vacationDays:36,leader:false,substitute:''},
    {id:4,name:'Jan Kullick',department:'Feinkost',hours:37,vacationDays:36,leader:false,substitute:''},
    {id:5,name:'Tom Wagner',department:'Kasse',hours:37,vacationDays:36,leader:true,substitute:'Max Richter'},
    {id:6,name:'Max Richter',department:'Kasse',hours:30,vacationDays:30,leader:false,substitute:''},
    {id:7,name:'Julia Becker',department:'Getränke',hours:37,vacationDays:36,leader:true,substitute:'Peter Hoffmann'},
    {id:8,name:'Peter Hoffmann',department:'Getränke',hours:37,vacationDays:36,leader:false,substitute:''}
  ],
  vacations: [
    {id:1,employeeId:1,from:'2027-07-19',to:'2027-07-23',type:'Urlaub',note:''},
    {id:2,employeeId:2,from:'2027-07-12',to:'2027-07-16',type:'Urlaub',note:''},
    {id:3,employeeId:3,from:'2027-07-19',to:'2027-07-23',type:'Urlaub',note:''},
    {id:4,employeeId:5,from:'2027-07-21',to:'2027-07-30',type:'Urlaub',note:''}
  ],
  moves: [
    {id:1,employeeId:1,oldPeriod:'05.–09.07.2027',newPeriod:'19.–23.07.2027',reason:'Personalmangel',initiator:'Betrieb'},
    {id:2,employeeId:1,oldPeriod:'02.–06.08.2027',newPeriod:'16.–20.08.2027',reason:'Überschneidung',initiator:'Betrieb'},
    {id:3,employeeId:6,oldPeriod:'12.–16.07.2027',newPeriod:'26.–30.07.2027',reason:'Privater Wunsch',initiator:'Mitarbeiter'}
  ]
};
