import { RemoteServer, serverOption  } from 'remote-signal'
import * as api_reply from '../src/server/api/api_reply.js';
serverOption.showMessage = 'message';

// no authManager
const rs = new RemoteServer( serverOption ,null )
// api  response module
rs.api('reply', api_reply)

console.log( 'serverOption:', serverOption )