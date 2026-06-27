const mongoose = require("mongoose");

const waitlistSchema =
new mongoose.Schema({

    trip: {

        type:
        mongoose.Schema.Types.ObjectId,

        ref:"Trip"
    },

    passenger: {

        type:
        mongoose.Schema.Types.ObjectId,

        ref:"User"
    }

},
{
    timestamps:true
});

module.exports =
mongoose.model(
    "Waitlist",
    waitlistSchema
);