import { RemoteServer, serverOption ,BohoAuth, BohoAuthFileDB } from 'remote-signal'

serverOption.showMetric = 2;
serverOption.showMessage = 'message';

const remoteServer = new RemoteServer( serverOption, new BohoAuth( new BohoAuthFileDB('../authInfo.json') ) )
console.log( 'serverOption:', serverOption )

