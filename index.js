const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const userModel = require("./models/user");
const questionModel = require("./models/question");
const emailModel = require("./models/emailModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
require("dotenv").config();

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const ADMIN_EMAILS = ["admin1@example.com", "wasil@example.com"];

//  Email Sender with Quiz Invite Template
app.post("/send-email", async (req, res) => {
    const { to,  message, link } = req.body;
    const quizLink = link || "http://localhost:3000/start-quiz";

    const htmlTemplate = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #0d47a1;">🎓 You're Invited to Take a Quiz!</h2>
            <p>You've been invited to take a quiz. Click the button below to begin:</p>
            
            <a href="${quizLink}" style="display:inline-block;margin-top:10px;padding:10px 20px;background-color:#1e88e5;color:white;text-decoration:none;border-radius:5px;">
                Start Quiz
            </a>
            <p style="margin-top:20px;font-size:12px;color:gray;">If you didn't expect this email, you can ignore it.</p>
        </div>
    `;

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: `"Quiz Admin" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html: htmlTemplate
    };

    try {
        await transporter.sendMail(mailOptions);
        res.redirect("/dashboard");
    } catch (error) {
        console.error("Email Error:", error);
        res.status(500).send("Email failed to send.");
    }
});

app.post("/send-bulk-invite", async (req, res) => {
    console.log("Received request body:", req.body); // Debug log
    const userEmails = req.body.emails || [];
    console.log("Extracted emails:", userEmails); // Debug log
    console.log("Number of emails to send:", userEmails.length); // Debug log

    if (!userEmails || userEmails.length === 0) {
        console.log("No emails provided");
        return res.status(400).send("No emails selected for invitation.");
    }

    const quizLink = "http://localhost:3000/start-quiz";

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const htmlTemplate = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #0d47a1;">🎓 You're Invited to Take a Quiz!</h2>
            <p>You've been invited to take a quiz. Click the button below to begin:</p>
            <a href="${quizLink}" style="display:inline-block;margin-top:10px;padding:10px 20px;background-color:#1e88e5;color:white;text-decoration:none;border-radius:5px;">
                Start Quiz
            </a>
            <p style="margin-top:20px;font-size:12px;color:gray;">If you didn’t request this, just ignore this email.</p>
        </div>
    `;

    try {
        let successCount = 0;
        for (let email of userEmails) {
            console.log(`Sending email to: ${email}`); // Debug log
            await transporter.sendMail({
                from: `"Quiz Admin" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: "You're invited to take the Quiz!",
                html: htmlTemplate
            });
            successCount++;
            console.log(`Successfully sent email to: ${email}`); // Debug log
        }

        console.log(`Total emails sent: ${successCount} out of ${userEmails.length}`);
        // For now just redirect - could add flash messages later
        res.redirect("/dashboard");
    } catch (err) {
        console.error("Bulk Email Error:", err);
        res.status(500).send("Failed to send bulk emails.");
    }
});

const isLoggedIn = (req, res, next) => {
    if (!req.cookies.token) return res.redirect("/login");
    try {
        let data = jwt.verify(req.cookies.token, "secret");
        req.user = data;
        next();
    } catch (err) {
        res.clearCookie("token");
        return res.redirect("/login");
    }
};

const isAdmin = async (req, res, next) => {
    try {
        let user = await userModel.findOne({ email: req.user.email });
        if (user && user.isAdmin) next();
        else res.redirect("/quiz");
    } catch (error) {
        res.redirect("/login");
    }
};

// Add email to database
app.post("/add-email", isLoggedIn, isAdmin, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }
        
        // Check if email already exists
        const existingEmail = await emailModel.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ success: false, message: "Email already exists" });
        }
        
        await emailModel.create({ email });
        res.json({ success: true, message: "Email added successfully" });
    } catch (error) {
        console.error("Add email error:", error);
        res.status(500).json({ success: false, message: "Failed to add email" });
    }
});

// Get all emails
app.get("/get-emails", isLoggedIn, isAdmin, async (req, res) => {
    try {
        const emails = await emailModel.find({}, 'email').sort({ _id: 1 });
        res.json({ success: true, emails: emails.map(e => e.email) });
    } catch (error) {
        console.error("Get emails error:", error);
        res.status(500).json({ success: false, message: "Failed to get emails" });
    }
});

// Delete email from database
app.delete("/delete-email", isLoggedIn, isAdmin, async (req, res) => {
    try {
        const { email } = req.body;
        await emailModel.deleteOne({ email });
        res.json({ success: true, message: "Email deleted successfully" });
    } catch (error) {
        console.error("Delete email error:", error);
        res.status(500).json({ success: false, message: "Failed to delete email" });
    }
});

