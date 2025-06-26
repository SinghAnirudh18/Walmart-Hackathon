const express = require('express');
const path = require('path');
const cp = require('cookie-parser');
const http = require('http');
const socketIO = require('socket.io');

const mongodb = require('./mongodb/mongodbconn');
const SharedCart = require('./mongodb/sharedcart');

const user = require('./routes/login-and-signup');
const home = require('./routes/home-and-admin');
const shared = require('./routes/shared-cart');
const cart = require('./routes/user-cart');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(cp());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set("view engine", 'ejs');

app.use(user);
app.use(home);
app.use(shared);
app.use(cart);

// Socket.IO handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinCartChat', async ({ cartCode }) => {
    socket.join(cartCode);
    const cart = await SharedCart.findOne({ cartCode }).populate('chat.sender', 'username');
    if (cart) {
      socket.emit('chatHistory', cart.chat);
    }
  });

  socket.on('sendMessage', async ({ cartCode, senderId, text }) => {
    const cart = await SharedCart.findOne({ cartCode });
    if (!cart) return;

    const newMsg = {
      sender: senderId,
      text,
      timestamp: new Date()
    };

    cart.chat.push(newMsg);
    await cart.save();

    await cart.populate('chat.sender', 'username');
    const populatedMsg = cart.chat[cart.chat.length - 1];

    io.to(cartCode).emit('newMessage', populatedMsg);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
