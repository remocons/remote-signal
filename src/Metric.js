import { memoryUsage } from 'process';
import { ENC_MODE } from './constants.js'


export class Metric{
  constructor(manager){
    this.manager = manager;
  }

  oneline(prn){
    let memoryUse = memoryUsage();
    let memoryInfo = [{
      ...memoryUse
    }]

    if ( prn ) console.table(memoryInfo, [ 
    'rss','heapTotal','heapUsed',
    'external','arrayBuffers' ]);

    let metric = [{
      lastSSID: this.manager.lastSSID,
      remotes: this.manager.remotes.size,
      channels: this.manager.channel_map.size,
      txBytes: this.manager.txBytes,
      rxBytes: this.manager.rxBytes,
    }]

    console.table(metric, [ 
    'lastSSID', 'remotes', 'channels','txBytes','rxBytes' ]);
    return metric
  }

  getRemotes( prn ){
    let remoteList =  Array.from(this.manager.remotes.values())
    let remoteStates = remoteList.map(v=>{
      return  "#"+v.ssid+":"+ v.cid +"("+v.state+")"
    })
    if (prn ) console.table(remoteStates)
    return remoteStates
  }
  getCIdList( prn ){
    let CIdList =  Array.from(this.manager.cid_map.keys())
    if (prn ) console.table(CIdList)
    return CIdList
  }

  getChannelList(prn){
    let chList =  Array.from(this.manager.channel_map.keys())
    if (prn ) console.table(chList)
    return chList
  }

  getSubscribers(ch){
    let list = [];
    if( this.manager.channel_map.has(ch)){
      let subscribers = this.manager.channel_map.get(ch) //set
      subscribers.forEach( c =>{
        list.push(c.cid)
      })
    }
    // console.log(list)
    return list
  }

  getClientByCId( cid , mode = 1){

    if( this.manager.cid_map.has(cid)){
      let remote = this.manager.cid_map.get(cid)
      if(mode == 1){
        return {
          ip: remote.ip,
          id: remote.cid,
          ssid: remote.ssid,
          cid: remote.cid,
          uptime:  Math.trunc( ( Date.now() - remote.socket.openTime ) / 1000),
          tx: remote.socket.txCounter,
          rx: remote.socket.rxCounter,
          txBytes: remote.socket.bytesWritten || remote.socket._socket?.bytesWritten,
          rxBytes: remote.socket.bytesRead || remote.socket._socket?.bytesRead
        }
      }else if( mode == 2){
        return {
          ip: remote.ip,
          uptime:  Math.trunc( ( Date.now() - remote.socket.openTime ) / 1000),
          nick: remote.nick,
          ssid: remote.ssid,
          echo: remote.lastEchoMessage
        }
      }else if( mode == 3){
        return {
          ip: remote.ip,
          uptime:  Math.trunc( ( Date.now() - remote.socket.openTime ) / 1000),
          nick: remote.nick,
          ssid: remote.ssid,
          isSecure: remote.TLS,
          isAuth: remote.boho.isAuthorized,
          encMode:  ENC_MODE[remote.encMode]
        }
      }else if( mode == 4){
        let channels = Array.from( remote.channels.keys() )
        let set_memory = Array.from( remote.memory.keys() )
        let retain_signal = Array.from( remote.retain_signal.keys() )
        return {
          ip: remote.ip,
          uptime:  Math.trunc( ( Date.now() - remote.socket.openTime ) / 1000),
          channels: channels,
          set: set_memory,
          retain: retain_signal
        }
      }

    }else{
      return { result: "nop" }
    }

  }


}



  // cid(){
  //   let cid_remotes = [];
  //   this.manager.cid_map.forEach( (v, cid )=>{
  //     cid_remotes.push( {
  //       ssid: v.ssid,
  //       cid: v.cid,
  //       uptime:  Math.trunc( ( Date.now() - v.socket.openTime ) / 1000),
  //       isSecure: v.TLS,
  //       isAuth: v.boho.isAuthorized,
  //       encMode:  ENC_MODE[v.encMode]
  //     })
  //   })

  //   console.log('\n\ncid_map:')
  //   console.table(cid_remotes, [ 'ssid','cid','uptime','isSecure','isAuth','encMode']);
  //   return cid_remotes;
  // }

  // remotes(){
  //   let remotes = Array.from(this.manager.remotes.keys())
  //   let remote_list = remotes.map( v => {
  //     return { 
  //       ssid: v.ssid,
  //       cid: v.cid,
  //       uptime:  Math.trunc( ( Date.now() - v.socket.openTime ) / 1000),
  //       TLS: v.TLS,
  //       isAuth: v.boho.isAuthorized,
  //       encMode:  ENC_MODE[v.encMode]
  //     }
  //   })
  //   console.log('remotes_set:')
  //   console.table(remote_list, [ 'ssid','cid', 'uptime','TLS','isAuth','encMode']);

  //   return remote_list;
  // }
  // channels( viewMode){

  //   this.manager.channel_map.forEach((clients, ch) => {
  //       // each clients of channels
  //       let list = Array.from(clients);

  //       if( viewMode == 1){
  //         list = list.map((remote) => {
  //           // console.log('map clients _socket',remote.nick, remote.socket )

  //           return {
  //             ip: remote.ip,
  //             id: remote.cid,
  //             ssid: remote.ssid,
  //             cid: remote.cid,
  //             uptime:  Math.trunc( ( Date.now() - remote.socket.openTime ) / 1000),
  //             tx: remote.socket.txCounter,
  //             rx: remote.socket.rxCounter,
  //             txBytes: remote.socket.bytesWritten || remote.socket._socket?.bytesWritten,
  //             rxBytes: remote.socket.bytesRead || remote.socket._socket?.bytesRead
  //           }
  //         });

  //           console.log(`ch: '${ch}' has ${clients.size} clients.`);
  //           console.table(list, [ 'ip', 'id', 'ssid','cid','uptime','tx', 'rx','txBytes','rxBytes']);

  //         }else if( viewMode == 2 ){

  //         list = list.map((remote) => {
  //           return {
  //             ip: remote.ip,
  //             uptime:  Math.trunc( ( Date.now() - remote.socket.openTime ) / 1000),
  //             nick: remote.nick,
  //             ssid: remote.ssid,
  //             echo: remote.lastEchoMessage
  //           }
  //         });
  //         console.log(`\nch: '${ch}' has ${clients.size} clients.`);
  //         console.table(list, [ 'ip', 'uptime','nick','ssid', 'echo']);

  //       }else if( viewMode == 3 ){

  //         list = list.map((remote) => {
  //           return {
  //             ip: remote.ip,
  //             uptime:  Math.trunc( ( Date.now() - remote.socket.openTime ) / 1000),
  //             nick: remote.nick,
  //             ssid: remote.ssid,
  //             isSecure: remote.TLS,
  //             isAuth: remote.boho.isAuthorized,
  //             encMode:  ENC_MODE[remote.encMode]
  //           }
  //         });
  //         console.log(`\nch: '${ch}' has ${clients.size} clients.`);
  //         console.table(list, [ 'ip', 'uptime','nick','ssid', 'isSecure','isAuth','encMode']);

  //       }
  //       return list;
      
  //   });

  // }

