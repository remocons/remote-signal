
export class ReplyHandler{
  constructor( name ){
    this.name = 'reply'
    if( name ){
      this.name = name
    }
  }

  async request( remote, req) {

    console.log('req handler name: ' ,this.name)
    let result;
    let status = 0;
    try {
      let cmd = req.topic;
      if ( cmd == 'echo') {
        if( req.$ ){
          result =  "echo: " + req.$[0]
        }else{
          result = "echo no message" 
        }
      } else if (cmd == 'date') {
        result = new Date().toUTCString()
      } else if (cmd == 'unixtime') {
        result = Math.floor( Date.now() /1000)
      } else{
        status = 255;
        result = "no such a cmd: " + cmd
      }
  
      // console.log('result', result)
      remote.response(req.mid, status, result)
  
    } catch (e) {
      console.log('handler err:',e.message)
      remote.response(req.mid, 255 )
    }
  
  }
}
