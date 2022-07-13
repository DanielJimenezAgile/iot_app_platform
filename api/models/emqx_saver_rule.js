import mongoose from 'mongoose';


const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const saverRouleShema = new Schema ({
    userId:{type:String,required:[true]},
    dId:{type:String,required:[true],unique:true},
    emqxRuleId:{type:String,required:[true]},
    status:{type:Boolean,required:[true]},
})

//validator

saverRouleShema.plugin(uniqueValidator,{message:'Error, '})

// convert to model

const SaverRoule = mongoose.model('SaverRoule',saverRouleShema) 

export default SaverRoule