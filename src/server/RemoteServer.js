import net from 'net'
import EventEmitter from 'events'
import { WebSocketServer } from 'ws'
import { Manager } from './Manager.js'
import { serverOption } from './serverOption.js'
import { STATUS } from './api/api_constant.js'
export class RemoteServer extends EventEmitter {

  constructor(options, authManager, requestHandler) {
    super();
    // console.log('RemoteServer input options', options )
    this.manager = new Manager(this, authManager, requestHandler)
    this.apiNames = new Set()

    this.startWSServer(options)
    if (options.congPort) {
      this.startCongServer(options)
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

    this.wss.on('error', (err) => {
      console.error('### ws server error:', err.message)
      if(err.code == 'EADDRINUSE'){
        process.exit()
      }
    })

    this.wss.on('close', (err) => {
      console.log('### WS server closed.', err)
    })

    this.wss.on('connection', (ws, req) => {
      ws.socketType = 'websocket'
      this.manager.addRemote(ws, req)
    })


  }

  startCongServer(options) {
    console.log('congServer listen:', options.congPort)

    this.congServer = net.createServer((socket) => {
      this.manager.addRemote(socket)
    })
      .on('error', (err) => {
        console.log('### cong server error:', err.message)
        if(err.code == 'EADDRINUSE'){
          process.exit()
        }
      }).listen(serverOption.congPort, () => {
        // console.log('congsocket server bound' );
      });
  }



  api(target, api) {
    this.apiNames.add(target)

    // common checkPermission
    if (!api.checkPermission || typeof api.checkPermission != 'function') {
      throw new Error('wrong api interface. no checkPermission function.')
    }


    // type1,. single request function
    if (typeof api.request == 'function') {
      this.on(target, (remote, req) => {
        if (api.checkPermission(remote, req)) {
          api.request(remote, req)
        } else {
          remote.response(req.mid, STATUS.ERROR, "NO_PERMISSION.")
        }
      })

      // type2. multiple functions
    } else {
      let apiList = []
      Object.keys(api).forEach(v => {
        if (typeof api[v] === 'function') apiList.push(v)
      })

      this.on(target, (remote, req) => {
        let r;
        if (!api.checkPermission(remote, req)) {
          r = "NO_PERMISSION."
        } else {
          if (apiList.includes(req.topic)) {
            api[req.topic](remote, req)
            return
          } else {
            r = `target: ${req.target} has not topic name: ${req.topic}`
          }
        }

        remote.response(req.mid, STATUS.ERROR, r)
      })


    }

    return this
  }

}
