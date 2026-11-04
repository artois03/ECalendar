'use strict';
// Standard Web Push (works with supporting desktop/Android browsers and iOS Home Screen PWAs).
self.addEventListener('push',event=>{
 let data={};try{data=event.data?.json()||{}}catch{data={body:event.data?.text()||''}}
 const title=String(data.title||'ECalendar');
 const opts={body:String(data.body||'Имаш предстоящо събитие.'),icon:'./icon-192.png',badge:'./icon-192.png',tag:String(data.tag||'ecalendar-reminder'),data:{url:new URL('./',self.registration.scope).href}};
 event.waitUntil(self.registration.showNotification(title,opts));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();event.waitUntil((async()=>{
  const url=new URL('./',self.registration.scope).href;
  const clientsArr=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const c of clientsArr){if(c.url.startsWith(url)){await c.focus();return}}
  await self.clients.openWindow(url);
 })());
});
