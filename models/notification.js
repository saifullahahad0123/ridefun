const mongoose =
require("mongoose");

const notificationSchema =
new mongoose.Schema({

    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },

    passengerName:String,

    passengerPhone:String,

    fromCity:String,

    toCity:String,

    seatsBooked:Number,

    amount:Number,

    arrivalTime:String,

travelDate:Date,


    isRead:{
    type:Boolean,
    default:false
},

    createdAt:{
        type:Date,
        default:Date.now,
        expires:172800
    }
    

});

module.exports =
mongoose.model(
    "Notification",
    notificationSchema
);