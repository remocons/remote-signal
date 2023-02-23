// table index related with:
// - AUTH DATABASE::  info.level
// - serverOption.defaultQuotaIndex

// quota example
// index should 0~255.
export let quotaTable = {
  0: { // default. anonymouse_minimum:
    signalSize: 255,
    publishCounter: 5,
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
  3: { // auth_power: eg. authorized browser.
    signalSize: 1048576,  
    publishCounter: 100,
    trafficRate: 1048576 * 20
  },
  
  // you can add your limit.


  255: { // super user
    signalSize: 1048576 * 20,
    publishCounter: 10000,
    trafficRate: 1048576 * 100
  }
}

