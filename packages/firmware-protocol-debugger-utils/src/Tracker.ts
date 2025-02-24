import {
  BoardType,
  DeviceBoundHandshakePacket,
  DeviceBoundPingPacket,
  DeviceBoundSensorInfoPacket,
  IncomingCalibrationFinishedPacket,
  IncomingCorrectionDataPacket,
  IncomingErrorPacket,
  IncomingFusedIMUDataPacket,
  IncomingGyroPacket,
  IncomingHeartbeatPacket,
  IncomingMagnetometerAccuracyPacket,
  IncomingRawCalibrationDataPacket,
  IncomingRawIMUDataPacket,
  IncomingRotationPacket,
  IncomingSignalStrengthPacket,
  IncomingTapPacket,
  IncomingTemperaturePacket,
  MCUType,
  PacketWithSensorId,
  parse,
  Protocol,
  SensorStatus,
  ServerBoundAccelPacket,
  ServerBoundBatteryLevelPacket,
  ServerBoundHandshakePacket,
  ServerBoundPongPacket,
  ServerBoundRotationDataPacket,
  ServerBoundSensorInfoPacket
} from '@slimevr/firmware-protocol';
import { Socket } from 'dgram';
import { createWriteStream, WriteStream } from 'fs';
import type { ConnectionTracker } from './ConnectionTracker';
import { Events } from './Events';
import {
  correctionDataDumpFile,
  fusedIMUDataDumpFile,
  rawIMUDataDumpFile,
  shouldDumpAllPacketsRaw,
  shouldDumpCorrectionDataProcessed,
  shouldDumpCorrectionDataRaw,
  shouldDumpFusedDataProcessed,
  shouldDumpFusedDataRaw,
  shouldDumpRawIMUDataProcessed,
  shouldDumpRawIMUDataRaw
} from './flags';
import { Sensor } from './Sensor';
import { serializeTracker } from './serialization';
import { VectorAggregator } from './VectorAggretator';

export class Tracker {
  private _packetNumber = BigInt(0);
  private handshook = false;
  private lastPacket = Date.now();
  private lastPing = {
    id: 0,
    startTimestamp: 0,
    duration: 0
  };

  private _mac = '';
  private protocol = Protocol.UNKNOWN;
  private firmware = '';
  private firmwareBuild = -1;
  private mcuType = MCUType.UNKNOWN;
  private boardType = BoardType.UNKNOWN;

  private sensors: Sensor[] = [];
  private signalStrength = 0;
  private batteryVoltage = 0;
  private batteryPercentage = 0;

  private readonly fusedRotation = new VectorAggregator(4);
  private readonly correctedRotation = new VectorAggregator(4);
  private readonly rawRotation = new VectorAggregator(3);
  private readonly rawAcceleration = new VectorAggregator(3);
  private readonly rawMagnetometer = new VectorAggregator(3);

  private readonly rawIMUDataRawStream: WriteStream | null = null;
  private readonly fusedIMUDataRawStream: WriteStream | null = null;
  private readonly correctionDataRawStream: WriteStream | null = null;

  constructor(
    private readonly events: Events,
    private readonly socket: Socket,
    private readonly connectionTracker: ConnectionTracker,
    private readonly _ip: string,
    private readonly _port: number
  ) {
    if (rawIMUDataDumpFile() !== '') {
      this.log(`Dumping raw IMU data to ${rawIMUDataDumpFile()}`);

      this.rawIMUDataRawStream = createWriteStream(rawIMUDataDumpFile(), 'utf8');
      this.rawIMUDataRawStream.write('timestamp,rX,rY,rZ,rA,aX,aY,aZ,aAmX,mY,mZ,mA\n');
    } else {
      this.rawIMUDataRawStream = null;
    }

    if (fusedIMUDataDumpFile() !== '') {
      this.log(`Dumping fused IMU data to ${fusedIMUDataDumpFile()}`);

      this.fusedIMUDataRawStream = createWriteStream(fusedIMUDataDumpFile(), 'utf8');
      this.fusedIMUDataRawStream.write('timestamp,x,y,z,w\n');
    } else {
      this.fusedIMUDataRawStream = null;
    }

    if (correctionDataDumpFile()) {
      this.log(`Dumping correction data to ${correctionDataDumpFile()}`);

      this.correctionDataRawStream = createWriteStream(correctionDataDumpFile(), 'utf8');
      this.correctionDataRawStream.write('timestamp,x,y,z,w\n');
    } else {
      this.correctionDataRawStream = null;
    }
  }

  get alive() {
    return this.lastPacket > Date.now() - 1000;
  }

  private log(msg: string) {
    console.log(`[Tracker:${this._ip}] ${msg}`);
  }

