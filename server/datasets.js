import {demoScores,examples} from './data.js';
const specs={
 people:{title:'People',table:'people',note:'Fictional people. Real possibilities.',columns:['name','job_title','country','work_mode','description'],examples:examples.slice(0,4)},
 countries:{title:'Countries',table:'countries',note:'A shuffled sample of real-world geography.',columns:['country','continent','capital','languages','description'],examples:['Warm places with a coastline','Landlocked countries','European countries with cold winters','Places where people speak Spanish']},
 numbers:{title:'Sensor readings',table:'sensor_readings',note:'Random measurements from imaginary sensors.',columns:['sensor','location','temperature_c','humidity_pct','battery_pct','status'],examples:['Sensors that might need attention','Low battery and high temperature','Cold places with lots of humidity','Offline sensors']}
};
export function describeDataset(type){if(!specs[type])throw new Error('Unknown dataset');return {type,...specs[type]};}
export function scoreDemo(type,query,rows){
 if(type==='people')return demoScores(query,rows);
 const q=query.trim().toLowerCase().replace(/[?.!]+$/,'');
 const predicates={
  countries:{
   'warm places with a coastline':r=>/coast/i.test(r.description)&&/warm|tropical|mild winters|mediterranean/i.test(r.description),
   'landlocked countries':r=>/landlocked/i.test(r.description),
   'european countries with cold winters':r=>r.continent==='Europe'&&/cold winters|cold climate|alpine/i.test(r.description),
   'places where people speak spanish':r=>/spanish/i.test(r.languages)
  },
  numbers:{
   'sensors that might need attention':r=>r.battery_pct<20||r.temperature_c>40||r.status!=='Online',
   'low battery and high temperature':r=>r.battery_pct<30&&r.temperature_c>30,
   'cold places with lots of humidity':r=>r.temperature_c<10&&r.humidity_pct>65,
   'offline sensors':r=>r.status==='Offline'
  }
 };
 const predicate=predicates[type]?.[q];
 if(!predicate){const e=new Error('This offline demo supports the example questions below. Add a TypeSafe API key on the server to ask anything.');e.status=422;throw e;}
 return rows.map(row=>({row,probability:predicate(row)?.96:.04}));
}
