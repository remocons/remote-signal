import { Transform } from 'stream'
import { MBP } from 'meta-buffer-pack'

export const CongType = {
  TYPE_LEN1: 1,
  TYPE_LEN2: 2,
  TYPE_LEN3: 3,
  TYPE_LEN4: 4
}

// support LittleEndian system.
export function pack(payload) {

  if (payload.byteLength < 256) { //one byte len
    return MBP.pack(
      MBP.MB('#type', '8', CongType.TYPE_LEN1),
      MBP.MB('#payloadLen1', '8', payload.byteLength),
      MBP.MB('#payload', payload)
    )

  } else if (payload.byteLength < 65536) {  // 2bytes len
    return MBP.pack(
      MBP.MB('#type', '8', CongType.TYPE_LEN2),
      MBP.MB('#payloadLen2', '16L', payload.byteLength),
      MBP.MB('#payload', payload)
    )

  } else if (payload.byteLength < 2 ** 24) {  // 3bytes len
    let len4Buffer = Buffer.alloc(4)
    len4Buffer.writeUint32LE( payload.byteLength ) 
    let cropLen3 = len4Buffer.subarray(0,3)
    return MBP.pack(
      MBP.MB('#type', '8', CongType.TYPE_LEN3),
      MBP.MB('#payloadLen3', cropLen3),
      MBP.MB('#payload', payload)
    )

  } else { //use 4 bytes.
    return MBP.pack(
      MBP.MB('#type', '8', CongType.TYPE_LEN4),
      MBP.MB('#payloadLen4', '32L', payload.byteLength),
      MBP.MB('#payload', payload)
    )
  }

}

// let totalCong = 0;

export class CongRx extends Transform {
  constructor(options) {
    super(options)
    // console.log('new congRx. totalCong:', ++totalCong )
    this.buffer = Buffer.alloc(0)
    this.frames = []
    this.rxi = 0;
    this.rxi_zero = 0;
  }



  _transform(chunk, encoding, callback) {
    this.addData(chunk)
    if (this.frames.length > 0) {
      this.frames.forEach(frame => {
        // console.log('emit frame:', frame)
        this.push(frame)
      })
      this.frames = []
    }
    callback()
  }


  addData(chunk) {
    // console.log('congpack chunk:', chunk )
    let c = chunk.byteLength;
    let i = 0;
    while( c-- ){
      this.rxi++
      if( chunk[ i++ ] == 0 ){
        this.rxi_zero++
      }
    }

    if (this.buffer.byteLength > 0) {
      this.buffer = Buffer.concat([this.buffer, chunk])
    } else {
      this.buffer = chunk
    }
    // console.log('buffer before parse', this.buffer )
    this.parse()
  }


  parse() {
    let head = this.buffer[0]
    let headerLen;
    let payloadSize;
    // find header
    // console.log('>> parser head, buffer:', head , this.buffer )

    if (head == CongType.TYPE_LEN1) {
       headerLen = 2;
      if (this.buffer.byteLength < headerLen) return;
       payloadSize = this.buffer.readUint8(1)

    } else if (head == CongType.TYPE_LEN2) {
       headerLen = 3;
      if (this.buffer.byteLength < headerLen) return;
       payloadSize = this.buffer.readUint16LE(1)

    } else if (head == CongType.TYPE_LEN3) {
       headerLen = 4;
      if (this.buffer.byteLength < headerLen) return;
       payloadSize = this.buffer.readUint16LE(1) + this.buffer.readUint8(3) * 65536

    } else if (head == CongType.TYPE_LEN4) {
       headerLen = 5;
      if (this.buffer.byteLength < headerLen) return;
       payloadSize = this.buffer.readUint32LE(1)

    } else {
      // console.log('CongPacket: UNKNOWN_HEAD drop', this.buffer)
      this.emit('wrong',this.buffer)
      this.buffer = Buffer.alloc(0)
    }


    if (payloadSize == this.buffer.byteLength - headerLen) {
      this.frames.push(this.buffer.subarray(headerLen))
      this.buffer = Buffer.alloc(0)
      return
    } else if (payloadSize < this.buffer.byteLength - headerLen) {
      this.frames.push(this.buffer.subarray(headerLen, headerLen + payloadSize))
      this.buffer = this.buffer.subarray(headerLen + payloadSize)
      this.parse()
    } else { 
      //not ready
      // console.log('+')
      return
    }


  }


}


