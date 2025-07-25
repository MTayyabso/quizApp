const mongoose = require("mongoose");

// mongoose.connect(`mongodb+srv://mtayyabsohail8:fLtRyZJgCrBtUoQL@quizapp.79wyyev.mongodb.net/?`);
mongoose.connect(`mongodb+srv://mtayyabsohail8:fLtRyZJgCrBtUoQL@quizapp.79wyyev.mongodb.net/?retryWrites=true&w=majority&appName=quizapp`);

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
