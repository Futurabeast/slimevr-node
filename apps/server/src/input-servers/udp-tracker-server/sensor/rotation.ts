import { Euler, Quaternion } from '@ros2jsguy/three-math-ts';
import logger from '../../../logger';
import { PacketType } from '../packet-builders';
import { UDPConnectionModule } from '../udp-connection';

const log = logger(__filename);

export const UDPSensorRotationModule: UDPConnectionModule = {
  reduce(state, action) {
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
      tracker.dispatch({
        type: 'tracker/set-rotation',
        rotation: new Quaternion().setFromEuler(new Euler(rotation.x, rotation.y, rotation.z))
      });
    });
  }
};
