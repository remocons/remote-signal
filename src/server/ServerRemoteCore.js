import { webcrypto } from 'crypto';
import { MBP } from 'meta-buffer-pack'
import { Boho, BohoMsg, MetaSize } from 'boho'
import { serverOption } from './serverOption.js';
import { RemoteMsg, ENC_MODE, CLIENT_STATE } from '../common/constants.js'
import { quotaTable } from '../common/quotaTable.js'

const decoder = new TextDecoder()

const NB = MBP.NB
const MB = MBP.MB


export class ServerRemoteCore {
  constructor(socket, manager) {

    this.socket = socket;
    socket.isAlive = true;
    socket.txCounter = 0;
    socket.rxCounter = 0;
    socket.openTime = Date.now()

    this.boho = new Boho()
    this.encMode = ENC_MODE.AUTO;
    this.channels = new Set();  //  subscribed tags
    this.retain_signal = new Map();

    this.ssid = ServerRemoteCore.ssid++;  // ordered index number
    this.manager = manager;

    this.cid; // Communication Id
    this.did; // Device Id
    this.uid;
    this.nick = ""


    this.lastEchoMessage = "N"
    this.privateNode = false
    this.HOME_CHANNEL = ""
    this.level = serverOption.defaultQuotaIndex;
    this.quota = quotaTable[this.level];
    this.isAdmin = false;

    this.state;
    this.stateLog = [];
    this.setState(CLIENT_STATE.INIT)

  }

  static ssid = 1;



  setState(state) {
    this.state = state
    if (serverOption.debug.showAuthInfo) {
      this.stateLog.push(state)
      console.log(this.stateLog.join('>'))
    }
  }

  getState(){
    return this.state
  }

  getStateName(){ 
    //state <number>
    //value of constant STATES.NAME < number >
    //type of constant STATES.NAME name < string uppercase >
    //stateName,eventName <string lowercase>
    return ( CLIENT_STATE[ this.state ]).toLowerCase()
  }


  showMessageLog(message, isBinary) {
    let from = this.boho.isAuthorized ? ` id: ${this.did}(${this.cid})` : ""
    if (isBinary) {
      let msgTypeName = RemoteMsg[message[0]]
      if (!msgTypeName) msgTypeName = BohoMsg[message[0]]
      msgTypeName = '#' + this.ssid + '(' + this.cid + ') [ ' + msgTypeName + ' ]';
      if (message.byteLength > 40) {
        console.log(msgTypeName + from + ' LEN:', message.length);
      } else {
        console.log(msgTypeName + from, message);
      }

    } else {
      console.log(from + '[TEXT MSG] %s', message);
    }
  }

  rxQuotaChecker(message) {
    let rxBytes = message.byteLength
    this.manager.rxBytes += rxBytes;

    if (serverOption.useQuota.signalSize && (rxBytes > this.quota.signalSize)) {
      console.log('## quota: size over')
      this.send(Buffer.from([RemoteMsg.OVER_SIZE]))
      if (serverOption.useQuota.disconnect) this.close();
      return false;
    }

    // todo:
    // traffic rate :  

    return true;
  }

