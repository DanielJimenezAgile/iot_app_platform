const express = require('express');
const router = express.Router()
const axios = require('axios');
const colors = require('colors');
const {checkAuth} =require('../middlewares/authentication.js')

import AlarmRoule from "../models/emqx_alarm_rules.js"

const auth ={
    auth:{
        username: "admin",
        password: process.env.emqx_app_sicret
    }
}


///Create alarm Rule
router.post("/alarm-rule",checkAuth,async(req,res)=>{

  var newRule = req.body.newRule
  newRule.userId = req.userData._id
  
  var r = await createAlarmRule(newRule)

  if (r) {
      return res.json({status:"success"})
  } else {
    return res.json({status:"error"})
  }



} );

//Update Alarm
router.put("/alarm-rule",checkAuth,async(req,res)=>{
    const rule = req.body.rule
    console.log("#########RULE SENDED#######".bgWhite + JSON.stringify(rule));
    if (await updateAlarmRuleStatus(rule.emqxRuleId,rule.status)){
        res.json({
            status: "success"
        })
    } else {
        res.json({
            status: "error"
        })
    }
    
})
// DELETE Alarm
router.delete("/alarm-rule",checkAuth,async(req,res)=>{
    try {
        var emqxRuleId = req.query.emqxRuleId

        if (await deleteAlarmRule(emqxRuleId)){
            res.json({
                "status":"success",
                    })
        }else{
            res.status(500).json({
                "status":"error",
                "error": "Can't delete Rule" 
                    })
        }
        


    } catch (error) {
        res.status(500).json({
            "status":"Error",
            "error": error 
                })
    }

} );

async function createAlarmRule(newAlarm) {
    
    const url = "http://"+process.env.emqx_host+":8085/api/v4/rules"

    const topic = newAlarm.userId+"/"+newAlarm.dId+"/"+newAlarm.variable+"/sdata"

    const rawsql = 'SELECT username,topic, payload FROM "'+topic+'" WHERE payload.value' +newAlarm.condition+ ' '+newAlarm.value+ ' AND is_not_null(payload.value)'

    var newRule = {
        rawsql: rawsql,
        actions:[
            {
                name: "data_to_webserver",
                params:{
                    $resource: global.alarmResource.id,
                    payload_tmpl: '{"userId":"'+newAlarm.userId+'", "payload":${payload},"topic": "${topic}"}'
                }
            }
        ],
        description: "ALARM-RULE",
        enabled: newAlarm.status
    }
    
    try {
        
        const res =await axios.post(url,newRule,auth)
        console.log("REs dAta -->>" + JSON.stringify(res.data.data.id ));
        const ruleId = res.data.data.id
        if(res.status ==200 && res.data.data != null ){
            
            const mongoRule = await AlarmRoule.create({
                userId:newAlarm.userId,
                dId:newAlarm.dId,
                emqxRuleId: ruleId,
                variableFullName:newAlarm.variableFullName,
                variable:newAlarm.variable,
                value:newAlarm.value,
                condition:newAlarm.condition,
                triggerTime:newAlarm.triggerTime,
                status:newAlarm.status,
                createdTime:Date.now(),
            })
            console.log("Mongo Alarm Rule -->>" + JSON.stringify(mongoRule));
            const url = "http://"+process.env.emqx_host+":8085/api/v4/rules/"+mongoRule.emqxRuleId

            const payload_templ = '{"userId":"' + newAlarm.userId + '","dId":"' + newAlarm.dId + '","payload":${payload},"topic":"${topic}","emqxRuleId":"' + mongoRule.emqxRuleId + '","value":' + newAlarm.value + ',"condition":"' + newAlarm.condition + '","variable":"' + newAlarm.variable + '","variableFullName":"' + newAlarm.variableFullName + '","triggerTime":' + newAlarm.triggerTime + '}';
            
            newRule.actions[0].params.payload_tmpl= payload_templ

            const res = await axios.put(url,newRule,auth)
            console.log("######### Alarm Rule Created ###############".green);
            return true
        } else {
          
            console.log("********Can't Create Rule. Status-->".red+ res.status +"***************".red);
            console.log("DATA--> "+ JSON.stringify(res.data));
            return false
        }
    } catch (error) {
        console.log("********Can't Create Rule. ERROR-->".red+ error +"***************".red);
        return false
    }

}

async function updateAlarmRuleStatus(emqxRuleId, status) {

    const url = "http://"+process.env.emqx_host+":8085/api/v4/rules/"+emqxRuleId
    console.log(url);
    const newRule = {
        enabled: status 
    }

    try {
        const res =await axios.put(url,newRule,auth)
    
        if(res.status ==200 && res.data.data){
            await AlarmRoule.updateOne({emqxRuleId:emqxRuleId},{status:status})
            console.log("********Alarm Rule Updated ***************".green);

            return true
        } else {
            console.log("********Can't Update Rule. Status-->".red+ res.status +"***************".red);
            //console.log("....DATA-->  " + JSON.stringify(res.data));
            return false
        }
    } catch (error) {
        console.log("********Can't Update Rule. ERROR-->".red+ error +"***************".red);
        return false
    }

}

async function deleteAlarmRule(emqxRuleId) {

    try {
        
        const url = "http://"+process.env.emqx_host+":8085/api/v4/rules/" + emqxRuleId
        const emqxRule = await axios.delete(url,auth)
        const deleted = await AlarmRoule.deleteOne({emqxRuleId:emqxRuleId})

       return true
    } catch (error) {
        console.log(error);
        return false  
    }
}
module.exports = router