import { Remote } from './sockets/RemoteWebSocket.js'
import { Boho, RAND, MBP, BohoMsg, Meta, MetaSize , sha256, Buffer } from 'boho'

Boho.RAND = RAND;
Boho.BohoMsg = BohoMsg;
Boho.Meta = Meta;
Boho.MetaSize = MetaSize;
Boho.sha256 = sha256;
Remote.Boho = Boho;
Remote.MBP = MBP;
Remote.Buffer = Buffer;

export default Remote;
