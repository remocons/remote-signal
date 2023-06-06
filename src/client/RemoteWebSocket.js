import { RemoteCore } from "./RemoteCore.js";
import { Buffer } from 'meta-buffer-pack'
export { Boho, RAND, BohoMsg, Meta, MetaSize , sha256, MBP, Buffer } from 'boho'

// using Browser WebSocket
export class Remote extends RemoteCore{
  constructor(url  ) {
    super(url);
    document.addEventListener('visibilitychange', this.browserVisiblePing.bind(this));
    if(url) this.connect();
  }

  browserVisiblePing(){
    if (document.visibilityState === 'visible') {
      console.log('[Remote connection check] visibilityState is visible.')
      this.ping()
    }
  }

  runChecker() {
    if ( !this.socket || this.socket?.readyState === 3 ) { //closed
      this.connect();
    }
  }

  close() {
    this.socket?.close();
    this.socket = null;
    clearInterval(this.runCheckIntervalID);
    this.runCheckIntervalID = null
  }

  open(url){
    this.connect(url)
  }


  connect(url) {
    if( !url && !this.serverURL ) return;
    if( url && !this.serverURL ){ // first connection
      this.serverURL = url;
    }else if( url && url !== this.serverURL ){
      // server url changed
      this.serverURL = url;
      if( this.socket ){
        // if old socket still remain: close socket and return.
        // runChecker is running. see u next runchecker time.
        // console.log("## remote change server.")
        this.socket?.close();
        this.socket = null; 
        return;
      }
    }

    if(!this.runCheckIntervalID) this.runCheckIntervalID = setInterval(this.runChecker.bind(this), this.runCheckPeriod);
 
    // Web Browser WebSocket
      this.socket = new WebSocket (this.serverURL );
      this.stateChange('opening')
  
      this.socket.binaryType = "arraybuffer"
      this.socket.onopen = (e) => {
        this.socket.onmessage = this.onWebSocketMessage.bind(this) ;
        this.emit('open' );
      };

      this.socket.onerror = (e)=>{ 
        this.emit('error', e)
      }

      this.socket.onclose = (e)=>{ 
        this.emit('close' );
      }
  
  } //end connect 

  onWebSocketMessage( event ) {
    this.rxCounter++;
    this.lastTxRxTime = Date.now();
    let buffer;

    // if( event.data instanceof ArrayBuffer ){
    //   //binary frame
    // }else{
    //   //text frame
    // }
    buffer = Buffer.from( event.data )
    this.rxBytes += buffer.byteLength

    this.emit('socket_data', buffer  );
  }

  socket_send(data) {  
    if( this.socket?.readyState === 1 ){ //open
      // console.log('websocket send', data)
      this.socket.send( data )
      this.txCounter++;
      this.txBytes += data.byteLength
      this.lastTxRxTime = Date.now();
    }else{
      console.log('-- send()::socket not open')
    }
  }
 
}

