import { MBP ,Buffer} from 'meta-buffer-pack'
import EventEmitter from "eventemitter3";
import { Boho, BohoMsg, MetaSize } from "boho";
import { quotaTable } from '../common/quotaTable.js'
import { RemoteMsg , PAYLOAD_TYPE , SIZE_LIMIT , ENC_MODE ,STATES} from '../common/constants.js'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function byteToUrl( buffer){
  //ipv4(4bytes) , port(2bytes)
  if(buffer.byteLength != 6 ) return 
  let address = buffer[0].toString() + "."+ buffer[1].toString()
                + "."+ buffer[2].toString() + "."+ buffer[3].toString();
  let port = (buffer[4] << 8) + buffer[5] 

  return address +':'+ port.toString()
}

export class RemoteCore extends EventEmitter{
  constructor( url) {
    super();
    this.cid = ""   // get from the server  CID_RES
    this.ip = ""    // get from the server  IAM_RES message.
    this.socket = null;
    this.url = url; // main server url
    this.url2 = ""  // redirection url
    this.url2closeCounter = 0
    this.state = STATES.CLOSED;  // Number type
    this.stateName = this.getStateName() // String type

    this.txCounter = 0;
    this.rxCounter = 0;
    this.txBytes = 0;
    this.rxBytes = 0;
    
    this.lastTxRxTime = Date.now();
    this.connectionCheckerPeriod = SIZE_LIMIT.CONNECTION_CHECKER_PERIOD ; 
    this.connectionCheckerIntervalID = null;

    this.boho = new Boho()
    this.TLS = false // true if protocol is wss(TLS)
    this.encMode = ENC_MODE.AUTO; 
    this.useAuth = false;

    this.nick = "";
    this.channels = new Set()
    this.promiseMap = new Map()
    this.promiseTimeOut = SIZE_LIMIT.PROMISE_TIMEOUT
    this.mid = 0  // promise message id 

    this.level = 0; // also defaultQuotaLevel
    this.quota = quotaTable[ this.level ];
    this.serverSet = {}

    this.linkMap = new Map()

    this.on('open',this.onOpen.bind(this))
    this.on('close',this.onClose.bind(this))
    this.on('socket_data',this.onData.bind(this))
    // this.on('auth_fail',this.onAuthFail.bind(this))
    // this.on('server_signal', this.onServerSignal.bind(this))
  }


  // onAuthFail(event, reason){
  // }

  // onServerSignal(event, data ){
  //   console.log('onServerSignal', event, data )
  // }
  
  redirect(url){
    this.url2 = url;
    this.url2closeCounter = SIZE_LIMIT.REDIRECTION_CLOSE;
    this.close()
  }

  open(url ) {
    if( !url && !this.url && !this.url2 ) return;
    if( url ){
        if( !this.url ){ // first connection
          this.url = url
        }else if( url !== this.url ){ // main server change
          this.url = url;
          if( this.socket ){
            this.close()
            return
          }
        }
    } 

    let _url
    if( this.url2 ){
      _url = this.url2
    }else if( this.url ){
      _url = this.url
    }
    
    this.createConnection( _url)
    if(!this.connectionCheckerIntervalID) this.connectionCheckerIntervalID = setInterval(this.keepAlive.bind(this), this.connectionCheckerPeriod);
  }

  onOpen( ){
    if( this.url.includes("wss://" )){
      this.TLS = true;
    }
    if(this.url2 ){
      this.url2closeCounter = SIZE_LIMIT.REDIRECTION_CLOSE;
    }
    this.stateChange('open' )
  }

  onClose(){
    this.boho.isAuthorized = false;
    this.cid = ""
    if(this.url2 ){
      if(this.url2closeCounter < 0  ){
        this.url2 = ""
      }else{
        this.url2closeCounter--;
      }
      // console.log('redirection close counter:', this.url2closeCounter)
    }
    this.stateChange('closed' )

    // console.log('-- remote is closed:')
  }

