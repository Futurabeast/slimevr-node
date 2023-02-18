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
  trackerId.trackerNum = tracker.id.id;
  if (tracker.deviceId) {
    const deviceId = new DeviceIdT();
    deviceId.id = tracker.deviceId;
    trackerId.deviceId = deviceId;
  }
  trackerData.trackerId = trackerId;

  if (mask.rotation) {
    const rot = new QuatT(tracker.rotation.x, tracker.rotation.y, tracker.rotation.z, tracker.rotation.w);
    trackerData.rotation = rot;
  }

  if (mask.status) trackerData.status = tracker.status;

  if (mask.info) {
    const trackerInfo = new TrackerInfoT();
    if (tracker?.sensorType) {
      trackerInfo.imuType = tracker.sensorType;
    }
    trackerInfo.bodyPart = tracker.bodyPart;
    trackerData.info = trackerInfo;
  }

  return trackerData;
}
