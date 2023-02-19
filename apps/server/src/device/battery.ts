import { DeviceModule } from './device';

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
