# Remote Signal

This library provides a server and client for doing signaling(messaging) with peers that supports [`RemoteSignal`](https://github.com/congtrol/remote-signal).

## Features

### Signaling
- pub/sub style multicast: by channel name.
- uni-cast: one to one messaging by CID.
- CID subscribing: subscribe one peer using CID.
- CID: Communication Id.
- HomeChannel: group by IP address.

### Embedded Security
- Authentication
- Encryption
- E2EE
- thanks to the `Boho` [ [github](https://github.com/congtrol/boho) ]


## Compatibility
 - Support Remote Signal Protocol.
 - Web browser use WebSocket.
 - Node.js use WebSocket or CongSocket.
 - Arduino use congSocket.
 - No MQTT protocol support.

## Remote Signal repositories.
- Javascript: `remote-signal` [ [github](https://github.com/congtrol/remote-signal) | [npm](https://www.npmjs.com/package/remote-signal) ]
  - Node.js server
  - Node.js client ( WebSocket, CongSocket)
  - Web Browser client( WebSocket)
- Arduino client: 
  - `remote-signal-arduino` [ [github](https://github.com/congtrol/remote-signal-arduino) ]
  - or use Arduino Library Manager: `RemoteSignal`
- CLI program 
  - `remocon` [ [github](https://github.com/congtrol/remocon) | [npm](https://www.npmjs.com/package/remocon) ]
  - install: `npm i -g remocon`
  - support mac, linux and windows.
  - server and client

## License

This code is released under the MIT License.