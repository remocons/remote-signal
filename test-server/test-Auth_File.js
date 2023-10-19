import { RemoteServer, serverOption , Auth_File } from '../index.js'

serverOption.showMetric = 2;
serverOption.showMessage = 'message';

// const remoteServer = new RemoteServer( serverOption, new Auth_File('../authInfo.json') )  // JSON version.  cannot add comments.
const remoteServer = new RemoteServer( serverOption, new Auth_File('../auth_file.mjs') )      // JS version. it support comments. 
// console.log( 'serverOption:', serverOption )

