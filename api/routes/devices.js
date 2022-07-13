const express = require('express');
const { request } = require('..');
const router = express.Router()
const {checkAuth} =require('../middlewares/authentication.js')
const axios = require('axios');
////////////////////////////
//////MODELS//////////////
//////////////////////
import Device from '../models/device.js'
import SaverRoule from '../models/emqx_saver_rule.js';
import Template from '../models/template.js';
import AlarmRoule from '../models/emqx_alarm_rules.js';
import EmqxAuthRule from '../models/emqx_auth.js';

const auth ={
    auth:{
        username: "admin",
        password: process.env.emqx_app_sicret
    }
}


//////////////////////
//////END-POINTS/////////
/////////////////////

//Get Devices
router.get("/devices",checkAuth,async(req,res)=>{
    try {
        var userid = req.userData._id
        var devices = await Device.find({userId: userid})
        devices = JSON.parse(JSON.stringify(devices))

        const saverRule = await getSaverRules(userid)
        const template = await getTemplates(userid)
        const alarmRule = await getAlarmRules(userid)

        devices.forEach((device,index)=>{
            devices[index].saverRule = saverRule.filter(saverRule=>saverRule.dId == device.dId)[0]
            devices[index].template = template.filter(template=>template._id == device.templateId)[0]
            devices[index].alarmRule = alarmRule.filter(alarmRule=>alarmRule.dId == device.dId)
        })

        res.json({
            "status":"success",
            "data": devices 
                })

    } catch (error) {
        res.status(500).json({
            "status":"Error",
            "error": error 
                })
    }
    
    
    

} );
///New device
router.post("/devices",checkAuth,async(req,res)=>{

    try {
        var newDevice = req.body.newDevice;
        const userId = req.userData._id;
        newDevice.userId = userId
        newDevice.createdTime = Date.now();
        newDevice.password = makeid(10)
        if(createSaverRoule(userId,newDevice.dId,true)){
            const device = await Device.create(newDevice); 
            selectDevices(userId,newDevice.dId)
            res.json({
                "status":"success",
                "data": newDevice 
                    })
        }else {
            res.status(500).json({
                "status":"Error",
                "error": "Can't create Rule" 
                    })
        }

        
    }
    catch(error){
        res.status(500).json({
            "status":"Error",
            "error": error 
                })
    }
} );
///Delete Device
router.delete("/device", checkAuth, async (req, res) => {
    try {
      const userId = req.userData._id;
      const dId = req.query.dId;
  
      //deleting saver rule.
      await deleteSaverRule(dId);
  
      //deleting all posible alarm rules
      await deleteAllAlarmRules(userId, dId);
  
      //deleting all posible mqtt device credentials
      await deleteMqttDeviceCredentials(dId);
  
      //deleting device
      const result = await Device.deleteOne({ userId: userId, dId: dId });
  
      //devices after deletion
      const devices = await Device.find({ userId: userId });
  
      if (devices.length >= 1) {
        //any selected?
        var found = false;
        devices.forEach(devices => {
          if (devices.selected == true) {
            found = true;
          }
        });
  
        //if no selected...
        //we need to selet the first
        if (!found) {
          await Device.updateMany({ userId: userId }, { selected: false });
          await Device.updateOne(
            { userId: userId, dId: devices[0].dId },
            { selected: true }
          );
        }
      }
  
      const response = {
        status: "success",
        data: result
      };
  
      return res.json(response);
    } catch (error) {
      console.log("ERROR DELETING DEVICE");
      console.log(error);
  
      const response = {
        status: "error",
        error: error
      };
  
      return res.status(500).json(response);
    }
  });
  

//Update Device
router.put("/devices",checkAuth, async (req,res)=>{
    const dId = req.body.dId
    const userId = req.userData._id
  
    if(await selectDevices(userId, dId)){
        res.json({
            "status":"success",
                })
    }else{
        res.json({
            "status":"error",
                })
    }

} );

router.put("/saver-rule",checkAuth,async(req,res)=>{
    const rule = req.body.rule
    console.log("#########RULE SENDED#######".bgWhite + JSON.stringify(rule));
    await updateSaveRuleStatus(rule.emqxRuleId,rule.status)
    res.json({
        status: "success"
    })
})
//////////////////////
//////FUNCTIONS/////////
/////////////////////

