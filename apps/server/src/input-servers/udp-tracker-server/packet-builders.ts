import { ReturnTypeOfMethod } from 'strict-event-emitter-types/types/src/index';

export type Packet<T> = Readonly<T>;
export type PacketBuilder<ID extends PacketType, T, W = T> = {
  id: ID;
  writeSize: number | ((data: W) => number);
  write: (buff: Buffer, data: W) => void;
  read: (buff: Buffer) => T;
};

export enum PacketType {
  PACKET_HEARTBEAT = 0,
  PACKET_ROTATION = 1,
  PACKET_HANDSHAKE = 3,
  PACKET_ACCEL = 4,
  PACKET_PING_PONG = 10,
  PACKET_SERIAL = 11,
  PACKET_BATTERY_LEVEL = 12,
  PACKET_TAP = 13,
  PACKET_ERROR = 14,
  PACKET_SENSOR_INFO = 15,
  PACKET_ROTATION_2 = 16, // Deprecated
  PACKET_ROTATION_DATA = 17,
  PACKET_MAGNETOMETER_ACCURACY = 18,
  PACKET_SIGNAL_STRENGTH = 19,
  PACKET_TEMPERATURE = 20,
  PACKET_USER_ACTION = 21,
  PACKET_PROTOCOL_CHANGE = 200
}

export type PacketHeartbeat = Packet<unknown>;
export const PacketHeartbeatBuilder: PacketBuilder<PacketType.PACKET_HEARTBEAT, PacketHeartbeat> = {
  id: PacketType.PACKET_HEARTBEAT,
  writeSize: 0,
  read: (buff) => ({}),
  write: (buff, data) => ({})
};

export type PacketHandshake = Packet<{
  boardType: number;
  imuType: number;
  mcuType: number;
  firmwareBuild: number;
  firmware: string;
  macString: string;
}>;
export const PacketHandshakeBuilder: PacketBuilder<PacketType.PACKET_HANDSHAKE, PacketHandshake, void> = {
  id: PacketType.PACKET_HANDSHAKE,
  writeSize: 14,
  read: (buff) => ({
    boardType: buff.readInt32BE(0),
    imuType: buff.readInt32BE(4),
    mcuType: buff.readInt32BE(8),
    firmwareBuild: buff.readInt32BE(20),
    firmware: buff.toString('ascii', 25, buff.readInt8(21)),
    macString: Array.from(buff.subarray(26, 26 + 6))
      .map((n) => n.toString(16).padStart(2, '0'))
      .join(':')
  }),
  write: (buff) => {
    buff.writeUint8(PacketType.PACKET_HANDSHAKE);
    buff.write('Hey OVR =D 5', 1, 'ascii');
  }
};

export type PacketRotation = Packet<{ sensorId: number; x: number; y: number; z: number }>;
export const PacketRotationBuilder: PacketBuilder<PacketType.PACKET_ROTATION, PacketRotation> = {
  id: PacketType.PACKET_ROTATION,
  writeSize: 13,
  read: (buff) => ({
    sensorId: buff.readInt8(0),
    x: buff.readFloatBE(1),
    y: buff.readFloatBE(5),
    z: buff.readFloatBE(9)
  }),
  write: (buff, data) => {
    buff.writeFloatBE(data.x, 0);
    buff.writeFloatBE(data.x, 0);
    buff.writeFloatBE(data.y, 4);
    buff.writeFloatBE(data.z, 8);
  }
};

export type PacketPingPong = Packet<{ pingId: number }>;
export const PacketPingPongBuilder: PacketBuilder<PacketType.PACKET_PING_PONG, PacketPingPong> = {
  id: PacketType.PACKET_PING_PONG,
  writeSize: 4,
  read: (buff) => ({
    pingId: buff.readInt32BE(0)
  }),
  write: (buff, data) => {
    buff.writeInt32BE(data.pingId, 0);
  }
};

export type PacketAccel = Packet<{ x: number; y: number; z: number }>;
export const PacketAccelBuilder: PacketBuilder<PacketType.PACKET_ACCEL, PacketAccel> = {
  id: PacketType.PACKET_ACCEL,
  writeSize: 12,
  read: (buff) => ({
    x: buff.readFloatBE(0),
    y: buff.readFloatBE(4),
    z: buff.readFloatBE(8)
  }),
  write: (buff, data) => {
    buff.writeFloatBE(data.x, 0);
    buff.writeFloatBE(data.y, 4);
    buff.writeFloatBE(data.z, 8);
  }
};

export type PacketSerial = Packet<{ serial: string }>;
export const PacketSerialBuilder: PacketBuilder<PacketType.PACKET_SERIAL, PacketSerial> = {
  id: PacketType.PACKET_SERIAL,
  writeSize: 0,
  read: (buff) => ({
    serial: buff.toString('ascii', 4, 4 + buff.readInt32BE(0))
  }),
  write: (buff, data) => {
    buff.writeInt32BE(data.serial.length, 0);
    buff.write(data.serial, 'ascii');
  }
};

