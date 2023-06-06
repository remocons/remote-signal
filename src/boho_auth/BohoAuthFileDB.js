/**
 * Boho Symmetric Key Authentication.
 * FileSystem DB Adapter
 */

import {readFileSync} from 'fs'
import { sha256 } from 'boho'

export class BohoAuthFileDB{
  constructor( path ){
    this.AUTH = new Map();
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



}

