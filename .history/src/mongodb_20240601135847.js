const mongoose = require("mongoose");

mongoose.connect("mongodb://127.0.0.1:27017/MakeMyWork")

.then(() => {
    console.log("MongoDB connected");
})
.catch((error) => {
    console.error("MongoDB connection error:", error);
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  deadline: {
    type: Date,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  images: [{
    type: String  // Assuming that we will store image URLs as strings
  }]
});

const SignUpInfoSchema = new mongoose.Schema({
    floatingInput: {
        type: String,
        required: true
    },
    floatingPassword: {
        type: String,
        required: true
    }
});




//for storing the task 
const Task = mongoose.model('Task', taskSchema);

//for storing the login informations 
const SignUpInfo = mongoose.model("SignUpInfo", SignUpInfoSchema);


