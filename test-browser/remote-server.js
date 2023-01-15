import { RemoteServer, serverOption } from 'remote-signal'

serverOption.showMetric = 1;
serverOption.showMessage = 'message';
const remoteServer = new RemoteServer( serverOption )

console.log( 'serverOption:', serverOption )

