//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
var flash = require('connect-flash');
const session = require('express-session');
const passport = require("passport"),
  LocalStrategy = require('passport-local').Strategy;


const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));
app.use(session({
  secret: "secret.",
  resave: true,
  saveUninitialized: false
}));
app.use(flash());

app.use(function(req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

passport.use('user',
  new LocalStrategy({
    usernameField: "email"
  }, (email, password, done) => {
    User.findOne({
        Email: email
      })
      .then(user => {
        if (!user) {

          return done(null, false, {
            message: "That email is not registered"
          });
        }

        bcrypt.compare(password, user.Password, (err, isMatch) => {
          if (err) throw err;
          if (isMatch) {
            return done(null, user);
          } else {
            return done(null, false, {
              message: "Password incorrect"
            });

          }
        })
      })
      .catch(err => console.log(err));


  }));

app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});


passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    if (err) done(err);
    if (user) {
      done(null, user);
    }
  })
});
mongoose.connect("mongodb://localhost:27017/secretuserDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});


const itemsSchema = {
  name: String
};
const Item = mongoose.model("Item", itemsSchema);

const listSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);
const dataSchema = new mongoose.Schema({
  First_name: String,
  Last_name: String,
  Email: String,
  Password: String,
  ConfirmPassword: String,
  ListTitles: [listSchema]

});



const User = mongoose.model("User", dataSchema);

const Office = new List({
  name: "Office",
  items: []
});

const Personal = new List({
  name: "Personal",
  items: []
});

const Household = new List({
  name: "Household",
  items: []
});

const item1 = new Item({
  name: "Welcome to your todolist!"
});

const item2 = new Item({
  name: "Hit the + button to add a new item."
});

const item3 = new Item({
  name: "<-- Hit this to delete an item."
});




app.get("/", function(req, res) {
  res.render("home");
});
app.get("/userprofile", function(req, res)
{
  handle = req.user.Email;
  listitems = req.user.ListTitles;
  if (req.isAuthenticated())
  {
    if (listitems.length == 0)
    {
      req.user.ListTitles.push(Office, Household, Personal);
      req.user.save()
    }
    res.render('Sign', {
      email: req.user.Email,
      getlist: req.user.ListTitles,
      nameofuser:req.user.First_name
    })


  } else {

    res.redirect("/login");
  }
});

app.get("/login", function(req, res) {
  if (!req.user) {

    res.render('login');
  } else {

    res.redirect("/userprofile");
  }
});

app.get("/register", function(req, res) {
  if (!req.user) {
    res.render('register');
  } else {
    res.redirect("/userprofile");
  }
});

app.post("/show", function(req, res)
{
  useremail=req.user.Email;
  namelist = req.body.Listname;
  if (namelist == "addnew")
  {
    addnewlistname = req.body.listtitlenew;
    const addlist = new List({
        name: addnewlistname,
        items: []
      });
    req.user.ListTitles.push(addlist);
    req.user.save();
    res.redirect("/userprofile");
  } else{
    User.findOne({
      _id: req.user._id
    }, function(err, users) {
      users.ListTitles.forEach(function(listitem)
       {
        if (listitem.name == namelist)
        {
          if (listitem.items.length == 0)
           {
            listitem.items.push(item1, item2, item3);
            users.save();
          }
          res.render("Listapp",
          {
            ListTitle: namelist,
            newListItems: listitem.items,
            email:useremail
          })

        }


      })

    });

  }


});

app.post("/add", function(req, res) {
  useremail=req.user.Email;
  nametitle = req.body.list;
  additem = req.body.newItem;
  var item4 = new Item({
    name: additem
  });

  User.findOne({
    _id: req.user._id
  }, function(err, users1) {
    users1.ListTitles.forEach(function(listitems) {
      if (listitems.name == nametitle) {

        listitems.items.push(item4);
        users1.save();
        res.render("Listapp", {
          ListTitle: nametitle,
          newListItems: listitems.items,
          email:useremail
        })

      }

    })

  });
});
app.post("/delete", function(req, res) {
  useremail=req.user.Email;
  nametitle = req.body.listName;
  const checkedItemId = req.body.checkbox;

  User.findOne({
    _id: req.user._id
  }, function(err, users1) {
    users1.ListTitles.forEach(function(listitems) {
      if (listitems.name == nametitle) {
        var x = listitems.items;
        var removeIndex = x.map(function(item) {
          return item._id;
        }).indexOf(checkedItemId);
        x.splice(removeIndex, 1);
        users1.save();
        res.render("Listapp", {
          ListTitle: nametitle,
          newListItems: listitems.items,
          email:useremail
        });
      }


    })

  });
});


app.post("/login", passport.authenticate('user', {
  'failureRedirect': '/login',
  'failureFlash': true,
  'session': true
}), (req, res) => {
  res.redirect("/userprofile");
});



app.post("/register", function(req, res) {

  const First_name = req.body.firstname;
  const Last_name = req.body.lastname;
  const Email = req.body.email;
  const Password = req.body.password;
  const ConfirmPassword = req.body.confirmpassword;

  // console.log(req.body);

  let errors = [];


  if (!First_name || !Last_name || !Email || !Password) {
    errors.push({
      msg: "Please fill in all the fields"
    });
  }

  if (Password !== ConfirmPassword) {
    errors.push({
      msg: "Password do not match"
    });
  }

  if (Password.length < 6) {
    errors.push({
      msg: "Password should be at least 6 characters"
    });
  }

  if (errors.length > 0) {
    return res.render('sign_up', {
      errors,
      First_name,
      Last_name,
      Email,
      Password,
      ConfirmPassword

    });
  } else {

    User.findOne({
      Email: Email
    }, function(err, findUser) {
      if (err) {
        console.log(err);
      } else if (findUser) {
        errors.push({
          msg: "Email is already registered"
        });
        res.render('sign_up', {
          errors,
          First_name,
          Last_name,
          Email,
          Password,
          ConfirmPassword
        })
      } else {
        const user = new User({
          First_name: First_name,
          Last_name: Last_name,
          Email: Email,
          Password: Password

        });

        bcrypt.genSalt(10, (err, salt) =>
          bcrypt.hash(user.Password, salt, (err, hash) => {
            if (err) {
              console.log(err);
            }

            user.Password = hash;

            user.save((err, result) => {
              if (err) {
                console.log(err);
              } else if (result) {
                req.flash('success_msg', "You have successfully registered");

                res.redirect("/login");
              }
            });


          })
        )


      }

    })

  }

});
app.get('/logout', (req, res) => {
  req.logout();
  req.flash('success_msg', 'You have successfully logged out. Come back soon!!!');
  res.redirect("/login");
});




app.listen(3000, function() {
  console.log("Server started on port 3000");
});
