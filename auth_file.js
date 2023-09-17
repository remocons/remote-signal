
/*
  Authentication data sample.

  device props: ["did", "key", "cid", level ]

    did: ( device id ) authentication id.  maximum 8 chars.
    key: ( device key ) authentication key. no size limit.
    cid: ( communication id ) signal target id.  maximum 12 chars. 
    level:( quota level) <Number>   ref. /server/quotaTable.js

*/
export const authInfo = [
  ["did","passowrd","cid",0],
  ["device1","device1_key","device1_cid",0],
  ["device2","device2_key","device2_cid",0],
  ["uno","uno-key","uno",1],
  ["go","go-key","go",2],
  ["bro","bro-key","bro",3],
  ["admin","admin-key","admin",255],
]


