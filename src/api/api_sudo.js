import { STATUS } from './api_constant.js'

const MIN_LEVEL = 255;

export const commands = [
  'cid','remotes','clients',
  'channels','subscribers',
  'remote', 'client', 'close',
  'addauth' , 'getauth' ,'delauth',
  'getauthidlist', 'getdevicelist',
  'adddevice' ,'getdevice','deldevice' 
]


export function checkPermission(remote){
  if( remote.level >= MIN_LEVEL ){
    return true
  }else{
    return false 
  }
}

export async function request( remote, req) {
    // console.log(req )
    let result;
    let status = 0;
    try {
      let cmd = req.topic;
      cmd = cmd.toLowerCase()
      if (cmd == 'cid') {
        result = remote.manager.metric.getCIdList()
      } else if (cmd == 'remotes' || cmd == 'clients') {
        result = remote.manager.metric.getRemotes()
      } else if (cmd == 'channels') {
        result = remote.manager.metric.getChannelList()
      } else if (cmd == 'subscribers') {
        let ch = req.$[0]
        if (ch) result = remote.manager.metric.getSubscribers(ch)
      } else if (cmd == 'remote' || cmd == 'client') {
        let cid = req.$[0]
        let mode = req.$[1]
        if (cid) result = remote.manager.metric.getRemoteByCId(cid, mode)
  
      } else if (cmd == 'close') {
        if (req.$[0]) result = remote.manager.closeRemoteByCId(req.$[0])
  
      } else if (cmd == 'addauth' || cmd == 'adddevice') {
        // console.log('## api_sudo: addauth ', remote.manager.bohoAuth , req.$.length)
        if (remote.manager.bohoAuth && req.$.length == 4) {
          if (remote.manager.bohoAuth.addAuth) {
            let did = req.$[0]
            let dkey = req.$[1]
            let cid = req.$[2]
            let level = req.$[3]
            // console.log('###### did,dkey,cid,level: ', did,dkey,cid,level)
            result = await remote.manager.bohoAuth.addAuth(did, dkey, cid, level)
          }
  
        }
      } else if (cmd == 'delauth' || cmd == 'deldevice') {
        if (remote.manager.bohoAuth && req.$.length == 1) {
          if (remote.manager.bohoAuth.delAuth) {
            let did = req.$[0]
            result = await remote.manager.bohoAuth.delAuth(did)
          }
        }
      } else if (cmd == 'getauth' || cmd == 'getdevice') {
        if (remote.manager.bohoAuth && req.$.length == 1) {
          if (remote.manager.bohoAuth.getAuth) {
            let did = req.$[0]
            result = await remote.manager.bohoAuth.getAuth(did)
          }
        }
      } else if (cmd == 'getauthidlist' || cmd == 'getdevicelist') {
        if (remote.manager.bohoAuth ) {
          if (remote.manager.bohoAuth.getAuthIdList ) {
            result = await remote.manager.bohoAuth.getAuthIdList()
          }
        }
      } else{
        status = STATUS.ERROR;
        result = "api sudo: no such a cmd: " + cmd
      }
  
      // console.log('req_sudo: result', result)
      remote.response(req.mid, status, result)
  
    } catch (e) {
      // console.log('req_sudo err:',e.message)
      remote.response(req.mid, STATUS.ERROR , e.message )
    }
  
  }



