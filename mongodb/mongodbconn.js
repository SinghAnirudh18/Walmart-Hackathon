const mongoose = require('mongoose');

// Mongoose Connection
const mongoURI = "mongodb+srv://anirudhsing308:qwerty12345@cluster0.feo95lg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI, {
  
})
  .then(() => {
    console.log("Database connected");
  })
  .catch((err) => {
    console.error("Database connection error:", err);
  });
  module.exports=mongoose.Connection;