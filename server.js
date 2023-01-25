const express = require('express');
const app = express();
const path = require('path');
const PORT = 8800;
const rateLimiter = require('rate-limiter-flexible');
const nodemailer = require('nodemailer');
const validator = require('email-validator');
require('dotenv').config();


app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.json())

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
    }
);
app.get('/contact.html', (req, res) =>{
    res.sendFile(path.join(__dirname, '/dist/contact.html'));
})
app.get('/dist/css/main.css',(req, res)=>{
    res.sendFile(path.join(__dirname, '/dist/css/main.css'));
    }
);
app.get('/dist/js/app.js',(req, res) =>{
    res.sendFile(path.join(__dirname, 'dist/js/app.js'));
    }
);
app.get('/dist/js/uikit.js',(req, res)=>{
    res.sendFile(path.join(__dirname, '/dist/js/uikit.js'));
    }
);
app.get('/src/js/uikit.js',(req, res) => {
    res.sendFile(path.join(__dirname, '/src/js/uikit.js'));
});
//alow user to send upto 100 messages under an hour
const limiter = new rateLimiter.RateLimiterMemory({
    points: 100,
    duration: 60 * 60
})
app.post('/mail', async (req, res) => {
    const name = String(req.body.name);
    const email = String(req.body._replyto);
    const message = String(req.body.message);
    console.log("Data:", name, email, message);
    try{
        await limiter.consume(req.ip);
        let errName = '';
        let errEmail = '';
        let errMessage = '';
        let err = false;
        if(!name){
            errName = 'Please enter your name.';
            err = true;
        }
        if(!email){
            errEmail = 'Please enter your email.';
            err = true;
        }
        if(!message || message.length < 10){
            errMessage = 'Sorry the message must be atleast 10 characters.';
            err = true;
        }
        if(!validator.validate(email)){
            res.status(400).json({message: 'Bad request', errEmail: 'Please enter a valid email.'});
            err = true;
            return;
        }
        if(err){
            res.status(400).json({message: 'Bad request', errName, errEmail, errMessage});
            return;
        }
        else if(!err){
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL,
                    pass: process.env.Pass
                }
        });
        let emailOption = {
            from: process.env.EMAIL,
            to: process.env.EMAIL,
            subject: `WebPage Message From ${name}`,
            text: `Email from: ${email}\nMessage: ${message}`,
        };
        transporter.sendMail(emailOption, (err, info) => {
            if(err){
                console.log("error: ", err);
                res.status(500).json({message: 'Internal server error'});
                return;
            }
            else{
                console.log("success: ", info);
                res.status(200).json({message: 'success'});
                return;
        }
    })
}}
    catch(err){
        console.log("catch error: ", err);
        res.status(429).json({message: 'Too many requests'});
        return;
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    }
);