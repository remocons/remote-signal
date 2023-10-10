
/**
 * BohoAuth_Redis
 */
import { BohoAuthCore } from '../boho_auth/BohoAuthCore.js';
import { sha256 } from 'boho'
const DEVICE_PREFIX = "device:"

export class BohoAuth_Redis extends BohoAuthCore{
  constructor( redisClient ){
    super()
    // default redis url and port
    if( !redisClient ){
      throw new Error("BohoAuthRedis constructor: no redisClient")
    }
    this.redis = redisClient
  }

  // get device key from DB. (for Boho auth.)
  async getAuth( id ){
    let result = await this.redis.hGetAll(DEVICE_PREFIX + id)
    // console.log('BohoAuth_Redis: getAuth req id result',id, result)
    if(result.key) return result
  }

// add device auth info
  async addAuth( id, keyStr , cid = '', level = 0){
    // console.log('addAuth', id, keyStr, cid, level)
    let Base64hashKey = Buffer.from( sha256.hash( keyStr)).toString('base64')
    return this.redis.hSet( DEVICE_PREFIX + id, {'key': Base64hashKey, 'cid': cid ,'level': level} )
  }

  async delAuth( id ){
    return this.redis.del( DEVICE_PREFIX + id )
  }

  async save( id ){
    return this.redis.save()
  }

}

