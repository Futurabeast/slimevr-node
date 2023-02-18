import fs from 'fs/promises';
import { aiter } from 'iterator-helper';
import { homedir } from 'os';
import { join } from 'path';
import { BodyPart } from 'solarxr-protocol';
import { eventStream } from '../event-utils';
import { Context, ContextReducer, createContext } from '../events';
import { debounce } from '../iterators';
import logger from '../logger';
import { TrackerConfigModule } from './tracker';

const logs = logger(__filename);

export type TrackerConfig = {
  name: string;
  bodyPart: BodyPart;
};

export type ConfigState = {
  version: number;
  trackers: Record<string, TrackerConfig | undefined>;
};

export type ConfigActions = { type: 'config/set-tracker-config'; id: string; config: TrackerConfig };

export type ConfigEvents = {
  'config:update': (state: ConfigState) => void;
};

export type ConfigContext = Context<ConfigState, ConfigActions, ConfigEvents>;

export type ConfigModule = {
  observe?: (props: { configContext: ConfigContext }) => void;
  reduce?: ContextReducer<ConfigState, ConfigActions>;
};

const modules: ConfigModule[] = [TrackerConfigModule];

const SLIME_FOLDER = join(homedir(), 'SlimeVR');
const SLIME_CONFIG_FILE = join(SLIME_FOLDER, 'config.json');

const INITIAL_CONFIG_STATE = {
  version: 1,
  trackers: {}
};

const loadConfigFile = async (): Promise<ConfigState> => {
  const content = await fs.readFile(SLIME_CONFIG_FILE).catch(() => null);
  if (!content) {
    return INITIAL_CONFIG_STATE;
  }
  logs.info('Loading config file');
  return JSON.parse(content.toString());
};

const saveConfigFile = async (config: ConfigState) => {
  if (!(await fs.stat(SLIME_FOLDER).catch(() => false))) {
    await fs.mkdir(SLIME_FOLDER, { recursive: true });
  }
  logs.info('Saving config file');
  await fs.writeFile(SLIME_CONFIG_FILE, JSON.stringify(config, null, 2));
};

export async function createConfigContext(): Promise<ConfigContext> {
  const context = createContext<ConfigState, ConfigActions, ConfigEvents>({
    initialState: await loadConfigFile(),
    stateEvent: 'config:update',
    stateReducer: (state, action) =>
      modules.reduce<ConfigState>(
        (intermediate, { reduce }) => (reduce ? reduce(intermediate, action) : intermediate),
        state
      )
  });

  aiter(debounce(eventStream(context.events, 'config:update'), 1000)).forEach(
    async ([config]) => await saveConfigFile(config)
  );

  modules.forEach(({ observe }) => {
    if (observe) observe({ configContext: context });
  });

  return context;
}
