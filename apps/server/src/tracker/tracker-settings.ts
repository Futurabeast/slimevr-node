import { TrackerModule } from './tracker';

export const TrackerSettingsModule: TrackerModule = {
  async reduce(state, action) {
    if (action.type === 'tracker/change-settings') {
      return {
        ...state,
        bodyPart: action.bodyPart
      };
    }
    return state;
  }
};