  // manual login
  login( id, key){
    if( !id && !key){
      console.log('no id and key.')
      return
    } 
    console.log('manual login: ', id)

    if( !key && id.includes('.') ){
      this.boho.set_id_key(id)
    }else if( id && key){
      this.boho.set_id8(id)
      this.boho.set_key(key)
    }else{
      console.log('no id or key.')
      return
    }
    this.useAuth = true
    let auth_pack = this.boho.auth_req()
    // console.log('auth_req_pack', auth_pack )
    this.send(auth_pack )
  }

  // auto login
  auth( id, key){
    if( !id && !key){
      console.log('no id and key.')
      return
    } 
    // console.log('set auto auth: ', id)

    if( !key && id.includes('.') ){
      this.boho.set_id_key(id)
    }else if( id && key){
      this.boho.set_id8(id)
      this.boho.set_key(key)
    }else{
      console.log('no id or key.')
      return
    }
    this.useAuth = true
  }

  onData( buffer ){
    // console.log('remote rcv socket_message', buffer )
    //check first byte (remote message type)
   let msgType = buffer[0];
   let decoded;

    if( msgType === BohoMsg.ENC_488 ){
      decoded = this.boho.decrypt_488( buffer )
      if( decoded ){
       //  console.log( decoded )
        msgType = decoded[0]
        buffer = decoded 
        // console.log('DECODED MsgType:', RemoteMsg[ msgType ] )
       }else{
         console.log('DEC_FAIL', buffer.byteLength)
       }
     }else if( msgType === BohoMsg.ENC_E2E ){
      // console.log('rcv ENC_E2E' )

      try{
        decoded = this.boho.decrypt_488( buffer )
        //헤더를 읽고 헤더크기만큼만 해석한다.
        if( decoded ){
          // console.log( 'ENC_E2E decoded ', decoded )
          msgType = decoded[0]
          // decoded has msg_header only. 
          buffer.set( decoded ,MetaSize.ENC_488) // set decoded signal_e2e headaer.
          buffer = buffer.subarray( MetaSize.ENC_488 ) // reset offset.
  // console.log('DECODED MsgType:', RemoteMsg[ msgType ] )
          }else{
            console.log('488 DEC_FAIL', buffer)
            return
          }

      }catch(err){
        console.log('E2E DEC_FAIL decryption error', err)
        return
      }

     }

    let type = RemoteMsg[ msgType ]
    if( !type ) type = BohoMsg[ msgType ] 

// console.log( "MsgType: ", type , " LEN ", buffer.byteLength)

   switch( msgType){
      case RemoteMsg.OVER_SIZE :
        console.log('## server sent: over_size event.')
        this.emit('over_size','over_size')
      break;
      case RemoteMsg.PING :
          this.pong();
      break;

      case RemoteMsg.PONG :
      break;

      case RemoteMsg.IAM_RES:
          try {
            let str = decoder.decode( buffer.subarray(1) )
            let jsonInfo = JSON.parse(str) 
            if( jsonInfo.ip ){
              this.ip = jsonInfo.ip;
            }
            console.log('<IAM_RES>', JSON.stringify(jsonInfo))
            // console.log('<IAM_RES>', JSON.stringify(jsonInfo,null,2))
          } catch (error) {
            console.log('<IAM_RES> data error')
          }
      break;

    case RemoteMsg.CID_RES :
      let cidStr = decoder.decode( buffer.subarray(1) )
      // console.log( '>> CID_RES: ' ,cidStr )
      this.cid = cidStr;
      this.stateChange('ready','cid_ready' ) 
      // change state before subscribe.
      this.subscribe_memory_channels()
      break;

    case RemoteMsg.QUOTA_LEVEL :
      let quotaLevel = buffer[1]
      console.log( '>> QUOTA_LEVEL : ' ,quotaLevel )
      this.level = quotaLevel;
      this.quota = quotaTable[ quotaLevel ];
      console.log('## current quota:', JSON.stringify(this.quota) )
      break;

    case RemoteMsg.SERVER_CLEAR_AUTH :
      this.useAuth = false;
      this.boho.clearAuth();
      this.stop();
      break;

    case RemoteMsg.SERVER_REDIRECT :
      console.log("SERVER_REDIRECT")
      console.log( buffer.toString('hex'))
      let host_port;
      if( buffer.byteLength == 7){ // ipv4 ,port
        console.log('ipv4,port')
        host_port = byteToUrl( buffer.subarray(1)) 
      }else{ // domain url
        console.log('domainURL')
        host_port = decoder.decode( buffer.subarray(1)) 
      }
      const protocol = 'ws://'
      let url = protocol + host_port
      console.log('url: ', url )
      this.redirect(url)
      break;

    case RemoteMsg.SERVER_READY :
      // console.log('>> SERVER_READY')
      this.stateChange('server_ready','server_ready' )
      if(this.useAuth){
        this.send( this.boho.auth_req() )
        // CID_REQ will be called, after auth_ack.
      }else{
        // CID_REQ here, if not using auth.
        this.send( Buffer.from([RemoteMsg.CID_REQ])  )
      }
      break;
    
    case RemoteMsg.SERVER_SIGNAL:
        try {
          let str = decoder.decode( buffer.subarray(1) )
          let ss = JSON.parse(str) 
          console.log('SERVER_SIGNAL', JSON.stringify(ss))

          if( ss.event && ss.data ){
            this.serverSet = ss.data;
            this.emit( ss.event , ss.data  )
          }
       
        } catch (error) {
          console.log('<SERVER_SIGNAL> parsing error')
        }
    break;

    case RemoteMsg.SET:
        try {
          let setPack = MBP.unpack(buffer)
          if(setPack ){
            console.log('[SET] topic: ',setPack.topic )
            this.emit( setPack.topic, ...setPack.args )
          }
        } catch (error) {
          console.log('<SET> parsing error')
        }
    break;

     case RemoteMsg.SIGNAL_E2E: 
     case RemoteMsg.SIGNAL: 
      try{
          let tagLen = buffer.readUint8(1)
          let tagBuf = buffer.subarray(2, 2 + tagLen )
          let tag = decoder.decode(tagBuf)

          let payloadType = buffer.readUint8( 2 + tagLen )
          let payloadBuffer = buffer.subarray( 3 + tagLen )
  
          /* three types of signal message.
            > unicast message to me:  tag includes @, no cid: '@*'
            > cid_sub message:  tag includes cid and @ both : 'cid@*'
            > ch_sub message:  else.
          */


          switch( payloadType ){

            case PAYLOAD_TYPE.EMPTY:  // 0
              if( tag.indexOf('@') === 0 )  this.emit( '@', null , tag)
                else this.emit( tag, null , tag )
              break;

            case PAYLOAD_TYPE.TEXT: // 1
            // !! Must remove null char before decode in JS.
            // string payload contains null char for the c/cpp devices.
              let payloadStringWithoutNull = payloadBuffer.subarray(0,payloadBuffer.byteLength - 1 )
              let oneString = decoder.decode( payloadStringWithoutNull )
              if( tag.indexOf('@') === 0 )  this.emit( '@', oneString , tag )
              if( tag !== '@') this.emit( tag, oneString , tag )
              break;
              
            case PAYLOAD_TYPE.BINARY: // 2
              if( tag.indexOf('@') === 0 ) this.emit( '@', payloadBuffer , tag  )
              if( tag !== '@') this.emit( tag, payloadBuffer , tag )
              break;

            case PAYLOAD_TYPE.OBJECT:
              let oneObjectBuffer = decoder.decode( payloadBuffer )
              let oneJSONObject = JSON.parse( oneObjectBuffer )
              if( tag.indexOf('@') === 0 ) this.emit( '@', oneJSONObject , tag  )
              if( tag !== '@') this.emit( tag, oneJSONObject , tag  )
                break;
                
            case PAYLOAD_TYPE.MJSON: 
              let mjsonBuffer = decoder.decode( payloadBuffer )
              // console.log('raw mjson tag', tag)
              // console.log('raw mjson', mjsonBuffer)
              let mjson = JSON.parse( mjsonBuffer )
              // console.log('parsed mjson', mjson)
              if( tag.indexOf('@') === 0 ) this.emit( '@', ...mjson , tag  )
              if( tag !== '@') this.emit( tag, ...mjson , tag  )
              break;

            case PAYLOAD_TYPE.MBA: 
              let mbaObject = MBP.unpack( buffer )
              if( tag.indexOf('@') === 0 ) this.emit( '@', ...mbaObject.args , tag  )
              if( tag !== '@') this.emit( tag, ...mbaObject.args , tag  )
              break;

            default:
              console.log('## Unkown payloadtype', payloadType)

          }


        }catch(err){
          console.log('## signal parse err',err)
        }
        break;


      
      case RemoteMsg.RESPONSE_MBP:
        this.testPromise( buffer)
        break;



      case BohoMsg.AUTH_NONCE:
        // console.log('auth_nonce', buffer )
        let auth_hmac = this.boho.auth_hmac( buffer )
        if(auth_hmac){
          this.send( auth_hmac )
        }else{
          this.stateChange('auth_fail', 'Invalid local auth_hmac.' )
          console.log('auth_fail', 'Invalid local auth_hmac.' )
        }
        break;
        case BohoMsg.AUTH_FAIL:
          this.stateChange('auth_fail','server reject auth.' )
          console.log('auth_fail', 'server reject auth.' )
          break;
          case BohoMsg.AUTH_ACK:
            if(this.boho.check_auth_ack_hmac( buffer ) ){
              // this.emit('authorized' );   
              this.stateChange('auth_ready','server sent auth_ack' )
              this.send( Buffer.from([RemoteMsg.CID_REQ ]) )
            }else{
              // this.emit('auth_fail','invalid server hmac')
              this.stateChange('auth_fail','invalid server_hmac' )
              console.log('auth_fail', 'Invalid server hmac.' )
        }
        break;
      
      default:
        try {
            decoded = decoder.decode( buffer )
            // console.log('text message:', decoded)
            this.emit('text_message', decoded)
        } catch (error) {
          
        } 

        break;

    }
  }

