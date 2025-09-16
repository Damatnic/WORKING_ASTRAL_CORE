// WebSocket exports index
export {
  initWebSocket,
  getIO,
  emitCrisisAlert,
  emitEmergencyBroadcast,
  notifyUser,
  notifyCounselors,
  getActiveCounselorsCount,
  isUserOnline,
  CrisisEvents,
  WEBSOCKET_EVENTS,
  Rooms
} from '../websocket';

export type { Socket, SocketIOServer } from '../websocket';