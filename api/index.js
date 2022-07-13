const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
const colors = require('colors');

require('dotenv').config();
//Instances
const app = express()

//espress config
app.use(morgan("tiny"))
app.use(express.json())
app.use(express.urlencoded({
    extended:true
}))
app.use(cors())

//express routes
app.use('/api', require('./routes/devices.js'))
app.use('/api', require('./routes/users.js'))
app.use('/api', require('./routes/templates.js'))
app.use('/api', require('./routes/webhooks.js'))
app.use('/api', require('./routes/emqxapi.js'))
app.use('/api', require('./routes/alarms.js'))
app.use('/api', require('./routes/dataprovider.js'))

module.exports = app
//listener

app.listen(process.env.api_port, ()=> {
    console.log("Api listening on " + process.env.api_port);
});

//mongo Connection

const mongoUserName=process.env.mongo_username
const mongoPassword=process.env.mongo_password
const mongoHost=process.env.mongo_host
const mongoPort=process.env.mongo_port
const mongoDatabase=process.env.mongo_db

var uri = "mongodb://"+mongoUserName+":"+mongoPassword+"@"+mongoHost+":"+mongoPort + "/" + mongoDatabase

const options = {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    authSource:"admin"
}
try {
    mongoose.connect(uri,options).then(()=>{
        console.log("*********Conectado a Mongo**************".bgGreen);
    },
    (err)=>{
        console.log("*********Coneccion fallida**************".red)
        console.log(err.red);;
    })
} catch (error) {
    console.log("***********************".red);
    console.log("*********Error al conectar a mongo**************".red);
    console.log(error.red);
}





//endpoint test

app.get("/testing",(req,res)=>{
    res.send("GEt resting");
} );


