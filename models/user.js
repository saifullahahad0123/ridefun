const mongoose = require("mongoose");

const passportLocalMongoose =
require("passport-local-mongoose").default;

const Schema = mongoose.Schema;

const userSchema = new Schema({

username:{
type:String,
required:true
},

email:{
type:String,
lowercase:true,
trim:true,
required:true,
unique:true,
sparse:true,
match:[
/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(.\w{2,3})+$/,
"Please enter a valid email"
]
},

phone:{
type:String,
required:true,
match:[
/^[0-9]{10}$/,
"Mobile number must be exactly 10 digits"
]
},

role:{
type:String,
enum:[
"passenger",
"driver",
"admin"
],
default:"passenger"
},

licenseImage:{
type:String,
default:""
},

rcImage:{
type:String,
default:""
},

isVerifiedDriver:{
type:Boolean,
default:false
},

verificationStatus:{
type:String,
enum:[
"pending",
"approved",
"rejected"
],
default:"pending"
},

profileImage:{
type:String,
default:""
},

address:{
type:String,
default:""
},

createdAt:{
type:Date,
default:Date.now
}

});

userSchema.plugin(passportLocalMongoose, {
    usernameField: "email"
});

module.exports =
mongoose.model(
"User",
userSchema
);


