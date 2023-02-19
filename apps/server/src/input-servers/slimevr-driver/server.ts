import net from 'node:net';
import os from 'node:os';

import { ConfigContext } from '../../config/config';
import { ID, RootContextContext } from '../../context';
import logger from '../../logger';
import { handleProtobufMessages } from '../handle-protobuf-messages';

const logs = logger(__filename);

function plaformSocketPath(): string {
  switch (os.platform()) {
    case 'win32':
      return '\\\\.\\pipe\\SlimeVRDriver';
    default:
      throw new Error('unsupported platform');
  }
}

export function init({
  rootContext,
  configContext
}: {
  rootContext: RootContextContext;
  configContext: ConfigContext;
}) {
  const socketPath = plaformSocketPath();

  const server = net.createServer((stream) => {
    logs.info({ socket: socketPath }, 'Socket open');
    const trackerIdMapping: Record<ID, number> = {};

    stream.on('data', async (msg) => {
      handleProtobufMessages(msg, logs, trackerIdMapping, 'driver', { rootContext, configContext });
    });

    stream.on('end', () => {
      logs.info({ socket: socketPath }, 'Socket closed');
      server.close();
    });
  });
  server.listen(socketPath);
  server.on('error', (err) => {
    logs.error(err);
  });
}
