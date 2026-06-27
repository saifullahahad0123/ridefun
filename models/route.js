const mongoose = require("mongoose");

const stopSchema = new mongoose.Schema({

    from:String,

    to:String,

    fare:Number,

    arrivalTime:String

});

const routeSchema = new mongoose.Schema({

    driver:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },

    vehicleType:String,

    vehicleNumber:String,

    contactNumber:String,

    totalSeats:Number,

    availableSeats:Number,

    status:{
        type:String,
        enum:[
            "waiting",
            "active",
            "stopped",
            "cancelled"
        ],
        default:"waiting"
    },

    stops:[stopSchema]

},{
    timestamps:true
});

module.exports =
mongoose.model(
    "Route",
    routeSchema
);