import { ConfigModule } from './config';

export const TrackerConfigModule: ConfigModule = {
  async reduce(state, action) {
    if (action.type === 'config/set-tracker-config') {
      return {
        ...state,
        trackers: {
          ...state.trackers,
          [action.id]: action.config
        }
      };
    }
    return state;
  }
};
