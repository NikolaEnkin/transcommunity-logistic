import { createApp } from '../server/app.mjs';
import { mailConfig } from '../server/mail.mjs';
const port=Number(process.env.PORT||4173);
const server=createApp({...mailConfig(),...(process.env.ENQUIRY_DIR?{inboxDir:process.env.ENQUIRY_DIR}:{})});
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port} (${process.env.MAIL_MODE||'local'} enquiry mode)`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
