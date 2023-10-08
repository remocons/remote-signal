/**
 * BohoAuth_File
 */
import { BohoAuthCore } from './BohoAuthCore.js';
import { readFileSync } from 'fs'
import { sha256 } from 'boho'
import path from 'path'

export class BohoAuth_File extends BohoAuthCore{
  constructor( _path ){
    super()
    this.AUTH = new Map();
    let pathObj = path.parse(_path)
    this.path = path.resolve(_path)
    console.log('auth from file path:', this.path )
    let ext = pathObj.ext;
    if( ext.toLowerCase() == '.js' || ext.toLowerCase() == '.mjs'){
      // Read auth data from file
      console.log( "#JS path:", this.path ); 
      this.loadAuthInfoFile_JS( this.path)
    }else if( ext.toLowerCase() == '.json') {
      console.log( "#JSON path:", this.path ); 
      this.loadAuthInfoFile_JSON(this.path)
    }else{
      console.log('no authinfofile path.')
    }
  }


  async getAuth( id ){
    return this.AUTH.get( id )
  }


  //loaded when server start.
   loadAuthInfoFile_JS(path){ 

    import( path ).then(( file ) => {
      
      console.log( file.authInfo ); 
      file.authInfo.forEach( item =>{
        this.addAuth(...item )
      })
      console.log('total AUTH INFO size: ', this.AUTH.size  )
    }).catch(e=>{
      console.log(e)
    })


  }

   loadAuthInfoFile_JSON(path){ 
    let file = readFileSync( path )
    file = new TextDecoder().decode( file )
    // console.log(file )
    let list = JSON.parse( file )
    list.forEach( item =>{
      this.addAuth(...item )
    })
    console.log('total AUTH INFO size: ', this.AUTH.size  )

  }

  addAuth( id, keyStr , cid , level = 0){
    let Base64hashKey = Buffer.from( sha256.hash(keyStr)).toString('base64')
    this.AUTH.set( id, { key: Base64hashKey, cid: cid, level: level } )
  }



}

