import { TrackerModule } from './tracker';

export const TrackerLinkDeviceModule: TrackerModule = {
  async reduce(state, action) {
    if (action.type === 'tracker/link-device') {
      return {
        ...state,
        deviceId: action.deviceId
      };
    }
    return state;
  }
};
