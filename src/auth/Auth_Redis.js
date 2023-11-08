
/**
 * Auth_Redis
 */
import { AuthCore } from './AuthCore.js';
import { sha256 } from 'boho'
const DEVICE_PREFIX = "device:"

export class Auth_Redis extends AuthCore{
  constructor( redisClient ){
    super()
    // default redis url and port
    if( !redisClient ){
      throw new Error("AuthRedis constructor: no redisClient")
    }
    this.redis = redisClient
  }

  // get device key from DB. (for Boho auth.)
  async getAuth( id ){
    let result = await this.redis.hGetAll(DEVICE_PREFIX + id)
    // console.log('Auth_Redis: getAuth req id result',id, result)
    if(result.key) return result
  }


  async getAuthIdList() {
    let result = await this.redis.keys( DEVICE_PREFIX + '*')
    result = result.map( v=> {
      return v.split(':')[1]
    })
    if(result) return result
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

