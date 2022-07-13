const express = require('express');
const router = express.Router()
const axios = require('axios');
const colors = require('colors');
const mqtt = require('mqtt');
const {checkAuth} =require('../middlewares/authentication.js')
//const { default: Device } = require('../models/device');

import Device from "../models/device.js"
import Data from "../models/data.js"
import Notification from "../models/notifications.js"
import AlarmRule from "../models/emqx_alarm_rules.js"
import EmqxAuthRule from "../models/emqx_auth.js";
import Template from "../models/template.js";

var client = null





//////////////////////
//////END-POINTS/////////
/////////////////////

router.post("/saver-webhook",async(req,res)=>{
    try {
        if(req.headers.token != process.env.emqx_api_token){
            res.sendStatus(404)
            return
        }
        var data = req.body
        
        const splitedTopic = data.topic.split("/")

        var result = await  Device.find({dId:splitedTopic[1], userId: data.userId})
        if (result.length == 1){
            Data.create({
                userId:data.userId,
                dId:splitedTopic[1],
                variable:splitedTopic[2],

                value:data.payload.value,
                time:Date.now(),
            })
            //console.log("Data Sorted".green);
        }
        res.sendStatus(200)
        console.log(data);
        
    } catch (error) {
        console.log(error);
        res.status(500).json(
            {"status":"error",
            "error": error});
        
}
})

router.post("/alarm-webhook",async(req,res)=>{
    try {
        if(req.headers.token != process.env.emqx_api_token){
            res.sendStatus(404)
            return
        }
        res.sendStatus(200)

        var data = req.body
        const lastNotification = await Notification.find({dId:data.dId,emqxRuleId:data.emqxRuleId}).sort({time:-1}).limit(1)
        updateAlarmCounter(data.emqxRuleId)
        if(lastNotification.length == 0){
            //console.log("FIRST NOTIFICATION".bgCyan);
            saveNotifToMongo(data)
            sendMqttNotif(data)
        }else {
            const lastNotivToNow = (Date.now()-lastNotification[0].time) / 1000 / 60
            if(lastNotivToNow > data.triggerTime){
                //console.log("TRIGGERED".bgCyan);
                saveNotifToMongo(data)
                sendMqttNotif(data)
            }
        }

        
        
        //console.log(JSON.stringify(data));
        
    } catch (error) {
        console.log(error);
        res.status(500).json(
            {"status":"error",
            "error": error});
        
}
})

router.post("/getdevicecredentials",async(req,res)=>{
    try {
        const password = req.body.password
       


        const dId = req.body.dId
        const device = await Device.findOne({dId:dId})

        if (password != device.password) {
            return res.status(401).json()
        }

        const userId = device.userId
        var credentials = await getDeviceMqttCredencials(dId,userId)
        var template = await Template.findOne({_id:device.templateId})

        var variables = []

        template.widgets.forEach(widget =>{
            var v = (({variable,variableFullName,variableType,variableSendFreq})=>({variable,variableFullName,variableType,variableSendFreq}))(widget)
            variables.push(v)
        })

        const toSend = {
            username: credentials.username,
            password: credentials.password,
            topic: userId+'/'+dId+'/',
            variables: variables

        }
       res.json(toSend)
    
    } catch (error) {
        console.log(error);
        res.status(500).json(
            {"status":"error",
            "error": error});
        
}
})


//GET NOTIFICATIONS
router.get("/notifications",checkAuth,async(req,res)=>{
    try {
        var userid = req.userData._id
        var notifications = await getNotifications(userid)

       

        res.json({
            "status":"success",
            "data": notifications 
                })

    } catch (error) {
        res.status(500).json({
            "status":"Error",
            "error": error 
                })
    }
    
    
    

} );

//UPDATE NOTIF STATUS
router.put("/notifications",checkAuth, async (req,res)=>{
    
    const notifId = req.body.notifId
    const userId = req.userData._id
  
try {
    await Notification.updateOne({userId:userId, _id: notifId},{readed:true})

    res.json({
        "status":"success",
            })
} catch (error) {
    res.json({
        "status":"error",
            })
}


} );




//////////////////////
//////FUNCTIONS/////////
/////////////////////

async function saveNotifToMongo(newNotiv) {
    newNotiv.time = Date.now()
    newNotiv.readed = false
    var device = await Device.findOne({dId:newNotiv.dId,userId:newNotiv.userId})
    //console.log('++++DEVICES+++++++ -->> ' + device.name);
    newNotiv.deviceName = device.name

    Notification.create(newNotiv)

}

async function updateAlarmCounter(emqxRuleId) {
    try {
        await AlarmRule.updateOne({emqxRuleId: emqxRuleId,},{$inc:{counter:1}})      
    } catch (error) {
        console.log(error);
    }
}

function startMqttClient() {
    const options={
        port: 1883,
        host: process.env.emqx_host,
        clientId: 'webhook_user' + Math.floor(Math.random() * (10000 - 1)) + 1,
        username: process.env.emqx_super_user,
        password: process.env.emqx_super_pass,
        keepalive: 60,
        reconnectPeriod: 5000,
        protocolId: 'MQIsdp',
        protocolVersion: 3,
        clean: true,
        encoding: 'utf8' 
    }

    client = mqtt.connect('mqtt://'+ process.env.emqx_host, options)
    client.on('connect', function () {
        console.log('+++++++++CONNECTED TO MQTT+++++++++++++++'.bgCyan);
    })
    client.on('reconnect', function (error) {
        console.log('+++++++++RECONNECTING MQTT+++++++++++++++'.bgYellow);
        console.log(error);
    })

    client.on('error', function () {
        console.log('+++++++++ERROR MQTT+++++++++++++++'.bgRed);
    })

}
function sendMqttNotif(notif) {
    const topic = notif.userId +'/dId/variable/notif'
    const msg = 'The ' +notif.variableFullName+' is '+notif.condition+' than '+ notif.value
    client.publish(topic,msg)
    
}

async function getNotifications(userId) {
    try {
        const res = await Notification.find({userId: userId, readed:false})
        return res
    } catch (error) {
        console.log('Error geting notifications --> '.red +error);
    }
}

async function getDeviceMqttCredencials(dId,userId){
    try {
        var rule = await EmqxAuthRule.find({
            type: "device",
            userId: userId,
            dId:dId
        })
        if (rule.length == 0 ) {
            const newRule = {
                userId:userId,
                dId:dId,
                username:makeid(10),
                password:makeid(10),
                publish:[userId +"/"+dId+"/+/sdata"],
                subscribe:[userId + "/"+dId+"/+/actdata"],
                type:"device",
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

        const result = await EmqxAuthRule.updateOne({type:"device", userId:userId},{$set:{username:newUserName,password:newPassword,updatedTime:Date.now()}})
        if (result.n==1 && result.ok == 1) {
            return {
                username: newUserName,
                password: newPassword
            }
        }

    } catch (error) {
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

setTimeout(() => {
    startMqttClient()
}, 1000);

module.exports = router