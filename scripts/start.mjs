import { access, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';
import { createApp } from '../server/app.mjs';
import { productionConfig } from '../server/production.mjs';

const {port,app}=productionConfig();
// Fail deployment before accepting traffic if the build or configured disk is unavailable.
await Promise.all(['index.html','_headers','404.html'].map(file=>access(resolve(app.root,file),constants.R_OK)));
if(app.mode!=='disabled'){
 await mkdir(app.inboxDir,{recursive:true,mode:0o700});
 await access(app.inboxDir,constants.W_OK);
}
const server=createApp(app);
server.listen(port,'0.0.0.0',()=>console.log(`Web service listening on port ${port}; enquiry mode: ${app.mode}`));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{
 server.close(()=>process.exit(0));
 setTimeout(()=>{server.closeAllConnections();process.exit(0);},10000).unref();
});
