import { RemoteServer, serverOption , BohoAuth_Env } from '../index.js'

serverOption.showMetric = 2;
serverOption.showMessage = 'message';

let authManager = new BohoAuth_Env( process.env.BOHO_AUTH ) 
const remoteServer = new RemoteServer( serverOption, authManager )   
console.log( 'serverOption:', serverOption )

