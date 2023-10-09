import { STATUS } from './api_constant.js'

const MIN_LEVEL = 255;

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
      if(cmd == 'set'){
        result = await this.redis.set( ...req.$ )
      }else if(cmd == 'get'){
        result = await this.redis.get( ...req.$ )
      }else if(cmd == 'hset'){
        result = await this.redis.hSet( ...req.$ )
      }else if(cmd == 'hget'){
        result = await this.redis.hGet( ...req.$ )
      }else if(cmd == 'hgetall'){
        result = await this.redis.hGetAll(  ...req.$ )
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

  
  

