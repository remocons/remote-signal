// table index related with:
// - AUTH database level
// - serverOption.defaultQuotaIndex

// quota example
// index range: 0~255.
export let quotaTable = {
  // CongSocket
  0: { // default. anonymouse:
    signalSize: 1500,
    publishCounter: 10,
    trafficRate: 10000
  },
  1: { // auth_ultralight:  eg. Arduino Uno.
    signalSize: 255,
    publishCounter: 10,
    trafficRate: 100000
  },
  2: { // auth_light:  eg. authorized ESP.
    signalSize: 65535,
    publishCounter: 10,
    trafficRate: 1048576
  },

  // WebSocket (browser and node app)
  3: { // authorized basic.
    signalSize: 1048576,  
    publishCounter: 10,
    trafficRate: 1048576 * 20
  },

  // WebSocket (browser and node app)
  10: { //  anonymouse
    signalSize: 1500,  
    publishCounter: 5,
    trafficRate: 1048576 * 20
  },

  11: { // authorized basic.
    signalSize: 65535,  
    publishCounter: 10,
    trafficRate: 1048576 * 20
  },
  
  12: { // authorized power.
    signalSize: 1048576,  
    publishCounter: 100,
    trafficRate: 1048576 * 20
  },
  
  // you can add your custom quota level.

  // super admin or root user.
  // to monitor, metric, sudo command, db acess
  255: { 
    signalSize: 1048576 * 20,
    publishCounter: 10000,
    trafficRate: 1048576 * 100
  }
}

