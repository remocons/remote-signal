import { STATUS } from './api_constant.js'

const MIN_LEVEL = 200;
const COMMANDS = [
  'GET',       'SET',
  'HGETALL',   'HGET',
  'HSET',      'SADD',
  'SISMEMBER', 'SMEMBERS',
  'EXISTS',    'SREM',
  'DEL',       'KEYS',
  'SAVE'
]

export class RedisAPI{
  constructor( redisClient, _minLevel ){
    if( !redisClient ){
      throw new Error("RedisAPI constructor: no redisClient")
    }
    this.redis = redisClient
    this.minLevel = _minLevel ? _minLevel : MIN_LEVEL
  }


  checkPermission(remote ,req){
    if( remote.level >= this.minLevel ){
      return true
    }else{
      return false
    }
  }


  async request(remote, req ){

    let result;
    let status = STATUS.OK; // *0~127: ok ,  128~*255 :error
    try {
      // console.log(req)
      let cmd = req.topic
      cmd = cmd.toUpperCase()
      if( COMMANDS.includes(cmd)){
        // console.log('RedisAPI call:', cmd, req.$)

        //common client menthod:  redisClient and remoteRedisAPI_Client
        result = await this.redis.sendCommand( [ cmd, ...req.$ ] )
        // result : []
        // result  [key,v1, key2, v2 ...]
        if( typeof result =='object'){
          if( Array.isArray(result)){
            // array. convert to object
            let resultObj = {}
            let k = result.length
            for(let i = 0 ; i < k ; i += 2 ){
              resultObj[ result[i]] = result[i+1]
            }
            // console.log('RedisAPI resultObj:', resultObj)
            result = resultObj
          }else{
            // remote response object.  use result.body
            if( result.ok ){
              result = result.body
            }
          }
        }else{
          // string. no convert
        }

        // console.log('RedisAPI: result:', result)

      }else{
        result = 'redis api: no such a cmd '+ cmd;
        status = STATUS.ERROR;
      }
      remote.response( req.mid, status , result)
    } catch (e) {
      remote.response( req.mid, STATUS.ERROR ,e.message )
    }

  }

}

  
  
