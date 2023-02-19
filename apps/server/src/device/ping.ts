import { DeviceModule } from './device';

export const DevicePingModule: DeviceModule = {
  reduce(state, action) {
    if (action.type === 'device/update-ping') {
      return {
        ...state,
        ping: action.ping
      };
    }
    return state;
  }
};