app.get("/", (req, res) => res.render("index"));

app.post("/create", (req, res) => {
    const { username, email, password } = req.body;
    const isAdminUser = ADMIN_EMAILS.includes(email);
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            await userModel.create({ username, email, password: hash, isAdmin: isAdminUser });
            let token = jwt.sign({ email }, "secret");
            res.cookie("token", token);
            res.redirect("/login");
        });
    });
});

app.get("/login", (req, res) => res.render("login"));

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    let user = await userModel.findOne({ email });
    if (user) {
        bcrypt.compare(password, user.password, (err, result) => {
            if (result) {
                let token = jwt.sign({ email }, "secret");
                res.cookie("token", token);
                res.redirect(user.isAdmin ? "/dashboard" : "/quiz");
            } else {
                res.send("Invalid password");
            }
        });
    } else {
        res.send("User not found");
    }
});

app.get("/dashboard", isLoggedIn, isAdmin, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email });
    let questions = await questionModel.find().populate("createdBy", "username").sort({ createdAt: 1 });
    let totalUsers = await userModel.countDocuments({ isAdmin: false });
    
    // Check if emails exist, if not, seed with default emails
    let emailCount = await emailModel.countDocuments();
    if (emailCount === 0) {
        const defaultEmails = [
            "muhammadtayyabsohail80@gmail.com",
            "wasilsohail123456@gmail.com", 
            "mtayyabsohail8@gmail.com",
            "wasil@example.com"
        ];
        
        for (let email of defaultEmails) {
            await emailModel.create({ email });
        }
    }
    
    let emails = await emailModel.find({}, 'email').sort({ _id: 1 });

if (questions.length > 2) {
  let first = questions[0];
  questions[0] = questions[1];
  questions[1] = first;
}

    res.render("dashboard", { user, questions, totalUsers, emails: emails.map(e => e.email) });
});

app.post("/create-question", isLoggedIn, isAdmin, async (req, res) => {
    try {
        const { question, option1, option2, option3, option4, correctAnswer, category } = req.body;
        const options = [option1, option2, option3, option4];
        let user = await userModel.findOne({ email: req.user.email });
        await questionModel.create({ question, options, correctAnswer: parseInt(correctAnswer), category: category || "General Knowledge", createdBy: user._id });
        res.json({ success: true, message: "Question created successfully!" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Failed to create question." });
    }
});

app.post("/update-question/:id", isLoggedIn, isAdmin, async (req, res) => {
    try {
        const { question, option1, option2, option3, option4, correctAnswer, category } = req.body;
        await questionModel.findByIdAndUpdate(req.params.id, {
            question,
            options: [option1, option2, option3, option4],
            correctAnswer: parseInt(correctAnswer),
            category
        });
        res.json({ success: true, message: "Question updated successfully!" });
    } catch (error) {
        console.error("Update question error:", error);
        res.status(500).json({ success: false, message: "Failed to update question." });
    }
});

app.post("/delete-question/:id", isLoggedIn, isAdmin, async (req, res) => {
    try {
        await questionModel.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Question deleted successfully!" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Failed to delete question." });
    }
});

app.get("/quiz", isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email });
    res.render("quiz", { user });
});

app.get("/start-quiz", isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email });
    let questions = await questionModel.find().select("_id question options");
    res.render("quiz-game", { user, questions });
});

app.post("/submit-quiz", isLoggedIn, async (req, res) => {
    try {
        let user = await userModel.findOne({ email: req.user.email });
        const answers = req.body;
        let score = 0;
        let totalQuestions = 0;
        let results = [];
        let questions = await questionModel.find();

        for (let question of questions) {
            totalQuestions++;
            const userAnswer = parseInt(answers[question._id]);
            const isCorrect = userAnswer === question.correctAnswer;
            if (isCorrect) score++;
            results.push({ question: question.question, options: question.options, userAnswer, correctAnswer: question.correctAnswer, isCorrect });
        }

        await userModel.findByIdAndUpdate(user._id, { $inc: { score: score, quizAttempts: 1 } });

        res.render("quiz-results", {
            user,
            score,
            totalQuestions,
            results,
            percentage: totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0
        });
    } catch (error) {
        console.log(error);
        res.redirect("/quiz");
    }
});

app.get("/logout", (req, res) => {
    res.cookie("token", "");
    res.redirect("/");
});

app.listen(3000, () => {
    console.log(" Server running at http://localhost:3000");
});
