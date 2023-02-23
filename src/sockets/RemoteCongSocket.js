import { RemoteCore } from "./RemoteCore.js"
import { CongTxSync, CongRx } from './CongPacket.js'
import net from'net'


export class RemoteCongSocket extends RemoteCore{
  constructor( url  ) {
    super( url );
    if(url) this.connect();
  }

  runChecker() {
    let state = this.socket?.readyState;
    if ( !this.socket || !(state === 'open' || state === 'opening')  ) {
      this.connect();
    } 
  }

  close() {
    this.socket?.end();
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
        this.socket?.end();
        this.socket = null; 
        return;
      }
    }

    if(!this.runCheckIntervalID) this.runCheckIntervalID = setInterval(this.runChecker.bind(this), this.runCheckPeriod);
 
   
    // TCP Socket
      let urlObj = new URL( this.serverURL )
      // console.log('connect port, url',urlObj.port,  urlObj.hostname )
      this.socket = net.createConnection( urlObj.port,  urlObj.hostname )
      this.stateChange('opening')

      this.socket.on('connect' , e=>{
        // console.log('cong connected' )
        this.congRx = new CongRx();
        this.socket.pipe( this.congRx )
        this.congRx.on("data", this.onTCPSocketMessage.bind(this));
        this.emit('open') 
      })

      this.socket.on('error', e=>{ 
        this.emit('error', e)
      })

      this.socket.on('close', e=>{ 
        this.emit('close');
      })
  
  } //end connect 

  onTCPSocketMessage( data ) {
    this.rxCounter++;
    this.rxBytes += data.byteLength
    this.lastTxRxTime = Date.now();
    // console.log('>> congRx data.len:', data.byteLength )
    // console.log('>> cong.rxi, rxi_zero:', this.congRx.rxi, this.congRx.rxi_zero )
    this.emit('socket_data', data  );
    
  }

  socket_send(data) {  
    if( this.socket?.readyState === 'open'){
      // console.log('tcp send raw payload:', data)
      let packData = CongTxSync(data);
      // console.log('tcp send cong packed:', packData)
      this.socket.write( packData )
      this.txCounter++;
      this.txBytes += packData.byteLength;
      this.lastTxRxTime = Date.now();
    }else{
      console.log('send()::socket not open')
    }
  }
 
}




