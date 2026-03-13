export const IPC_CHANNELS = {
  window: {
    minimize: 'window-minimize',
    maximize: 'window-maximize',
    close: 'window-close',
    openExternal: 'window-open-external',
  },
  gateway: {
    send: 'gateway-send',
    message: 'gateway-message',
    error: 'gateway-error',
    state: 'gateway-state',
  },
  chat: {
    history: 'chat:history',
  },
  skills: {
    list: 'skills:list',
    setEnabled: 'skills:set-enabled',
    update: 'skills:update',
    install: 'skills:install',
    openFolder: 'skills:open-folder',
  },
  channels: {
    list: 'channels:list',
  },
  cron: {
    snapshot: 'cron:snapshot',
    save: 'cron:save',
    toggle: 'cron:toggle',
    run: 'cron:run',
    remove: 'cron:remove',
  },
  sessions: {
    list: 'sessions:list',
    patch: 'sessions:patch',
    delete: 'sessions:delete',
  },
  usage: {
    overview: 'usage:overview',
    timeSeries: 'usage:timeseries',
    logs: 'usage:logs',
  },
  config: {
    get: 'config:get',
    set: 'config:set',
  },
  dashboard: {
    accessInfo: 'dashboard:access-info',
    overview: 'dashboard:overview',
  },
} as const

