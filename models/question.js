const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true,
        trim: true
    },
    options: {
        type: [String],
        required: true,
        validate: [arrayLimit, 'Must have exactly 4 options']
    },
    correctAnswer: {
        type: Number,
        required: true,
        min: 0,
        max: 3
    },
    category: {
        type: String,
        default: 'General Knowledge'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

function arrayLimit(val) {
    return val.length === 4;
}

module.exports = mongoose.model("Question", questionSchema); 