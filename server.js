const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const cors = require('cors');

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/exercise-track' )

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Helper function to validate username according to rules set by us
const validateUser = (text) => /^[a-zA-Z_][a-zA-Z0-9\s.\-_$@*!]*$/.test(text);

// Schema
const userSchema = new mongoose.Schema({
  username : {type : String, unique : true, index: true, required: true, lowercase: true, trim: true},
  exercise : [{description : {type : String, trim : true, required: true},
               duration : {type: Number, required: true}, 
               date : {type : Date, default : new Date()}
              }]
});

// User Model
const User = mongoose.model('User', userSchema);

// Create New User
app.post('/api/exercise/new-user', (req, res) => {
  if (!validateUser(req.body.username)) {
    return res.json({"ERROR" : "Invalid Username"});
  }
  // Create the user and add to database
  const newUser = new User({"username" : req.body.username});
  newUser.save((err, doc) => {
    if (err) {
      return res.json(err);
    }
    res.json(doc);
  });
});

// Insert New Exercise data into given User's Exercise array
app.post('/api/exercise/add', (req, res) => {
  if (!validateUser(req.userId)) {
    return res.json({"ERROR" : "Invalid Username"});
  }
  // If any of these null, return error
  if (!req.body.description || !req.body.duration) {
    return res.json({"ERROR" : "Must provide exercise duration and description"});
  }
  // Make exercise doc
  const exercise = {
        "description" : req.body.description,
        "duration" : req.body.duration
  };
  // If date not null, add the date
  if (req.body.date) {
    exercise.date = req.body.date;
  }
  // Build lookup the query
  const query = {"username" : req.body.userId.toLowerCase()};
  // Build update operation for query
  const queryOp = {
    "$push" : {
      "exercise" : exercise
    }
  };
  // Supply query and queryOp and execute the update
  User.findOneAndUpdate(query, queryOp).exec((err, doc) => {
    if (err) {
      return res.json(err);
    };
    res.json({"MESSAGE" : `${doc} updated`});
  });
});

// Get user data from exercise database
app.get('/api/exercise/log', (req, res) => {
  if (!validateUser(req.query.userId)) {
    return res.json({"ERROR" : "Invalid Username"});
  }
  const username = req.query.userId.toLowerCase();
  const from = (req.query.from) ? new Date(req.query.from) : null;
  const to = (req.query.to) ? new Date(req.query.to) : null;
  const limit = Number(req.query.limit);
  
  User.findOne({"username" : username}).
  select('-exercise._id -_id').
  exec((err, doc) => {
    if (err) {
      return res.json(err);
    }
    const resp = {
      "username" : doc.username,
      "exercise" : doc.exercise
    };
    if (from) {
      resp.exercise = resp.exercise.filter(e => e.date >= from);
    }
    if (to) {
      resp.exercise = resp.exercise.filter(e => e.date <= to);
    }
    if (limit) {
      resp.exercise = resp.exercise.slice(0, limit);
    }
    return res.json(resp);
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
