const express = require('express');
const app = express();
const userModel = require("./models/user");
const postModel = require('./models/post');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");


app.set("view engine" , "ejs");
app.use(express.json());
app.use(express.urlencoded({extended : true}));
app.use(cookieParser());


app.get('/' , (req , res) => {
  res.render("index");
});

app.get('/login', (req, res) => {
  res.render("login");
});


app.post('/register' , async (req , res) => {
  let {email , password , username , name , age} = req.body;

  let user = await userModel.findOne({email});
  
  if(user) return res.status(500).send("User already registered");
  bcrypt.genSalt(10 , (err , salt) =>{
    bcrypt.hash(password , salt , async(err , hash) => {
      let user = await userModel.create({
        username,
        email,
        age,
        name,
        password : hash
      })

      let token = jwt.sign({email : email , userid : user._id},"shhhh");
      res.cookie("token" , token);
      res.send("registered");
    })
  });

});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(400).send("User not found!");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).send("Incorrect password!");
    }

    const token = jwt.sign({ email: user.email, userid: user._id }, "shhhh");
    res.cookie("token", token);

    res.redirect("/profile");

  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.get('/profile', isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findOne({ email: req.user.email }).populate("posts");

    if (!user) {
      return res.status(404).send("User not found!");
    }
    res.render("profile", { user });

  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong");
  }
});

app.post("/post", isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email });
    let {content} = req.body;
    let post = await postModel.create({
      user : user._id,
      content
     });

     user.posts.push(post._id);
     await user.save();
     res.redirect("/profile");
});


app.get('/logout' , (req , res) => {
  res.cookie("token" , "");
  res.redirect("/login");

});


function isLoggedIn(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.redirect("/login");
  }

  try {
    const data = jwt.verify(token, "shhhh");
    req.user = data;
    next();
  } catch (err) {
    res.clearCookie("token");
    return res.redirect("/login");
  }
}



app.listen(3000);