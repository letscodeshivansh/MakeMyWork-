const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const mongoose = require('mongoose');
const { Task, User, Message } = require('./mongodb');  // MongoDB models

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const sessionMiddleware = session({
  secret: 'secretkey',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year in milliseconds
  },
});

app.use(sessionMiddleware);

io.use(require('express-socket.io-session')(sessionMiddleware, {
  autoSave: true
}));

const parentDir = path.join(__dirname, '../');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.set('views', path.join(parentDir, 'templates'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(parentDir, 'public')));
app.use(express.static(path.join(parentDir, 'assets')));

app.get('/', (req, res) => {
  res.render('landing');
});

app.get('/index', async (req, res) => {
  try {
    const tasks = await Task.find();
    const loggedInUsername = req.session.loggedInUsername; // Username of the currently logged-in user
    res.render('index', { tasks, loggedInUsername });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).send('Error fetching tasks');
  }
});

app.get('/chatroom', async (req, res) => {
  const loggedInUsername = req.session.loggedInUsername;
  try {
    const conversations = await Message.find({
      $or: [{ sender: loggedInUsername }, { receiver: loggedInUsername }],
    }).distinct('taskId');

    const conversationTasks = await Task.find({
      _id: { $in: conversations },
    });

    res.render('chatroom', {
      loggedInUsername,
      conversationTasks,
    });
  } catch (error) {
    console.error('Error fetching task or messages:', error);
    res.status(500).send('Error fetching task or messages');
  }
});

app.get('/chat/:taskId', async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).send("Task not found");
    }

    const loggedInUsername = req.session.loggedInUsername;
    const taskOwner = task.taskOwner;

    // Pass the logged-in user's name and task ID to the chat view
    res.render('chat', { taskOwner, loggedInUsername, taskId });
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).send("Error fetching task");
  }
});

app.get('/chat.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'chat.js'));
});

let socketsConnected = new Set();

io.on('connection', onConnected);

function onConnected(socket) {
  console.log('Socket connected', socket.id);
  socketsConnected.add(socket.id);
  io.emit('clients-total', socketsConnected.size);

  socket.on('disconnect', () => {
    console.log('Socket disconnected', socket.id);
    socketsConnected.delete(socket.id);
    io.emit('clients-total', socketsConnected.size);
  });

  socket.on('message', async (data) => {
    // Save message to MongoDB
    const message = new Message({
      taskId: data.taskId,
      sender: data.sender,
      message: data.message,
      dateTime: data.dateTime,
    });

    try {
      await message.save();
      socket.broadcast.emit('chat-message', data);  // Broadcast to all clients except the sender
    } catch (error) {
      console.error('Error saving message to database:', error);
    }
  });

  socket.on('feedback', (data) => {
    socket.broadcast.emit('feedback', data);
  });
}

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });

    if (!user) {
      return res.status(401).render('login', { error: 'Invalid username or password' });
    }

    req.session.loggedInUsername = username;
    res.redirect('/index');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error logging in');
  }
});

app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).render('signup', { error: 'Username already exists' });
    }

    const newUser = new User({ username, password });
    await newUser.save();

    req.session.loggedInUsername = username;
    res.redirect('/index');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error signing up');
  }
});

const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
    },
  }),
});

app.post('/postwork', upload.array('images', 5), async (req, res) => {
  try {
    const { title, description, deadline, price } = req.body;
    const imageUrls = req.files.map((file) => '/uploads/' + file.filename);
    const taskOwner = req.session.loggedInUsername;

    const taskAdded = new Task({
      title,
      description,
      deadline,
      price,
      images: imageUrls,
      taskOwner, // Use req.session.loggedInUsername as task owner
    });

    await taskAdded.save();
    const tasks = await Task.find();
    res.render('index', { tasks, loggedInUsername: taskOwner }); // Pass username when rendering index
  } catch (error) {
    console.error('Error adding task:', error);
    res.status(500).send('Error adding task');
  }
});

app.get('/postwork', async (req, res) => {
  try {
    const tasks = await Task.find();
    const loggedInUsername = req.session.loggedInUsername;
    res.render('postwork', { tasks, loggedInUsername });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).send('Error fetching tasks');
  }
});

const port = 6969;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