  iam( title ){
    // console.log('iam', title)
    if(title ){
      this.send_enc_mode(  MBP.pack( 
          MBP.MB('#MsgType','8', RemoteMsg.IAM ) , 
          MBP.MB('#', title )
        ))
    }else{
      this.send_enc_mode(  MBP.pack( 
          MBP.MB('#MsgType','8', RemoteMsg.IAM )
        ))
    }
  }


  ping(){
    this.send( Buffer.from( [ RemoteMsg.PING ]))
  }

  pong(){
    this.send( Buffer.from( [ RemoteMsg.PONG ]))
  }


  // application level ping tool.  
  // simple message sending and reply.
  echo( args ){
    if(args ){
      console.log( 'echo args:', args )
      this.send_enc_mode(  MBP.pack( 
        MBP.MB('#MsgType','8', RemoteMsg.ECHO ) , 
        MBP.MB('#msg', args )
      ))
    }else{
      // # do not encrypt blank echo #
      this.send( Buffer.from([ RemoteMsg.ECHO ]))
    }
  }


  bin(...data){
    this.send( MBP.U8pack( ...data) )
  }

  send( data ){
    if( data.byteLength > this.quota.signalSize ){
      this.emit('over_size')
      console.log('## QUOTA LIMIT OVER!! \nsignal message.byteLength: ', data.byteLength )
      console.log('## your maximum signalSize(bytes) is:', this.quota.signalSize )
      return
    }
    this.socket_send( data );
  }

