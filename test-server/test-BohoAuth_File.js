import { RemoteServer, serverOption , BohoAuth_File } from 'remote-signal'

serverOption.showMetric = 2;
serverOption.showMessage = 'message';

// const remoteServer = new RemoteServer( serverOption, new BohoAuth_File('../authInfo.json') )  // JSON version.  cannot add comments.
const remoteServer = new RemoteServer( serverOption, new BohoAuth_File('../auth_file.js') )      // JS version. it support comments. 
console.log( 'serverOption:', serverOption )

