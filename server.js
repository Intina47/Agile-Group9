const express = require('express');
const app = express();
const path = require('path');
const PORT = 8800;
const rateLimiter = require('rate-limiter-flexible');
const nodemailer = require('nodemailer');
const validator = require('email-validator');
const db = require('mssql');
const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
const Buffer = require('buffer').Buffer;
const sharp = require('sharp');
// const connection = require('mssql')
require('dotenv').config();

app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.json())

const config = {
    user:'CloudSAddeb947e',
    password: 'agile-projectG9',
    server: 'agile-project.database.windows.net',
    database: 'agile',
port: 1433
}

app.get('/recipes', (req, res) => {
    let recipes = cache.get('recipes');
    if(recipes){
        console.log('Recipes successfully retrieved from cache');
            return res.status(200).send(recipes);
    }
    db.connect(config, (err) => {
      if (err) {
        console.error('Error connecting to database:', err);
        return res.status(500).send({ error: 'Error connecting to database' });
      }
      console.log(req.connection.remoteAddress, 'Successfully Connected to database');
      //create a new request object
      let sqlRequest = new db.Request();
      //query the database and get the records
      let sqlQuery = 'Select * From Recipes';
      sqlRequest.query(sqlQuery, function(err, data){
        if (err) {
          console.error('Error querying database:', err);
          return res.status(500).send({ error: 'Error querying database' });
        }
        const Recipes = data.recordset.map(async recipe=>{
            const resizedImage = await sharp(recipe.image).resize(300,160).toBuffer();
            recipe.image = Buffer.from(resizedImage).toString('base64');
            return recipe;
        })
        Promise.all(Recipes)
        .then(Recipes => {
            console.log('Recipes successfully retrieved from database');
            cache.set('recipes', Recipes);
            res.status(200).send(Recipes);
            db.close();
        })
        .catch(err => {
            console.error('Error querying database for Recipes:', err);
            return res.status(500).send({ error: 'Error querying database' });
        });
      });
    });
  });

app.post('/details', (req,res) =>{
    //receive the product id from the client
    const id = parseInt(req.body.id, 10);
    if(!id){
        console.log('No id provided');
    }
    const cacheKey = `recipe_details_${id}`;
    //check if the results is in the cache
    cache.get(cacheKey, (err, value)=>{
        if (!err && value) {
            console.log('Data retrieved from cache');
            console.log(value);
            return res.status(200).send(value);
        }
        //query database
        getRecipeDetails(id, res, cacheKey);
    })
    getRecipeDetails(id, res, cacheKey);
});
        //query the database and get the records
        async function getRecipeDetails(id, res, cacheKey){
            try {
                await db.connect(config);
                console.log('Connected to database');
                //create a new request object
                let sqlRequest = new db.Request();

                let sqlQuery = "Select * From Recipes Where RecipeID = '" + id + "'";
                const recipeData = await sqlRequest.query(sqlQuery);
                const Recipes = recipeData.recordset.map(async recipe=>{
                    const resizedImage = await sharp(recipe.image).resize(600,600).toBuffer();
                    recipe.image = Buffer.from(resizedImage).toString('base64');
                    return recipe;
                })
                const recipeDataEdited = await Promise.all(Recipes)
                let sqlQuery2 = "Select * From RecipeIngredients Where RecipeID = '" + id + "'";
                const ingredientData = await sqlRequest.query(sqlQuery2);
                const Ingredients = ingredientData.recordset

                const ingredientPromises = Ingredients.map(async item=>{
                    const ingredientIDs = item.IngredientID;
                    let sqlQuery3 = "Select * From Ingredients Where IngredientID = '" + ingredientIDs + "'";
                    const ingredientDetails = await sqlRequest.query(sqlQuery3);
                    return ingredientDetails.recordset;
                });
                const ingredientDetails = await Promise.all(ingredientPromises);
                const results ={
                    recipeData: recipeDataEdited,
                    ingredientDetails
                };
                console.log('Recipe details successfully retrieved from database');
                //store result in the cache
                cache.set(cacheKey, results, (err,success)=>{
                    if(!err && success){
                        console.log('Recipe details successfully stored in cache');
                    }
                });
                return res.status(200).send(results);
            
        }
            catch(err){
                console.error('Error querying database:', err);
                return res.status(500).send({ error: 'Internal server error' });
            }
        }