  handle(msg: Buffer) {
    const packet = parse(msg, false);
    if (packet === null) {
      this.log(`Received unknown packet (${msg.length} bytes): ${msg.toString('hex')}`);

      return;
    }

    if (!this.isNextPacket(packet.number)) {
      this.log(`Received packet with wrong packet number: ${packet.number}`);
    }

    this.lastPacket = Date.now();

    if (shouldDumpAllPacketsRaw()) {
      this.log(packet.toString());
    }

    switch (packet.type) {
      case IncomingHeartbeatPacket.type: {
        this.log('Received heartbeat');

        break;
      }

      case IncomingRotationPacket.type: {
        const rotation = packet as IncomingRotationPacket;

        this.handleSensorPacket(ServerBoundRotationDataPacket.fromRotationPacket(rotation));

        break;
      }

      case IncomingGyroPacket.type: {
        const rot = packet as IncomingGyroPacket;

        this.log(`Gyroscope: ${rot.rotation.join(', ')}`);

        break;
      }

      case ServerBoundHandshakePacket.type: {
        const handshake = packet as ServerBoundHandshakePacket;

        this._mac = handshake.mac;
        this.protocol = handshake.firmware === '' ? Protocol.OWO_LEGACY : Protocol.SLIMEVR_RAW;
        this.firmware = handshake.firmware;
        this.firmwareBuild = handshake.firmwareBuild;
        this.mcuType = handshake.mcuType;
        this.boardType = handshake.boardType;

        const existingConnection = this.connectionTracker.getConnectionByMAC(handshake.mac);

        if (existingConnection) {
          this.log(`Removing existing connection for MAC ${handshake.mac}`);
          this.connectionTracker.removeConnectionByMAC(handshake.mac);
        }

        this.connectionTracker.addConnection(this);

        this.handshook = true;

        if (this.protocol === Protocol.OWO_LEGACY || this.firmwareBuild < 9) {
          const buf = ServerBoundSensorInfoPacket.encode(0n, 0, SensorStatus.OK, handshake.imuType);

          this.handleSensorPacket(new ServerBoundSensorInfoPacket(packet.number, buf));
        }

        this.socket.send(DeviceBoundHandshakePacket.encode(), this._port, this._ip);

        break;
      }

      case ServerBoundAccelPacket.type: {
        const accel = packet as ServerBoundAccelPacket;

        this.log(`Acceleration: ${accel.acceleration.join(', ')}`);

        break;
      }

      case IncomingRawCalibrationDataPacket.type: {
        const rawCalibrationData = packet as IncomingRawCalibrationDataPacket;

        this.handleSensorPacket(rawCalibrationData);

        break;
      }

      case IncomingCalibrationFinishedPacket.type: {
        const calibrationFinished = packet as IncomingCalibrationFinishedPacket;

        this.handleSensorPacket(calibrationFinished);

        break;
      }

      case ServerBoundPongPacket.type: {
        const pong = packet as ServerBoundPongPacket;

        if (pong.id !== this.lastPing.id + 1) {
          this.log('Ping ID does not match, ignoring');
        } else {
          this.lastPing.duration = Date.now() - this.lastPing.startTimestamp;
          this.lastPing.id = pong.id;

          this.log(`Received pong in ${this.lastPing.duration}ms`);

          this.events.emit('tracker:changed', serializeTracker(this));
        }

        break;
      }

      case ServerBoundBatteryLevelPacket.type: {
        const batteryLevel = packet as ServerBoundBatteryLevelPacket;

        this.batteryVoltage = batteryLevel.voltage;
        this.batteryPercentage = batteryLevel.percentage;

        this.log(`Battery level changed to ${this.batteryVoltage}V (${this.batteryPercentage}%)`);

        this.events.emit('tracker:changed', serializeTracker(this));

        break;
      }

      case IncomingTapPacket.type: {
        const tap = packet as IncomingTapPacket;

        this.handleSensorPacket(tap);

        break;
      }

      case IncomingErrorPacket.type: {
        const error = packet as IncomingErrorPacket;

        this.handleSensorPacket(error);

        break;
      }

      case ServerBoundSensorInfoPacket.type: {
        const sensorInfo = packet as ServerBoundSensorInfoPacket;

        this.log('Received sensor info');

        this.handleSensorPacket(sensorInfo);

        this.socket.send(
          DeviceBoundSensorInfoPacket.encode(sensorInfo.sensorId, sensorInfo.sensorStatus),
          this._port,
          this._ip
        );

        break;
      }

      case ServerBoundRotationDataPacket.type: {
        const rotation = packet as ServerBoundRotationDataPacket;

        this.handleSensorPacket(rotation);

        break;
      }

      case IncomingMagnetometerAccuracyPacket.type: {
        const magnetometerAccuracy = packet as IncomingMagnetometerAccuracyPacket;

        this.handleSensorPacket(magnetometerAccuracy);

        break;
      }

      case IncomingSignalStrengthPacket.type: {
        const signalStrength = packet as IncomingSignalStrengthPacket;

        this.signalStrength = signalStrength.signalStrength;

        this.log(`Signal strength changed to ${this.signalStrength}`);

        this.events.emit('tracker:changed', serializeTracker(this));

        break;
      }

      case IncomingTemperaturePacket.type: {
        const temperature = packet as IncomingTemperaturePacket;

        this.handleSensorPacket(temperature);

        break;
      }

      case IncomingRawIMUDataPacket.type: {
        const raw = packet as IncomingRawIMUDataPacket;

        if (shouldDumpRawIMUDataRaw()) {
          this.log(raw.toString());
        }

        this.rawRotation.update(raw.rotation);
        this.rawAcceleration.update(raw.acceleration);
        this.rawMagnetometer.update(raw.magnetometer);

        if (shouldDumpRawIMUDataProcessed()) {
          this.log(`Raw | ROT | ${this.rawRotation.toString()}`);
          this.log(`Raw | ACC | ${this.rawAcceleration.toString()}`);
          this.log(`Raw | MAG | ${this.rawMagnetometer.toString()}`);
        }

        if (this.rawIMUDataRawStream !== null) {
          const csv =
            [
              Date.now(),
              ...raw.rotation,
              raw.rotationAccuracy,
              ...raw.acceleration,
              raw.accelerationAccuracy,
              ...raw.magnetometer,
              raw.magnetometerAccuracy
            ].join(',') + '\n';
          this.rawIMUDataRawStream.write(csv);
        }

        break;
      }

      case IncomingFusedIMUDataPacket.type: {
        const fused = packet as IncomingFusedIMUDataPacket;

        if (shouldDumpFusedDataRaw()) {
          this.log(fused.toString());
        }

        this.fusedRotation.update(fused.quaternion);

        if (shouldDumpFusedDataProcessed()) {
          this.log(`Fused | ${this.fusedRotation.toString()}`);
        }

        if (this.fusedIMUDataRawStream !== null) {
          const csv = [Date.now(), ...fused.quaternion].join(',') + '\n';
          this.fusedIMUDataRawStream.write(csv);
        }

        break;
      }

      case IncomingCorrectionDataPacket.type: {
        const correction = packet as IncomingCorrectionDataPacket;

        if (shouldDumpCorrectionDataRaw()) {
          this.log(correction.toString());
        }

        this.correctedRotation.update(correction.quaternion);

        if (shouldDumpCorrectionDataProcessed()) {
          this.log(`Correction | ${this.correctedRotation.toString()}`);
        }

        if (this.correctionDataRawStream !== null) {
          const csv = [Date.now(), ...correction.quaternion].join(',') + '\n';
          this.correctionDataRawStream.write(csv);
        }

        break;
      }
    }
  }

