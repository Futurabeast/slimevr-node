import { messages } from '@slimevr/driver-protobuf-messages';
import { BodyPart, TrackerStatus } from 'solarxr-protocol';
import { ConfigContext } from '../config/config';
import { ID, RootContextContext } from '../context';
import { createDeviceContext } from '../device/device';
import { hardwareId } from '../hardware-id';
import logger from '../logger';
import { createTrackerContext } from '../tracker/tracker';

enum TrackerRole {
  NONE = 0,
  WAIST = 1,
  LEFT_FOOT = 2,
  RIGHT_FOOT = 3,
  CHEST = 4,
  LEFT_KNEE = 5,
  RIGHT_KNEE = 6,
  LEFT_ELBOW = 7,
  RIGHT_ELBOW = 8,
  LEFT_SHOULDER = 9,
  RIGHT_SHOULDER = 10,
  LEFT_HAND = 11,
  RIGHT_HAND = 12,
  LEFT_CONTROLLER = 13,
  RIGHT_CONTROLLER = 14,
  HEAD = 15,
  NECK = 16,
  CAMERA = 17,
  KEYBOARD = 18,
  HMD = 19,
  BEACON = 20,
  GENERIC_CONTROLLER = 21
}

const trackerRoleToBodyPartMapping = {
  [TrackerRole.NONE]: BodyPart.NONE,
  [TrackerRole.HEAD]: BodyPart.NONE,
  [TrackerRole.CAMERA]: BodyPart.NONE,
  [TrackerRole.KEYBOARD]: BodyPart.NONE,
  [TrackerRole.BEACON]: BodyPart.NONE,
  [TrackerRole.GENERIC_CONTROLLER]: BodyPart.NONE,
  [TrackerRole.HMD]: BodyPart.HEAD,
  [TrackerRole.NECK]: BodyPart.NECK,
  [TrackerRole.CHEST]: BodyPart.CHEST,
  [TrackerRole.WAIST]: BodyPart.HIP,
  [TrackerRole.LEFT_KNEE]: BodyPart.LEFT_UPPER_LEG,
  [TrackerRole.RIGHT_KNEE]: BodyPart.RIGHT_UPPER_LEG,
  [TrackerRole.LEFT_FOOT]: BodyPart.LEFT_FOOT,
  [TrackerRole.RIGHT_FOOT]: BodyPart.RIGHT_FOOT,
  [TrackerRole.LEFT_CONTROLLER]: BodyPart.LEFT_CONTROLLER,
  [TrackerRole.RIGHT_CONTROLLER]: BodyPart.RIGHT_CONTROLLER,
  [TrackerRole.LEFT_ELBOW]: BodyPart.LEFT_LOWER_ARM,
  [TrackerRole.RIGHT_ELBOW]: BodyPart.RIGHT_LOWER_ARM,
  [TrackerRole.LEFT_SHOULDER]: BodyPart.LEFT_UPPER_ARM,
  [TrackerRole.RIGHT_SHOULDER]: BodyPart.RIGHT_UPPER_ARM,
  [TrackerRole.LEFT_HAND]: BodyPart.LEFT_HAND,
  [TrackerRole.RIGHT_HAND]: BodyPart.RIGHT_HAND,
  [TrackerRole.LEFT_SHOULDER]: BodyPart.LEFT_SHOULDER
};

export async function handleProtobufMessages(
  msg: Buffer,
  logs: ReturnType<typeof logger>,
  trackerIdMapping: Record<number, ID>,
  origin: 'feeder' | 'driver',
  {
    rootContext,
    configContext
  }: {
    rootContext: RootContextContext;
    configContext: ConfigContext;
  }
) {
  const size = msg.readInt32LE(0) - 4;
  const data = msg.subarray(4);

  const error = messages.ProtobufMessage.verify(data);
  if (error) {
    logs.warn(error, 'unable to parse protobuf message');
    return;
  }

  const decoded = messages.ProtobufMessage.decode(data, size);
  if (decoded.message === 'trackerAdded' && decoded.trackerAdded) {
    const deviceId = rootContext.nextHandleId();
    const deviceHardwareAddress = `slimevr-${origin}://${decoded.trackerAdded.trackerSerial}`;
    const newDeviceContext = await createDeviceContext({
      id: deviceId,
      hardwareAddress: deviceHardwareAddress,
      rootContext,
      origin
    });
    rootContext.dispatch(
      {
        type: 'server/new-device',
        id: deviceId,
        context: newDeviceContext
      },
      async () => {
        const trackerId = rootContext.nextHandleId();
        const newTrackerContext = await createTrackerContext({
          id: trackerId,
          hardwareId: hardwareId(deviceHardwareAddress, 0),
          rootContext,
          configContext,
          origin
        });
        newTrackerContext.events.once('tracker:update', () => {
          rootContext.dispatch({
            type: 'server/new-tracker',
            id: trackerId,
            context: newTrackerContext
          });
          newTrackerContext.dispatch({
            type: 'tracker/set-infos',
            status: TrackerStatus.DISCONNECTED
          });
          newTrackerContext.dispatch({
            type: 'tracker/change-settings',
            bodyPart:
              (decoded.trackerAdded?.trackerRole &&
                trackerRoleToBodyPartMapping[decoded.trackerAdded.trackerRole as TrackerRole]) ||
              BodyPart.NONE
          });
          newTrackerContext.dispatch({
            type: 'tracker/link-device',
            deviceId: deviceId
          });
        });
        trackerIdMapping[decoded.trackerAdded?.trackerId || 0] = trackerId;
      }
    );
  }
  if (decoded.message === 'trackerStatus' && decoded.trackerStatus) {
    const trackerId = trackerIdMapping[decoded.trackerStatus?.trackerId || 0];
    const trackerContext = rootContext.getTrackerContext(trackerId);
    if (!trackerContext) {
      logs.warn({ id: decoded.trackerStatus.trackerId }, 'unknown tracker id');
      return;
    }

    trackerContext.dispatch({
      type: 'tracker/set-infos',
      status: (decoded.trackerStatus?.status?.valueOf() as TrackerStatus) + 1 || TrackerStatus.NONE
    });
  }
  if (decoded.message === 'position' && decoded.position) {
    const trackerId = trackerIdMapping[decoded.position?.trackerId || 0];
    const trackerContext = rootContext.getTrackerContext(trackerId);
    if (!trackerContext) {
      logs.warn({ id: decoded.position.trackerId }, 'unknown tracker id');
      return;
    }
    trackerContext.dispatch({
      type: 'tracker/set-position',
      position: { x: decoded.position.x || 0, y: decoded.position.y || 0, z: decoded.position.z || 0 }
    });
    trackerContext.dispatch({
      type: 'tracker/set-rotation',
      rotation: {
        x: decoded.position.qx || 0,
        z: decoded.position.qx || 0,
        y: decoded.position.qx || 0,
        w: decoded.position.qw || 0
      }
    });
  }
  if (decoded.message === 'userAction' && decoded.userAction) {
    switch (decoded.userAction.name) {
      case 'reset':
        logs.info('Reset triggered');
        break;
      case 'fast_reset':
        logs.info('Fast Reset triggered');
        break;
      default:
        logs.warn('unimplemented action');
        break;
    }
  }
}
