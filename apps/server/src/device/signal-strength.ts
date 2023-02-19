import { DeviceModule } from './device';

export const DeviceSignalStrengthModule: DeviceModule = {
  reduce(state, action) {
    if (action.type === 'device/set-signal-strength') {
      return {
        ...state,
        signalStrength: action.signalStrength
      };
    }
    return state;
  }
};