export type PacketBatteryLevel = Packet<{ voltage: number; level: number }>;
export const PacketBatteryLevelBuilder: PacketBuilder<PacketType.PACKET_BATTERY_LEVEL, PacketBatteryLevel> = {
  id: PacketType.PACKET_BATTERY_LEVEL,
  writeSize: 0,
  read: (buff) => ({
    voltage: buff.readFloatBE(0),
    level: buff.readFloatBE(4)
  }),
  write: (buff, data) => {
    buff.writeFloatBE(data.level, 0);
    buff.writeFloatBE(data.level, 4);
  }
};

export type PacketTap = Packet<{ sensorId: number }>;
export const PacketTapBuilder: PacketBuilder<PacketType.PACKET_TAP, PacketTap> = {
  id: PacketType.PACKET_TAP,
  writeSize: 0,
  read: (buff) => ({
    sensorId: buff.readInt8(0)
  }),
  write: (buff, data) => {
    buff.writeInt8(data.sensorId, 0);
  }
};

export type PackeError = Packet<{ sensorId: number; errorNumber: number }>;
export const PackeErrorBuilder: PacketBuilder<PacketType.PACKET_ERROR, PackeError> = {
  id: PacketType.PACKET_ERROR,
  writeSize: 0,
  read: (buff) => ({
    sensorId: buff.readInt8(0),
    errorNumber: buff.readInt8(1)
  }),
  write: (buff, data) => {
    buff.writeInt8(data.sensorId, 0);
    buff.writeInt8(data.errorNumber, 1);
  }
};

export type PacketSensorInfo = Packet<{ sensorId: number; sensorStatus: number; sensorType: number }>;
export const PacketSensorInfoBuilder: PacketBuilder<PacketType.PACKET_SENSOR_INFO, PacketSensorInfo> = {
  id: PacketType.PACKET_SENSOR_INFO,
  writeSize: 0,
  read: (buff) => ({
    sensorId: buff.readInt8(0),
    sensorStatus: buff.readInt8(1),
    sensorType: buff.readInt8(2)
  }),
  write: (buff, data) => {
    buff.writeInt8(data.sensorId, 0);
    buff.writeInt8(data.sensorStatus, 1);
    buff.writeInt8(data.sensorType, 2);
  }
};

export type PacketRotation2 = Packet<{ sensorId: number; x: number; y: number; z: number }>;
export const PacketRotation2Builder: PacketBuilder<PacketType.PACKET_ROTATION_2, PacketRotation2> = {
  id: PacketType.PACKET_ROTATION_2,
  writeSize: 12,
  read: (buff) => ({
    sensorId: buff.readUInt8(0),
    x: buff.readFloatBE(1),
    y: buff.readFloatBE(5),
    z: buff.readFloatBE(9)
  }),
  write: (buff, data) => {
    buff.writeUInt8(data.sensorId, 0);
    buff.writeFloatBE(data.x, 1);
    buff.writeFloatBE(data.y, 5);
    buff.writeFloatBE(data.z, 9);
  }
};

export type PacketRotationData = Packet<{
  sensorId: number;
  dataType: number;
  rotation: { x: number; y: number; z: number };
  calibrationInfo: number;
}>;
export const PacketRotationDataBuilder: PacketBuilder<PacketType.PACKET_ROTATION_DATA, PacketRotationData> = {
  id: PacketType.PACKET_ROTATION_DATA,
  writeSize: 15,
  read: (buff) => ({
    sensorId: buff.readInt8(0),
    dataType: buff.readInt8(1),
    rotation: {
      x: buff.readFloatBE(2),
      y: buff.readFloatBE(6),
      z: buff.readFloatBE(10)
    },
    calibrationInfo: buff.readInt8(11)
  }),
  write: (buff, data) => {
    buff.writeInt8(data.sensorId, 0);
    buff.writeInt8(data.dataType, 1);
    buff.writeFloatBE(data.rotation.x, 2);
    buff.writeFloatBE(data.rotation.y, 6);
    buff.writeFloatBE(data.rotation.z, 10);
    buff.writeInt8(data.calibrationInfo, 11);
  }
};

export type PacketMagnetometerAccuracy = Packet<{ sensorId: number; accuracyInfo: number }>;
export const PacketMagnetometerAccuracyBuilder: PacketBuilder<
  PacketType.PACKET_MAGNETOMETER_ACCURACY,
  PacketMagnetometerAccuracy
> = {
  id: PacketType.PACKET_MAGNETOMETER_ACCURACY,
  writeSize: 0,
  read: (buff) => ({
    sensorId: buff.readInt8(0),
    accuracyInfo: buff.readFloatBE(1)
  }),
  write: (buff, data) => {
    buff.writeInt8(data.sensorId, 0);
    buff.writeFloatBE(data.accuracyInfo, 1);
  }
};

