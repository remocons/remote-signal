import { RemoteServer, serverOption , Auth_Env } from '../index.js'

serverOption.showMetric = 2;
serverOption.showMessage = 'message';

// example
// process.env.BOHO_AUTH=id1.key1.255,id2.key2.200

let authManager = new Auth_Env( process.env.BOHO_AUTH ) 
const remoteServer = new RemoteServer( serverOption, authManager )   
console.log( 'serverOption:', serverOption )