  // 
  onTimeDelayMessage(message, isBinary = true) {
    setTimeout(() => {
      this.onSocketMessage(message, isBinary)
    }
      , serverOption.debug.delay)
  }
  // CongSocket or WebSocket
  onSocketMessage(message, isBinary = true) {

    this.receiveMonitor() // rx data and ping pong : timeout check
    if (!this.rxQuotaChecker(message)) return

    if (serverOption.showMessage === 'message') this.showMessageLog(message, isBinary)

    let msgType, decoded

    if (isBinary) {
      msgType = message[0]

      if (msgType === BohoMsg.ENC_488) {
        // let from = this.boho.isAuthorized ? this.cid : "anonymous"
        // console.log(`>> [E488] from: ${from} LEN ${message.byteLength}`)
        // console.log( "ENC buffer", message)
        try {
          decoded = this.boho.decrypt_488(message)
        } catch (err) {
          console.log('-- E488 DEC_FAIL', err)
          return
        }

        if (decoded) {
          msgType = decoded[0]
          message = decoded   // signal message
          // console.log('[D]', RemoteMsg[ msgType] )
        } else {
          return
        }

      } else if (msgType === BohoMsg.ENC_E2E) { // End to End Signal
        try {
          decoded = this.boho.decrypt_488(message)
        } catch (err) {
          console.log('-- E2E DEC_FAIL', err)
          return
        }
        // console.log('e2e unpack:', decoded )
        if (decoded) {
          msgType = decoded[0]
          message.set(decoded, MetaSize.ENC_488) // set decoded signal_e2e headaer.
          message = message.subarray(MetaSize.ENC_488) // reset offset.
          // console.log('[D]', RemoteMsg[ msgType] )
        } else {
          return
        }

      } else {
        // console.log( `[P] ${ RemoteMsg[ msgType] || BohoMsg[cmd]}  LEN: ${message.byteLength}` )
      }

      switch (msgType) {
        case RemoteMsg.PING:
          // console.log('-- ping from:' , this.cid )
          this.pong();
          break;

        case RemoteMsg.PONG:
          // console.log('<-pong')
          break;

        case RemoteMsg.CID_REQ:
          if (this.state < CLIENT_STATE.SENT_SERVER_READY) {
            // console.log('protocol error. cid_req before server_ready')
            this.close()
          }
          if (!this.cid) {
            this.cid = '?' + webcrypto.getRandomValues(Buffer.alloc(3)).toString('base64url')
            this.manager.cid2remote.set(this.cid, this)
          }

          // console.log('<< SENDING CID_RES:', this.cid)
          this.send_enc_mode(MBP.pack(
            MB('#cid_ack', '8', RemoteMsg.CID_RES),
            MB('#cid', this.cid)
          ))

          this.setState(CLIENT_STATE.CID_READY)
          break;


        case RemoteMsg.ECHO: // TEXT only 
          try {
            let msg = decoder.decode(message.subarray(1))
            this.lastEchoMessage = msg
          } catch (error) {
            // console.log('ECHO message is not a text')
          }
          this.send(message, isBinary)
          break;

        case RemoteMsg.IAM: // iam
          if(message.byteLength > 1){
            let iamInfo = message.subarray(1)
            this.nick = decoder.decode(iamInfo)  
            console.log('iam nick reset', this.nick)
          }
          this.iamResponse()
          break;

        case RemoteMsg.SIGNAL_E2E:
        case RemoteMsg.SIGNAL:
          if (message.byteLength >= 3) {
            let tagLen = message.readUInt8(1)
            if (message.byteLength >= tagLen + 2) {
              let tag = message.subarray(2, 2 + tagLen)
              tag = decoder.decode(tag)
              this.manager.sender(tag, this, message )
            }
          }
          break;



        case RemoteMsg.UNSUBSCRIBE:
          if (message.byteLength == 2) {
            this.manager.unsubscribe([""], this)
          } else if (message.byteLength >= 3) {
            let tagLen = message.readUInt8(1)

            if (message.byteLength == tagLen + 2) {
              let tag = message.subarray(2, 2 + tagLen)
              tag = decoder.decode(tag)
              // console.log('unsub:  tag', tag)
              let tagList = tag.split(',')
              this.manager.unsubscribe(tagList, this)
            }
          }
          break;


        case RemoteMsg.SUBSCRIBE: // 1byte tagLen
          if (message.byteLength >= 3) {
            let tagLen = message.readUInt8(1)
            if (message.byteLength == tagLen + 2) {
              let tag = message.subarray(2, 2 + tagLen)
              tag = decoder.decode(tag)
              let tagList = tag.split(',')
              // console.log('-- SUBSCRIBE req splittagList', tagList)
              this.manager.subscribe(tagList, this)
            }
          }
          break;

        case RemoteMsg.SUBSCRIBE_REQ:  // 2bytes tagLen
          // console.log('#####recv sub_req ', message, message.byteLength )
          if (message.byteLength >= 6) {
            let msgID = message.readUInt16BE(1)
            let tagLen = message.readUInt16BE(3)
            if (message.byteLength == tagLen + 5) {
              let tag = message.subarray(5, 5 + tagLen)
              tag = decoder.decode(tag)
              let tagList = tag.split(',')
              // console.log('>> SUBSCRIBE_REQ from:', this.cid, tagList)
              let size = this.manager.subscribe(tagList, this)

              // this.response(msgID, 0, { size: size })
              this.response(msgID, 0)
            } else {
              this.response(msgID, 255 )
            }
          }
          break;


        case RemoteMsg.REQUEST: //api request
          try {
            let req = MBP.unpack( message )
            // console.log('request unpack req', req)
            if(req){
              // console.log('request target:', req.target, 'topic:', req.topic)
              if( !req.target || !req.topic ) return
              if(this.manager.server.apiNames.has(req.target)){
                this.manager.server.emit( req.target, this , req  )
              }else{
              console.log('UnKnown API req: ', req.target)
              }
            }
          } catch (e) {
            console.log('request catch error', e)
          }
          break;


        case RemoteMsg.CLOSE:
          if (message.byteLength > 1) {
            let reason = decoder.decode(message.subarray(1))
            console.log('>> CLOSE reason:', reason)
            this.close();
          }
          break;


        // Auth
        case BohoMsg.AUTH_REQ:
          if (!this.manager.bohoAuth) return
          if (this.state < CLIENT_STATE.SENT_SERVER_READY) {
            // console.log('protocol error. auth_req before server_ready')
            this.close();
          }
          this.setState(CLIENT_STATE.RECV_AUTH_REQ)
          let auth_nonce_pack = this.boho.auth_nonce()
          // console.log('## auth_nonce_pack', auth_nonce_pack )
          this.send(auth_nonce_pack)
          this.setState(CLIENT_STATE.SENT_SERVER_NONCE)
          break;

        case BohoMsg.AUTH_HMAC:
          if (!this.manager.bohoAuth) return
          if (this.state < CLIENT_STATE.SENT_SERVER_NONCE) {
            // console.log('protocol error. auth_hmac before server_nonce')
            this.close();
          }
          this.setState(CLIENT_STATE.RECV_AUTH_HMAC)
          //async
          this.manager.bohoAuth.verify_auth_hmac(message, this)
          .then(authInfo=>{
            if(authInfo){
              this.manager.deligateSignal(remote, '@$name', authInfo.name)
              // console.log('device login success authInfo', authInfo)
              // this.manager.sender('@$name', authInfo.name )
            }

          })
          .catch(e=>{

          })

          return;

        default:
        // console.log('unknown MsgType:',msgType,' from:', this.ip, this.ssid, this.cid )

      }

    } else {
      // TEXT FRAME
      try {
        let textMessage = decoder.decode(message)
        // console.log('text buffer:',textMessage )
        // console.log('text buffer:',message.toString('hex') )
        this.manager.server.emit('text_message', textMessage, this)
      } catch (error) {

      }
    }

  }


