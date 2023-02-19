import { TrackerModule } from './tracker';

export const TrackerInfosModule: TrackerModule = {
  reduce(state, action) {
    if (action.type === 'tracker/set-infos') {
      return {
        ...state,
        sensorType: action.sensorType !== undefined ? action.sensorType : state.sensorType,
        status: action.status !== undefined ? action.status : state.status
      };
    }
    return state;
  }
};
