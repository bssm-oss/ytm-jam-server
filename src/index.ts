import { WebSocket, WebSocketServer } from "ws";

type PlaybackState = {
  trackId: string | null;
  startedAt: number | null;
  paused: boolean;
  pausedAt: number | null;
  queue: string[];
};

type ClientToServer =
  | { t: "JOIN"; roomId: string }
  | { t: "PLAY"; trackId: string }
  | { t: "PAUSE" }
  | { t: "SEEK"; time: number }
  | { t: "QUEUE_ADD"; trackId: string }
  | { t: "SKIP" };

type ServerToClient = { t: "STATE"; state: PlaybackState };

type Room = {
  id: string;
  clients: Set<WebSocket>;
  state: PlaybackState;
};

const port = Number(process.env.PORT ?? "3000");
const rooms = new Map<string, Room>();
const sessionRoom = new WeakMap<WebSocket, string>();
const wss = new WebSocketServer({ port });

const createInitialState = (): PlaybackState => ({
  trackId: null,
  startedAt: null,
  paused: false,
  pausedAt: null,
  queue: [],
});

const getOrCreateRoom = (roomId: string): Room => {
  const existing = rooms.get(roomId);
  if (existing) {
    return existing;
  }

  const created: Room = {
    id: roomId,
    clients: new Set<WebSocket>(),
    state: createInitialState(),
  };

  rooms.set(roomId, created);
  return created;
};

const safeSend = (socket: WebSocket, payload: ServerToClient): void => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
};

const broadcastState = (room: Room): void => {
  const payload: ServerToClient = { t: "STATE", state: room.state };

  for (const client of room.clients) {
    safeSend(client, payload);
  }
};

const getCurrentPosition = (state: PlaybackState, now: number): number => {
  if (state.trackId === null) {
    return 0;
  }

  if (state.paused) {
    return state.pausedAt ?? 0;
  }

  if (state.startedAt === null) {
    return 0;
  }

  return Math.max(0, now - state.startedAt);
};

const applyEvent = (room: Room, event: ClientToServer): void => {
  const now = Date.now() / 1000;

  switch (event.t) {
    case "JOIN": {
      return;
    }
    case "PLAY": {
      room.state.trackId = event.trackId;
      room.state.startedAt = now;
      room.state.paused = false;
      room.state.pausedAt = null;
      return;
    }
    case "PAUSE": {
      room.state.pausedAt = getCurrentPosition(room.state, now);
      room.state.paused = true;
      return;
    }
    case "SEEK": {
      room.state.startedAt = now - event.time;
      if (room.state.paused) {
        room.state.pausedAt = event.time;
      }
      return;
    }
    case "QUEUE_ADD": {
      room.state.queue.push(event.trackId);
      return;
    }
    case "SKIP": {
      const nextTrack = room.state.queue.shift() ?? null;
      room.state.trackId = nextTrack;
      room.state.startedAt = nextTrack ? now : null;
      room.state.paused = false;
      room.state.pausedAt = null;
      return;
    }
  }
};

const parseEvent = (raw: string): ClientToServer | null => {
  try {
    const parsed = JSON.parse(raw) as { t?: string };
    if (!parsed || typeof parsed !== "object" || typeof parsed.t !== "string") {
      return null;
    }

    switch (parsed.t) {
      case "JOIN":
        if (typeof (parsed as { roomId?: unknown }).roomId === "string") {
          return parsed as ClientToServer;
        }
        return null;
      case "PLAY":
      case "QUEUE_ADD":
        if (typeof (parsed as { trackId?: unknown }).trackId === "string") {
          return parsed as ClientToServer;
        }
        return null;
      case "SEEK":
        if (typeof (parsed as { time?: unknown }).time === "number") {
          return parsed as ClientToServer;
        }
        return null;
      case "PAUSE":
      case "SKIP":
        return parsed as ClientToServer;
      default:
        return null;
    }
  } catch {
    return null;
  }
};

wss.on("connection", (socket) => {
  socket.on("message", (raw) => {
    const event = parseEvent(raw.toString());
    if (!event) {
      return;
    }

    if (event.t === "JOIN") {
      const room = getOrCreateRoom(event.roomId);

      const prevRoomId = sessionRoom.get(socket);
      if (prevRoomId) {
        const prevRoom = rooms.get(prevRoomId);
        prevRoom?.clients.delete(socket);
      }

      sessionRoom.set(socket, room.id);
      room.clients.add(socket);
      safeSend(socket, { t: "STATE", state: room.state });
      return;
    }

    const roomId = sessionRoom.get(socket);
    if (!roomId) {
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      return;
    }

    applyEvent(room, event);
    broadcastState(room);
  });

  socket.on("close", () => {
    const roomId = sessionRoom.get(socket);
    if (!roomId) {
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      return;
    }

    room.clients.delete(socket);
    sessionRoom.delete(socket);
  });
});

console.log(`[ytm-jam-server] listening on :${port}`);
