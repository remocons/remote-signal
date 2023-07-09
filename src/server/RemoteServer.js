import net from 'net'
import EventEmitter from 'events'
import { WebSocketServer } from 'ws'
import { Manager }  from './Manager.js'
import { serverOption } from './serverOption.js'
import { getLocalAddress } from '../util.js'
import { RemoteWS } from '../client/RemoteWS.js'
import { STATUS } from './api/api_constant.js'
export class RemoteServer extends EventEmitter {

  constructor(options, authManager ,requestHandler) {
    super();
    // console.log('RemoteServer input options', options )
    this.manager = new Manager(this, authManager ,requestHandler)
    this.startWSServer(options)
    if(options.congPort){ 
      this.startCongServer(options)
    }

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



  api( target, api , adminOnly = false){
    
    // type1,. single request function
    if( typeof api.request == 'function'){
      this.on( target, (remote, req)=>{
        if( adminOnly && !remote.isAdmin){
          remote.response(req.mid, STATUS.ERROR , "NO PERMISSION." )
        }else{
          api.request( remote, req ) 
        }
      })
      
    // type2. multiple functions
    }else{ 
      let apiList = []
      Object.keys( api ).forEach( v=>{ 
        if( typeof api[v] === 'function' ) apiList.push(v)  
      })

      this.on( target, ( remote, req)=>{
        let r;
        if( adminOnly && !remote.isAdmin){
          r = "NO PERMISSION."
        }else if( apiList.includes( req.topic ) ){
          api[req.topic](remote, req )
          return
        }else{
          r = "No such a Request topic: " + req.topic
        }
        remote.response(req.mid, STATUS.ERROR ,r )
      })
    }

    return this
  }
  
}
