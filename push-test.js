import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getMessaging, getToken, isSupported, onMessage } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging.js';

let fcmToken = '';
let messageListener = false;
const $ = id => document.getElementById(id);
function status(message, error=false) {const node=$('pushStatus'); if(node){node.textContent=message; node.style.color=error?'#bb354b':'#42608f';}}
function ensureApp(){const cfg=window.FIREBASE_CONFIG; if(!cfg?.apiKey||!cfg.projectId) throw Error('Липсва Firebase конфигурация.');return getApps().length?getApp():initializeApp(cfg);}
function iosStandalone(){return window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}
function environmentCheck(){
  if(!('Notification' in window)||!('serviceWorker' in navigator)||!('PushManager' in window)) throw Error('Този браузър/режим не поддържа Web Push. На iPhone отвори приложението от началния екран (iOS 16.4+).');
  if(/iPad|iPhone|iPod/.test(navigator.userAgent)&&!iosStandalone()) throw Error('На iPhone push работи от приложението на Home Screen, не от обикновен таб в Safari.');
  if(!window.cloudReady?.()) throw Error('Първо влез в Google профила си.');
}
document.addEventListener('click',async event=>{
  const id=event.target?.id;
  if(id==='enablePush'){
    const button=$('enablePush');button.disabled=true;
    try {
      environmentCheck();
      if(!(await isSupported())) throw Error('Firebase Messaging не е поддържан от този браузър.');
      const vapidKey=String($('pushVapidKey')?.value||'').trim();
      if(!vapidKey) throw Error('Постави публичния Web Push VAPID ключ от Firebase Console.');
      localStorage.setItem('ecalendar_vapid_public',vapidKey);
      // Permission is requested only in response to the explicit button tap.
      const permission=await Notification.requestPermission();
      if(permission!=='granted') throw Error('Известията не са разрешени. Провери Settings → Notifications на iPhone.');
      status('Регистрирам устройството за push…');
      const registration=await navigator.serviceWorker.register('./firebase-messaging-sw.js',{scope:'./'});
      await navigator.serviceWorker.ready;
      const messaging=getMessaging(ensureApp());
      fcmToken=await getToken(messaging,{vapidKey,serviceWorkerRegistration:registration});
      if(!fcmToken) throw Error('Firebase не върна регистрационен токен.');
      $('pushToken').value=fcmToken;
      $('copyPushToken').disabled=false;
      status('✅ Push е разрешен на това устройство. Копирай токена и изпрати тест от Firebase Console.');
      if(!messageListener){messageListener=true;onMessage(messaging,p=>{status('📬 Пристигна тестово съобщение: '+(p.notification?.title||'FCM'));});}
    } catch(error){status('⚠️ '+(error.message||error),true)}finally{button.disabled=false}
  }
  if(id==='copyPushToken'){
    if(!fcmToken)return;
    try{await navigator.clipboard.writeText(fcmToken);status('✅ Токенът е копиран. Постави го във Firebase → Messaging → Send test message.')}catch{ $('pushToken').focus();$('pushToken').select();status('Маркирах токена. Копирай го ръчно.');}
  }
  if(id==='localNotificationTest'){
    try{
      environmentCheck();
      if(Notification.permission!=='granted')throw Error('Първо натисни „Разреши push“.');
      const registration=await navigator.serviceWorker.getRegistration('./');
      if(!registration)throw Error('Service worker още не е регистриран.');
      await registration.showNotification('ECalendar · Локална проба',{body:'Това е проба на показването, не истинско отдалечено push съобщение.',icon:'./icon-192.png',tag:'ecalendar-local-test'});
      status('✅ Показах локално известие. За истински push тествай от Firebase Console.');
    }catch(error){status('⚠️ '+(error.message||error),true)}
  }
});
// Settings panel is dynamically rendered. Restore the public VAPID key whenever it appears.
const observer=new MutationObserver(()=>{const input=$('pushVapidKey');if(input&&!input.dataset.ready){input.dataset.ready='1';input.value=localStorage.getItem('ecalendar_vapid_public')||'';if(fcmToken){$('pushToken').value=fcmToken;$('copyPushToken').disabled=false;}}});
observer.observe(document.getElementById('content'),{childList:true});