  /*
   Policy. Should message do encrypt?

   if encMode == auto
     NO. if connection using TLS line.
        // ex. wss://url connection.
     YES. if no TLS line.
        // ex. ws://url connection.

   if encMode == YES
     YES. encrypt the message.

   if encMode == NO
     NO. do not ecnrypt message.

  */
  getEncryptionMode(){
    if( this.encMode === ENC_MODE.YES || 
      this.encMode === ENC_MODE.AUTO && 
      !this.TLS && this.boho.isAuthorized
      ){
        return true;
      }else{
        return false
      }
  }

  send_enc_mode( data ,useEncryption  ){
    
    // use default policy.
    if( useEncryption === undefined){
      useEncryption = this.getEncryptionMode()
    }
      
    if( data[0] == RemoteMsg.SIGNAL_E2E && useEncryption){
      // input data:  signal_header + e2ePayload
      // encrypt signal_header area only. payload is encrypted with e2e key already.
      let tagLen = data[1]
      let encHeader = this.boho.encrypt_488( data.subarray(0, 3 + tagLen))
      encHeader[0] = BohoMsg.ENC_E2E
      this.send( Buffer.concat([encHeader, data.subarray(3+tagLen) ]))
      // console.log('<< send_enc_mode [ ENC_E2E ]')
      
    }else if( useEncryption ){
      // console.log('<< send_enc_mode [ ENC_488 ]')
      let encPack = this.boho.encrypt_488( data ) 
      this.send( encPack )
    }else{
      // console.log('<< send_enc_mode  [ PLAIN ]' )
      this.send( data )
    }

  }

  
  setMsgPromise(mid ){
    return new Promise( (resolve, reject)=>{
      this.promiseMap.set( mid, [resolve, reject ] )
      // console.log('set promise.  mid, size', mid, this.promiseMap.size)
      setTimeout( e=>{ 
        if(this.promiseMap.has(mid )){
          reject('timeout');
          this.promiseMap.delete( mid )
          // console.log('promise timeout. mid, size:', mid, this.promiseMap.size)
        }
      }, this.promiseTimeOut);
    })
  }

