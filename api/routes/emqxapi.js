const express = require('express');
const router = express.Router()
const axios = require('axios');
const colors = require('colors');


const auth ={
    auth:{
        username: "admin",
        password: process.env.emqx_app_sicret
    }
}

global.saverResource = null
global.alarmResource = null

///////////////////
////FUNCTIONS//////
//////////////////

async function listResource() {
    const url = "http://localhost:8085/api/v4/resources/"
    const res = await axios.get(url,auth)
    const sizeRes = res.data.data.length
    console.log(res.data.data);

    try {
        if(!res.status == 200){
            console.log("*******Error Status "+res.status+" From EMQX********************".bgRed)
            return
        }
    
        if(sizeRes==0){
            console.log("*********Creting Resources EMQX************".green);
            createResources()
        }else if (sizeRes==2) {
            console.log("*********2 Resources geted************".green);
            res.data.data.forEach(resource => {
                if(resource.description == "alarm-webhook"){
                    global.alarmResource = resource
                    console.log("*******Alarm Resource Found --> ".bgBlue+ global.alarmResource+" ********************".bgBlue);
                }
                if(resource.description == "saver-webhook"){
                    global.saverResource = resource
                    console.log("*******Saver Resource Found --> ".bgBlue+ global.saverResource+" ********************".bgBlue);
                }
            });
        } else {
            console.log("*******Erase all the EMQX resources and restart node ********************".bgRed)
        }
    } catch (error) {
        console.log("*******Error listing the resources********************".bgRed)
    }

}


async function createResources(){
const url = "http://localhost:8085/api/v4/resources"

const saverData ={
    "type": "web_hook",
    "config" : {
        url: "http://localhost:3001/api/saver-webhook",
        headers:{
            token: process.env.emqx_api_token,
        },
        method: "POST"
    },
    description : "saver-webhook"
}

const alarmData ={
    "type": "web_hook",
    "config" : {
        url: "http://localhost:3001/api/alarm-webhook",
        headers:{
            token: process.env.emqx_api_token,
        },
        method: "POST"
    },
    description : "alarm-webhook"
}
///Create Saver Resource
try {
    const res1 = await axios.post(url,saverData,auth)
    if(res1.status==200){
        console.log("*********Saver Resource Created************".green);
    }else{
        console.log("*********Can't create Saver Resource. Get status--> "+res1.status+" ************".red);
    }
} catch (error) {
    console.log("*********Can't create Saver Resource. Get Error--> ".red+error+" ************".red);
}
//Create alarm Resource
try {
    const res2 = await axios.post(url,alarmData,auth)
    if(res2.status==200){
        console.log("*********Saver Resource Created************".green);
    }else{
        console.log("*********Can't create Saver Resource. Get status--> "+res2.status+" ************".red);
    }
} catch (error) {
    console.log("*********Can't create Alarm Resource. Get Error--> ".red +error+" ************".red);
}

listResource()


}


setTimeout(() => {
    listResource()
}, 1000);

module.exports = router