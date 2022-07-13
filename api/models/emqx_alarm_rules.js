import mongoose from 'mongoose';


const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const alarmRouleShema = new Schema ({
    userId:{type:String,required:[true]},
    dId:{type:String,required:[true]},
    emqxRuleId:{type:String,required:[true]},
    variableFullName:{type:String},
    variable:{type:String},
    value:{type:Number},
    condition:{type:String},
    triggerTime:{type:Number},
    status:{type:Boolean},
    counter:{type:Number,default:0},
    createdTime:{type:Number},
})



// convert to model

const AlarmRoule = mongoose.model('AlarmRoule',alarmRouleShema) 

export default AlarmRoule