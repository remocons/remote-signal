import { createClient  } from 'redis';

const HOST = 'localhost'  // default
const PORT = 6379  //default

export const redisClient = createClient();
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();