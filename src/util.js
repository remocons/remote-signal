import { networkInterfaces } from 'os';

export function isPrivateIP(ip){
  if(ip.indexOf("0.0.0.0") === 0) return  true 
  if(ip.indexOf("127.0.0.1") === 0) return  true 
  if(ip.indexOf("192.168.") === 0) return  true 
  if(ip.indexOf("10.") === 0) return  true 
  if(ip.indexOf("172.") === 0){
    if(ip.indexOf("172.16.") === 0) return  true 
    if(ip.indexOf("172.17.") === 0) return  true 
    if(ip.indexOf("172.18.") === 0) return  true 
    if(ip.indexOf("172.19.") === 0) return  true 
    if(ip.indexOf("172.20.") === 0) return  true 
    if(ip.indexOf("172.21.") === 0) return  true 
    if(ip.indexOf("172.22.") === 0) return  true 
    if(ip.indexOf("172.23.") === 0) return  true 
    if(ip.indexOf("172.24.") === 0) return  true 
    if(ip.indexOf("172.25.") === 0) return  true 
    if(ip.indexOf("172.26.") === 0) return  true 
    if(ip.indexOf("172.27.") === 0) return  true 
    if(ip.indexOf("172.28.") === 0) return  true 
    if(ip.indexOf("172.29.") === 0) return  true 
    if(ip.indexOf("172.30.") === 0) return  true 
    if(ip.indexOf("172.31.") === 0) return  true 
  }

  return false
}

export function numberWithCommas (x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function getIPv4HexString(ipStr){
  let ipv4 = ipStr.split('.')
  return Buffer.from(ipv4).toString('hex')
}

export function getLocalAddress(){
  const nets = networkInterfaces();
  // console.log(nets)
  const results = Object.create(null); // Or just '{}', an empty object
  let localAddress =''
  for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
          // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
          // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
          const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
          if (net.family === familyV4Value && !net.internal) {
              if (!results[name]) {
                  results[name] = [];
              }
              results[name].push(net.address);
              localAddress = net.address
          }
      }
  }
  
  // console.log('localAddress:', localAddress)
  return localAddress
}
