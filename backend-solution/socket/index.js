const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next();
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      return next();
    } catch (error) {
      return next(error);
    }
  });

  io.on("connection", (socket) => {
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      io.emit("presence:update", { userId: socket.userId, online: true });
    }

    socket.on("chat:join", ({ userId }) => {
      if (userId) {
        socket.join(`user:${userId}`);
      }
    });

    socket.on("chat:typing", ({ to, from }) => {
      if (to) {
        io.to(`user:${to}`).emit("chat:typing", { from });
      }
    });

    socket.on("chat:stop-typing", ({ to, from }) => {
      if (to) {
        io.to(`user:${to}`).emit("chat:stop-typing", { from });
      }
    });

    socket.on("disconnect", () => {
      if (socket.userId) {
        io.emit("presence:update", { userId: socket.userId, online: false });
      }
    });
  });

  return io;
};

module.exports = setupSocket;
