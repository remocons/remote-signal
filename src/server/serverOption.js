

export let serverOption = {
  clientTracking: false,
  port: 7777,
  congPort: null,
  timeout: 50000,
  showMessage: 'none',
  showMetric: 0,
  showChannel: 0,
  monitorPeriod: 5000,
  fileLogger:{
    connection: { 
      use: false, 
      path: 'connection.log'
    },
    auth: {
      use: false, 
      path: 'auth.log'
    },
    attack:{
      use: false,
      path:'attack.log'
    }
  },
  useQuota:{
    signalSize: false,
    publishCounter: false,
    trafficRate: false,
    disconnect: false
  },
  defaultQuotaIndex: 0,
  adminLevel: 255,

  debug:{
    slow: false,
    delay: 500,
    showAuthInfo: false
  },

  retain:{
    isAvailable: true,
    limitSize: 100000,
    limitCounter: 1000
  },

  publishLocalAddress:{
    use: false,
    url: '',
    ch: ''
  },

  auth:{
    delay_auth_fail: 1000,
  }

}


