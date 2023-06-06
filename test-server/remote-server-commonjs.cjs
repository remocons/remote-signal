let { RemoteServer, serverOption } = require('remote-signal')

  serverOption.showMetric = 2;
  serverOption.congPort = 8888
  const remoteServer = new RemoteServer( serverOption )
  console.log( 'serverOption:', serverOption )

