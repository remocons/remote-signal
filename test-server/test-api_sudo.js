import { RemoteServer, serverOption ,api_sudo , Auth_Env } from 'remote-signal'
serverOption.showMessage = 'message';

//  authManager
serverOption.port = 7777
let authManager = new Auth_Env('admin.adminkey.255')
const rs = new RemoteServer( serverOption ,authManager )
// api  response module
rs.api('sudo', api_sudo )

// console.log( 'serverOption:', serverOption )