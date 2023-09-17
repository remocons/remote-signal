
/**
 * BohoAuth_Remote
 */

import { BohoAuthCore } from '../boho_auth/BohoAuthCore.js';
import { RemoteWS as Remote } from '../client/RemoteWS.js'
import path from 'path'

const DEVICE_PREFIX = "device:"

export class BohoAuth_Remote extends BohoAuthCore {
  constructor( filePath  ){
    super()
    
    if( !filePath ){
      throw new Error("BohoAuth_Remote constructor: no remote client")
    }
    
    this.path = path.resolve(filePath)
    this.remote = new Remote()
    this.remote.on('error',e=>{
      console.log(e)
    })
    this.remote.on('auth_fail',e=>{
      console.log(e)
    })
    this.remote.on('close',e=>{
      console.log(e)
    })
    this.getAuthServerKey( this.path )
  }

  // get device key from Remote server.
  async getAuth( did ){
    let result = await this.remote.req( 'redis', 'hGetAll', DEVICE_PREFIX + did)
    console.log('getAuth result', result)
    if( result.ok && result.body.key ){
        return result.body
    }
  }


  async getAuthServerKey(path){ 
    let r;
    try {
      r = await import( path );
      console.log('import server auth key', r )
      if( r.url && r.id_key ){
        this.remote.open( r.url )
        this.remote.auth( r.id_key )
      }
      
    } catch (error) {
        console.log(error)
    } 

  }


}

