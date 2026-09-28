const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json({limit:'50kb'}));
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,'public')));

const messageSchema = new mongoose.Schema({
  name:{type:String,required:true,trim:true,maxLength:80},
  email:{type:String,required:true,trim:true,maxLength:120},
  message:{type:String,required:true,trim:true,maxLength:2000},
  createdAt:{type:Date,default:Date.now}
});
const Message = mongoose.model('Message', messageSchema);

app.post('/api/contact', async (req,res)=>{
  try {
    const {name,email,message}=req.body;
    if(!name || !email || !message) return res.status(400).json({ok:false,message:'Please fill all fields.'});
    if(!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ok:false,message:'Enter a valid email.'});
    if(!process.env.MONGO_URI) return res.status(503).json({ok:false,message:'MongoDB is not configured. Copy .env.example to .env and add MONGO_URI.'});
    if(mongoose.connection.readyState !== 1) await mongoose.connect(process.env.MONGO_URI);
    await Message.create({name,email,message});
    res.json({ok:true,message:'Message saved successfully. I will get back to you soon.'});
  } catch(err){
    console.error(err);
    res.status(500).json({ok:false,message:'Server error. Please try again.'});
  }
});

app.get('/api/health',(req,res)=>res.json({ok:true,service:'Ashick Portfolio API'}));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,()=>console.log(`Portfolio running at http://localhost:${PORT}`));
