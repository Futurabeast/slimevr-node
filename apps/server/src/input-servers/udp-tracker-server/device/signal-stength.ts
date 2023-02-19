import { PacketType } from '../packet-builders';
import { UDPConnectionModule } from '../udp-connection';

export const UDPDeviceSignalStrengthModule: UDPConnectionModule = {
  reduce(state) {
    return state;
  },
  observe({ udpContext, rootContext }) {
    udpContext.events.on(PacketType.PACKET_SIGNAL_STRENGTH, ({ signalStrength }) => {
      const deviceContext = udpContext.getDeviceContext(rootContext);
      if (!deviceContext) return;
      deviceContext.dispatch({ type: 'device/set-signal-strength', signalStrength });
    });
  }
};
