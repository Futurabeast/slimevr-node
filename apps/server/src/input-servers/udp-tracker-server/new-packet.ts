import { createDeviceContext } from '../../device/device';
import logger from '../../logger';
import { PacketHandshake, PacketHandshakeBuilder, PacketType } from './packet-builders';
import { UDPConnectionModule } from './udp-connection';

const log = logger(__filename);

export const UDPNewPacketModule: UDPConnectionModule = {
  async reduce(state, action) {
    if (action.type === 'udp/update-last-packet') {
      return {
        ...state,
        lastPacket: action.time
      };
    }
    if (action.type === 'udp/set-packet-num') {
      return {
        ...state,
        lastPacketNum: action.num
      };
    }
    if (action.type === 'udp/handshook') {
      return {
        ...state,
        deviceId: action.deviceId,
        handshook: true
      };
    }
    return state;
  },
  observe({ udpContext, rootContext }) {
    udpContext.events.on('udp-connection:new-packet', async (id, packetNumber, packet, rinfo) => {
      const { lastPacketNum, lastPacket, deviceId, handshook } = udpContext.getState();
      if (Date.now() - lastPacket > 5000 && packetNumber === BigInt(0)) {
        udpContext.dispatch({ type: 'udp/set-packet-num', num: BigInt(-1) });
        log.info({ address: rinfo.address }, 'Reconnecting');
      } else if (packetNumber < lastPacketNum) {
        log.warn({ lastPacketNum, packetNumber }, 'Received packet with wrong packet number');
        return;
      }
      udpContext.dispatch({ type: 'udp/update-last-packet', time: Date.now() });

      if (id === PacketType.PACKET_HANDSHAKE) {
        const handshakeData = packet as PacketHandshake;

        if (!deviceId) {
          const deviceId = rootContext.nextHandleId();
          const newDeviceContext = await createDeviceContext({
            id: deviceId,
            // I make sure we have an hardwareAddress because it is the uinique key for the device/tracker config
            hardwareAddress:
              handshakeData.macString === '00:00:00:00:00:00'
                ? `${rinfo.address}:${rinfo.port}`
                : handshakeData.macString,
            rootContext
          });
          rootContext.dispatch({
            type: 'server/new-device',
            id: deviceId,
            context: newDeviceContext
          });

          rootContext.events.once('context:update', () => {
            udpContext.dispatch({ type: 'udp/handshook', deviceId });
            udpContext.sendPacket(PacketHandshakeBuilder, BigInt(0), {} as never);
          });
        } else {
          udpContext.sendPacket(PacketHandshakeBuilder, BigInt(0), {} as never);
        }
      }

      if (!handshook) return;
      // Could not find how to strictly type that bit
      udpContext.events.emit(id, packet as any, rinfo);
    });
  }
};
