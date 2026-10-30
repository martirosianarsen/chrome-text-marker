// Standalone design demo. No access to the installed extension's storage.
(() => {
const KEY='text-marker-highlights', demoKey='text-marker-design-preview';
const url = location.origin + '/preview.html';
const seed = [{id:'demo-1',text:'The best ideas often begin with a small moment of attention.',color:'yellow',timestamp:Date.now(),title:'The art of paying attention',pageUrl:url},{id:'demo-2',text:'Leave a little space for curiosity.',color:'green',timestamp:Date.now()-86400000,title:'The art of paying attention',pageUrl:url}];
if (!localStorage.getItem(demoKey)) localStorage.setItem(demoKey,JSON.stringify({[url]:seed}));
const listeners = [];
const read = () => JSON.parse(localStorage.getItem(demoKey));
const notify = () => listeners.forEach(fn=>fn({[KEY]:{newValue:read()}},'local'));
window.addEventListener('storage',notify); window.addEventListener('marker-demo-change',notify);
window.chrome = {storage:{local:{async get(){return {[KEY]:read()}}},onChanged:{addListener(fn){listeners.push(fn)}}},runtime:{onMessage:{addListener(){}},async sendMessage(message){
 let stored=read(); const key=TextMarker.pageKey(message.url), list=stored[key]||[];
 if(message.operation==='add')stored[key]=[...list,message.item];
 if(message.operation==='remove')stored[key]=list.filter(item=>item.id!==message.id);
 if(message.operation==='clearPage')delete stored[key];
 if(message.operation==='clearAll')stored={};
 localStorage.setItem(demoKey,JSON.stringify(stored));notify();
 for(const frame of parent.frames)frame.dispatchEvent(new Event('marker-demo-change'));
 parent.dispatchEvent(new Event('marker-demo-change'));return {ok:true};
}},tabs:{async query(){return [{id:1,url}]},async create({url}){window.open(url,'_blank')},async sendMessage(id,message){
 const node=[...parent.document.querySelectorAll('[data-text-marker-id]')].find(node=>node.getAttribute('data-text-marker-id')===message.id);node?.scrollIntoView({block:'center',behavior:'smooth'});return {found:!!node};
}}};
})();
