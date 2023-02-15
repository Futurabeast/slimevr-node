import { utils } from '@slimevr/firmware-protocol-debugger-utils';
import { createSocket, RemoteInfo } from 'node:dgram';
import { ReturnTypeOfMethod } from 'strict-event-emitter-types/types/src/index';
import { ConfigContext } from '../../config/config';
import { RootContextContext } from '../../context';
import logger from '../../logger';
import { inboundPacketBuilders, InboundPackets, PacketType } from './packet-builders';
import { createUdpConnectionContext } from './udp-connection';

const log = logger(__filename);
const addressBlacklist = utils.getBroadcastAddresses()[1];

export type InboundPacketEvents<T extends InboundPackets> = {
  [K in T['id']]: (packet: ReturnTypeOfMethod<Extract<T, { id: K }>['read']>, rinfo: RemoteInfo) => void;
};

export const init = ({
  rootContext,
  configContext
}: {
  rootContext: RootContextContext;
  configContext: ConfigContext;
}) => {
  const socket = createSocket('udp4');

  socket.on('error', (err) => {
    log.error(err, 'UDP Socket Error');
  });

  socket
    .once('listening', () => {
      log.info('UDP Socket listening');
    })
    .bind(6969, '0.0.0.0');

  socket.on('message', (msg, rinfo) => {
    if (addressBlacklist.includes(rinfo.address)) {
      return;
    }

    const packetId: PacketType = msg.readInt32BE(0);
    const packetNumber = msg.readBigInt64BE(4);

    const packetBuilder = inboundPacketBuilders[packetId];
    if (!packetBuilder) {
      log.warn({ hex: msg.toString('hex'), bytes: msg.length, packetId }, `Received unknown packet`);
      return;
    }
    const { id, read } = packetBuilder;
    const data = read(msg.subarray(12));

    log.debug({ id: PacketType[packetId] || packetId, payload: data }, 'received packet');

    const { udpConnections } = rootContext.getState();
    const connection = udpConnections[rinfo.address];

    if (connection) {
      connection.events.emit('udp-connection:new-packet', id, packetNumber, data, rinfo);
    } else {
      log.info({ address: rinfo.address }, 'new connection');
      const udpState = createUdpConnectionContext({ id: rinfo.address, socket, rootContext, rinfo, configContext });
      rootContext.dispatch({ type: 'udp/new-connection', id: rinfo.address, context: udpState });
      udpState.events.once('udp-connection:update', () => {
        udpState.events.emit('udp-connection:new-packet', id, packetNumber, data, rinfo);
      });
    }
  });

  process.on('SIGINT', async () => {
    socket.close();
  });
};
