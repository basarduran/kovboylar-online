const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  transports: ["websocket"],
  pingInterval: 10000,
  pingTimeout: 20000
});

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const WIN_SCORE = 5;
const START_NO_FIRE_MS = 1000;
const FINAL_CUTSCENE_MS = 2000;
const HIT_INVULNERABLE_MS = 500;
const TICK_MS = 1000 / 90; // v19: 90 FPS sunucu tick

const CANVAS = { w: 1000, h: 600 };
const movementBand = CANVAS.h / 3;
const topBand = { minY: 18, maxY: movementBand - 70 };
const bottomBand = { minY: CANVAS.h - movementBand + 18, maxY: CANVAS.h - 70 };

const TEAM = {
  top: { team: "Yankeeler", hat: "#2f5d8f", coat: "#477cc2", pants: "#17263f", dir: 1 },
  bottom: { team: "Redneckler", hat: "#8f2f2f", coat: "#c24b3e", pants: "#4a1712", dir: -1 }
};

const rooms = new Map();

function cleanRoomCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

function makeRoomCode(preferredCode = "") {
  const preferred = cleanRoomCode(preferredCode);
  if (preferred) return preferred;

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = "";
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  } while (rooms.has(code));
  return code;
}

function newPlayer(role) {
  const isTop = role === "top";
  const t = isTop ? TEAM.top : TEAM.bottom;
  return {
    x: CANVAS.w / 2 - 27,
    y: isTop ? 50 : CANVAS.h - 118,
    w: 54,
    h: 68,
    speed: 360,
    dir: t.dir,
    role,
    team: t.team,
    hat: t.hat,
    coat: t.coat,
    pants: t.pants,
    skin: "#d5965e",
    ammo: 6,
    maxAmmo: 6,
    reloading: false,
    reloadEnd: 0,
    fireLock: false,
    invulnerableUntil: 0,
    hitFlashUntil: 0
  };
}

function freshState(matchTop = 0, matchBottom = 0) {
  const now = Date.now();
  return {
    mode: "playing",
    scoreTop: 0,
    scoreBottom: 0,
    matchTop,
    matchBottom,
    top: newPlayer("top"),
    bottom: newPlayer("bottom"),
    bullets: [],
    nextBulletId: 1,
    fireDisabledUntil: now + START_NO_FIRE_MS,
    finalStart: 0,
    finalWinner: "",
    finalLoserRole: "",
    matchWinCounted: false
  };
}

function createRoom(ownerSocket, preferredCode = "") {
  const code = makeRoomCode(preferredCode);
  const room = {
    code,
    players: new Map(),
    inputs: new Map(),
    state: freshState(0, 0),
    lastTick: Date.now(),
    interval: null
  };
  rooms.set(code, room);
  assignPlayer(room, ownerSocket, "top");
  room.interval = setInterval(() => tickRoom(room), TICK_MS);
  return room;
}

function assignPlayer(room, socket, role) {
  socket.join(room.code);
  socket.data.roomCode = room.code;
  socket.data.role = role;
  room.players.set(socket.id, { id: socket.id, role });
  room.inputs.set(socket.id, { left: false, right: false, fire: false });
  socket.emit("joined", { code: room.code, role });
  emitRoomInfo(room);
}

function emitRoomInfo(room) {
  const count = room.players.size;
  io.to(room.code).emit("roomInfo", { code: room.code, count });
}

function cleanupRoom(room) {
  if (room.interval) clearInterval(room.interval);
  rooms.delete(room.code);
}

function getSocketByRole(room, role) {
  for (const [id, p] of room.players.entries()) {
    if (p.role === role) return id;
  }
  return null;
}

function getInputByRole(room, role) {
  const socketId = getSocketByRole(room, role);
  return socketId ? (room.inputs.get(socketId) || { left: false, right: false, fire: false }) : { left: false, right: false, fire: false };
}

function tickRoom(room) {
  const now = Date.now();
  const dt = Math.min(0.05, (now - room.lastTick) / 1000);
  room.lastTick = now;

  const s = room.state;

  if (s.mode === "playing") {
    updatePlayer(s.top, getInputByRole(room, "top"), topBand, dt, now, s);
    updatePlayer(s.bottom, getInputByRole(room, "bottom"), bottomBand, dt, now, s);
    updateBullets(room, dt, now);
  } else if (s.mode === "finalCutscene") {
    if (now - s.finalStart >= FINAL_CUTSCENE_MS) {
      s.mode = "matchOver";
    }
  }

  if (s.mode === "playing") {
    io.to(room.code).volatile.compress(false).emit("state", s);
  } else {
    io.to(room.code).emit("state", s);
  }
}

function updatePlayer(player, input, band, dt, now, state) {
  if (input.left) player.x -= player.speed * dt;
  if (input.right) player.x += player.speed * dt;

  player.x = clamp(player.x, 22, CANVAS.w - player.w - 22);
  player.y = clamp(player.y, band.minY, band.maxY);

  if (player.reloading && now >= player.reloadEnd) {
    player.reloading = false;
    player.ammo = player.maxAmmo;
  }

  const fireBlocked = state.fireDisabledUntil && now < state.fireDisabledUntil;

  if (input.fire && !player.fireLock && !player.reloading && !fireBlocked) {
    shoot(player, state, now);
    player.fireLock = true;
  }

  if (!input.fire) player.fireLock = false;
}

