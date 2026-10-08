import nodemailer from 'nodemailer';
export function mailConfig(env=process.env){
 const mode=env.MAIL_MODE||'local';if(mode==='local')return {mode};
 if(mode!=='smtp')throw new Error('MAIL_MODE must be local or smtp');
 const {SMTP_HOST:host,SMTP_USER:user,SMTP_PASS:pass,SMTP_FROM:from}=env,port=Number(env.SMTP_PORT||587);
 if(!host||!user||!pass||!from||!Number.isInteger(port)||port<1||port>65535||/[\r\n]/.test(from))throw new Error('Incomplete SMTP configuration; check .env.example');
 const transport=nodemailer.createTransport({host,port,secure:port===465,requireTLS:port!==465,auth:{user,pass},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,disableFileAccess:true,disableUrlAccess:true});
 return {mode,transport,from};
}
