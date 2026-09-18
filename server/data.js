const first = ['Alex','Sofia','James','Maya','Oliver','Amara','Noah','Luca','Emma','Ethan','Isabel','Leo','Chloe'];
const last = ['Morgan','Chen','Bennett','Patel','Williams','Okafor','Rivera','Rossi','Anderson','Park'];
const places = [['Brooklyn','United States'],['London','United Kingdom'],['Austin','United States'],['Lisbon','Portugal'],['Berlin','Germany'],['Seattle','United States'],['Toronto','Canada'],['Copenhagen','Denmark'],['San Francisco','United States'],['Amsterdam','Netherlands']];
const roles = [
 ['Product designer','Design','Figma, prototyping, design systems','Designs thoughtful digital products. Works with a distributed team and enjoys mentoring junior designers.','Remote'],
 ['Software engineer','Engineering','TypeScript, React, PostgreSQL','Builds developer tools and reliable APIs. Previously worked at an early-stage startup.','Remote'],
 ['Architect','Architecture','AutoCAD, sustainable design','Designs low-carbon buildings and visits construction sites throughout the week.','On-site'],
 ['Content strategist','Marketing','Writing, SEO, storytelling','Turns technical ideas into clear stories. Collaborates asynchronously across time zones.','Remote'],
 ['Registered nurse','Healthcare','Patient care, clinical practice','Provides hands-on care in a community hospital. Loves hiking and volunteering.','On-site'],
 ['Data analyst','Analytics','SQL, Python, data visualization','Helps small teams turn messy data into practical decisions. Interested in climate technology.','Hybrid'],
 ['Head chef','Hospitality','Cooking, team leadership','Runs a busy neighborhood restaurant with an emphasis on seasonal ingredients.','On-site'],
 ['Customer success manager','Operations','Communication, SaaS, onboarding','Helps software customers get started and manages accounts across Europe and the Americas.','Remote'],
 ['Mechanical engineer','Engineering','CAD, manufacturing, robotics','Prototypes physical products in the lab and oversees production on the factory floor.','On-site'],
 ['Independent illustrator','Design','Illustration, visual storytelling','Creates editorial illustrations for international publications from a home studio.','Remote'],
 ['Product manager','Product','Roadmaps, research, B2B SaaS','Leads a small product team building collaboration software. Former startup founder.','Hybrid'],
 ['Research scientist','Research','Biology, experiments, statistics','Studies marine ecosystems through laboratory experiments and field research.','On-site']
];
export const people = Array.from({length:129},(_,i)=>{
 const r=roles[i%roles.length], p=places[(i*3)%places.length];
 return {id:i+1,name:`${first[i%first.length]} ${last[(Math.floor(i/first.length)+i*7)%last.length]}`,job_title:r[0],company:['Forma','Linear Labs','Northstar','Acme Studio','Fieldwork','Orbit'][i%6],city:p[0],country:p[1],department:r[1],work_mode:r[4],skills:r[2],description:r[3]};
});
export const examples = ['Could work from home','Designers based in the United States','People who work with their hands','People with startup experience','Creative people living in Europe','People who know SQL'];
export const schema = Object.keys(people[0]).map(name=>({name,type:name==='id'?'integer':'text'}));
// Explicit offline fixtures, never represented as model predictions.
export function demoScores(query, rows) {
 const q=query.trim().toLowerCase().replace(/[?.!]+$/,'');
 const predicates = {
  'could work from home': r=>r.work_mode==='Remote'?0.97:r.work_mode==='Hybrid'?0.76:0.08,
  'designers based in the united states':r=>/designer|illustrator/i.test(r.job_title)&&r.country==='United States'?0.98:0.05,
  'people who work with their hands':r=>r.work_mode==='On-site'?0.95:0.09,
  'people with startup experience':r=>/startup/i.test(r.description)?0.96:0.12,
  'creative people living in europe':r=>/designer|illustrator|strategist|architect/i.test(r.job_title)&&['United Kingdom','Portugal','Germany','Denmark','Netherlands'].includes(r.country)?0.94:0.07,
  'people who know sql':r=>/sql/i.test(r.skills)?0.98:0.04,
 };
 if(!predicates[q]) {const error=new Error('This offline playground supports the six example queries. Add TYPESAFE_API_KEY to .env for any natural-language query.');error.status=422;throw error;}
 return rows.map(row=>({row,probability:predicates[q](row)}));
}