  response(msgId, statusCode, body) {
// console.log('response body', body)
    if( body ){

      this.send_enc_mode( MBP.pack(
        MB('#type', '8', RemoteMsg.RESPONSE_MBP),
        MB('status','8', statusCode),
        MB('mid','16', msgId),
        MB('body',body)
      ))

    }else{
      this.send_enc_mode( MBP.pack(
        MB('#type','8', RemoteMsg.RESPONSE_MBP),
        MB('status','8', statusCode),
        MB('mid','16', msgId)
      ))

    }
    
  }


  send_enc_mode(data, useEncryption = false) {

    if (this.encMode === ENC_MODE.YES ||
      this.encMode === ENC_MODE.AUTO &&
      !this.TLS && this.boho.isAuthorized
    ) useEncryption = true;

    // console.log('svr useEnc',  useEncryption, data )

    if (useEncryption && data[0] == RemoteMsg.SIGNAL_E2E) {
      // E2E는,
      // 서버는 수신자와 암호통신하는경우, 헤더부분만 암호화 하고, 데이타 부분은 그대로 전달해야한다.
      let tagLen = data[1];

      // let tagInfo = decoder.decode( data.subarray( 2, 2 + tagLen) )
      // console.log('server bypass E2E signal taginfo:', tagInfo )

      let encHeader = this.boho.encrypt_488(data.subarray(0, 3 + tagLen))
      // console.log('size check:', encHeader.byteLength == (tagLen + 3 + 21 ) )
      encHeader[0] = BohoMsg.ENC_E2E
      // encHeader 크기가 21(enc_488)크기 만큼 커짐. tagLen+3 + 21 
      let newEncBuffer = Buffer.concat([encHeader, data.subarray(3 + tagLen)])

      // console.log('ENC_E2E', newEncBuffer)
      this.send(newEncBuffer)

    } else if (useEncryption) {
      let encPack = this.boho.encrypt_488(data)
      if (encPack) {
        // console.log('send *S* LEN:', encPack.byteLength)
        this.send(encPack)
      } else {
        console.log('encryption FAIL: NO DATA TRANSIT')
      }
    } else {
      // console.log('send -N-')
      this.send(data)

    }

  }



  iamResponse(info = "") {

    if (info == "") {
      //send general info
      let channels = []
      for (let tag of this.channels.keys()) {
        channels.push(tag)
      }

      info = {
        "ssid": this.ssid,
        "uid": this.uid,
        "cid": this.cid,
        "did": this.did,
        "nick": this.nick,
        "ip": this.ip
        , 'tag': channels
      }
    }

    let pack = MBP.pack(
      MB('#MsgType', '8', RemoteMsg.IAM_RES),
      MB('#info', info)
    )
    this.send_enc_mode(pack)
  }

  // storeSet(topic, ...args){
    // this.manager.set( this, topic, ...args )
  // }

}

