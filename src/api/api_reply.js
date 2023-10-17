

import { STATUS } from './api_constant.js'

const MIN_LEVEL = 0;

export function checkPermission(remote){
  if( remote.level >= MIN_LEVEL ){
    return true
  }else{
    return false
  }
}

export async function echo( remote , req)
{
  if( !req.args)
    remote.response( req.mid, STATUS.ERROR , 'no message to echo' )
  else
    remote.response( req.mid, STATUS.OK , req.args )
}

export async function date( remote , req)
{
  let r = new Date().toUTCString()
  remote.response( req.mid, STATUS.OK , r)
}

export async function unixtime( remote , req)
{
  let r = Math.floor( Date.now() /1000)
  remote.response( req.mid, STATUS.OK , r)
}

