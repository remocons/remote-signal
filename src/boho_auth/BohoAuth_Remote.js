
/**
 * BohoAuth_Remote
 * multiple protocol support.  ws, wss, cong
 */

import { BohoAuthCore } from './BohoAuthCore.js';
import { RemoteWS } from '../client/RemoteWS.js';
import { RemoteCongSocket } from '../client/RemoteCongSocket.js';
import path from 'path'

const DEVICE_PREFIX = "device:"
let remote;

export class BohoAuth_Remote extends BohoAuthCore {
  constructor( filePath  ){
    super()
    
    if( !filePath ){
      throw new Error("BohoAuth_Remote constructor: no auth-remote server credential file path.")
    }
    
    this.path = path.resolve(filePath)
    this.getAuthServerKey( this.path )
  }

  // get device key from Remote server.
  async getAuth( did ){
    let result = await remote.req( 'redis', 'hGetAll', DEVICE_PREFIX + did)
    console.log('getAuth result', result)
    if( result.ok && result.body.key ){
        return result.body
    }
  }


  async getAuthServerKey(path){ 
    let r;
    try {
      r = await import( path );
      console.log('connecting to the remote auth server: ', r.url )


      if( r.url && r.id_key ){

        if( r.url.indexOf('ws') == 0 ){
          remote = new RemoteWS()
        }else if( r.url.indexOf('cong') == 0 ){
          remote = new RemoteCongSocket()
        }else{
          throw TypeError('BohoAuth_Remote: wrong server url. available protcols: ws, wss or cong')
        }

        remote.on('error',e=>{
          console.log(e)
        })
        remote.on('auth_fail',e=>{
          console.log(e)
        })
        remote.on('close',e=>{
          console.log(e)
        })

        remote.open( r.url )
        remote.auth( r.id_key )
      }
      
    } catch (error) {
        console.log('BohoAuth_Remote Error', error)
    } 

  }


}