// }





// getMetric ( filter = 0) {

//   let channelMetric = []
//   let clientsSet;

//   if( filter == 0){
//     clientsSet = this.remotes
//   }else if( filter == 1){
//     //all channel from map
//   }else{
//     //one channel
//     clientsSet = this.channel_map.get( filter )
//   }
  
//   if(filter == 1){

//     this.channel_map.forEach((clients, key) => {
//         let list =[];
//         list = Array.from(clients);
//         list = list.map((v) => {
//           return {
//             ip: v.ip,
//             ssid: v.ssid,
//             id: v.cid,
//             cid: v.cid,
//             uptime:  Math.trunc( ( Date.now() - v.socket.openTime ) / 1000),
//             tx: v.socket.txCounter,
//             rx: v.socket.rxCounter,
//             txBytes: v.socket.bytesWritten || v.socket._socket?.bytesWritten,
//             rxBytes: v.socket.bytesRead || v.socket._socket?.bytesRead
//           }
//         });

//         let channel = { "name": key , "clients": list };
//         channelMetric.push( channel )
      
//     });

//   }else{

//       let list =[];
//       if( !clientsSet){
//         // no such a chnannel name
//         return [ { "name": 'no channel' , "clients": [] }]
//       } 
//       list = Array.from(clientsSet);
//       list = list.map((v) => {
//         return {
//           ip: v.ip,
//           id: v.cid,
//           ssid: v.ssid,
//           nick: v.nick,
//           uptime:  Math.trunc( ( Date.now() - v.socket.openTime ) / 1000),
//           tx: v.socket.txCounter,
//           rx: v.socket.rxCounter,
//           txBytes: v.socket.bytesWritten || v.socket._socket?.bytesWritten,
//           rxBytes: v.socket.bytesRead || v.socket._socket?.bytesRead 
//         }
//       });

//       let channel = { "name": filter , "clients": list };
//       channelMetric.push( channel )
//   }

//   // console.log( channelMetric )
//   return channelMetric
// }