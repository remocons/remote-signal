let { RemoteServer, serverOption } = require('remote-signal')

  serverOption.showMetric = 2;
  // serverOption.port = 7777  // default. websocket port 7777 will be open.
  serverOption.congPort = 8888  // additional tcp cong port open.  for Arduino like devices.
  const remoteServer = new RemoteServer( serverOption )
  console.log( 'serverOption:', serverOption )

