import { RemoteServer, serverOption } from 'remote-signal'

// serverOption.showMetric = 2;
// serverOption.showMessage = 'message';
// serverOption.port = '6666'
// serverOption.congPort = '6667'

const rs = new RemoteServer( serverOption )
console.log( 'serverOption:', serverOption )

// text message handler (No binary message)
// print text message
// then reply.
rs.on('message', (msg, remote)=>{
  console.log('text_message from(cid): ', remote.cid,  msg.toString() )
  let result = { msg: msg, yourcid: remote.cid , date: new Date().toUTCString() }
  let res = JSON.stringify( result )
  remote.send( res )
})
