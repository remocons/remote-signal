import fs from 'fs'

export class FileLogger{
  constructor(path ){
    this.file = fs.openSync(path ,'a+')
    console.log('new logFile', path, this.file )
  }
  
  log(msg){
    let format = new Date() + " "+ msg +'\n';
    fs.write( this.file, format , (err) => {
      if (err) throw err;
    })

  }


  timeStamp(){
    let now = new Date()
    let time = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}`
    return time
  }

}
