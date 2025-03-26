var express = require('express');
var path = require('path');
var app = express();
var session = require('express-session');

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore} = require('firebase-admin/firestore');
var serviceAccount = require("./key.json");
const { text} = require("express");

initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();
//s
// ✅ Middleware to parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ Session middleware
app.use(session({
    secret: 'mysecretkey',
    resave: false,
    saveUninitialized: true
}));
//e
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
        // Save user data in Firestore
        await db.collection("users").add({
            Name: req.body.Name || "Unknown",
            dob: req.body.dob || "N/A",
            username: req.body.username,
            password: req.body.password,
            role: req.body.role  // Save Player Role
        });

        res.redirect("/login"); // Redirect to login after successful signup
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
    .where("password", "==", req.body.password)
    .get()
    .then((docs) => {
        if (docs.size > 0) {
            req.session.user = req.body.username;  // ✅ Store session

            docs.forEach((doc) => {
                    const data = doc.data();
                res.render('dashboard', {
                    username: req.body.username,
                    about: {
                        Name: data.Name || "Unknown",
                        dob: data.dob || "N/A",
                        role: data.role
                    }
                });
            });
        } else {
            res.send("Login failed: Incorrect username or password.");
        }
    }).catch(err => {
        res.send("Error: " + err.message);
    });
});
app.post('/edit', (req, res) => {
    if (!req.session.user) {  // ✅ Use 'user' instead of 'username'
        return res.status(401).send("Unauthorized: Please login first.");
    }

    db.collection("users")
      .where("username", "==", req.session.user)  // ✅ Use 'user' session variable
      .get()
      .then(snapshot => {
          if (snapshot.empty) {
              return res.status(404).send("User not found.");
          }

          snapshot.forEach(doc => {
              const userId = doc.id;
              db.collection("users").doc(userId).update({
                  Name: req.body.Name,
                  dob: req.body.dob,
                  username: req.body.username
              }).then(() => {
                  console.log("User updated successfully!");
                  
              }).catch(error => {
                  console.error("Error updating user:", error);
                  res.status(500).send("Error updating user.");
              });
          });
      })
      .catch(error => {
          console.error("Error finding user:", error);
          res.status(500).send("Error finding user.");
      });
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('http://localhost:3000/login');
    });
});
app.listen(3000, function () {
    console.log('Example app listening on port 3000');
});