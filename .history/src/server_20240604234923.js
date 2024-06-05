const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
// const collection = require("./mongodb");
const multer = require("multer");

//adding dotenv file
require('dotenv').config();

//data collection link 
const { Task, SignUpInfo } = require("./mongodb");

//express server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const parentDir = path.join(__dirname, '../'); // Parent directory

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set the views directory
app.set("views", path.join(parentDir, "templates"));

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Serve static files (CSS, JS, images, etc.)
app.use(express.static(path.join(parentDir, "public")));
app.use(express.static(path.join(parentDir, "assets")));

// Routes
app.get("/", async (req, res) => {
    try {
      const tasks = await Task.find();
      res.render("index.ejs", { tasks }); // Pass tasks data to the template
    } catch (error) {
      console.error("Error fetching tasks:", error.message);
      res.status(500).send("Error fetching tasks");
    }
});

// Serve the login page
app.get("/login", (req, res) => {
    res.render("login"); // Render the login.ejs file
});

// For sign up 
app.get("/signup.html", (req, res) => {
    res.sendFile(path.join(parentDir, "templates", "signup.html"));
});

// For posting work
app.get("/postwork.html", (req, res) => {
    res.sendFile(path.join(parentDir, "templates", "postwork.html"));
});

// Serve the chat.html file
app.get("/chat.html", (req, res) => {
    res.sendFile(path.join(parentDir, "templates", "chat.html"));
});

// Serve the chat.js file
app.get("/chat.js", (req, res) => {
    res.sendFile(path.join(__dirname, "chat.js"));
});

// Socket.io events
io.on("connection", (socket) => {
    console.log("A user connected");

    socket.on("disconnect", () => {
        console.log("User disconnected");
    });

    // Listen for messages
    socket.on("chat message", (message) => {
        // Broadcast the message to all connected clients
        io.emit("chat message", message);
    });
});



// Handle sign-up request
app.post("/signup", async (req, res) => {
    try {
        const { floatingInput, floatingPassword } = req.body;

        // Create a new SignUpInfo document with the provided data
        const signUpInfo = new SignUpInfo({
            floatingInput,
            floatingPassword
        });

        // Save the SignUpInfo document to the database
        await signUpInfo.save();
        
        res.redirect("/");;
    } catch (error) {
        res.status(500).render("Error signing up");
    }
});

//checking email and password for login 

app.post("/login", async (req, res) => {
    try {
        const { floatingInput, floatingPassword } = req.body;

        // Find the user by email in the database
        const user = await SignUpInfo.findOne({ floatingInput });

        // If no user is found, render the login page with an error message
        if (!user) {
            return res.status(401).render("login", { error: "User Not found" });
        }

        // Check if the provided password matches the stored password
        if (user.floatingPassword === floatingPassword) {
            // If passwords match, redirect to the index page
            res.render('index', { tasks });
        } else {
            // If passwords don't match, render the login page with an error message
            res.status(401).render("login", { error: "Wrong Password" });
        }
    } catch (error) {
        // If an error occurs, send error message
        console.error(error);
        res.status(500).send("Error logging in");
    }
});


// Multer configuration for handling file uploads

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // Directory where uploaded files will be stored
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname) // Unique file name
    }
});

const upload = multer({ storage: storage });

app.post("/postwork", upload.array('images', 5), async (req, res) => {
    try {
        const { title, description, deadline, price } = req.body;

        // Get the URLs of uploaded images
        const imageUrls = req.files.map(file => '/uploads/' + file.filename);

        // Create a new task with the provided data
        const taskAdded = new Task({
            title,
            description,
            deadline,
            price,
            images: imageUrls
        });

        // Save the task to the database
        await taskAdded.save();

        // Fetch tasks again from MongoDB
        const tasks = await Task.find();

        // Render the index page with the updated tasks data
        res.render("index", {tasks});
    } catch (error) {
        console.error("Error adding task:", error); // Log any errors
        res.status(500).send("Error adding task");
    }
});


// Add a route to render job cards on the index page
app.get('/jobcards', async (req, res) => {
    try {
        // Retrieve tasks from MongoDB
        const tasks = await Task.find();
        res.render('index', {tasks}); // Pass tasks data to the index.ejs template
    } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).send("Error fetching tasks");
    }
});

//Listening on the port 
const port = 6969;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

//hello get to the next step