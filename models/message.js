const mongoose =
require("mongoose");

const messageSchema =
new mongoose.Schema({

    sender: {

        type:
        mongoose.Schema.Types.ObjectId,

        ref: "User"

    },

    trip: {

        type:
        mongoose.Schema.Types.ObjectId,

        ref: "Trip"

    },

    text: String

},
{
    timestamps: true
});

module.exports =
mongoose.model(
    "Message",
    messageSchema
);