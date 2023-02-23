import { MBP } from 'meta-buffer-pack'
import { BohoMsg , Meta } from 'boho'
import { quotaTable } from '../sockets/quotaTable.js'
import { serverOption } from '../serverOption.js'
import { RemoteMsg ,CLIENT_STATE } from '../constants.js'

const decoder = new TextDecoder()
export class AuthCore{
  constructor(){ 
  }

  send_auth_fail( peer , reason){
    console.log('## AUTH_FAIL reason:', reason )
    // peer.send( Buffer.from( [BohoMsg.AUTH_FAIL] ))
    peer.setState( CLIENT_STATE.AUTH_FAIL )
    setTimeout(e=>{
      peer.send( Buffer.from( [BohoMsg.AUTH_FAIL] ))
    }, serverOption.auth.delay_auth_fail )
  }

  async verify_auth_hmac( auth_hmac , peer ){
    try {
      //1. unpack 
      let infoPack = MBP.unpack( auth_hmac , Meta.AUTH_HMAC )
      if(!infoPack){
        this.send_auth_fail( peer ,'unpack auth_pack');
        return
      }

      let id = ""
      if( infoPack.id8.includes(0)){
        id = decoder.decode( infoPack.id8.subarray( 0, infoPack.id8.indexOf(0) ) );
      }else{
        id = decoder.decode( infoPack.id8 );
      }

      //2. get key of id from DB
      let authInfo = await this.getAuth( id )

      if(serverOption.debug.showAuthInfo ){
        console.log('##### authInfo',authInfo )
      }
      
      if( !authInfo ){
        this.send_auth_fail( peer , 'NO ID:'+ id);
        return
      }

      let authKey =  Buffer.from( authInfo.key, 'base64')
      
      //3. check hmac
      // console.log('-- found: authKey of id: ', id, authKey.toString('hex'))
      peer.boho.copy_id8( infoPack.id8 )
      peer.boho.copy_key( authKey )
      let auth_ack = peer.boho.check_auth_hmac( infoPack )

      if( !auth_ack ){
        this.send_auth_fail( peer, 'hmac dismatched' );
        return
      }

      //4. get info
        // console.log('#### auth success' )

      //5. check duplicate login.
      // current policy. Deny duplicate login

      // duplicate login policy.  
      // 1. send clear_auth signal to the old connection. 
      // 2. close old connection.
      // 3. close new connection. retry from begining.
      if( peer.manager.cid_map.has( authInfo.cid  ) ){
        let old = peer.manager.cid_map.get(authInfo.cid )
        if( old == peer ){
          console.log('## trying RELOGIN with SAME ID. ignored.')
          return
        }
        console.log('### clear_auth and close old connection:', old.cid )
        old.send( Buffer.from( [ RemoteMsg.SERVER_CLEAR_AUTH ]))
        old.close() 
        peer.close()  // auto relogin
      }


      //6. delete current (temp rand)cid if exist.
      if( peer.cid ){
        peer.manager.cid_map.delete( peer.cid ) 
      }

      //7. setting info.
      peer.did = id
      peer.cid = authInfo.cid
      peer.nick =  authInfo.cid // temporary: nick as cid

      //8. setting quota level. 
      let quotaLevel = serverOption.defaultQuotaIndex;
      if(authInfo.level) quotaLevel = authInfo.level; 
      quotaLevel = parseInt( quotaLevel )
      let newQuota = quotaTable[ quotaLevel ];
      if(!newQuota){
        let err = 'no index quotaTable for auth.level: ' + quotaLevel
        console.log('##AUTH:DATA ERROR##', err)
        this.send_auth_fail( peer, err );
        return
      }else{
        peer.level = quotaLevel;
        peer.quota = newQuota;
      }

      if( peer.level === serverOption.adminLevel){
        console.log('## ADMIN LOGIN')
        peer.isAdmin = true;
      }
      // console.log('auth: peer.quota', peer.quota )
      // send quota.level
      peer.send( Buffer.from( [RemoteMsg.QUOTA_LEVEL, quotaLevel] ))

      //9. set cid_map
      peer.manager.cid_map.set( peer.cid , peer )
      // console.log( 'done: cid_map:', peer.manager.cid_map.keys()  )
      console.log("LOGIN: ", `id: ${ peer.did}(${peer.cid})` )
      //10. send ack.
      peer.send( auth_ack )
      peer.setState( CLIENT_STATE.AUTH_READY )
    } catch (error) {
      this.send_auth_fail( peer , 'caught: unknown error' + error );
    }

  }



  
}