  testPromise( buffer ){
    // console.log('mbp buffer : ', buffer , buffer.byteLength)
    // let mbp = ( buffer.byteLength > 4  ) ?  buffer.subarray(4) : ""

    let res = MBP.unpack(buffer)
    if( !res ) return
    // console.log( res )

    // console.log(`RESPONSE_MBP  MID: ${mid} status: ${status} ,mbp: ${ buffer.subarray(4)} `)

    if( this.promiseMap.has(res.mid)){
      // console.log('res promise msg', mid)
      let [ resolve, reject ] = this.promiseMap.get( res.mid )
      this.promiseMap.delete( res.mid )

      if(res.status < 128){
        res.ok = true;
        // console.log( 'unpack meta:', meta)
        resolve( res  )
      } else{
        res.ok = false ;
        reject ( res )
      } 

      
    }else{
      console.log('no promise id')
    }
  }


  publish( ...args ){
      this.signal( ...args )
  }


  parsePayload( args ){
    // console.log( 'parsePayload args', args )
    let type, pack;
    if( args.length == 0){
      type = PAYLOAD_TYPE.EMPTY 
      pack = null
    }else if( args.length == 1){
      if( typeof args[0] === 'string' || typeof args[0] === 'number'){
       type = PAYLOAD_TYPE.TEXT
       pack = encoder.encode( args[0] + ".") // add null area.
       pack[pack.byteLength - 1 ] = 0 // set null.

      }else if( ArrayBuffer.isView( args[0]) || args[0] instanceof ArrayBuffer ){  //one buffer
        type = PAYLOAD_TYPE.BINARY
        pack = MBP.B8( args[0 ] )
      }else if(typeof args[0] === 'object'){ 
        type = PAYLOAD_TYPE.OBJECT
        pack = encoder.encode( JSON.stringify( args[0]) )
      }else{
        //
        console.log('unknown type payload arguments')
      }
    }else{ // args 2 and more
      let containsBuffer = false
      args.forEach( item =>{
        if( ArrayBuffer.isView( item ) || item instanceof ArrayBuffer ) containsBuffer = true;
        // console.log('payload item', item )
      })

      if( containsBuffer ){
        type = PAYLOAD_TYPE.MBA;
        // pack 
      }else{
        type = PAYLOAD_TYPE.MJSON;
          // args is array
        pack = encoder.encode( JSON.stringify( args ) )
      }
      
    }
    
    return { type: type, buffer: pack }

  }  

