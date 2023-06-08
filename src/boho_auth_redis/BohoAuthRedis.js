
/**
 * Boho Symmetric Key Authentication.
 * Redis DB Adapter
 */

import { sha256 } from 'boho'

const DEVICE_PREFIX = "device:"
const KEY_SALT = "" // Adding Salt to Key Hashing: to protect rainbow table atttack or dictionary attack

export class BohoAuthRedis{
  constructor( redisClient ){
    // default redis url and port
    if( !redisClient ){
      throw new Error("BohoAuthRedis constructor: no redisClient")
    }
    this.redis = redisClient
  }

  // get device key from DB. (for Boho auth.)
  async getAuth( id ){
    let result = await this.redis.hGetAll(DEVICE_PREFIX + id)
    if(result.key) return result
  }

// add device auth info
  async addAuth( id, keyStr , cid = '', level = 0){
    console.log('addAuth', id, keyStr, cid, level)
    let Base64hashKey = Buffer.from( sha256.hash( KEY_SALT + keyStr)).toString('base64')
    // let addAuth = this.redis.set( DEVICE_PREFIX + id,  hashKey  )
    return this.redis.hSet( DEVICE_PREFIX + id, {'key': Base64hashKey, 'cid': cid ,'level': level} )
  }

  async delAuth( id ){
    return this.redis.del( DEVICE_PREFIX + id )
  }

  async save( id ){
    return this.redis.save()
  }

}

