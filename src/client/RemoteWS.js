import { RemoteCore } from "./RemoteCore.js";
import { WebSocket } from "ws";

//  Node.js 'ws' websocket
export class RemoteWS extends RemoteCore{
  constructor(url  ) {
    super(url);
    if(url) this.open();
  }

  

  close() {
    if(this.socket ){
      this.socket.onclose = null
      this.socket.onmessage = null
      this.socket.onerror = null
      this.socket.close();
      this.socket = null;
    }
    this.emit('close')
  }



  stop() {
    this.close()
    clearInterval(this.connectionCheckerIntervalID);
    this.connectionCheckerIntervalID = null
  }
  
  keepAlive() {
    if ( !this.socket || this.socket?.readyState === 3 ) { //closed
      this.open();
    }
  }


  createConnection(url){
    // node WebSocket
    this.socket = new WebSocket ( url );
    this.stateChange('opening')

    this.socket.onopen = () => {
      this.socket.on('message', this.onWebSocketMessage.bind(this) );
      this.emit('open' );
    };

    this.socket.onerror = (e)=>{ 
      this.emit('error', e)
    }

    this.socket.onclose = ()=>{ 
      this.emit('close' );
    }
  }

  onWebSocketMessage( data  ) {
    this.rxCounter++;
    this.lastTxRxTime = Date.now();
    this.rxBytes += data.byteLength
    this.emit('socket_data', data  );
  }

  socket_send(data) {  
    if( this.socket?.readyState === 1 ){ //open
      // console.log('websocket send', data)
      this.socket.send( data )
      this.txCounter++;
      this.txBytes += data.byteLength
      this.lastTxRxTime = Date.now();
    }else{
      console.log('')
    }
  }
 
}




