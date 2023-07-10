import { MBP } from 'meta-buffer-pack'
import { ServerRemote } from './ServerRemote.js'
import { serverOption } from './serverOption.js'
import { RemoteMsg, PAYLOAD_TYPE, CLIENT_STATE } from '../constants.js'
import { FileLogger } from './FileLogger.js'
import { Metric } from './Metric.js'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export class Manager{

  constructor( server, bohoAuth  ) {
    this.server = server;
    this.txBytes = 0;
    this.rxBytes = 0;

    this.bohoAuth = bohoAuth;
    // TIP. bohoAuth module is option.
    // if exist: used by ServerRemoteCore for the auth. process.

    this.connectionLogger;
    if (serverOption.fileLogger.connection.use) {
      this.connectionLogger = new FileLogger( serverOption.fileLogger.connection.path)
      console.log('Manager: begin file logger [connection]')
    }

    this.attackLogger;
    if( serverOption.fileLogger.attack.use ){
      this.attackLogger = new FileLogger( serverOption.fileLogger.attack.path )
      console.log('Manager: begin file logger.[attack]')
    }

    this.remotes = new Set(); // total ServerRemotes
    this.channel_map = new Map()  //  key: channelName  value: < ServerRemote : Set >
    this.CHANNEL_PREFIX = 'CH:'
    this.CID_PREFIX = 'CID:'
    this.cid2remote = new Map(); //  map:[ key:cid -> value:client ]
    this.retain_messages = new Map() // key: tag, data: signalMessage
    this.metric = new Metric(this)
    this.lastSSID = 0;

    // this.uid2remotes = new Map()  
    // this.uidStores = new Map()

    this.pingIntervalID = setInterval(e => {
      this.remotes.forEach(function each(remo) {
        let socket = remo.socket;
        if (socket.isAlive === false) {
          console.log('## timeout. cid:', remo.cid)
          remo.close();
        }

        socket.txCounter++;
        socket.isAlive = false;
        if (remo.socketType === 'websocket') {
          socket.ping();
        } else {
          remo.ping()
        }
        // console.log('<< PING')
      });
    }, serverOption.timeout);


    this.monitIntervalID = setInterval((e) => {
      if (serverOption.showMetric) {
        this.monitor()
      }
    }, serverOption.monitorPeriod);

  }


  addClient(socket, req) {
    socket.isAlive = true;
    let client = new ServerRemote(socket, req, this)
    this.remotes.add(client)
    client.send(Buffer.from([RemoteMsg.SERVER_READY]))
    client.setState(CLIENT_STATE.SENT_SERVER_READY)
    this.lastSSID = client.ssid;
    let connectionInfo = `+ IP:${client.ip} #${client.ssid} ${socket.socketType === 'websocket' ? "WS" : "CS"} `;
    // console.log( connectionInfo)
    if (this.connectionLogger) this.connectionLogger.log(connectionInfo)
  };


  removeClient(client) {
    // client is ServerRemote 
    let remoteInfo = `- IP:${client.ip} #${client.ssid} cid:${client.cid} ${client?.socket.socketType === 'websocket' ? "WS" : "CS"} `
    if (this.connectionLogger) this.connectionLogger.log(remoteInfo)
    // console.log('#### manager.removeClient()', client.cid)
    this.deligateSignal(client, '@state', 'close')
    this.deligateSignal(client, '@$state', 'close')

    // remove subscriber 
    for (let ch of client.channels.keys()) {
      if (this.channel_map.has(ch)) {
        const clients = this.channel_map.get(ch)
        // console.log(`-- channel [ ${ch} ] removes subscriber id: ${client.cid} `)
        clients.delete(client)
        if (clients.size == 0) this.channel_map.delete(ch)
      }else{
        // console.log('no such a ch: ', ch )
      }
    }

    // If client has retain message(cid publisher):

    // policy
    // type 1. keep if authUser, delete if anonymouse.
    if( client.boho.isAuthorized ){
      //keep retain signal.
    }else{
      // anonymouse: remove the cid publish channel
      for (let ch of client.retain_signal.keys()) {
        // console.log('cid retain_signal.keys:', ch )
        ch = this.CID_PREFIX + client.cid + '@' + ch
        if (this.channel_map.has(ch)) {
          this.channel_map.delete(ch)
          // console.log(`-- deleted cid pub ch [ ${ch} ]. cid publisher id: ${client.cid} `)
        }else{
          // console.log('no such a retain_signal tag: ', ch )
        }
      }
    }
 
    // this.delUserRemote(client )
    let req = { topic:'delUserRemote'}
    this.server.emit('account', client, req )
    this.remotes.delete(client)
    this.cid2remote.delete(client.cid)
    client = null

  }



  serverSignal(obj) {
    // obj.event  obj.data
    console.log('server signal', obj)
    let sigPack = MBP.pack(
      MBP.MB('#MsgType', '8', RemoteMsg.SERVER_SIGNAL),
      MBP.MB('#signalObject', obj)
    )

    this.remotes.forEach(remote => {
      remote.send_enc_mode(sigPack)
    })
  }

  getSignalTag(buffer) {
    let tagLen = buffer.readUint8(1)
    let tagBuf = buffer.subarray(2, 2 + tagLen)
    let tag = decoder.decode(tagBuf)
    return tag
  }

  getNewSignalTagMessage(buffer, newTag) {
    let msgType = buffer[0]
    let tagLen = buffer.readUint8(1)
    let newTagBuf = encoder.encode(newTag)
    let newTagLen = newTagBuf.byteLength;
    let payloadCunk = buffer.subarray(2 + tagLen)
    let newBuffer = Buffer.concat([Buffer.from([msgType, newTagLen]), newTagBuf, payloadCunk])
    return newBuffer
  }


  parsePayload(args) {
    // console.log( 'parsePayload args', args )
    let type, pack;
    if (args.length == 0) {
      type = PAYLOAD_TYPE.EMPTY
      pack = null
    } else if (args.length == 1) {
      if (typeof args[0] === 'string' || typeof args[0] === 'number') {
        type = PAYLOAD_TYPE.TEXT
        pack = encoder.encode(args[0] + ".") // add null area.
        pack[pack.byteLength - 1] = 0 // set null.

      } else if (ArrayBuffer.isView(args[0]) || args[0] instanceof ArrayBuffer) {  //one buffer
        type = PAYLOAD_TYPE.BINARY
        pack = MBP.B8(args[0])
      } else if (typeof args[0] === 'object') {
        type = PAYLOAD_TYPE.OBJECT
        pack = encoder.encode(JSON.stringify(args[0]))
      } else {
        //
        console.log('unknown type payload arguments')
      }
    } else { // args 2 and more
      let containsBuffer = false
      args.forEach(item => {
        if (ArrayBuffer.isView(item) || item instanceof ArrayBuffer) containsBuffer = true;
        // console.log('payload item', item )
      })

      if (containsBuffer) {
        type = PAYLOAD_TYPE.MBA;
        // pack 
      } else {
        type = PAYLOAD_TYPE.MJSON;
        // args is array
        pack = encoder.encode(JSON.stringify(args))
      }

    }

    return { type: type, buffer: pack }

  }

  get_signal_pack(tag, ...args) {
    if (typeof tag !== 'string') throw TypeError('tag should be string.')
    let tagEncoded = encoder.encode(tag)
    let payload = this.parsePayload(args)

    let sigPack;
    if (payload.type == PAYLOAD_TYPE.EMPTY) {
      sigPack = MBP.pack(
        MBP.MB('#MsgType', '8', RemoteMsg.SIGNAL),
        MBP.MB('#tagLen', '8', tagEncoded.byteLength),
        MBP.MB('#tag', tagEncoded),
        MBP.MB('#payloadType', '8', payload.type)
      )
    } else if (payload.type == PAYLOAD_TYPE.MBA) {
      sigPack = MBP.pack(
        MBP.MB('#MsgType', '8', RemoteMsg.SIGNAL),
        MBP.MB('#tagLen', '8', tagEncoded.byteLength),
        MBP.MB('#tag', tagEncoded),
        MBP.MB('#payloadType', '8', payload.type),
        MBP.MBA(...args)
      )
    } else {
      sigPack = MBP.pack(
        MBP.MB('#MsgType', '8', RemoteMsg.SIGNAL),
        MBP.MB('#tagLen', '8', tagEncoded.byteLength),
        MBP.MB('#tag', tagEncoded),
        MBP.MB('#payloadType', '8', payload.type),
        MBP.MB('#payload', payload.buffer)
      )
    }
    return sigPack
  }




  // signaling to the cid subscribers.
  // example.  sending cid close signal.
  deligateSignal(client, tag, ...args) {
    let sigPack = this.get_signal_pack(tag, ...args)
    this.sender(tag, client, sigPack)
  }


  sender(tag, client, message) {

    if( tag.indexOf('$') == 0 ) return ['err', 'prefix $ is reserved for userSet tag.']

    let cidIndex = tag.indexOf('@');
    if (cidIndex === 0) {
      // ** CID_PUB is not uni-cast but multic-cast.
      // [cid_pub]  @topic ,  @$retainTopic
      // modify signalpack with cid_appneded tag.
      tag = client.cid + tag;
      message = this.getNewSignalTagMessage(message, tag)

      // console.log('cid_pub new tag:', tag, this.getSignalTag(message ))
    } else if (cidIndex > 0) {
      // uni-cast.  
      // console.log('unicast to:', tag)
      let targetCId = tag.split('@')[0];
      if (this.cid2remote.has(targetCId)) {
        //rm cid from tag.
        let ommitCIdTag = '@' + tag.split('@')[1]
        message = this.getNewSignalTagMessage(message, ommitCIdTag)
        // console.log(`origin tag: ${tag} omitTag: ${this.getSignalTag(message)}`)
        this.cid2remote.get(targetCId).send_enc_mode(message)
        return ['ok', 1]
      }
      return ['err', 'Invalid cid']
      // pub message from cid. 
      // you already subscribe the cid.  
    } else {
      // console.log('ch_pub tag:', tag)
      //else channel publish message
    }


    /**
     * multi-cast: 
     * channel_publish 
     * or cid_publish
     */

    // HOME_CHANNEL substitution.
    // (blank)#topic  ->  home_channel#topic. 
    if (tag.indexOf('#') === 0) {
      tag = client.HOME_CHANNEL + tag;
    } else if( tag.includes('@')){
      tag = this.CID_PREFIX + tag;
    } else {
      tag = this.CHANNEL_PREFIX + tag;
    }

    // retain signal message
    if (tag.includes('$')
      // && client.boho.isAuthorized
      && serverOption.retain.isAvailable
      && serverOption.retain.limitCounter > this.retain_messages.size
      && serverOption.retain.limitSize > message.byteLength
    ) {
      // cid retain signal
      if (tag.includes('@')) {
        // cid retain signal stored inside client.
        let retainTag = tag.split('@')[1]
        client.retain_signal.set(retainTag, message)
        // console.log('## cid retain tag, size: ', retainTag, client.retain_signal.size)
      } else {
        // channel retain signal stored inside manager.
        this.retain_messages.set(tag, message)
        // console.log('## channel retain tag, size: ', tag, this.retain_messages.size)
      }

    } else {
      // console.log('no retain. serverOption.retain:', serverOption.retain )
    }

    let sentCounter = 0;
    if (this.channel_map.has(tag)) {
      // console.log('raw channel_map matched tag:', tag)
      let clients = this.channel_map.get(tag);
      if (clients.size >= 1) {
        let limit;
        if (serverOption.useQuota.publishCounter) {
          limit = Math.min(client.quota.publishCounter, clients.size)
        } else {
          limit = clients.size;
        }
        let peers = clients.values();
        while (sentCounter < limit) {
          let c = peers.next().value
          if (!c) {
            // console.log('## null client' )
            break;
          }
          if (c !== client) {
            c.send_enc_mode(message);
            sentCounter++;
          }
        }

        if (serverOption.useQuota.publishCounter) {
          // console.log(`pub >> [${tag}] sent: ${sentCounter} [use quota limit: ${client.quota.publishCounter }] total: ${clients.size} subscribers. ` )
        } else {
          // console.log(`pub >> [${tag}] sent: ${sentCounter} [no quota limit] total: ${clients.size} subscribers. ` )
        }
        return ['ok', sentCounter]
      }
    }
    // console.log('-- No subscriber. ch: ' , tag )
    return ['err', 'No subscriber.']
  }



  subscribe(chArr, client) {
    // console.log('ChannelManager:: subscribe: ',chArr)
    chArr.forEach(tag => {
      if (tag.indexOf('#') === 0) {
        tag = client.HOME_CHANNEL + tag
      } else if( tag.includes('@')){
        tag = this.CID_PREFIX + tag;
      } else {
        tag = this.CHANNEL_PREFIX + tag
      }

      // 1. set channel map
      if (this.channel_map.has(tag)) {
        this.channel_map.get(tag).add(client)
      } else {
        this.channel_map.set(tag, new Set([client]))
      }
      // console.log('Manager::map:', this.channel_map.keys() )

      // 2.add to client channels.
      client.channels.add(tag)
      // console.log('client.channels set.', client.channels  )

      // 3. send retain message if available.
      if (tag.includes('$')
        && serverOption.retain.isAvailable
      ) {
        let retainMessage;
        if (tag.includes('@')) {
          let cid = tag.split('@')[0]
          cid = cid.split(this.CID_PREFIX)[1]
          let retainTag = tag.split('@')[1]
          if (this.cid2remote.has(cid)) {
            retainMessage = this.cid2remote.get(cid).retain_signal.get(retainTag)
          } else {
            // console.log('cid subscribe is rejected. not online:', cid)
            return;
          }

        } else if (this.retain_messages.has(tag)) {
          retainMessage = this.retain_messages.get(tag)
        }
        // console.log('send retainMessage buffer',retainMessage)
        if(retainMessage) client.send_enc_mode(retainMessage)

      }

    })
    return client.channels.size;
  }

  unsubscribe(chArr, client) {
    //unsubscribe all channels of the client.
    if (chArr.length == 1 && chArr[0] == "") {

      client.channels.forEach(ch => {
        if (this.channel_map.has(ch)) {
          let clients = this.channel_map.get(ch)
          clients.delete(client)
          if (clients.size == 0) this.channel_map.delete(ch)
        }
      })
      client.channels.clear();

    } else {
      // unsubscribe each channels.
      chArr.forEach(ch => {
        // substitution home_channel
        if (ch.indexOf('#') === 0) {
          ch = client.HOME_CHANNEL + ch;
        } else if( ch.includes('@')){
          ch = this.CID_PREFIX + ch;
        } else {
          ch = this.CHANNEL_PREFIX + ch;
        }
        // console.log('-- Manager::unsubscribe:', ch )

        // delete manager map.
        if (this.channel_map.has(ch)) {
          let clients = this.channel_map.get(ch)
          clients.delete(client)
          if (clients.size == 0) this.channel_map.delete(ch)
        } else {
          // console.log('##no such a ch', ch )
        }
        client.channels.delete(ch)
      })
    }

    // console.log( '-- result unsub:', client.channels )

  }


  monitor() {
    if (process.stdout.isTTY) {
      process.stdout.cursorTo(0, 0)
      process.stdout.clearScreenDown()
    }

    if (serverOption.showChannel > 0) {
      this.metric.channels(serverOption.showChannel);
    }
    let mode = parseInt(serverOption.showMetric)
    console.log('monitor metric type:', mode)
    switch (mode) {
      case 1:
        this.metric.oneline(true);
        break;
      case 2:
        // this.metric.getCIdList(true);
        this.metric.getRemotes(true);
        break;
      case 3:
        this.metric.getChannelList(true);
        break;
      default:
    }

  }


  closeRemoteByCId(cid) {
    if (this.cid2remote.has(cid)) {
      this.cid2remote.get(cid).close()
      return 1
    } else {
      return 0
    }
  }


}