  get_signal_pack( tag, ...args ){
    if( typeof tag !== 'string') throw TypeError('tag should be string.')
    let tagEncoded = encoder.encode( tag)
    let payload = this.parsePayload( args )

    let sigPack;
    if( payload.type == PAYLOAD_TYPE.EMPTY ){
      sigPack = MBP.pack( 
        MBP.MB('#MsgType','8', RemoteMsg.SIGNAL) , 
        MBP.MB('#tagLen','8', tagEncoded.byteLength),
        MBP.MB('#tag', tagEncoded),
        MBP.MB('#payloadType', '8', payload.type )
        )
    }else if( payload.type == PAYLOAD_TYPE.MBA ){
      sigPack = MBP.pack( 
        MBP.MB('#MsgType','8', RemoteMsg.SIGNAL) , 
        MBP.MB('#tagLen','8', tagEncoded.byteLength),
        MBP.MB('#tag', tagEncoded),
        MBP.MB('#payloadType', '8', payload.type ),
        MBP.MBA(...args)
        )
    }else {
      sigPack = MBP.pack( 
        MBP.MB('#MsgType','8', RemoteMsg.SIGNAL) , 
        MBP.MB('#tagLen','8', tagEncoded.byteLength),
        MBP.MB('#tag', tagEncoded),
        MBP.MB('#payloadType', '8', payload.type ),
        MBP.MB('#payload', payload.buffer )
        )
    }
    return sigPack
  }


  signal( tag , ...args ){
    if( typeof tag !== 'string') throw TypeError('tag should be string.')

    let signalPack = this.get_signal_pack(tag, ...args )
    this.send_enc_mode( signalPack )
  }

  decrypt_e2e( data, key ){
   return this.boho.decrypt_e2e( data, key )
  }

  signal_e2e( tag , data, key){

    if( typeof tag !== 'string') throw TypeError('tag should be string.')
    let tagEncoded = encoder.encode( tag)
    let dataPack = MBP.B8( data  )

    //encrypt payload area with key
    let sercretPack = this.boho.encrypt_e2e( dataPack, key )

    //change signal MsgType header into SIGNAL_E2E
    let signalPack = MBP.pack( 
      MBP.MB('#MsgType','8', RemoteMsg.SIGNAL_E2E) , 
      MBP.MB('#tagLen','8', tagEncoded.byteLength),
      MBP.MB('#tag', tagEncoded),
      MBP.MB('#payloadType', '8', PAYLOAD_TYPE.BINARY ),
      MBP.MB('#payload', sercretPack )
      )

    this.send_enc_mode( signalPack )
  }
    
    
  
  set( storeName, ...args ){
    if( !storeName || args.length == 0 ){
      return Promise.reject(new Error('set need storeName and value)'))
    } 
    return this.req('store', 'set', storeName, ...args )
  }
  
