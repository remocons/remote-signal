import { createClient  } from 'redis';
export let redisClient = {}


if( process.env.REDIS_HOST && process.env.REDIS_PORT ){
    let url = `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
    console.log('####### redis server url:', url )
    redisClient = createClient({
        url: url
    });
}else{
    console.log('####### default redis server url: redis://localhost:6379 ' )   
    redisClient = createClient();
}



redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();