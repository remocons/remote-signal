import fs from 'fs'

const formatter = new Intl.DateTimeFormat('ko-KR', {
  // hour12: true,
  // hour: 'numeric',
  // minute: '2-digit',
  // second: '2-digit'
  year: 'numeric', month: 'numeric', day: 'numeric',
  hour: 'numeric', minute: 'numeric', 
  hour12: false,
  timeZone: 'Asia/Seoul'
});


export class FileLogger{
  constructor(path ){
    this.file = fs.openSync(path ,'a+')
    console.log('new logFile', path, this.file )
  }
  
  log(msg){
    let format =formatter.format(new Date()) + " "+ msg +'\n';
    fs.write( this.file, format , (err) => {
      if (err) throw err;
    })

  }


}
