import net from 'net'
import { Manager }  from './Manager.js'
import { WebSocketServer } from 'ws'
import { serverOption } from './serverOption.js'
import { getLocalAddress } from './util.js'
import { RemoteWS } from '../src/sockets/RemoteWS.js'

export class RemoteServer {

  constructor(options, authManager ) {
    // console.log('RemoteServer input options', options )
    this.manager = new Manager(authManager)
    this.startWSServer(options)
    this.startCongServer(options)

    // publish local ipaddress to global server.
    if( serverOption.publishLocalAddress.use ){
      let ip = getLocalAddress();
      let wsurl= 'ws://'+ip+':'+serverOption.port;
      console.log(wsurl, ip)
      let remote = new RemoteWS( serverOption.publishLocalAddress.url )
      remote.on('ready',e=>{
        remote.signal( serverOption.publishLocalAddress.ch , wsurl)
        remote.signal( serverOption.publishLocalAddress.ch+'cong' , ip)
      }) 
    }

  }


  startWSServer(options) {
    if (options.timeout) {
      let pingT = parseInt(options.timeout)
      if (pingT && pingT >= 1000) serverOption.timeout = pingT
    }

    if (options.monitorPeriod) {
      let monitorT = parseInt(options.monitorPeriod)
      if (monitorT && monitorT >= 1000) serverOption.monitorPeriod = monitorT
    }

    if (options.port) {
      let port = parseInt(options.port)
      if (port) serverOption.port = port
    }

    console.log('WebSocketServer listen:', options.port)
    this.wss = new WebSocketServer(options)
    this.wss.setMaxListeners(0)

    this.wss.on('error', (e) => {
      console.error('### ws server error:', e)
    })

    this.wss.on('close', (e) => {
      console.log('### WS server closed.', e)
    })
    
    this.wss.on('connection', (ws, req) => {
      ws.socketType = 'websocket'
      this.manager.addClient(ws, req)
    })


  }

  startCongServer(options) {
    console.log('congServer listen:', options.congPort)

    this.congServer = net.createServer((socket) => {
      this.manager.addClient(socket)
    })
      .on('error', (err) => {
        console.log('### congServer error:', err)
      }).listen(serverOption.congPort, () => {
        // console.log('congsocket server bound' );
      });
  }


}
