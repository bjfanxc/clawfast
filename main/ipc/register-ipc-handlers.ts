import type { IpcRegistrationContext } from './types'
import { registerGatewayWindowIpc } from './register-gateway-window-ipc'
import { registerChatSkillsIpc } from './register-chat-skills-ipc'
import { registerOpsIpc } from './register-ops-ipc'
import { registerDataIpc } from './register-data-ipc'

export function registerIpcHandlers(context: IpcRegistrationContext) {
  registerGatewayWindowIpc(context)
  registerChatSkillsIpc(context)
  registerOpsIpc(context)
  registerDataIpc(context)
}
