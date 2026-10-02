const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const rooms = new Map();

io.on("connection", (socket) => {
  console.log("CONNECTED:", socket.id);

  socket.on("join-room", (roomId) => {
    console.log(`${socket.id} wants to join ${roomId}`);

    let room = rooms.get(roomId);

    if (!room) {
      room = [];
      rooms.set(roomId, room);
    }

    if (room.length >= 2) {
      socket.emit("room-full");
      return;
    }

    room.push(socket.id);
    socket.join(roomId);
    socket.roomId = roomId;

    console.log(`Room ${roomId}:`, room);

    if (room.length === 1) {
      socket.emit("waiting");
    }

    if (room.length === 2) {
      console.log("ROOM READY");

      io.to(room[0]).emit("ready", {
        initiator: true
      });

      io.to(room[1]).emit("ready", {
        initiator: false
      });
    }
  });

  socket.on("offer", ({ roomId, offer }) => {
    console.log("OFFER received");

    socket.to(roomId).emit("offer", offer);
  });

  socket.on("answer", ({ roomId, answer }) => {
    console.log("ANSWER received");

    socket.to(roomId).emit("answer", answer);
  });

  socket.on("ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice-candidate", candidate);
  });

  socket.on("disconnect", () => {
    console.log("DISCONNECTED:", socket.id);

    if (!socket.roomId) return;

    let room = rooms.get(socket.roomId);

    if (!room) return;

    room = room.filter((id) => id !== socket.id);

    if (room.length === 0) {
      rooms.delete(socket.roomId);
    } else {
      rooms.set(socket.roomId, room);
      io.to(room[0]).emit("user-left");
    }
  });
});

server.listen(3000, "0.0.0.0", () => {
  console.log("Server running on port 3000");
});