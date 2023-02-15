import logger from '../../../logger';
import { PacketType } from '../packet-builders';
import { UDPConnectionModule } from '../udp-connection';

const log = logger(__filename);

export const UDPSensorRotationModule: UDPConnectionModule = {
  async reduce(state, action) {
    return state;
  },
  observe({ udpContext, rootContext }) {
    udpContext.events.on(PacketType.PACKET_ROTATION, (data) => {
      // log.info({ rot: data }, 'rot');
    });
    udpContext.events.on(PacketType.PACKET_ROTATION_2, (data) => {
      // log.info({ rot: data }, 'rot');
    });
    udpContext.events.on(PacketType.PACKET_ROTATION_DATA, ({ sensorId, rotation }) => {
      const tracker = udpContext.getTrackerContext(sensorId, rootContext);
      if (!tracker) return;
      tracker.dispatch({ type: 'tracker/set-rotation', rotation: { ...rotation, w: 0 } });
    });
  }
};
