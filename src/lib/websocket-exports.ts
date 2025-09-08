// Re-export websocket functions from the main websocket module
export { 
  getActiveCounselorsCount, 
  getIO,
  emitEmergencyBroadcast,
  emitCrisisAlert,
  notifyUser,
  notifyCounselors,
  isUserOnline,
  initWebSocket,
  CrisisEvents,
  WEBSOCKET_EVENTS,
  Rooms
} from './websocket';