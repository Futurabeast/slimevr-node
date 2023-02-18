import logger from '../logger';
import { DeviceModule } from './device';

const log = logger(__filename);

export const DeviceBatteryModule: DeviceModule = {
  reduce(state, action) {
    if (action.type === 'device/set-battery') {
      return {
        ...state,
        battery: {
          level: action.level,
          voltage: action.voltage
        }
      };
    }
    return state;
  }
};