  async get( storeName ){
    if( !storeName ){
      return Promise.reject(new Error('store get need storeName)'))
    } 
    let pack = await this.req('store', 'get', storeName )
    let { $ } = MBP.unpack(pack.body)
    return $
  }
  
  
  req( target, topic, ...args ){
    // console.log('common_req args', args)
    if( !target || !topic) 
      return Promise.reject(new Error('request need target and topic)'))
    let sigPack;
    if(args.length > 0){
        sigPack = MBP.pack( 
        MBP.MB('#MsgType','8', RemoteMsg.REQUEST) ,
        MBP.MB('mid','16',++this.mid), 
        MBP.MB('target', target ), 
        MBP.MB('topic', topic ), 
        MBP.MBA(  ...args )
        )
    }else{
        sigPack = MBP.pack( 
        MBP.MB('#MsgType','8', RemoteMsg.REQUEST) ,
        MBP.MB('mid','16',++this.mid), 
        MBP.MB('target', target ), 
        MBP.MB('topic', topic )
        )
    }
    // console.log('<< adminPack', this.mid, sigPack)
    this.send_enc_mode(  sigPack  )
    return this.setMsgPromise( this.mid )
  }


  subscribe(tag ){
    if( typeof tag !== 'string') throw TypeError('tag should be string.')
    if( this.state !== STATES.READY ) return 

    let tagList = tag.split(',')
    tagList.forEach( tag=>{
      this.channels.add(tag)
    })

    let tagEncoded = encoder.encode( tag) 
    if( tagEncoded.byteLength > SIZE_LIMIT.TAG_LEN1 ) throw TypeError('please use tag string bytelength below:' + SIZE_LIMIT.TAG_LEN1 )

    this.send_enc_mode( 
      Buffer.concat( [
        MBP.NB('8',RemoteMsg.SUBSCRIBE),  
        MBP.NB('8', tagEncoded.byteLength), 
        tagEncoded ]) )
  }

  subscribe_promise(tag){
    if( typeof tag !== 'string') throw TypeError('tag should be string.')
    if( this.state !== STATES.READY ){
      console.log('not ready state:', this.state )
      return Promise.reject('subscribe_promise:: connection is not ready')
    }

    let tagEncoded = encoder.encode( tag) 
    if( tagEncoded.byteLength > SIZE_LIMIT.TAG_LEN2 ) throw TypeError('please use tag string bytelength: ' + SIZE_LIMIT.TAG_LEN2)

    this.send_enc_mode( 
      Buffer.concat( [
        MBP.NB('8',RemoteMsg.SUBSCRIBE_REQ),  
        MBP.NB('16', ++this.mid), 
        MBP.NB('16', tagEncoded.byteLength), 
        tagEncoded ]) )
    return this.setMsgPromise( this.mid )
  }

  subscribe_memory_channels( ){ //local cache . auto_resubscribe
    if(this.channels.size == 0) return
    let chList = Array.from( this.channels).join(',')
    // console.log('<< subscibe memory channels by cid', chList , this.cid )

    this.subscribe_promise( chList)
    .then( (res )=>{ 
      // console.log('>> SUBSCRIBE_REQ result', res ) // return code == map.size
    }).catch( (e)=>{
      console.log('>> SUBSCRIBE FAIL:', e)
    }) 

  }

  unsubscribe(tag = ""){
    // console.log('unsub', tag)
    if( typeof tag !== 'string') throw TypeError('tag should be string.')
    
    if(tag == ""){
      // console.log('unsub all')
      this.channels.clear();
    }else{
      let tagList = tag.split(',')
      tagList.forEach( tag=>{
        this.channels.delete(tag)
      })
    }

    let tagEncoded = encoder.encode( tag) 
    if( tagEncoded.byteLength > SIZE_LIMIT.TAG_LEN1 ) throw TypeError('please use tag string bytelength below:' + SIZE_LIMIT.TAG_LEN1 )

    this.send_enc_mode( Buffer.concat( [
      MBP.NB('8',RemoteMsg.UNSUBSCRIBE),  
      MBP.NB('8', tagEncoded.byteLength), 
      tagEncoded ]) )
  }


