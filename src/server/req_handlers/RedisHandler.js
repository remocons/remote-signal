
export class RedisHandler{
  constructor( name , redisClient){
    if( !redisClient ){
      throw new Error("RedisHandler constructor: no redisClient")
    }
    this.redis = redisClient
    if( name ){
      this.name = name
    }else{
      this.name = 'redis'
    }
  }

  async request(remote, req ){
    if( !remote.isAdmin ){
      remote.response( req.mid , 255 , "NO PERMISSION" )
      return
    }
    let result = "no result";
    let status = 0;// *0~127: ok ,  128~*255 :error
    try {
      console.log(req)
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
        result = 'req_redis: no such a cmd '+ cmd;
        status = 255;
      }

      // let mbp = MBP.pack(MBP.MB('result', result));
      remote.response( req.mid, status , result)
    } catch (e) {
      // remote.response( mid, 255, error )
      // console.error( e)
      remote.response( req.mid, 255 ,e.message )
    }

  }

}

  
  

