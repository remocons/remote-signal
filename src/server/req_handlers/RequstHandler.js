

export class RequestHandler{

  constructor( ...handlers){
    this.targetNames = []
    this.handler = {};
    handlers.forEach((h)=>{
      if( h.name ){
      this.targetNames.push( h.name )
      this.handler[h.name] = h;
      }else{
        console.log('no target name', h )
      }

    })
    console.log('handlers',this.targetNames)
  }



}