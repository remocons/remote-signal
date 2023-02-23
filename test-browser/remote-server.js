import { RemoteServer, serverOption } from 'remote-signal'

serverOption.showMetric = 2;
serverOption.showMessage = 'message';
const remoteServer = new RemoteServer( serverOption )

console.log( 'serverOption:', serverOption )

