/**
 * BohoAuth_Env
 * 
 * use env BOHO_AUTH=id1.key1.level:id2:key2.level
 */
import { BohoAuthCore } from './BohoAuthCore.js';
import { sha256 } from 'boho'

export class BohoAuth_Env extends BohoAuthCore{
  constructor(){
    super()
    this.AUTH = new Map();
    if(!process.env.BOHO_AUTH){
      // console.log('env',process.env)
      console.log("NO process.env.BOHO_AUTH authentication value.")
      process.exit()
    }


    let id_keys = process.env.BOHO_AUTH.split(':')

    if( id_keys.length >= 1 ){
      id_keys.forEach( v=>{
        
        let id = v.split('.')[0]
        let key = v.split('.')[1]
        let level = v.split('.')[2]
    
        if( id && key && level){
          this.addAuth( id, key , id , level )
        }else{
          console.log("Wrong process.env.BOHO_AUTH authentication value.")
          process.exit();

        }
      })
      
    }else{
      console.log("Wrong process.env.BOHO_AUTH authentication value.")
      process.exit();
    }

  }


  async getAuth( id ){
    return this.AUTH.get( id )
  }


  addAuth( id, keyStr , cid , level = 0){
    let Base64hashKey = Buffer.from( sha256.hash(keyStr)).toString('base64')
    this.AUTH.set( id, { key: Base64hashKey, cid: cid, level: level } )
  }



}

