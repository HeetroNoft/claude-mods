// Fake data.js for test runs: N desks (env N, default 4) covering every board state; the sixth and seventh were stopped by the user and by an error.
// Usage: N=6 node mkdata.js > data.js
const now=Date.now(),M=60000;
const st=(l,m,s,d)=>({label:l,estMin:m,startMs:s,doneMs:d});
const desk=(id,name,act,steps,eta,extra)=>Object.assign({id,name,activity:act,detail:'Working',activityMs:now,steps,planMs:now-20*M,interns:[],files:[],sent:[],got:[],turnMs:now-60000,doneMs:0,doneLine:'',updatedMs:now,eta},extra||{});
const N=+(process.env.N||4);const all=[
 desk('a1','Designer','edit',[st('Lire le code',5,now-20*M,now-15*M),st('Améliorer le contraste des meubles',15,now-15*M,now-2*M),st('Bureaux par thème',20,now-2*M),st('Tableau',20)],{finishMs:now+38*M,plannedMs:now+40*M,lateMin:0,allDone:false}),
 desk('b2','CTO','bash',[st('Build',5,now-30*M,now-20*M),st('Deploy',5,now-20*M)],{finishMs:now+2*M,plannedMs:now-10*M,lateMin:12,allDone:false}),
 desk('c3','Writer','idle',[st('Draft',5,now-30*M,now-20*M),st('Edit',5,now-20*M,now-10*M)],{finishMs:now-10*M,plannedMs:now-10*M,lateMin:0,allDone:true}),
 desk('d4','Claude','idle',[],undefined,{waiting:{kind:'question',text:'Which theme do you prefer?',since:now-3*M}}),
];
for(let i=4;i<N;i++)all.push(desk("e"+i,["Writer","CEO","Dev"][i%3],"read",[st("Step",5,now-M)],{finishMs:now+9*M,plannedMs:now+9*M,lateMin:0,allDone:false}));
// the account's usage, as the gauge reads it, and a fifth desk knocked out by the usage limit
all[0].rate={fiveHour:62,sevenDay:35,fiveResets:new Date(now+2*60*M).toISOString(),sevenResets:new Date(now+3*24*60*M).toISOString(),ms:now};
if(all[4])Object.assign(all[4],{activity:'limit',limited:{since:now-M,resetsAt:new Date(now+95*M).toISOString()}});
[[5,'interrupted'],[6,'error']].forEach(([i,kind])=>{if(all[i])Object.assign(all[i],{activity:'idle',stopped:{kind,ms:now-2*M},pausedMs:now-2*M});});
const desks=all.slice(0,N);
process.stdout.write(`window.__office && window.__office(${JSON.stringify({now,desks})})\n`);
