const express = require("express");
const connectDB = require("./config/db");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const path = require("path");

dotenv.config();
connectDB();
const app = express();
app.use(express.static("public"));

app.use(express.json()); // to accept json data since taking values from frontent like name,email,pass,pic

// app.get("/", (req, res) => {
//   res.send("API Running!");
// });

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// --------------------------deployment------------------------------

const __dirname1 = path.resolve();

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/frontend/build")));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "frontend", "build", "index.html")) //send frontent 
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}

// --------------------------deployment------------------------------

// Error Handling middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT;

const server = app.listen(
  PORT,
  console.log(`Server running on PORT ${PORT}...`)
);

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:3000",
    // credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("Connected to socket.io");
  //user should be connnected to own personal socket
  //creating new socket where frontend will send some datat and join room
  socket.on("setup", (userData) => { //take user datta from fromtend
    socket.join(userData._id); //creating room with id of user data
    socket.emit("connected");
  });

  //take room id from frontend
  socket.on("join chat", (room) => {
    socket.join(room);//another user joins it adds that user to that room
    console.log("User Joined Room: " + room); //when we go from 1 user to other 
  });
  socket.on("typing", (room) => socket.in(room).emit("typing")); //creating socket for typing
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("play sound", (audioFile) => {
  const audio = new Audio(`/ting.mp3`);
  audio.play();
});

  socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat; //see which chats it belongs to
// const audio = new Audio("/ting.mp3");
 //  audio.play();
    if (!chat.users) return console.log("chat.users not defined");//if chat doesnot have any users
//socket.in(user._id).emit("play sound", "ting.mp3");
    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;

      socket.in(user._id).emit("message recieved", newMessageRecieved);
    //inside users room emit msg
    //in frontend now take newMessageRe and see which chat it belongs to wheather currently active chat or other 
    });
  });

  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
    socket.leave(userData._id);
  });
});