async function selectDevices(userId, deviceId) {
   try {
    const result = await Device.updateMany(
        {userId : userId,},
        {selected: false}
        ) 

    const result2 = await Device.updateOne(
        {dId:deviceId, userId:userId},
        {selected: true}
        )
    console.log("------"+JSON.stringify(result2)+"--------");
    return true
   } catch (error) {
       console.log("Error in update Device:  " + error);
   }
}

async function getSaverRules(userId) {
    try {
        const rules = await SaverRoule.find({userId:userId})
        return rules
    } catch (error) {
        return false
    }
}

async function updateSaveRuleStatus(emqxRuleId,status) {

    const url = "http://"+process.env.emqx_host+":8085/api/v4/rules/"+emqxRuleId
    console.log(url);
    const newRule = {
        enabled: status 
    }

    try {
        const res =await axios.put(url,newRule,auth)
    
        if(res.status ==200 && res.data.data){
            await SaverRoule.updateOne({emqxRuleId:emqxRuleId},{status:status})
            console.log("********Saver Rule Updated ***************".green);

            return {
                status: "success",
                action: "updated",

            }
        } else {
            console.log("********Can't Update Rule. Status-->".red+ res.status +"***************".red);
            console.log("....DATA-->  " + JSON.stringify(res.data));
            return false
        }
    } catch (error) {
        console.log("********Can't Create Update. ERROR-->".red+ error +"***************".red);
        return false
    }


    
}

async function deleteSaverRule(dId) {

    try {
        const mongoRule = await SaverRoule.findOne({dId:dId})
        const url = "http://"+process.env.emqx_host+":8085/api/v4/rules/" + mongoRule.emqxRuleId
        const emqxRule = await axios.delete(url,auth)
        const deleted = await SaverRoule.deleteOne({dId:dId})

       return true
    } catch (error) {
        console.log(error);
        return false  
    }
}

async function createSaverRoule(userId,dId,status) {
    const url = "http://"+process.env.emqx_host+":8085/api/v4/rules"

    const topic = userId+"/"+dId+"/+/sdata"

    const rawsql = 'SELECT topic, payload FROM "'+topic+'" WHERE payload.save = 1'

    var newRule = {
        rawsql: rawsql,
        actions:[
            {
                name: "data_to_webserver",
                params:{
                    $resource: global.saverResource.id,
                    payload_tmpl: '{"userId":"'+userId+'", "payload":${payload},"topic": "${topic}"}'
                }
            }
        ],
        description: "SAVE-RULE",
        enabled: status
    }

try {
    const res =await axios.post(url,newRule,auth)
    
    if(res.status ==200 && res.data.data){
        console.log("********Saver Rule Created ***************".green);

        await SaverRoule.create({
            userId:userId,
            dId:dId,
            emqxRuleId:res.data.data.id,
            status:status,
        })
        return true
    } else {
      
        console.log("********Can't Create Rule. Status-->".red+ res.status +"***************".red);
        console.log("DATA--> "+ res.data);
        return false
    }
} catch (error) {
    console.log("********Can't Create Rule. ERROR-->".red+ error +"***************".red);
    return false
}



    

}

async function getTemplates(userid){
    try {
        const rules = await Template.find({userId:userid})
        return rules
    } catch (error) {
        return false
    }

}

async function getAlarmRules(userId){
    try {
        const rules = await AlarmRoule.find({userId:userId})
        return rules
    } catch (error) {
        return false
    }
}

async function deleteMqttDeviceCredentials(dId) {
    try {
      await EmqxAuthRule.deleteMany({ dId: dId, type: "device" });
  
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

async function deleteAllAlarmRules(userId, dId) {
try {
    const rules = await AlarmRoule.find({ userId: userId, dId: dId });

    if (rules.length > 0) {
    asyncForEach(rules, async rule => {
        const url = "http://"+process.env.emqx_host+":8085/api/v4/rules/" + rule.emqxRuleId;
        const res = await axios.delete(url, auth);
    });

    await AlarmRoule.deleteMany({ userId: userId, dId: dId });
    }

    return true;
} catch (error) {
    console.log(error);
    return "error";
}
}

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  }

function makeid(length) {
    var result = "";
    var characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

module.exports = router