
import { STATUS } from './api_constant.js'
import { redisClient } from './redisClient.js'


const MIN_LEVEL = 200;

export function checkPermission(remote, req){
  if( remote.level >= MIN_LEVEL ){
    return true
  }else{
    return false
  }
}

export async function get( remote , req)
{
  let r, status = STATUS.OK;
  try {
    r = await redisClient.get( ...req.$ )
  } catch (e) {
    r = e.message
    status = STATUS.ERROR;
  } finally{
    remote.response( req.mid, status , r )
  }
}

export async function set( remote , req)
{
  let r, status = STATUS.OK;
  try {
    r = await redisClient.set( ...req.$ )
  } catch (e) {
    r = e.message
    status = STATUS.ERROR;
  } finally{
    remote.response( req.mid, status , r )
  }
}


export async function hSet( remote , req)
{
  let r, status = STATUS.OK;
  try {
    r = await redisClient.hSet( ...req.$ )
  } catch (e) {
    r = e.message
    status = STATUS.ERROR;
  } finally{
    remote.response( req.mid, status , r )
  }
}


export async function hGet( remote , req)
{
  let r, status = STATUS.OK;
  try {
    r = await redisClient.hGet( ...req.$ )
  } catch (e) {
    r = e.message
    status = STATUS.ERROR;
  } finally{
    remote.response( req.mid, status , r )
  }
}

export async function hGetAll( remote , req)
{
  let r, status = STATUS.OK;
  try {
    r = await redisClient.hGetAll( ...req.$ )
  } catch (e) {
    r = e.message
    status = STATUS.ERROR;
  } finally{
    remote.response( req.mid, status , r )
  }
}



  
  

