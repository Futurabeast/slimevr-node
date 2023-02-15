import {
  DataFeedConfigT,
  DeviceDataT,
  DeviceIdT,
  HardwareInfoT,
  HardwareStatusT,
  TrackerDataMaskT
} from 'solarxr-protocol';
import { DeviceState } from '../../../device/device';
import { DeepReadonly } from '../../../events';
import { TrackerState } from '../../../tracker/tracker';
import { createDatafeedTracker } from './tracker';

export function createDatafeedDevice(
  device: DeepReadonly<DeviceState>,
  trackers: DeepReadonly<TrackerState>[],
  config: DataFeedConfigT
) {
  const deviceData = new DeviceDataT();

  if (config.dataMask?.deviceData) {
    deviceData.customName = device.name;

    const hardwareInfos = new HardwareInfoT();
    hardwareInfos.displayName = device.name;
    deviceData.hardwareInfo = hardwareInfos;

    const hardwareStatus = new HardwareStatusT();
    hardwareStatus.batteryPctEstimate = device.battery.level * 100;
    hardwareStatus.batteryVoltage = device.battery.voltage;
    deviceData.hardwareStatus = hardwareStatus;

    const deviceId = new DeviceIdT();
    deviceId.id = device.id;
    deviceData.id = deviceId;
  }

  if (config.dataMask?.trackerData) {
    deviceData.trackers = trackers.map((tracker) =>
      createDatafeedTracker(device, tracker, config.dataMask?.trackerData || new TrackerDataMaskT())
    );
  }

  return deviceData;
}
