const express = require('express');
const { request } = require('..');
const router = express.Router()
const {checkAuth} =require('../middlewares/authentication.js')
////////////////////////////
//////MODELS//////////////
//////////////////////
import Template from '../models/template.js'
import Device from '../models/device.js'

//Get templates
router.get("/template",checkAuth,async(req,res)=>{
    try {
        var userid = req.userData._id
        const templates = await Template.find({userId: userid})

        res.json({
            "status":"success",
            "data": templates
                })

    } catch (error) {
        console.log(error);
        res.status(500).json({
            "status":"Error",
            "error": error 
                })
    }
    
    
    

} );


router.post("/template",checkAuth,async(req,res)=>{

    try {
        var newTemplate = req.body.template;
        const userId = req.userData._id;

        newTemplate.userId = userId
        newTemplate.createdTime = Date.now();

        const respuesta = await Template.create(newTemplate);
      
        
        res.json({
            "status":"success",
            "data": newTemplate 
                })
    }
    catch(error){
        console.log(error);
        res.status(500).json({
            "status":"Error",
            "error": error 
                })
    }
} );


///Delete template
router.delete("/template",checkAuth,async(req,res)=>{
    try {
        var userId = req.userData._id
        const templateId = req.query.templateId

        const devices = await Device.find({userId: userId, templateId: templateId });


        if (devices.length > 0){

            const response = {
                status: "fail",
                error: "template in use"
            }
    
            return res.json(response);
        }

        const result = await Template.deleteOne({userId:userId,_id:templateId})
        console.log("Result--->"+ result);
        res.json({
            "status":"success",
            "data": result
                })


    } catch (error) {
        res.status(500).json({
            "status":"Error",
            "error": error 
                })
    }

} );

module.exports = router