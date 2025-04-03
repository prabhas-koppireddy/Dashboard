var express = require('express');
var path = require('path');
var app = express();
var session = require('express-session');
const bcrypt = require('bcrypt'); 

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
var serviceAccount = require("./key.json");

initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'mysecretkey',
    resave: false,
    saveUninitialized: true
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', function (req, res) {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', function (req, res) {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.post("/signupSubmit", async function (req, res) {
    if (!req.body.username || !req.body.password || !req.body.role) {
        return res.send("Error: Missing username, password, or role.");
    }

    try {
        // Check if username already exists
        const existingUser = await db.collection("users")
            .where("username", "==", req.body.username)
            .get();

        if (!existingUser.empty) {
            return res.send("Error: Username already exists.");
        }

        // Hash password before storing it
        const hashedPassword = await bcrypt.hash(req.body.password, 10); // Hash password with salt rounds

        // Save user data in Firestore
        await db.collection("users").add({
            Name: req.body.Name || "Unknown",
            dob: req.body.dob || "N/A",
            username: req.body.username,
            password: hashedPassword,  
            role: req.body.role 
        });

        res.redirect("/login");
    } catch (err) {
        res.send("Error: " + err.message);
    }
});

app.post("/dashboard", function(req, res) {
    if (!req.body.username || !req.body.password) {
        return res.send("Error: Missing username or password.");
    }

    db.collection("users")
    .where("username", "==", req.body.username)
    .get()
    .then(async (docs) => {
        if (docs.empty) {
            return res.send("Login failed: Incorrect username or password.");
        }

        let userFound = false;
        
        for (let doc of docs.docs) {
            const data = doc.data();

            // Compare hashed password
            const match = await bcrypt.compare(req.body.password, data.password);
            if (match) {
                userFound = true;
                req.session.user = req.body.username; 
                
                return res.render('dashboard', {
                    username: req.body.username,
                    about: {
                        Name: data.Name || "Unknown",
                        dob: data.dob || "N/A",
                        role: data.role
                    }
                });
            }
        }

        if (!userFound) {
            res.send("Login failed: Incorrect username or password.");
        }
    }).catch(err => {
        res.send("Error: " + err.message);
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('http://localhost:3000/login');
    });
});

// ✅ Start Server
app.listen(3000, function () {
    console.log('Example app listening on port 3000');
});
