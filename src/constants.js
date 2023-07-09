import{ MBP } from "meta-buffer-pack"

// client remote state
export const STATES = {
  OPENING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
  SERVER_READY: 4,
  AUTH_FAIL: 5,
  AUTH_READY: 6,
  READY: 7
}
for (let c in STATES) { STATES[STATES[c]] = c }

// server side remote client state
export const CLIENT_STATE = {
  INIT: 0,
  SENT_SERVER_READY: 1,
  RECV_AUTH_REQ: 2,
  SENT_SERVER_NONCE: 3,
  RECV_AUTH_HMAC: 4,
  AUTH_FAIL: 5,
  AUTH_READY: 6,
  CID_READY: 7
}
for (let c in CLIENT_STATE) { CLIENT_STATE[CLIENT_STATE[c]] = c }

export let ENC_MODE = {
  NO: 0,
  YES: 1,
  AUTO: 2
}

for (let c in ENC_MODE) { ENC_MODE[ENC_MODE[c]] = c }


export const SIZE_LIMIT = {
  TAG_LEN1: 255,
  TAG_LEN2: 65535
}

export let PAYLOAD_TYPE = {
  EMPTY: 0, 
  TEXT: 1,
  BINARY: 2, 
  OBJECT: 3, // one stringify able object. no buffer.
  MJSON: 4, // multiple stringify able obejct.  JSON string. with top levle array , no buffer
  MBA: 5  // "meta_buffer_arguments" arbitary types.  buffer included.
}
for (let c in PAYLOAD_TYPE) { PAYLOAD_TYPE[PAYLOAD_TYPE[c]] = c }
// console.log( PAYLOAD_TYPE )

// MJSON: multiple arguments 
// accepet only string, number, root depth js primittive object, 
// unpack and will send to receiver handler with multiple params.

// MBA: buffer pack of multiple arguments.  check "meta-buffer-pack" module. 
// MBA: when armuents includes raw Buffer( TypedArray )

// remote message pack one byte header. 
export let RemoteMsg = {

  /* 
  * 0~127dec.  reserved. for text stream.
  * 0~31: control code
  * 32~126: ascii charactor
  * 127: DEL
  */
  
  // ADMIN_REQ: 0xA0,

  // DO NOT USE: 0xB0~ 0xBF
  // Boho module using this numbers.
  // AUTH_REQ : 0xB0,  
  // AUTH_NONCE: 0xB1,
  // AUTH_HMAC: 0xB2,
  // AUTH_ACK: 0xB3,
  // AUTH_FAIL: 0xB4,
  // AUTH_EXT: 0xB5,
  // ENC_PACK : 0xB6,  
  // ENC_E2E : 0xB7,  
  // ENC_488 : 0xB8
  // reserved ~0xBF

  // C. Remote status contorl.
  SERVER_READY: 0xC0,
  CID_REQ: 0xC1, 
  CID_RES: 0xC2,  
  QUOTA_LEVEL: 0xC3,
  SERVER_CLEAR_AUTH: 0xC4, 

  // ..
  LOOP: 0xCB,
  ECHO: 0xCC,
  PING: 0xCD,  
  PONG: 0xCE,
  CLOSE: 0xCF,
  // ~CF


  // D. Remote data signaling
  SIGNAL: 0xD0,  
  SIGNAL_REQ: 0xD1, 
  SIGNAL_E2E: 0xD2, 
  SUBSCRIBE: 0xD3,
  SUBSCRIBE_REQ: 0xD4, 
  UNSUBSCRIBE: 0xD5, 
  SERVER_SIGNAL: 0xD6, 

  // ..
  IAM: 0xD9,
  IAM_RES: 0xDA,
  
  //.. 
  SET: 0xDB,   //
  RESPONSE_CODE: 0xDC,   
  RESPONSE_MBP: 0xDD,   

  REQUEST: 0xDE, //client public
  RESPONSE: 0xDF,
  // ~DF


  // F. Framing Flow control related framing protocol.(CongPacket)
  FLOW_MODE: 0xF0,
  WAIT: 0xF1,
  RESUME: 0xF2,
  //..
  TIME_OUT: 0xFD,
  OVER_SIZE: 0xFE,
  OVER_FLOW: 0xFF

}

for (let c in RemoteMsg) { RemoteMsg[RemoteMsg[c]] = c }

// console.log( RemoteMsg );


export const API_TYPE = {
  'REQUEST_RESPONSE': 'requet_response',
  'ONE_WAY': 'one_way'
}



// api response status code
export const STATUS = {
  OK: 0,
  //0~127: success
  //128~255: fail
  ERROR: 255
}
