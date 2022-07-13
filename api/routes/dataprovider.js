const express = require('express');
const { request } = require('..');
const router = express.Router()
const {checkAuth} =require('../middlewares/authentication.js')
const axios = require('axios');

import Data from '../models/data.js'

router.get("/get-small-charts-data",checkAuth,async(req,res)=>{
    try {
        var userId = req.userData._id
        const chartTimeAgo = req.query.chartTimeAgo
        const dId = req.query.dId
        const variable = req.query.variable
        
        const timeAgoMs = Date.now()-(chartTimeAgo *60 * 1000)
        
        var data = await Data.find({userId: userId, dId:dId,variable:variable,"time":{$gt:timeAgoMs}}).sort({"time": 1})

        res.json({
            "status":"success",
            "data": data 
                })

    } catch (error) {
        console.log("............"+error+".................");
        res.status(500).json({
            "status":"Error",
            "error": error 
                })
    }
})
    
    


module.exports = router