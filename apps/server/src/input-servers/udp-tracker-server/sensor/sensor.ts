import { hardwareId } from '../../../hardware-id';
import { createTrackerContext, TrackerActions } from '../../../tracker/tracker';
import { PacketType } from '../packet-builders';
import { UDPConnectionModule } from '../udp-connection';

export const UDPSensorModule: UDPConnectionModule = {
  reduce(state, action) {
    if (action.type === 'udp/assign-tracker') {
      return {
        ...state,
        trackerIds: [...state.trackerIds, action.trackerId]
      };
    }
    return state;
  },
  observe({ udpContext, rootContext, configContext }) {
    udpContext.events.on(PacketType.PACKET_SENSOR_INFO, async ({ sensorId, sensorType, sensorStatus }) => {
      // Get the tacker context from the received sensor id
      const trackerContext = udpContext.getTrackerContext(sensorId, rootContext);

      const statusUpdatePayload: TrackerActions = {
        type: 'tracker/set-infos',
        sensorType,
        status: sensorStatus
      };

      // If we already have a tracker context we just update the status and sensor type
      if (trackerContext) {
        trackerContext.dispatch(statusUpdatePayload);
      } else {
        const deviceContext = udpContext.getDeviceContext(rootContext);
        if (deviceContext == null) {
          throw new Error('Invalid state, the device should exist at this point');
        }
        const deviceState = deviceContext.getState();

        // If we dont have one we create a new context then send the status and sensor type
        const trackerId = rootContext.nextHandleId();
        const newTrackerContext = await createTrackerContext({
          id: { id: trackerId, trackerNum: sensorId },
          hardwareId: hardwareId(deviceState.hardwareAddress, sensorId),
          rootContext,
          configContext
        });
        newTrackerContext.events.once('tracker:update', () => {
          rootContext.dispatch({
            type: 'server/new-tracker',
            id: trackerId,
            context: newTrackerContext
          });
          udpContext.dispatch({ type: 'udp/assign-tracker', trackerId: { id: trackerId, trackerNum: sensorId } });
          newTrackerContext.dispatch(statusUpdatePayload);
          newTrackerContext.dispatch({
            type: 'tracker/link-device',
            deviceId: deviceState.id
          });
        });
      }
    });
  }
};
