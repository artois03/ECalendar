import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore, doc, getDoc, setDoc, onSnapshot} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const gate=document.getElementById('accountGate');
const login=document.getElementById('signInButton');
const error=document.getElementById('authError');
const status=document.getElementById('cloudStatus');
const indicator=document.getElementById('cloudIndicator');
const logout=document.getElementById('signOutButton');
let auth,db,uid=null,unsub=null,ready=false,generation=0,writeQueue=Promise.resolve(),writeId=0;
window.cloudReady=()=>ready && !!uid;
function show(msg,color='#536be2'){status.textContent=msg;indicator.style.color=color}
function explain(e){const code=e?.code||'';
 if(code.includes('unauthorized-domain'))return 'Добави artois03.github.io (без интервал) в Firebase → Authentication → Settings → Authorized domains.';
 if(code.includes('permission-denied'))return 'Firestore отказа достъп. Провери и публикувай правилата firestore.rules.';
 if(code.includes('popup-blocked'))return 'Браузърът блокира прозореца за вход. Разреши pop-up прозорци.';
 if(code.includes('popup-closed-by-user'))return 'Входът е прекъснат.';
 return String(e?.message||e||'Неизвестна грешка');}
function fail(msg){error.textContent=msg;show(msg,'#c53b50')}
const config=window.FIREBASE_CONFIG;
if(!config?.apiKey||config.apiKey.includes('PASTE_')||!config.projectId||config.projectId.includes('PASTE_')){
 login.disabled=true;fail('Попълни firebase-config.js с настройките на твоя Firebase проект.');
}else{
 try{
  const app=initializeApp(config);auth=getAuth(app);db=getFirestore(app);
  login.addEventListener('click',async()=>{login.disabled=true;error.textContent='';try{await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){fail(explain(e))}finally{login.disabled=false}});
  logout.addEventListener('click',async()=>{if(!confirm('Да излезеш ли от профила?'))return;try{await signOut(auth)}catch(e){fail(explain(e))}});
  onAuthStateChanged(auth,async user=>{
   const mine=++generation;
   if(unsub){unsub();unsub=null}
   ready=false;uid=null;window.cloudClear?.();gate.classList.remove('hidden');logout.style.display='none';
   if(!user){show('Влез с Google, за да отвориш личния календар','#a77e23');return}
   error.textContent='';show('Зареждане на личните данни…');
   const ref=doc(db,'users',user.uid,'data','calendar');
   try{
    let snap=await getDoc(ref);
    if(mine!==generation)return;
    if(!snap.exists()){
      // Нов акаунт = празен календар. Никакви вградени потребителски данни.
      await setDoc(ref,{version:3,events:[],missing:[]});
      if(mine!==generation)return;
      snap=await getDoc(ref);
    }
    const data=snap.data();
    if(!Array.isArray(data?.events)||!Array.isArray(data?.missing))throw Error('Невалиден запис в Firestore.');
    uid=user.uid;window.cloudReplace(data);ready=true;
    gate.classList.add('hidden');logout.style.display='';
    show('☁️ Синхронизирано · '+(user.email||'Google профил'),'#268867');
    unsub=onSnapshot(ref,s=>{
      if(mine!==generation||!ready||!s.exists()||s.metadata.hasPendingWrites)return;
      // Не замествай локална промяна, докато има незавършен запис.
      if(writeId>0)return;
      const next=s.data();if(Array.isArray(next?.events)&&Array.isArray(next?.missing)){
       window.cloudReplace(next);show('☁️ Синхронизирано · '+(user.email||'Google профил'),'#268867');
      }
    },e=>show('Грешка при синхронизация: '+explain(e),'#c53b50'));
   }catch(e){if(mine===generation){ready=false;uid=null;gate.classList.remove('hidden');fail('Не мога да заредя личния календар: '+explain(e))}}
  });
 }catch(e){login.disabled=true;fail('Грешка при стартиране: '+explain(e))}
}
window.cloudSave=(data)=>{
 if(!ready||!uid){show('Не си влязъл в профила.','#c53b50');return}
 const owner=uid,mine=generation,token=++writeId;
 show('Записване…','#a77e23');
 writeQueue=writeQueue.catch(()=>{}).then(async()=>{
   if(owner!==uid||mine!==generation)return;
   await setDoc(doc(db,'users',owner,'data','calendar'),data);
   if(owner===uid&&mine===generation&&token===writeId){writeId=0;show('☁️ Запазено и синхронизирано','#268867')}
 }).catch(e=>{
   if(owner===uid&&mine===generation){writeId=0;show('⚠️ Записът НЕ е успешен: '+explain(e),'#c53b50');alert('Изпитите не се записаха! Експортирай JSON като резервно копие. '+explain(e))}
 });
};
