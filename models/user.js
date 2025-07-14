const mongoose = require("mongoose");

mongoose.connect(`mongodb://127.0.0.1:27017/authtestapp`);

const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    isAdmin: {
        type: Boolean,
        default: false,
    },
    score: {
        type: Number,
        default: 0
    },
    quizAttempts: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model("User", userSchema);