export type PacketSignalStrengh = Packet<{ sensorId: number; signalStrength: number }>;
export const PacketSignalStrenghBuilder: PacketBuilder<PacketType.PACKET_SIGNAL_STRENGTH, PacketSignalStrengh> = {
  id: PacketType.PACKET_SIGNAL_STRENGTH,
  writeSize: 0,
  read: (buff) => ({
    sensorId: buff.readInt8(0),
    signalStrength: buff.readInt8(1)
  }),
  write: (buff, data) => {
    buff.writeInt8(data.sensorId, 0);
    buff.writeInt8(data.signalStrength, 1);
  }
};

export type PacketTemperature = Packet<{ sensorId: number; temperature: number }>;
export const PacketTemperatureBuilder: PacketBuilder<PacketType.PACKET_TEMPERATURE, PacketTemperature> = {
  id: PacketType.PACKET_TEMPERATURE,
  writeSize: 0,
  read: (buff) => ({
    sensorId: buff.readInt8(0),
    temperature: buff.readFloatBE(1)
  }),
  write: (buff, data) => {
    buff.writeInt8(data.sensorId, 0);
    buff.writeFloatBE(data.temperature, 1);
  }
};

export type PacketUserAction = Packet<{ type: number }>;
export const PacketUserActionBuilder: PacketBuilder<PacketType.PACKET_USER_ACTION, PacketUserAction> = {
  id: PacketType.PACKET_USER_ACTION,
  writeSize: 0,
  read: (buff) => ({
    type: buff.readInt8(0)
  }),
  write: (buff, data) => {
    buff.writeInt8(data.type, 0);
  }
};

export type PacketProtocolChange = Packet<{ targetProtocol: number; targetProtocolVersion: number }>;
export const PacketProtocolChangeBuilder: PacketBuilder<PacketType.PACKET_PROTOCOL_CHANGE, PacketProtocolChange> = {
  id: PacketType.PACKET_PROTOCOL_CHANGE,
  writeSize: 0,
  read: (buff) => ({
    targetProtocol: buff.readInt8(0),
    targetProtocolVersion: buff.readInt8(0)
  }),
  write: (buff, data) => {
    buff.writeInt8(data.targetProtocol, 0);
    buff.writeInt8(data.targetProtocolVersion, 1);
  }
};

const builders = [
  PacketHandshakeBuilder,
  PacketRotationBuilder,
  PacketHeartbeatBuilder,
  PacketPingPongBuilder,
  PacketAccelBuilder,
  PacketSerialBuilder,
  PacketBatteryLevelBuilder,
  PacketTapBuilder,
  PackeErrorBuilder,
  PacketSensorInfoBuilder,
  PacketRotation2Builder,
  PacketRotationDataBuilder,
  PacketMagnetometerAccuracyBuilder,
  PacketSignalStrenghBuilder,
  PacketTemperatureBuilder,
  PacketUserActionBuilder,
  PacketProtocolChangeBuilder
];

export const inboundPacketBuilders = {
  [PacketHandshakeBuilder['id']]: PacketHandshakeBuilder,
  [PacketRotationBuilder['id']]: PacketRotationBuilder,
  [PacketHeartbeatBuilder['id']]: PacketHeartbeatBuilder,
  [PacketPingPongBuilder['id']]: PacketPingPongBuilder,
  [PacketAccelBuilder['id']]: PacketAccelBuilder,
  [PacketSerialBuilder['id']]: PacketSerialBuilder,
  [PacketBatteryLevelBuilder['id']]: PacketBatteryLevelBuilder,
  [PacketTapBuilder['id']]: PacketTapBuilder,
  [PackeErrorBuilder['id']]: PackeErrorBuilder,
  [PacketSensorInfoBuilder['id']]: PacketSensorInfoBuilder,
  [PacketRotation2Builder['id']]: PacketRotation2Builder,
  [PacketRotationDataBuilder['id']]: PacketRotationDataBuilder,
  [PacketMagnetometerAccuracyBuilder['id']]: PacketMagnetometerAccuracyBuilder,
  [PacketSignalStrenghBuilder['id']]: PacketSignalStrenghBuilder,
  [PacketTemperatureBuilder['id']]: PacketTemperatureBuilder,
  [PacketUserActionBuilder['id']]: PacketUserActionBuilder,
  [PacketProtocolChangeBuilder['id']]: PacketProtocolChangeBuilder
};

export type InboundPackets = typeof builders[number];
export type PacketReturnType<T extends InboundPackets, K = T['id']> = ReturnTypeOfMethod<Extract<T, { id: K }>['read']>;

export const writePacket = <ID extends PacketType, T, W, B extends PacketBuilder<ID, T, W>>(
  builder: B,
  packetNumber: bigint,
  data: W
) => {
  const shouldWriteHeader = builder.id !== PacketType.PACKET_HANDSHAKE;

  const packetSize = typeof builder.writeSize === 'function' ? builder.writeSize(data) : builder.writeSize;

  const packetBuff = Buffer.alloc(packetSize);
  builder.write(packetBuff, data);

  if (shouldWriteHeader) {
    const buff = Buffer.alloc(4 + 8);
    buff.writeInt32BE(builder.id, 0);
    buff.writeBigInt64BE(packetNumber, 4);
    return Buffer.concat([buff, packetBuff]);
  } else {
    return packetBuff;
  }
};
