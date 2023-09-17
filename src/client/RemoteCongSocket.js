import { RemoteCore } from "./RemoteCore.js"
import { CongTxSync, CongRx } from './CongPacket.js'
import net from'net'


export class RemoteCongSocket extends RemoteCore{
  constructor( url  ) {
    super( url );
    if(url) this.open();
  }

  close() {
    this.socket?.end();
    this.socket = null;
  }

  stop() {
    this.close()
    clearInterval(this.connectionCheckerIntervalID);
    this.connectionCheckerIntervalID = null
  }
  
  keepAlive() {
    let state = this.socket?.readyState;
    if ( !this.socket || !(state === 'open' || state === 'opening')  ) {
      this.open();
    } 
  }


  createConnection(url){
    // TCP Socket
    let urlObj = new URL( url )
    // console.log('connect port, url',urlObj.port,  urlObj.hostname )
    this.socket = net.createConnection( urlObj.port,  urlObj.hostname )
    this.stateChange('opening')

    this.socket.on('connect' , ()=>{
      // console.log('cong connected' )
      this.congRx = new CongRx();
      this.socket.pipe( this.congRx )
      this.congRx.on("data", this.onTCPSocketMessage.bind(this));
      this.emit('open') 
    })

    this.socket.on('error', e=>{ 
      this.emit('error', e)
    })

    this.socket.on('close', ()=>{ 
      this.emit('close');
    })

  }

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