  isNextPacket(packetNumber: bigint) {
    if (packetNumber >= BigInt(0)) {
      this._packetNumber = packetNumber;

      return true;
    }

    if (this._packetNumber < packetNumber) {
      return false;
    }

    this._packetNumber = packetNumber;

    return true;
  }

  ping() {
    this.lastPing.startTimestamp = Date.now();

    this._packetNumber = this._packetNumber + BigInt(1);

    this.socket.send(DeviceBoundPingPacket.encode(this._packetNumber, this.lastPing.id + 1), this._port, this._ip);

    this.log('Sent ping');
  }

  handleSensorPacket(packet: PacketWithSensorId) {
    const sensor = this.sensors[packet.sensorId];

    if (!sensor) {
      this.log(`Setting up sensor ${packet.sensorId}`);

      if (!(packet instanceof ServerBoundSensorInfoPacket)) {
        this.log(`Packet ${packet} is not an ServerBoundSensorInfoPacket`);

        return;
      }

      const sensor = (this.sensors[packet.sensorId] = new Sensor(
        this,
        this.events,
        packet.sensorType,
        packet.sensorId
      ));

      this.log(`Added sensor ${packet.sensorId}`);

      sensor.handle(packet);

      return;
    }

    sensor.handle(packet);
  }

  getIP(): string {
    return this._ip;
  }

  getPort(): number {
    return this._port;
  }

  getMAC(): string {
    return this._mac;
  }

  getProtocol(): Protocol {
    return this.protocol;
  }

  getCurrentPacketNumber(): bigint {
    return this._packetNumber;
  }

  getSignalStrength(): number {
    return this.signalStrength;
  }

  getPing(): number {
    return this.lastPing.duration;
  }

  getBatteryPercentage(): number {
    return this.batteryPercentage;
  }

  getBatteryVoltage(): number {
    return this.batteryVoltage;
  }

  getSensors(): Record<number, Sensor> {
    return this.sensors;
  }

  getMCUType(): MCUType {
    return this.mcuType;
  }

  getFirmware(): string {
    return this.firmware;
  }

  getFirmwareBuild(): number {
    return this.firmwareBuild;
  }

  getBoardType(): BoardType {
    return this.boardType;
  }
}
