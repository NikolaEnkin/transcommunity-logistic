import { isAbsolute, relative, resolve, sep } from 'node:path';
import { mailConfig } from './mail.mjs';

export function productionConfig(env=process.env){
 const raw=[env.APP_ORIGIN,env.RENDER_EXTERNAL_URL,...(env.ADDITIONAL_ORIGINS||'').split(',')].filter(Boolean);
 const allowedOrigins=[...new Set(raw.map(value=>{
  const url=new URL(value.trim());
  if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('Public origins must be HTTPS origins without credentials, paths or queries');
  return url.origin;
 }))];
 if(!allowedOrigins.length)throw new Error('Set APP_ORIGIN or deploy as a Render web service');
 const mode=env.MAIL_MODE||'disabled';
 if(!['disabled','inbox','smtp'].includes(mode))throw new Error('Public MAIL_MODE must be disabled, inbox or smtp');
 const port=Number(env.PORT||10000);
 if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid PORT');
 const root=resolve('dist');
 let inboxDir;
 if(mode!=='disabled'){
  if(env.PERSISTENT_STORAGE!=='true'||!env.ENQUIRY_DIR||!isAbsolute(env.ENQUIRY_DIR))throw new Error('Public enquiries require PERSISTENT_STORAGE=true and an absolute ENQUIRY_DIR on a persistent disk');
  inboxDir=resolve(env.ENQUIRY_DIR);
  const path=relative(root,inboxDir);
  if(path===''||(!path.startsWith('..'+sep)&&path!=='..'&&!isAbsolute(path)))throw new Error('Enquiry storage must be outside the public directory');
 }
 return {port,app:{root,allowedOrigins,trustRenderProxy:env.RENDER==='true',indexable:env.SEARCH_INDEXING==='true',...(inboxDir?{inboxDir}:{}),...(mode==='smtp'?mailConfig(env):{mode})}};
}
