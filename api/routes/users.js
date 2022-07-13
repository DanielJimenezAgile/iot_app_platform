const express = require('express');
const router = express.Router()
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const {checkAuth} =require('../middlewares/authentication.js')

import { token } from 'morgan';
//models import

import User from '../models/user.js'
import EmqxAuthRule from '../models/emqx_auth.js'



router.post("/register",async(req,res)=>{
    try {
        var data = req.body    
        const encriptedPassword=  bcrypt.hashSync(data.password,10)

        const newUser = {
            name:data.name,
            email:data.email,
            password:encriptedPassword,
        }


            const user = await User.create(newUser);
            res.json({"status":"success"})
} catch (error) {
    res.status(500).json(
        {"status":"error",
         "error": error});
    //res.json({"error": error})
}



} );

router.post("/login",async(req,res)=>{
   const data = req.body
   var user = await User.findOne({email: data.email})
 if (user){
    if (bcrypt.compareSync(data.password,user.password)){
        user.set('password', undefined, {strict: false})
        const token = jwt.sign({userData:user},'securePasswordHere',{expiresIn: 60*60*24*30*12})
            return res.json({
                "status":"success",
                "token": token,
                "userData":user
                    })
        
        }else{
            return res.status(401).json({
                "status":"error",
                "error" : "Credenciales invalidas"
         })
        }

} else{
    return res.status(401).json({
        "status":"error",
        "error" : "Credenciales invalidas"
 })
}



} );

// GET MQTT Credentials

router.post("/getmqttcredentials",checkAuth,async(req,res)=>{
   
try {
    var userId = req.userData._id
   const credentials = await getWebUserMqttCredentials(userId)
   credentials.status = "success"
   res.json(credentials)
    setTimeout(() => {
        getWebUserMqttCredentials(userId)
    }, 5000);

} catch (error) {
    console.log(error);
    res.status(500).json({
        status:'error'
    })
}

 } );
// GET MQTT Credentials For Reconection
 router.post("/getmqttcredentialsreconect",checkAuth,async(req,res)=>{
   
    try {
        var userId = req.userData._id
       const credentials = await getWebUserMqttCredentialsForReconnection(userId)
       credentials.status = "success" 
       res.json(credentials)
        setTimeout(() => {
            getWebUserMqttCredentials(userId)
        }, 15000);
    
    } catch (error) {
        res.status(500).json({
            status:'error'
        })
    }
    
     } );

async function getWebUserMqttCredentialsForReconnection(userId) {
    try {
        var rule = await EmqxAuthRule.find({type: 'user', userId:userId})
        if (rule.length == 1) {
            
            return {
                username: rule[0].username,
                password: rule[0].password
            }
        }
    } catch (error) {
        console.log(error);
    }

    }
     
async function getWebUserMqttCredentials(userId) {
    var rule = await EmqxAuthRule.find({type: 'user', userId:userId})
    if (rule.length == 0) {
        const newRule = {
            userId:userId,
            username:makeid(10),
            password:makeid(10),
            publish:[userId + "/#"],
            subscribe:[userId + "/#"],
            type:"user",
            time:Date.now(),
            updatedTime:Date.now(),
        }

        const result = await EmqxAuthRule.create(newRule)

        return {
            username: result.username,
            password: result.password
        }
    }
    
    const newUserName = makeid(10)
    const newPassword = makeid(10)

    const result = await EmqxAuthRule.updateOne({type:"user", userId:userId},{username:newUserName,password:newPassword,updatedTime:Date.now()})
   if (result.n==1 && result.ok == 1) {
    return {
        username: newUserName,
        password: newPassword
    }

   } else {
       return false
   }

}

function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

module.exports = router