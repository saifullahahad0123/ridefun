const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({

passenger:{
type:mongoose.Schema.Types.ObjectId,
ref:"User"
},

route:{
type:mongoose.Schema.Types.ObjectId,
ref:"Route"
},

passengerName:String,

phoneNumber:Number,
arrivalTime:String,




seatsBooked:Number,

fromPlace:String,

toPlace:String,

totalAmount:Number,

createdAt:{
type:Date,
default:Date.now,
expires:172800
},

status:{
type:String,
default:"confirmed"
}

},{
timestamps:true
});


module.exports = mongoose.model(
    "Booking",
    bookingSchema
);