  listen(tag , handler){
    if( typeof tag !== 'string') throw TypeError('tag should be string.')
    if( tag.length > 255 || tag.length == 0 ) throw TypeError('tag string length range: 1~255')
    if( typeof handler !== 'function') throw TypeError('handler is not a function.')
    
    if( tag.indexOf('@') !== 0){
      this.channels.add(tag) 
    }
    // console.log('channels:', this.channels )
    this.on( tag , handler)
    // do not subscribe now.
    // will subscribe when receive CID_RES signal from server.
  
  }



  link( to , tag , handler){
    if( typeof to !== 'string') throw TypeError('to(local link target) is not a string.')
    if( typeof tag !== 'string') throw TypeError('tag is not a string.')
    if( tag.length > 255 || tag.length == 0 ) throw TypeError('tag string length range: 1~255')
    if( typeof handler !== 'function') throw TypeError('handler is not a function.')
    
    if( tag.indexOf('@') !== 0){
      this.channels.add(tag) 
    }
    
    let linkSet;
    if( this.linkMap.has(to) ){
      linkSet = this.linkMap.get(to)
    }else {
      linkSet = new Set()
    }
    
    linkSet.add(tag )
    this.linkMap.set( to, linkSet)
    this.on( tag , handler)
    this.subscribe( tag )
    // console.log('link [to] linkMap:', to, this.linkMap )
  
  }
  

  unlink( to, tag){
    if( typeof to !== 'string') throw TypeError('to(local link target) is not a string.')
    if( typeof tag !== 'string') throw TypeError('tag is not a string.')
    if( tag.length > 255 || tag.length == 0 ) throw TypeError('tag string length range: 1~255')
    
    if( !this.linkMap.has( to ) ) return;

    let linkSet = this.linkMap.get(to)
    let tags = Array.from(linkSet)
    for(let i=0; i< tags.length; i++){
      if( tags[i] == tag ){
        this.unsubscribe( tag )
        this.removeAllListeners(tag)
        linkSet.delete(tag)
        this.linkMap.set( to , linkSet)
        break;
      }
    }

    // console.log('unlink linkMap result:', this.linkMap )
  }

  unlinkAll( to){
    if( typeof to !== 'string') throw TypeError('to(local link target) is not a string.')
    if( !this.linkMap.has( to ) ) return;

    let linkSet = this.linkMap.get(to)
    let tags =  Array.from(linkSet)
    for(let i=0; i< tags.length; i++){
        this.unsubscribe( tags[i] )
        this.removeAllListeners(tags[i])
        linkSet.delete(tags[i])
    }
    this.linkMap.delete( to )

    // console.log('unlinkAll linkMap result:', this.linkMap )
  }



  getMetric(){
    return { 
      tx: this.txCounter, 
      rx: this.rxCounter, 
      txb: this.txBytes, 
      rxb: this.rxBytes,
      last: ( Date.now() - this.lastTxRxTime) / 1000
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
    return ( STATES[ this.state ]).toLowerCase()
  }

  getSecurity(){
    return {
      useAuth: this.useAuth,
      isTLS: this.TLS, 
      isAuthorized: this.boho.isAuthorized,
      encMode: this.encMode,
      usingEncryption: this.getEncryptionMode()
    }
  }

  stateChange(state, emitEventAndMessage ){
    // STATES constant name : string upperCase
    // eventName, .stateName : string lowerCase
    // .state : number
    let eventName = state.toLowerCase()
    this.state = STATES[ state.toUpperCase() ] // state: number
    if(emitEventAndMessage) this.emit(eventName, emitEventAndMessage)
    
    if( this.stateName !== eventName ){
      // console.log(`change: ${this.stateName} => ${eventName}` )
      this.emit('change', eventName)
      this.stateName = eventName
    } 
  }
 
}




