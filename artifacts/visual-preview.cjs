const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const root = path.resolve(__dirname, '../public');
const session = {id:99001,name:'گروه کاوشگران',code:'NX-204',active_case:'village',cases:[{case_key:'syndrome',status:'solved'}]};
const fixtures = [
{id:1,sender_type:'admin',message_type:'text',content:'کارآگاهان، به اتاق تحقیقات خوش آمدید. آخرین گزارش از حوالی آسیاب سنگی رسیده. تصاویر را بررسی کنید؛ چه ارتباطی میان این نشانه‌ها می‌بینید؟'},
{id:2,sender_type:'admin',message_type:'image',content:'آسیاب سنگی؛ آخرین محل دیده‌شدن پیام‌رسان',file_url:'/media-library/images/preview-mill.jpg'},
{id:3,sender_type:'admin',message_type:'image',content:'شاهد ناشناس در مسیر دهکده',file_url:'/media-library/images/preview-stranger.jpg'},
{id:4,sender_type:'user',message_type:'text',content:'رد مسیر به آسیاب می‌رسد. داریم تصویر شاهد را با گزارش قبلی مقایسه می‌کنیم.'},
{id:5,sender_type:'admin',message_type:'image',content:'تصویر کدخدا؛ بررسی روایت شاهد',file_url:'/media-library/images/preview-suspect.jpg'},
{id:6,sender_type:'admin',message_type:'voice',content:'صدای ضبط‌شده در نزدیکی آسیاب',file_url:'/media-library/audio/preview.mp3'},
{id:7,sender_type:'admin',message_type:'file',content:'گزارش اولیهٔ تحقیقات',file_name:'گزارش.txt',file_url:'/media-library/files/preview.txt'}
].map(m=>({...m,session_id:99001,created_at:'2026-10-02T18:40:00Z'}));
app.get('/socket.io/socket.io.js', (req,res)=>res.type('js').send(`window.io=()=>({connected:true,on(name,fn){if(name==='connect')setTimeout(fn,20);},io:{on(){}},emit(){},timeout(){return {emit(name,data,cb){cb(null,{success:true,message:{id:Date.now(),session_id:99001,sender_type:'user',message_type:'text',content:data.content,created_at:new Date().toISOString()}})}}}});`));
app.get('/api/sessions/:id/messages',(req,res)=>res.json({success:true,data:req.headers.referer?.includes('empty=1')?[]:fixtures}));
app.get('/media-library/images/preview-:name.jpg',(req,res)=>res.sendFile(path.join(root,'assets/scene',req.params.name+'.jpg')));
app.get('/media-library/files/preview.txt',(req,res)=>res.type('text').send('Local visual fixture.'));
app.get(['/archive.html','/chat.html'],(req,res)=>{
let html=fs.readFileSync(path.join(root,req.path),'utf8');
const seed=`<script>sessionStorage.setItem('userToken','local-visual-fixture');sessionStorage.setItem('userSession',${JSON.stringify(JSON.stringify(session))});</script>`;
html=html.replace('<head>','<head>'+seed);
// Preview has no microphone access, real transport, database writes or production auth.
if(req.path==='/chat.html')html=html.replace('src="/assets/js/user-chat.js"','src="/preview-user-chat.js"');
res.type('html').send(html);
});
app.get('/preview-user-chat.js',(req,res)=>res.type('js').send(fs.readFileSync(path.join(root,'assets/js/user-chat.js'),'utf8').replace('  initUserMicrophone();','  // Microphone intentionally excluded in visual preview.')));
app.post('/api/upload', (req,res)=>res.json({success:false,message:'این صفحه پیش‌نمایش ظاهر با دادهٔ آزمایشی است؛ ارسال فایل در سرور اصلی فعال است.'}));
app.use(express.static(root));
app.listen(3011,'127.0.0.1',()=>console.log('Visual preview http://localhost:3011/archive.html (fixture data only)'));

