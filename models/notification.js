const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({

    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    // Notification Title
    title:{
        type:String,
        default:"Notification"
    },

    // Notification Message
    message:{
        type:String,
        required:true
    },

    // Notification Type
    type:{
        type:String,
        enum:[
            "booking",
            "cancel",
            "route_cancel",
            "arrival",
            "warning",
            "completed"
        ],
        default:"booking"
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
        expires:172800 // Delete automatically after 48 hours
    }

});

module.exports = mongoose.model(
    "Notification",
    notificationSchema
);