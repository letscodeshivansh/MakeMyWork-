const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/MakeMyWork")
.then(() => {
    console.log("MongoDB connected");
})
.catch((error) => {
    console.error("MongoDB connection error:", error);
});

const loginSchema = new mongoose.Schema({
    floatingInput: {
        type: String,
        required: true
    },
    floatingPassword: {
        type: String,
        required: true
    }
});

const Login = mongoose.model("S", loginSchema);

module.exports = Login;
