import { aiter } from 'iterator-helper';
import { setInterval } from 'timers/promises';
import { eventStream } from '../../event-utils';
import logger from '../../logger';
import { PacketHeartbeatBuilder, PacketType } from './packet-builders';
import { UDPConnectionModule } from './udp-connection';

const log = logger(__filename);

export const UDPPingModule: UDPConnectionModule = {
  async reduce(state, action) {
    if (action.type === 'udp/start-ping') {
      return {
        ...state,
        lastPing: {
          ...state.lastPing,
          startTime: action.startTime
        }
      };
    }
    if (action.type === 'udp/received-pong') {
      return {
        ...state,
        lastPing: {
          ...state.lastPing,
          duration: action.duration,
          id: action.id
        }
      };
    }
    return state;
  },

  observe({ udpContext }) {
    aiter(setInterval(1000, {}, { signal: udpContext.signal, ref: false })).forEach(() => {
      const { lastPing, lastPacketNum, handshook } = udpContext.getState();
      if (!handshook) return;
      udpContext.dispatch({ type: 'udp/start-ping', startTime: Date.now() });
      udpContext.sendPacket(PacketHeartbeatBuilder, lastPacketNum + BigInt(1), { pingId: lastPing.id + 1 });
    });

    aiter(eventStream(udpContext.events, PacketType.PACKET_PING_PONG, { signal: udpContext.signal })).forEach(
      ([{ pingId }]) => {
        const { lastPing } = udpContext.getState();
        if (pingId !== lastPing.id + 1) {
          log.warn('Ping ID Does not match, ignoring');
          return;
        }
        const duration = Date.now() - lastPing.startTime;
        udpContext.dispatch({ type: 'udp/received-pong', id: pingId, duration });
        log.debug(`Received pong in ${duration}ms`);
      }
    );
  }
};
