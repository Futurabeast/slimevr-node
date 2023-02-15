import { dirname, relative } from 'path';
import pino from 'pino';
import { LOG_LEVEL } from './config';

const root = dirname(__filename);

const stripExtension = (path: string) => path.slice(0, path.lastIndexOf('.'));

export default function logger(url: string, isPath = true) {
  return pino({
    base: { name: isPath ? stripExtension(relative(root, url)) : url },
    level: LOG_LEVEL
  });
}
