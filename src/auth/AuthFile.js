import {readFileSync} from 'fs'
import { AuthCore } from './AuthCore.js'
import { sha256 } from 'boho'

// this is a sample how Boho auth works.
// !!Do not store plain password as string.
// AuthRedis adapter example has addAuth example(using hashed key)
export class AuthFile extends AuthCore{
  constructor( path ){
    super();
    this.AUTH = new Map();
    this.PUBLIC = new Map();
    this.path = path
    if(path){
      // Read auth data from file
      this.loadAuthInfoFile(path)
    }else{
      console.log('no authinfofile path.')
    }
    console.log('authfromfile path:', path )
  }


  async getAuth( id ){
    return this.AUTH.get( id )
  }


  async getPublic( id ){
    return this.PUBLIC.get( id )
  }

  //loaded when server start.
   loadAuthInfoFile(path){ 
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

  setPublic( id, infoObj = {} ){
    this.PUBLIC.set( id, infoObj )
  }

}