//add users email to the tbl Subscriptions
app.post('/subscribe', (req, res) => {
    const email = req.body.email;
    if(!validator.validate(email)){
        return res.status(400).send({error: 'Invalid email address'});
    }
    db.connect(config, (err) => {
        if (err) {
            console.error('Error connecting to database:', err);
            return res.status(500).send({ error: 'Error connecting to database' });
        }
        console.log(req.connection.remoteAddress, 'Successfully Connected to database');
        //create a new request object
        let sqlRequest = new db.Request();
        //query the database and get the records
        let sqlQuery = "INSERT INTO Subscriptions (Email) VALUES ('" + email + "')";
        sqlRequest.query(sqlQuery, function(err, data){
            if (err) {
                console.error('Error querying database:', err);
                return res.status(500).send({ error: 'Error querying database' });
            }
            console.log('Email added to database');
            res.status(200).send({message: 'Success'});
            db.close();
        });
    });
});
//filter data with tags
app.post('/filter', (req, res) => {
    const tags = req.body.tags;
    if(!tags){
        console.log('No tags provided');
        return res.status(400).send({error: 'No tags provided'});
    }
    console.log(tags);
    db.connect(config, (err) => {
        if (err) {
            console.error('Error connecting to database:', err);
            return res.status(500).send({ error: 'Error connecting to database' });
        }
        console.log(req.connection.remoteAddress, 'Successfully Connected to database');
        //create a new request object
        let sqlRequest = new db.Request();
        //query the database and get the records
        let sqlQuery = "Select * From Recipes Where CHARINDEX(',' + '" + tags + "' + ',', ',' + Tags + ',') > 0";
        sqlRequest.query(sqlQuery, function(err, data){
            if (err) {
                console.error('Error querying database:', err);
                return res.status(500).send({ error: 'Error querying database' });
            }
            const Recipes = data.recordset.map(async recipe=>{
                const resizedImage = await sharp(recipe.image).resize(300,160).toBuffer();
                recipe.image = Buffer.from(resizedImage).toString('base64');
                return recipe;
            }
            );
            Promise.all(Recipes)
            .then(Recipes => {
                console.log('Recipes successfully retrieved from database');
                res.status(200).send(Recipes);
                db.close();
            })
        });
    });
});

//retrieved the saved saveditems from the db using the product id

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/views/index.ejs'));
});
app.get('/contact.html', (req, res) =>{
    res.sendFile(path.join(__dirname, '/dist/contact.html'));
})
app.get('/dist/css/main.css',(req, res)=>{
    res.set('Content-Type', 'text/css');
    res.sendFile(path.join(__dirname, '/dist/css/main.css'));
});
app.get('/dist/js/app.js',(req, res) =>{
    res.sendFile(path.join(__dirname, 'dist/js/app.js'));
    }
);
app.get('/dist/js/uikit.js',(req, res)=>{
    res.sendFile(path.join(__dirname, '/dist/js/uikit.js'));
});
app.get('/src/js/uikit.js',(req, res) => {
    res.sendFile(path.join(__dirname, '/src/js/uikit.js'));
});
app.get('/src/js/login.js',(req, res) => {
    res.sendFile(path.join(__dirname, '/src/js/login.js'));
});
app.get('/src/js/index.js',(req, res) => {
    res.sendFile(path.join(__dirname, '/src/js/index.js'));
});
app.get('/src/js/recipe.js',(req, res) => {
    res.sendFile(path.join(__dirname, '/src/js/recipe.js'));
});
app.get('/src/js/filter.js',(req, res) => {
    res.sendFile(path.join(__dirname, '/src/js/filter.js'));
});
app.get('/src/js/save.js',(req, res) => {
    res.sendFile(path.join(__dirname, '/src/js/save.js'));
});
app.get('//src/js/morelike.js',(req, res) => {
    res.sendFile(path.join(__dirname, '/src/js/morelike.js'));
});
app.get('/dist/js/service_worker.js',(req, res) => {
    res.sendFile(path.join(__dirname, '/dist/js/service_worker.js'));
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