function shoot(player, state, now) {
  if (player.ammo <= 0) return;
  player.ammo--;

  state.bullets.push({
    id: state.nextBulletId++,
    x: player.x + player.w / 2 - 3,
    y: player.dir === 1 ? player.y + player.h - 4 : player.y - 12,
    w: 6,
    h: 28,
    vy: 620 * player.dir,
    ownerRole: player.role,
    color: player.dir === 1 ? "#65d9ff" : "#ffdf5d"
  });

  if (player.ammo === 0) {
    player.reloading = true;
    player.reloadEnd = now + 1000;
  }
}

function updateBullets(room, dt, now) {
  const s = room.state;

  for (let i = s.bullets.length - 1; i >= 0; i--) {
    const b = s.bullets[i];
    b.y += b.vy * dt;

    if (b.y < -70 || b.y > CANVAS.h + 70) {
      s.bullets.splice(i, 1);
      continue;
    }

    const target = b.ownerRole === "top" ? s.bottom : s.top;
    if (rectsOverlap(b, target)) {
      // Vurulma sonrası 0,5 sn boyunca tekrar vurulamaz.
      if (target.invulnerableUntil && now < target.invulnerableUntil) {
        s.bullets.splice(i, 1);
        continue;
      }
      roundHit(room, b.ownerRole, target.role, now, target);
      break;
    }
  }
}

function roundHit(room, winnerRole, loserRole, now, targetPlayer) {
  const s = room.state;
  s.bullets = [];

  if (targetPlayer) {
    targetPlayer.invulnerableUntil = now + HIT_INVULNERABLE_MS;
    targetPlayer.hitFlashUntil = now + HIT_INVULNERABLE_MS;
  }

  if (winnerRole === "top") s.scoreTop++;
  else s.scoreBottom++;

  if (s.scoreTop >= WIN_SCORE || s.scoreBottom >= WIN_SCORE) {
    const winnerName = winnerRole === "top" ? TEAM.top.team : TEAM.bottom.team;
    if (!s.matchWinCounted) {
      if (winnerRole === "top") s.matchTop++;
      else s.matchBottom++;
      s.matchWinCounted = true;
    }
    s.mode = "finalCutscene";
    s.finalStart = now;
    s.finalWinner = winnerName;
    s.finalLoserRole = loserRole;
  }

  const target = loserRole === "top" ? s.top : s.bottom;
  io.to(room.code).emit("hitEffect", {
    role: loserRole,
    x: target.x + target.w / 2,
    y: target.y + target.h / 2,
    until: now + HIT_INVULNERABLE_MS
  });

  // Her skor sonrası konum korunur. Sadece mermiler temizlenir.
}

function restartRoom(room) {
  const old = room.state;
  room.state = freshState(old.matchTop || 0, old.matchBottom || 0);
  room.lastTick = Date.now();
  io.to(room.code).emit("state", room.state);
}

io.on("connection", (socket) => {
  socket.on("createRoom", (payload = {}) => {
    const preferredCode = cleanRoomCode(payload.code);
    if (preferredCode && preferredCode.length < 3) {
      socket.emit("createError", { message: "Oda kodu en az 3 karakter olmalı." });
      return;
    }

    if (preferredCode && rooms.has(preferredCode)) {
      socket.emit("createError", { message: "Bu oda kodu kullanılıyor. Başka kod seç." });
      return;
    }

    const room = createRoom(socket, preferredCode);
    socket.emit("roomCreated", { code: room.code });
  });

  socket.on("joinRoom", ({ code }) => {
    const cleanCode = cleanRoomCode(code);
    const room = rooms.get(cleanCode);

    if (!room) {
      socket.emit("joinError", { message: "Bu oda bulunamadı. Kodu kontrol et." });
      return;
    }

    if (room.players.size >= 2) {
      socket.emit("joinError", { message: "Bu oda dolu." });
      return;
    }

    const role = getSocketByRole(room, "top") ? "bottom" : "top";
    assignPlayer(room, socket, role);
  });

  socket.on("input", (input) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || !room.players.has(socket.id)) return;

    room.inputs.set(socket.id, {
      left: !!input.left,
      right: !!input.right,
      fire: !!input.fire
    });
  });

  socket.on("restart", () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || !room.players.has(socket.id)) return;
    restartRoom(room);
  });

  socket.on("disconnect", () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return;

    room.players.delete(socket.id);
    room.inputs.delete(socket.id);
    emitRoomInfo(room);

    if (room.players.size === 0) {
      cleanupRoom(room);
    }
  });
});

function rectsOverlap(a, b) {
  return a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

server.listen(PORT, () => {
  console.log(`Yankeeler vs Redneckler v20 server running on port ${PORT}`);
});
