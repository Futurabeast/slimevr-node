import { TrackerModule } from './tracker';

export const TrackerRotationModule: TrackerModule = {
  reduce(state, action) {
    if (action.type === 'tracker/set-rotation') {
      return {
        ...state,
        rotation: action.rotation
      };
    }
    return state;
  }
};
