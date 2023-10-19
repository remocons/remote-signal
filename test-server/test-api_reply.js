import { RemoteServer, serverOption ,api_reply  } from 'remote-signal'
serverOption.showMessage = 'message';

// no authManager
serverOption.port = 7777
const rs = new RemoteServer( serverOption  )
// api  response module
rs.api('reply', api_reply)

// console.log( 'serverOption:', serverOption )