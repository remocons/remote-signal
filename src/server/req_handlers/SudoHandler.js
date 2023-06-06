
export class SudoHandler{
  constructor( name ){
    this.name = 'sudo'
    if( name ){
      this.name = name
    }
  }

  async request( remote, req) {
    if( !remote.isAdmin ){
      remote.response( req.mid , 255 , "NO PERMISSION" )
      return
    }
    
    let result;
    let status = 0;
    try {
      console.log('req_sudo req:',req )
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
        if (cid) result = remote.manager.metric.getClientByCId(cid, mode)
  
      } else if (cmd == 'close') {
        if (req.$[0]) result = remote.manager.closeRemoteByCId(req.$[0])
  
      } else if (cmd == 'addauth' || cmd == 'adddevice') {
        console.log('## inside addauth: ', remote.manager.bohoAuth , req.$.length)
        if (remote.manager.bohoAuth && req.$.length == 4) {
          if (remote.manager.bohoAuth.db.addAuth) {
            let did = req.$[0]
            let dkey = req.$[1]
            let cid = req.$[2]
            let level = req.$[3]
            console.log('###### did,dkey,cid,level: ', did,dkey,cid,level)
            result = await remote.manager.bohoAuth.db.addAuth(did, dkey, cid, level)
            console.log('###### result: ', result)
          }
  
        }
      } else if (cmd == 'delauth' || cmd == 'deldevice') {
        if (remote.manager.bohoAuth && req.$.length == 1) {
          if (remote.manager.bohoAuth.db.delAuth) {
            let did = req.$[0]
            result = await remote.manager.bohoAuth.db.delAuth(did)
          }
        }
      } else if (cmd == 'getauth' || cmd == 'getdevice') {
        if (remote.manager.bohoAuth && req.$.length == 1) {
          if (remote.manager.bohoAuth.db.getAuth) {
            let did = req.$[0]
            result = await remote.manager.bohoAuth.db.getAuth(did)
          }
        }
      } else{
        status = 255;
        result = "sudo_reg: no such a cmd: " + cmd
      }
  
      console.log('req_sudo: result', result)
      remote.response(req.mid, status, result)
  
    } catch (e) {
      console.log('req_sudo err:',e.message)
      remote.response(req.mid, 255 )
    }
  
  }
}
