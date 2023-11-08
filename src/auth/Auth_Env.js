/**
 * Auth_Env.js
 * 
 * You can use environment variable BOHO_AUTH.
 * 
 *  BOHO_AUTH=id1.key1.level,id2:key2.level 
 * 
 *  or constructor parameter.
 * 
 * 
 * [ authInfo ]
 *  id: <String> max 8chars
 *  key: <String>
 *  level: <Numbrer> range: 0~255
 *  separator: ','
 * 
 * example => process.env.BOHO_AUTH=id1.key1.255,id2.key2.200
 */

import { AuthCore } from './AuthCore.js';
import { sha256 } from 'boho'

export class Auth_Env extends AuthCore {
  constructor( authInfo) {
    super()
    let id_keys;
    if( authInfo ){
      id_keys = authInfo.split(',')
    }else if ( process.env.BOHO_AUTH) {
      authInfo = process.env.BOHO_AUTH
      id_keys = process.env.BOHO_AUTH.split(',')
    }else{
      console.log("Auth_Env: None of process.env.BOHO_AUTH or authInfo")
      process.exit()
    }
    
    this.AUTH = new Map();

    if (id_keys.length >= 1) {
      id_keys.forEach(v => {

        let did = v.split('.')[0]
        let key = v.split('.')[1]
        let level = v.split('.')[2]
        level = parseInt(level)

        // console.log('typeof level', level, typeof level)

        if (did && key && typeof level =='number') {
          let cid = did;
          this.addAuth(did, key, cid, level)
        } else {
          console.log("Wrong process.env.BOHO_AUTH authentication value.", id, key, level)
          process.exit();
        }
      })

    } else {
      console.log("Wrong process.env.BOHO_AUTH authentication value.")
      process.exit();
    }

  }

  async getAuth(id) {
    return this.AUTH.get(id)
  }
  async getAuthIdList() {
    return Array.from( this.AUTH.keys() )
  }

  addAuth(id, keyStr, cid, level = 0) {
    let Base64hashKey = Buffer.from(sha256.hash(keyStr)).toString('base64')
    this.AUTH.set(id, { key: Base64hashKey, cid: cid, level: level })
  }

}

