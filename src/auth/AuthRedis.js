import { AuthCore } from './AuthCore.js'
import { sha256 } from 'boho'
import { createClient  } from 'redis';

const HOST = 'localhost'
const PORT = 6379

export class AuthRedis extends AuthCore{
  constructor( url ){
    super();
    this.redis = createClient();
    this.redis.on('error', (err) => console.log('Redis Client Error', err));
    this.redis.connect();
  }

  async getAuth( id ){
    let result = await this.redis.hGetAll('AUTH:'+ id)
    if(result.key) return result
  }

  async getPublic( id ){
    return this.redis.hGetAll('PUBLIC:'+ id)
  }

// auth info generators
  async addAuth( id, keyStr , cid = '', level = 0){
    console.log('addAuth', id, keyStr, cid, level)
    let Base64hashKey = Buffer.from( sha256.hash(keyStr)).toString('base64')
    // let addAuth = this.redis.set( 'AUTH:' + id,  hashKey  )
    return this.redis.hSet( 'AUTH:' + id, {'key': Base64hashKey, 'cid': cid ,'level': level} )
  }

  async delAuth( id ){
    return this.redis.del( 'AUTH:' + id )
  }


  async setPublic( id, infoObj = {} ){
    await this.redis.hSet( 'PUBLIC:' + id, infoObj )
  }

}

