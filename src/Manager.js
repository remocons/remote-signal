import { MBP} from 'meta-buffer-pack'
import { ServerRemote } from './ServerRemote.js'
import { serverOption  } from './serverOption.js'
import { RemoteMsg, PAYLOAD_TYPE, CLIENT_STATE  } from './constants.js'
import { FileLogger } from './FileLogger.js'
import { Metric } from './Metric.js'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export class Manager {

  constructor ( authManager ) {
    this.txBytes = 0;
    this.rxBytes = 0;
    
    this.authManager = authManager; 
    // TIP. authManager module is option.
    // if exist: used by ServerRemoteCore for the auth. process.
    
    if( serverOption.useLogger ){
      this.logger = new FileLogger('manager.log')
      console.log('manager logger', this.logger )
    }

    // this.privateChannelName =  webcrypto.getRandomValues( Buffer.alloc(15) ).toString('base64') 
    // this.publicIPChannelBaseName = webcrypto.getRandomValues( Buffer.alloc(15) ).toString('base64') 

    this.remotes = new Set(); // total ServerRemotes
    this.channel_map = new Map()  //  key: channelName  value: < ServerRemote : Set >
    this.CHANNEL_PREFIX = 'CH:'
    this.cid_map = new Map(); //  map:[ key:cid -> value:client ]
    this.retain_messages = new Map() // key: tag, data: signalMessage
    this.metric = new Metric( this )

    this.lastSSID = 0;

    this.pingIntervalID = setInterval( e=>{
      this.remotes.forEach(function each(remo) {
        let socket = remo.socket;
        if (socket.isAlive === false){
          // console.log('## timeout.')
          if( remo.socketType === 'websocket' ){
            socket.terminate();
          } else {
            socket.end();
          } 
        } 

          socket.txCounter++;
          socket.isAlive = false;
          if( remo.socketType === 'websocket' ){
            socket.ping();
          }else{
            remo.ping()
          }
          // console.log('<< PING')
      });
    }, serverOption.timeout );


    this.monitIntervalID = setInterval((e) => {
      if ( serverOption.showMetric ) {
        this.monitor()
      }
    }, serverOption.monitorPeriod);

  }


  addClient (socket, req) {
      socket.isAlive = true;
      let client =  new ServerRemote(socket, req, this) 
      this.remotes.add(client )
      client.send( Buffer.from([RemoteMsg.SERVER_READY  ]) )
      client.setState( CLIENT_STATE.SENT_SERVER_READY )
      this.lastSSID = client.ssid;
      let connectionInfo =  `### add SSID:${client.ssid} ${ socket.socketType === 'websocket' ? "WS" : "CS" } ${client.ip}`;
      // console.log( connectionInfo)
      if(this.logger) this.logger.log( connectionInfo)
  };


  noticCloseSignalToCIdSubscribers(){

  }

  removeClient ( client) {
    console.log('#### manager.removeClient()', client.cid  )
    this.deligateSignal( client, '@state', 'close')
    this.deligateSignal( client, '@$state', 'close')

    for( let ch of client.channels.keys( )){
      if (this.channel_map.has(ch)) {
        const clients = this.channel_map.get(ch)
        // console.log(`-- channel [ ${ch} ] removes client id: ${client.cid} `)
        clients.delete(client)
        if(clients.size == 0 ) this.channel_map.delete( ch )
      }
    }

    this.remotes.delete( client )
    this.cid_map.delete( client.cid )

    client = null
 }



  serverSignal( obj ){
    // obj.event  obj.data
    console.log('server signal', obj )
    let sigPack = MBP.pack(
      MBP.MB('#MsgType','8', RemoteMsg.SERVER_SIGNAL) , 
      MBP.MB('#signalObject', obj)
    )

    this.remotes.forEach( remote=>{
      remote.send_enc_mode( sigPack )
    })
  }

  getSignalTag( buffer){
    let tagLen = buffer.readUint8(1)
    let tagBuf = buffer.subarray(2, 2 + tagLen )
    let tag = decoder.decode(tagBuf)
    return tag
  }

  getNewSignalTagMessage( buffer, newTag){
    let msgType = buffer[0]
    let tagLen = buffer.readUint8(1)
    let newTagBuf = encoder.encode( newTag )
    let newTagLen = newTagBuf.byteLength;
    let payloadCunk = buffer.subarray(2 + tagLen)
    let newBuffer = Buffer.concat([ Buffer.from([ msgType, newTagLen]), newTagBuf, payloadCunk ])
    return newBuffer
  }

  saveSignalMessage( tag, buffer ){
    this.retain_messages.set( tag, buffer )
    console.log('## total retain messages:', this.retain_messages.size )
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

  get_signal_pack( target, ...args ){
    if( typeof target !== 'string') throw TypeError('target should be string.')
    let targetEncoded = encoder.encode( target)
    let payload = this.parsePayload( args )

    let sigPack;
    if( payload.type == PAYLOAD_TYPE.EMPTY ){
      sigPack = MBP.pack( 
        MBP.MB('#MsgType','8', RemoteMsg.SIGNAL) , 
        MBP.MB('#targetLen','8', targetEncoded.byteLength),
        MBP.MB('#target', targetEncoded),
        MBP.MB('#payloadType', '8', payload.type )
        )
    }else if( payload.type == PAYLOAD_TYPE.MBA ){
      sigPack = MBP.pack( 
        MBP.MB('#MsgType','8', RemoteMsg.SIGNAL) , 
        MBP.MB('#targetLen','8', targetEncoded.byteLength),
        MBP.MB('#target', targetEncoded),
        MBP.MB('#payloadType', '8', payload.type ),
        MBP.MBA(...args)
        )
    }else {
      sigPack = MBP.pack( 
        MBP.MB('#MsgType','8', RemoteMsg.SIGNAL) , 
        MBP.MB('#targetLen','8', targetEncoded.byteLength),
        MBP.MB('#target', targetEncoded),
        MBP.MB('#payloadType', '8', payload.type ),
        MBP.MB('#payload', payload.buffer )
        )
    }
    return sigPack
  }


  // signaling to the cid subscribers.
  // example.  sending cid close signal.
  deligateSignal( client , tag, ...args  ){
    let sigPack = this.get_signal_pack( tag, ...args )
    this.sender(tag, client , sigPack )
  }

  sender( tag , client, message){
    // console.log('-- sender tag:', tag )

    /* three types of signal message.
     tag
     'cid@?':  unicast to the cid.
      > find cid
      > remove cid from tag.
      > send to the_cid.
     '@?' : cid publish.  
      > server modify tag: append sender.cid
     'ch' : publish to the ch.
    */

    let cidIndex = tag.indexOf('@');
    if(cidIndex === 0){
      // [cid_pub] append the sender.cid
      // console.log('cid_pub origin tag:', tag)
      tag = client.cid + tag
      message = this.getNewSignalTagMessage( message, tag )
      // console.log('cid_pub new tag:', tag, this.getSignalTag(message ))
    }else if( cidIndex > 0){
      // console.log('unicast to:', tag)
      let targetCId = tag.split('@')[0];
      if( this.cid_map.has( targetCId ) ){
        //rm cid from tag.
        let ommitCIdTag = '@'+ tag.split('@')[1]
        message = this.getNewSignalTagMessage( message, ommitCIdTag)
        // console.log(`origin tag: ${tag} omitTag: ${this.getSignalTag(message)}`)
        this.cid_map.get( targetCId ).send_enc_mode( message )
        return [ 'ok', 1 ]
      }
      return [ 'err', 'Invalid cid' ]
      // pub message from cid. 
      // you already subscribe the cid.  
    }else{
      // console.log('ch_pub tag:', tag)
      //else channel publish message
    }


    /**
     *  multicast: channel_publish and cid_publish
     */

    // HOME_CHANNEL substitution.
    // (blank)#topic  ->  home_channel#topic. 
    if(tag.indexOf('#') === 0 ){
      tag = client.HOME_CHANNEL + tag;
      // signal payload's tag will not changed.
    }else{
      tag = this.CHANNEL_PREFIX + tag;
    }

    if( tag.includes('$') 
      && serverOption.retain.isAvailable 
      && serverOption.retain.limitCounter > this.retain_messages.size
      && serverOption.retain.limitSize > message.byteLength
    ){
      this.saveSignalMessage(tag, message )
    }else{
      // console.log('no retain. serverOption.retain:', serverOption.retain )
    }

    let sentCounter = 0;
      if (this.channel_map.has(tag)) {
        // console.log('raw channel_map matched tag:', tag)
        let clients = this.channel_map.get(tag);
        if(clients.size >= 1){
          let limit;
          if( serverOption.useQuota.publishCounter ){
            limit = Math.min( client.quota.publishCounter , clients.size )
          }else{
            limit = clients.size;
          }
          let peers = clients.values();
          while( sentCounter < limit ){
            let c = peers.next().value
            if( !c ){
              // console.log('## null client' )
              break;
            } 
            if( c !== client ){
              c.send_enc_mode( message );
              sentCounter++;
            }
          }
  
          if(serverOption.useQuota.publishCounter){
            // console.log(`pub >> [${tag}] sent: ${sentCounter} [use quota limit: ${client.quota.publishCounter }] total: ${clients.size} subscribers. ` )
          }else{
            // console.log(`pub >> [${tag}] sent: ${sentCounter} [no quota limit] total: ${clients.size} subscribers. ` )
          }
          return [ 'ok', sentCounter ]
        }
      }
      // console.log('-- No subscriber. ch: ' , tag )
      return [ 'err', 'No subscriber.' ]
  }


  // getPrivateChannel( client ){
  //   return "P:" + this.privateChannelName;
  // }

  // getGlobalIPChannel( client ){
  //   return "G:" + client.ip + this.publicIPChannelBaseName 
  // }


  subscribe(chArr, client ){
    // console.log('ChannelManager:: subscribe: ',chArr)
    chArr.forEach(tag=>{
      if(tag.indexOf('#') === 0){
        tag = client.HOME_CHANNEL + tag
      }else{
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
      client.channels.add( tag )
      // console.log('client.channels set.', client.channels  )
  
      // 3. send retain message if available.
      if( tag.includes('$') 
        && serverOption.retain.isAvailable 
        && this.retain_messages.has(tag)
      ){
        let retainMessage = this.retain_messages.get(tag)
        // console.log('send retainMessage buffer',retainMessage)
        client.send_enc_mode( retainMessage )
      }else{
        // console.log('no retain message' )
      }

    } )
    return client.channels.size;
  }

  unsubscribe(chArr, client) {
      //unsubscribe all channels of the client.
      if(chArr.length == 1 && chArr[0] == ""){

        client.channels.forEach( ch=>{
          if( this.channel_map.has(ch ) ){
            let clients = this.channel_map.get( ch )
            clients.delete(client)
            if(clients.size == 0 ) this.channel_map.delete( ch )
          }
        })
        client.channels.clear();

      }else{
        // unsubscribe each channels.
        chArr.forEach(ch=>{
          // substitution home_channel
          if(ch.indexOf('#') === 0 ){
            ch = client.HOME_CHANNEL + ch;
          }else{
            ch = this.CHANNEL_PREFIX + ch;
          }
          // console.log('-- Manager::unsubscribe:', ch )
    
          // delete manager map.
          if( this.channel_map.has(ch ) ){
            let clients = this.channel_map.get( ch )
            clients.delete(client)
            if(clients.size == 0 ) this.channel_map.delete( ch )
          }else{
            // console.log('##no such a ch', ch )
          }
          client.channels.delete( ch )
        })
      }
    
    // console.log( '-- result unsub:', client.channels )

  }


  monitor() {
    if( process.stdout.isTTY ){            
      process.stdout.cursorTo(0,0)
      process.stdout.clearScreenDown()
    }
    
    if (serverOption.showChannel > 0){
      this.metric.channels( serverOption.showChannel );
    }
    let mode  = parseInt( serverOption.showMetric )
    console.log('monitor metric type:', mode )
    switch (mode){
      case 1:
        this.metric.oneline(true);
        break;
      case 2:
        this.metric.getCIdList(true);
        break;
      case 3:
        this.metric.getChannelList(true);
        break;
      default:
    }

  }


  closeRemoteByCId( cid ){
    if(this.cid_map.get(cid ) ){
      this.cid_map.get(cid ).close()
      return 1
    }else{
      return 0
    }
  }


  async adminRequest(  adminClient, message){
    // console.log('=== adminPack message', message)
    let msgId;
    let req;
    let result;  
    try {
      
      msgId = message.readUInt16BE(1) 
      req = MBP.unpack(message)
      // console.log('adminRequest unpack req:',req )

      if( !req){
        result = "wrong req mbp"
        adminClient.response(  msgId, 255 )
        return
      }

      
      if( req.$[0] == 'cid'){
        result = this.metric.getCIdList()
      }else if( req.$[0] == 'channels'){
        result = this.metric.getChannelList()
      }else if( req.$[0] == 'subscribers'){
        let ch = req.$[1]
        if( ch ) result = this.metric.getSubscribers(ch )

      }else if( req.$[0] == 'remote'){
        let cid = req.$[1]
        let mode = req.$[2]
        if( cid ) result = this.metric.getClientByCId(cid , mode )

      }else if( req.$[0] == 'close'){
        if(req.$[1] ) result = this.closeRemoteByCId( req.$[1] )
      
      }else if( req.$[0] == 'addauth'){
        if(this.authManager && req.$.length == 5 ){
          if(this.authManager.addAuth){
            let did = req.$[1]
            let dkey = req.$[2]
            let cid = req.$[3]
            let level = req.$[4]
            result = await this.authManager.addAuth( did,dkey,cid,level )
          }

        } 
      }else if( req.$[0] == 'delauth'){
        if(this.authManager && req.$.length == 2 ){
          if(this.authManager.delAuth){
            let did = req.$[1]
            result = await this.authManager.delAuth( did  )
          }
        } 
      }else if( req.$[0] == 'getauth'){
        if(this.authManager && req.$.length == 2 ){
          if(this.authManager.getAuth){
            let did = req.$[1]
            result = await this.authManager.getAuth( did  )
          }
        } 
      }
      
      let code = 0;
      // console.log('adminRequest: result', result)

      if(!result) result = "nop"
      let mbp = MBP.pack( MBP.MB('result', result));
      adminClient.response(  msgId, code , mbp  )

    } catch (error) {
      // console.log('adminRequest err:',error)
      adminClient.response(  msgId, 255 )
    }
    


  }

  
}
