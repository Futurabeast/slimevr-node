import logger from '../../../logger';
import { PacketType } from '../packet-builders';
import { UDPConnectionModule } from '../udp-connection';

const log = logger(__filename);

export const UDPDeviceBatteryModule: UDPConnectionModule = {
  reduce(state) {
    return state;
  },
  observe({ udpContext, rootContext }) {
    udpContext.events.on(PacketType.PACKET_BATTERY_LEVEL, ({ level, voltage }) => {
      const deviceContext = udpContext.getDeviceContext(rootContext);
      if (!deviceContext) return;
      deviceContext.dispatch({ type: 'device/set-battery', level, voltage });
    });
  }
};
