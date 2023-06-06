import { RemoteServer, serverOption , RequestHandler } from 'remote-signal'
import { ReplyHandler } from '../src/req_handlers/ReplyHandler.js'

let requestHander = new RequestHandler(new ReplyHandler() )
serverOption.showMessage = 'message';

// no authManager
// testing simple sample 'ReplyHandler' requestHandler
const rs = new RemoteServer( serverOption ,null ,requestHander )
console.log( 'serverOption:', serverOption )
