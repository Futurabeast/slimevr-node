import logger from '../logger';
import { TrackerModule } from './tracker';

const log = logger(__filename);

export const TrackerRotationModule: TrackerModule = {
  async reduce(state, action) {
    if (action.type === 'tracker/set-rotation') {
      return {
        ...state,
        rotation: action.rotation
      };
    }
    return state;
  }
};
