import { DeviceIdT, QuatT, TrackerDataMaskT, TrackerDataT, TrackerIdT, TrackerInfoT } from 'solarxr-protocol';
import { DeviceState } from '../../../device/device';
import { DeepReadonly } from '../../../events';
import { TrackerState } from '../../../tracker/tracker';

export function createDatafeedTracker(
  device: DeepReadonly<DeviceState>,
  tracker: DeepReadonly<TrackerState>,
  mask: TrackerDataMaskT
) {
  const trackerData = new TrackerDataT();

  const trackerId = new TrackerIdT();
  trackerId.trackerNum = tracker.id.trackerNum;
  if (tracker.deviceId) {
    const deviceId = new DeviceIdT();
    deviceId.id = tracker.deviceId;
    trackerId.deviceId = deviceId;
  }
  trackerData.trackerId = trackerId;

  if (mask.rotation) {
    const rot = new QuatT(tracker.rotation.x, tracker.rotation.y, tracker.rotation.z, 1);
    trackerData.rotation = rot;
  }

  if (mask.status && tracker.infos?.status) trackerData.status = tracker.infos?.status;

  if (mask.info) {
    const trackerInfo = new TrackerInfoT();

    if (tracker.infos?.sensorType) {
      trackerInfo.imuType = tracker.infos?.sensorType;
    }
    trackerData.info = trackerInfo;
  }

  return trackerData;
}
