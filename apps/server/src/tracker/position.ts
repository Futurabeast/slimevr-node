import { TrackerModule } from './tracker';

export const TrackerPositionModule: TrackerModule = {
  reduce(state, action) {
    if (action.type === 'tracker/set-position') {
      return {
        ...state,
        position: action.position
      };
    }
    return state;
  }
};
