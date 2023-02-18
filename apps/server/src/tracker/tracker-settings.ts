import { TrackerModule } from './tracker';

export const TrackerSettingsModule: TrackerModule = {
  reduce(state, action) {
    if (action.type === 'tracker/change-settings') {
      return {
        ...state,
        bodyPart: action.bodyPart
      };
    }
    return state;
  }
};
