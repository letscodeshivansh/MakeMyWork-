const mongoose = require("mongoose");

mongoose.connect("mongodb://127.0.0.1:27017/MakeMyWork")

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

const LoginInfo = mongoose.model("SignUpInfo", loginSchema);

module.exports = LoginInfo;
