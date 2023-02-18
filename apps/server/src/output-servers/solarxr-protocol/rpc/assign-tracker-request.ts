import { aiter } from 'iterator-helper';
import { RpcMessage } from 'solarxr-protocol';
import { eventStream } from '../../../event-utils';
import logger from '../../../logger';
import { SolarXRConnectionModule } from '../solarxr-connection';

const logs = logger(__filename);

export const RpcAssignTrackerReqXRModule: SolarXRConnectionModule = {
  observe({ solarXRContext, rootContext }) {
    aiter(eventStream(solarXRContext.rpcEvents, RpcMessage.AssignTrackerRequest)).forEach(
      ([{ trackerId, allowDriftCompensation, displayName, bodyPosition }]) => {
        const tracker = rootContext.getTrackerContext(trackerId);
        if (!tracker) {
          logs.warn({ trackerId }, 'unknown tracker id');
          return;
        }

        tracker.dispatch(
          {
            type: 'tracker/change-settings',
            allowDriftCompensation,
            displayName: displayName?.toString(),
            bodyPart: bodyPosition
          },
          () => {
            tracker.saveTracker();
          }
        );
      }
    );
  }
};
