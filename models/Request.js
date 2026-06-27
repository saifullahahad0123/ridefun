// const mongoose = require("mongoose");

// const requestSchema = new mongoose.Schema({

//     passenger:{
//         type:mongoose.Schema.Types.ObjectId,
//         ref:"User"
//     },

//     fromCity:String,

//     toCity:String,

//     seats:Number,

//     status:{
//         type:String,
//         enum:[
//             "pending",
//             "accepted",
//             "completed",
//             "cancelled"
//         ],
//         default:"pending"
//     },

//     acceptedDriver:{
//         type:mongoose.Schema.Types.ObjectId,
//         ref:"User",
//         default:null
//     }

// },{
//     timestamps:true
// });

// module.exports =
// mongoose.model(
//     "Request",
//     requestSchema
// );