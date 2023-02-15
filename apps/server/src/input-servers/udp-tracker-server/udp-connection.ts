import { RemoteInfo, Socket } from 'dgram';
import { ConfigContext } from '../../config/config';
import { ID, RootContextContext } from '../../context';
import { DeviceContext } from '../../device/device';
import { Context, ContextReducer, createContext } from '../../events';
import { TrackerContext, TrackerIdNum } from '../../tracker/tracker';
import { UDPDeviceBatteryModule } from './device/battery';
import { UDPNewPacketModule } from './new-packet';
import { InboundPackets, PacketBuilder, PacketReturnType, PacketType, writePacket } from './packet-builders';
import { UDPPingModule } from './ping';
import { UDPSensorRotationModule } from './sensor/rotation';
import { UDPSensorModule } from './sensor/sensor';

export type UDPConnectionState = {
  id: string;
  lastPacket: number;
  lastPacketNum: bigint;
  lastPing: {
    id: number;
    startTime: number;
    duration: number;
  };
  handshook: boolean;
  address: string;
  port: number;
  trackerIds: TrackerIdNum[];
  deviceId?: number;
};

export type UDPConnectionActions =
  | { type: 'udp/update-last-packet'; time: number }
  | { type: 'udp/set-packet-num'; num: bigint }
  | { type: 'udp/received-pong'; id: number; duration: number }
  | { type: 'udp/assign-tracker'; trackerId: TrackerIdNum }
  | { type: 'udp/handshook'; deviceId: ID }
  | { type: 'udp/start-ping'; startTime: number };

export type UDPConnectionEvents<T extends InboundPackets = InboundPackets> = {
  'udp-connection:update': (context: UDPConnectionState) => void;
  'udp-connection:new-packet': <T extends InboundPackets>(
    id: T['id'],
    packetNumber: bigint,
    packet: PacketReturnType<T>,
    rinfo: RemoteInfo
  ) => void;
} & {
  [K in T['id']]: (packet: PacketReturnType<T, K>, rinfo: RemoteInfo) => void;
};

type SendPacketFn = <ID extends PacketType, T, W, B extends PacketBuilder<ID, T, W>>(
  packetBuilder: B,
  packetNum: bigint,
  data: W
) => void;

export type UDPConnectionContext = Context<UDPConnectionState, UDPConnectionActions, UDPConnectionEvents> & {
  socket: Socket;
  sendPacket: SendPacketFn;
  getTrackerContext: (sensorId: number, rootContext: RootContextContext) => TrackerContext | null;
  getDeviceContext: (rootContext: RootContextContext) => DeviceContext | null;
};

export type UDPConnectionModule = {
  observe: (props: {
    udpContext: UDPConnectionContext;
    rootContext: RootContextContext;
    configContext: ConfigContext;
  }) => void;
  reduce: ContextReducer<UDPConnectionState, UDPConnectionActions>;
};

const modules: UDPConnectionModule[] = [
  UDPNewPacketModule,
  UDPPingModule,
  UDPSensorModule,
  UDPSensorRotationModule,
  UDPDeviceBatteryModule
];

export function createUdpConnectionContext({
  id,
  socket,
  rootContext,
  configContext,
  rinfo
}: {
  id: string;
  socket: Socket;
  rinfo: RemoteInfo;
  rootContext: RootContextContext;
  configContext: ConfigContext;
}): UDPConnectionContext {
  const context = createContext<UDPConnectionState, UDPConnectionActions, UDPConnectionEvents>({
    initialState: {
      id,
      lastPacket: Date.now(),
      lastPacketNum: BigInt(0),
      lastPing: {
        id: 0,
        duration: 0,
        startTime: 0
      },
      handshook: false,
      address: rinfo.address,
      port: rinfo.port,
      trackerIds: []
    },
    stateEvent: 'udp-connection:update',
    stateReducer: async (state, action) =>
      modules.reduce<Promise<UDPConnectionState>>(
        async (intermediate, { reduce }) => reduce(await intermediate, action),
        new Promise((res) => res(state))
      )
  });

  const udpContext: UDPConnectionContext = {
    ...context,
    socket,
    sendPacket: (packetBuilder, packetNum, data) => {
      const { address, port } = context.getState();
      context.dispatch({ type: 'udp/set-packet-num', num: packetNum });
      const buff = writePacket(packetBuilder, packetNum, data);
      socket.send(buff, port, address);
    },
    getTrackerContext: (sensorId, rootContext) => {
      const { trackerIds } = context.getState();
      const tracker = trackerIds.find(({ trackerNum }) => trackerNum == sensorId);

      if (!tracker) return null;

      const { trackers } = rootContext.getState();
      return trackers[tracker.id];
    },
    getDeviceContext: (rootContext) => {
      const { deviceId } = context.getState();

      if (!deviceId) return null;

      const { devices } = rootContext.getState();
      return devices[deviceId];
    }
  };

  modules.forEach(({ observe }) => observe({ udpContext, rootContext, configContext }));

  return udpContext;
}
