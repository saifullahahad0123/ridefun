require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
const Booking = require("./models/booking");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user");
const { isLoggedIn, isDriver } = require("./middleware/auth");
const Review = require("./models/review");
const {isAdmin} = require("./middleware/adminmiddleware");
const twilio = require("twilio");
const Waitlist = require("./models/waitlist");
const Message = require("./models/message");
const Notification = require("./models/notification");
const multer = require("multer");
const Route = require("./models/route");


const storage =
multer.diskStorage({

    destination:
    function(req,file,cb){

        cb(
            null,
            "public/uploads"
        );

    },

    filename:
    function(req,file,cb){

        cb(

            null,

            Date.now() +
            path.extname(
                file.originalname
            )

        );

    }

});

const upload =
multer({
    storage
});



const app = express();

const http =
require("http");

const server =
http.createServer(app);

const { Server } =
require("socket.io");

const io =
new Server(server);
// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));


// EJS Setup
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
// Static Files
app.use(express.static(path.join(__dirname, "public")));

main()
  .then(() => {
    console.log("MongoDB Connected");
  })
  .catch((err) => {
    console.log(err);
  });


async function main() {
  await mongoose.connect(process.env.ATLASDB_URL);
}



const sessionOptions = {

    secret: "mysecretcode",

    resave: false,

    saveUninitialized: true,

    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,

        maxAge: 7 * 24 * 60 * 60 * 1000,

        httpOnly: true
    }

};


app.use(session(sessionOptions));

app.use(flash());

app.use(passport.initialize());

app.use(passport.session());

passport.use(
new LocalStrategy(
{
usernameField: "email"
},
User.authenticate()
));

passport.serializeUser(User.serializeUser());

passport.deserializeUser(User.deserializeUser());

const client =
twilio(

    process.env.TWILIO_ACCOUNT_SID,

    process.env.TWILIO_AUTH_TOKEN

);

app.use(
    "/uploads",
    express.static("uploads")
);

app.use((req, res, next) => {

    res.locals.currentUser = req.user;
    res.locals.session = req.session;

    res.locals.success = req.flash("success");

    res.locals.error = req.flash("error");

    next();


});



app.use(
async(req,res,next)=>{

    if(req.user){

        const notificationCount =
        await Notification.countDocuments({

            user:req.user._id,

            isRead:false

        });

        res.locals.notificationCount =
        notificationCount;

    }else{

        res.locals.notificationCount = 0;

    }

    next();

});



// Home Route
app.get("/", (req, res) => {
  res.render("home.ejs");
});



app.delete(
"/notifications/delete-all",
isLoggedIn,
async (req, res) => {

    try {

        await Notification.deleteMany({
            user: req.user._id
        });

        req.flash(
            "success",
            "All Notifications Deleted Successfully"
        );

        res.redirect("/notifications");

    } catch (err) {

        console.log(err);

        req.flash(
            "error",
            "Failed to delete notifications"
        );

        res.redirect("/notifications");

    }

});



app.delete(
"/notifications/:id",
isLoggedIn,
async(req,res)=>{

await Notification.findByIdAndDelete(
req.params.id
);

req.flash(
"success",
"Notification Deleted"
);

res.redirect("/notifications");

});


app.get(
"/notifications",
isLoggedIn,
async(req,res)=>{

    const notifications =
    await Notification.find({

        user:req.user._id

    })
    .sort({createdAt:-1});

    await Notification.updateMany(

        {
            user:req.user._id,
            isRead:false
        },

        {
            isRead:true
        }

    );

    res.render(
        "notifications/index.ejs",
        {
            notifications
        }
    );

});

app.get("/signup", (req, res) => {

    res.render("users/signup.ejs");

});


app.post(
"/signup",
async(req,res)=>{

try{

const {
username,
email,
phone,
password,
role
} = req.body;

// Only allow passenger or driver
if(
role !== "passenger" &&
role !== "driver"
){

req.flash(
"error",
"Invalid account type"
);

return res.redirect(
"/signup"
);

}

if(
!/^[0-9]{10}$/.test(phone)
){

req.flash(
"error",
"Mobile number must be exactly 10 digits"
);

return res.redirect(
"/signup"
);

}

if(
password.length < 8 ||
password.length > 20
){

req.flash(
"error",
"Password must be between 8 and 20 characters"
);

return res.redirect(
"/signup"
);

}

const user =
new User({

username,
email: email.toLowerCase(),
phone,
role

});

const registeredUser =
await User.register(
user,
password
);

req.login(
registeredUser,
(err)=>{

if(err){
return res.redirect("/login");
}

req.flash(
"success",
"Account Created Successfully"
);

if(role === "driver"){

return res.redirect(
"/driver/dashboard"
);

}

res.redirect("/");

});

}catch(err){

req.flash(
"error",
err.message
);

res.redirect(
"/signup"
);

}

});

app.get("/login", (req, res) => {

    res.render("users/login.ejs");

});

;


app.post(
"/login",

passport.authenticate(
"local",
{
failureRedirect:"/login",
failureFlash:true
}
),

(req,res)=>{

req.flash(
"success",
"Welcome Back!"
);

if(req.user.role==="admin"){

return res.redirect("/admin/dashboard");

}

if(req.user.role==="driver"){

if(!req.user.isVerifiedDriver){

req.flash(
"error",
"Your driver account is pending approval."
);

return res.redirect("/");

}

return res.redirect("/driver/dashboard");

}

return res.redirect("/");

});

app.get(
"/logout",
(req,res,next)=>{

req.logout(function(err){

if(err){
return next(err);
}

req.flash(
"success",
"Logged Out Successfully"
);

res.redirect(
"/login"
);

});

});




app.get(
"/driver/dashboard",
isLoggedIn,
isDriver,
async(req,res)=>{

const routes = await Route.find({
driver:req.user._id
});

const routeIds = routes.map(
route => route._id
);

const bookings = await Booking.find({
route: { $in: routeIds }
});

const notifications =
await Notification.find({
user:req.user._id
})
.sort({
createdAt:-1
});

// Driver Earnings (Only Completed Bookings)

const earnings = await Booking.aggregate([

{
$match:{

route:{ $in: routeIds },

status:"completed"

}
},

{
$group:{

_id:null,

total:{
$sum:"$totalAmount"
}

}

}

]);

const totalEarnings =
earnings.length > 0
?
earnings[0].total
:
0;

console.log("Route IDs:", routeIds);

console.log("Completed Bookings:",
await Booking.find({

route:{ $in: routeIds },

status:"completed"

}));

console.log("Total Earnings:", totalEarnings);

res.render(
"driver/dashboard.ejs",
{
routes,
totalEarnings,
notifications
}
);

});




app.post(
    "/send-otp",

    async (req, res) => {

        try{

            await client.verify.v2
            .services(
                process.env.TWILIO_VERIFY_SID
            )

            .verifications.create({

                to:
                `+91${req.body.phone}`,

                channel: "sms"

            });

            req.flash(
                "success",
                "OTP Sent Successfully"
            );

            res.redirect(
                `/verify-otp?phone=${req.body.phone}`
            );

        }

        catch(err){

            console.log(err);

            req.flash(
                "error",
                "OTP Failed"
            );

            res.redirect("back");

        }

});

app.get(
    "/verify-otp",

    (req, res) => {

        res.render(
            "verify.ejs",

            {
                phone:
                req.query.phone
            }
        );

});

app.post(
    "/verify-otp",

    async (req, res) => {

        try{

            const check =
            await client.verify.v2
            .services(
                process.env.TWILIO_VERIFY_SID
            )

            .verificationChecks.create({

                to:
                `+91${req.body.phone}`,

                code:
                req.body.otp

            });

            if(
                check.status ===
                "approved"
            ){
 req.session.isVerified = true;
 req.session.verifiedPhone =
req.body.phone;
                req.flash(
                    "success",
                    "Phone Verified Successfully"
                );

                return res.redirect(
                    "/trips"
                );

            }

            req.flash(
                "error",
                "Invalid OTP"
            );

            res.redirect("back");

        }

        catch(err){

            console.log(err);

            req.flash(
                "error",
                "Verification Failed"
            );

            res.redirect("back");

        }

});



app.get(

"/notifications/read",

isLoggedIn,

async(req,res)=>{

await Notification.updateMany(

{

user:
req.user._id

},

{

read:true

}

);

res.redirect(
"/notifications"
);

});

app.get(
    "/notifications",

    isLoggedIn,

    async(req,res)=>{

        await Notification.updateMany(

            {
                user:req.user._id,
                read:false
            },

            {
                read:true
            }

        );

        const notifications =
        await Notification.find({

            user:req.user._id

        }).sort({
            createdAt:-1
        });

        res.render(
            "notifications/index.ejs",
            { notifications }
        );

});



app.get(
    "/driver/verify",

    isLoggedIn,

    isDriver,

    (req,res)=>{

        res.render(
            "driver/verify.ejs"
        );

});

app.post(

    "/driver/verify",

    isLoggedIn,

    isDriver,

    upload.fields([

        {
            name:"licenseImage"
        },

        {
            name:"rcImage"
        }

    ]),

    async(req,res)=>{

        await User.findByIdAndUpdate(

            req.user._id,

            {

                licenseImage:

                req.files
                .licenseImage[0]
                .filename,

                rcImage:

                req.files
                .rcImage[0]
                .filename

            }

        );

        req.flash(

            "success",

            "Documents uploaded successfully. Waiting for admin approval."

        );

        res.redirect(
            "/driver/dashboard"
        );

});

app.get(

    "/admin/verifications",

    isLoggedIn,

    isAdmin,

    async(req,res)=>{

        const drivers =
        await User.find({

            role:"driver"

        });

        res.render(

            "admin/verifications.ejs",

            {

                drivers

            }

        );

});

app.get(

    "/admin/verify-driver/:id",

    isLoggedIn,

    isAdmin,

    async(req,res)=>{

        await User.findByIdAndUpdate(

            req.params.id,

            {

                isVerifiedDriver:true,

                verificationStatus:
                "approved"

            }

        );

        req.flash(
            "success",
            "Driver Approved"
        );

        res.redirect(
            "/admin/verifications"
        );

});


app.get(

    "/admin/reject-driver/:id",

    isLoggedIn,

    isAdmin,

    async(req,res)=>{

        await User.findByIdAndUpdate(

            req.params.id,

            {

                isVerifiedDriver:false,

                verificationStatus:
                "rejected"

            }

        );

        req.flash(
            "success",
            "Driver Rejected"
        );

        res.redirect(
            "/admin/verifications"
        );

});





app.get(
"/admin/dashboard",
isLoggedIn,
isAdmin,
async(req,res)=>{

const users =
await User.find();

const drivers =
await User.find({
isDriver:true
});

const routes =
await Route.find()
.populate("driver");

const bookings =
await Booking.find()
.populate("passenger")
.populate("route");

let totalEarnings = 0;

bookings.forEach(booking=>{

totalEarnings +=
Number(
booking.totalAmount || 0
);

});

res.render(
"admin/dashboard.ejs",
{
users,
drivers,
routes,
bookings,
totalEarnings
}
);

});



app.delete(
"/admin/users/:id",
isLoggedIn,
isAdmin,
async(req,res)=>{

await User.findByIdAndDelete(
req.params.id
);

req.flash(
"success",
"User Deleted"
);

res.redirect(
"/admin/dashboard"
);

});



app.delete(
"/admin/routes/:id",
isLoggedIn,
isAdmin,
async(req,res)=>{

await Route.findByIdAndDelete(
req.params.id
);

req.flash(
"success",
"Route Deleted"
);

res.redirect(
"/admin/dashboard"
);

});


app.get(
"/admin/users",
isLoggedIn,
isAdmin,
async(req,res)=>{

const users =
await User.find({
role:"passenger"
});

res.render(
"admin/users",
{
users
}
);

});


app.get(
"/admin/users/:id",
isLoggedIn,
isAdmin,
async(req,res)=>{

const user =
await User.findById(
req.params.id
);

const bookings =
await Booking.find({
passenger:user._id
});

res.render(
"admin/userDetails",
{
user,
bookings
}
);

});


app.delete(
"/admin/users/:id",
isLoggedIn,
isAdmin,
async(req,res)=>{

if(req.params.id === req.user._id.toString()){

req.flash(
"error",
"You cannot delete yourself"
);

return res.redirect(
"/admin/users"
);

}

await User.findByIdAndDelete(
req.params.id
);

req.flash(
"success",
"User Deleted Successfully"
);

res.redirect(
"/admin/users"
);

});


app.get(
"/admin/drivers",
isLoggedIn,
isAdmin,
async(req,res)=>{

const drivers =
await User.find({
role:"driver"
});

res.render(
"admin/drivers.ejs",
{ drivers }
);

});




app.get(
"/admin/drivers/:id",
isLoggedIn,
isAdmin,
async(req,res)=>{

const driver =
await User.findById(req.params.id);

const routes =
await Route.find({
driver: driver._id
});

const routeIds =
routes.map(route => route._id);

const bookings =
await Booking.find({
route:{
$in: routeIds
}
});

let totalEarnings = 0;

bookings.forEach(booking=>{

totalEarnings +=
Number(
booking.totalAmount || 0
);

});

res.render(
"admin/driverDetails",
{
driver,
routes,
totalEarnings
}
);

});


app.delete(
"/admin/drivers/:id",
isLoggedIn,
isAdmin,
async(req,res)=>{

await User.findByIdAndDelete(
req.params.id
);

req.flash(
"success",
"Driver Deleted Successfully"
);

res.redirect(
"/admin/drivers"
);

});


app.get(
"/admin/routes",
isLoggedIn,
isAdmin,
async(req,res)=>{

const routes =
await Route.find()
.populate("driver");

res.render(
"admin/routes.ejs",
{ routes }
);

});


app.get(
"/admin/bookings",
isLoggedIn,
isAdmin,
async(req,res)=>{

const bookings =
await Booking.find()
.populate("passenger")
.populate("route");

res.render(
"admin/bookings.ejs",
{ bookings }
);

});



app.get(
"/admin/routes/:id",
isLoggedIn,
isAdmin,
async(req,res)=>{

const route =
await Route.findById(req.params.id)
.populate("driver");

const bookings =
await Booking.find({
route:route._id
}).populate("passenger");

res.render(
"admin/routeDetails.ejs",
{
route,
bookings
}
);

});

app.delete(
"/admin/routes/:id",
isLoggedIn,
isAdmin,
async(req,res)=>{

await Route.findByIdAndDelete(
req.params.id
);

req.flash(
"success",
"Route Deleted Successfully"
);

res.redirect(
"/admin/routes"
);

});



app.delete(
"/admin/bookings/:id",
isLoggedIn,
isAdmin,
async(req,res)=>{

await Booking.findByIdAndDelete(
req.params.id
);

req.flash(
"success",
"Booking Deleted Successfully"
);

res.redirect(
"/admin/bookings"
);

});










app.get(
"/routes/new",
isLoggedIn,
isDriver,
(req,res)=>{

    res.render(
        "routes/new.ejs"
    );

});



app.post(
"/routes",
isLoggedIn,
async(req,res)=>{

const stops = [];

for(
let i = 0;
i < req.body.from.length;
i++
){

stops.push({

from:req.body.from[i],

to:req.body.to[i],

fare:req.body.fare[i],

arrivalTime:req.body.time[i]

});

}

const route = new Route({

driver:req.user._id,

vehicleType:req.body.vehicleType,

vehicleNumber:req.body.vehicleNumber,

contactNumber:req.body.contactNumber,

totalSeats:req.body.totalSeats,

availableSeats:req.body.totalSeats,

stops:stops

});

await route.save();

req.flash(
"success",
"Route Added Successfully"
);

res.redirect(
"/driver/dashboard"
);

});








app.get("/routes/:id", async (req, res) => {

try {

    const route = await Route.findById(req.params.id)
        .populate("driver");

    if (!route) {

        req.flash("error", "Route not found");

        return res.redirect("/");

    }

    const fromPlace = req.query.from || "";
    const toPlace = req.query.to || "";

    let fare = 0;
    let arrivalTime = "";

    const selectedStop = route.stops.find(
        stop =>
            stop.from === fromPlace &&
            stop.to === toPlace
    );

    if (selectedStop) {

        fare = selectedStop.fare;

        arrivalTime = selectedStop.arrivalTime;

    }

    res.render("routes/show.ejs", {

        route,

        fromPlace,

        toPlace,

        fare,

        arrivalTime

    });

} catch (err) {

    console.log(err);

    req.flash("error", "Something went wrong");

    res.redirect("/");

}


});


app.get("/search-route", async(req,res)=>{

const from = req.query.from;
const to = req.query.to;

const routes = await Route.find({
status:"active",
availableSeats: { $gt: 0 }
});

let results = [];

for(const route of routes){

const segment = route.stops.find(
s =>
s.from.toLowerCase() === from.toLowerCase() &&
s.to.toLowerCase() === to.toLowerCase()
);

if(segment){

results.push({

routeId: route._id,

vehicleType: route.vehicleType,

vehicleNumber: route.vehicleNumber,

contactNumber: route.contactNumber,

availableSeats: route.availableSeats,

from: segment.from,

to: segment.to,

fare: segment.fare,

time: segment.arrivalTime

});

}

}

res.render("routes/search.ejs",{
results,
from,
to
});

});



app.post(
"/routes/:id/book",
isLoggedIn,
async(req,res)=>{

try{

const route = await Route.findById(req.params.id);

if(!route){

req.flash("error","Route not found");

return res.redirect("/");

}

const seats = parseInt(req.body.seatsBooked);

if(seats > route.availableSeats){

req.flash(
"error",
`Only ${route.availableSeats} seat(s) available`
);

return res.redirect(
`/routes/${route._id}?from=${req.body.from}&to=${req.body.to}`
);

}

const selectedStop = route.stops.find(
stop =>
stop.from.trim().toLowerCase() === req.body.from.trim().toLowerCase() &&
stop.to.trim().toLowerCase() === req.body.to.trim().toLowerCase()
);

if(!selectedStop){

req.flash(
"error",
"Invalid Route Selected"
);

return res.redirect(
`/routes/${route._id}`
);

}

const fare = Number(selectedStop.fare);



const totalAmount = fare * seats;


route.availableSeats -= seats;

await route.save();

const arrivalTime =
selectedStop.arrivalTime;

const booking = new Booking({

passenger: req.user._id,
driver: route.driver,
route: route._id,

passengerName: req.body.passengerName,

phoneNumber: req.body.phoneNumber,

seatsBooked: seats,

arrivalTime:arrivalTime,

fromPlace: req.body.from,

toPlace: req.body.to,

totalAmount: totalAmount,

status: "confirmed"

});

await booking.save();



await Notification.create({

user: route.driver,

passengerName: req.body.passengerName,

passengerPhone: req.body.phoneNumber,

fromCity: req.body.from,

toCity: req.body.to,

seatsBooked: seats,

arrivalTime:arrivalTime,


amount: totalAmount,

message:
`${req.body.passengerName} booked ${seats} seat(s) from ${req.body.from} to ${req.body.to}`

});

req.flash(
"success",
"Seat Booked Successfully"
);

res.redirect("/my-bookings");

}catch(err){

console.log(err);

req.flash(
"error",
"Booking Failed"
);

res.redirect("/");

}

});



app.get("/about",(req,res)=>{
res.render("about");
});

app.get("/contact",(req,res)=>{
res.render("contact");
});

app.get("/terms",(req,res)=>{
res.render("terms");
});



app.delete(
"/routes/:id",
isLoggedIn,
async(req,res)=>{

const route =
await Route.findById(
req.params.id
);

if(!route){

req.flash(
"error",
"Route not found"
);

return res.redirect(
"/driver/dashboard"
);

}

await Route.findByIdAndDelete(
req.params.id
);

req.flash(
"success",
"Route Deleted Successfully"
);

res.redirect(
"/driver/dashboard"
);

});




app.get(
"/passenger/dashboard",
isLoggedIn,
async(req,res)=>{

const bookings =
await Booking.find({

passenger:
req.user._id

})
.populate("route");

res.render(
"passenger/dashboard",
{
bookings
}
);

});

app.get("/my-bookings",
isLoggedIn,
async(req,res)=>{

const bookings =
await Booking.find({
    passenger:req.user._id
})
.populate("route");

res.render(
"bookings/index.ejs",
{
    bookings
}
);

});


app.get(
"/routes/:id/edit",
isLoggedIn,
isDriver,
async(req,res)=>{

const route =
await Route.findById(req.params.id);

res.render(
"routes/edit.ejs",
{ route }
);

});

app.put("/routes/:id", async(req,res)=>{

const stops = [];

for(
let i = 0;
i < req.body.from.length;
i++
){

stops.push({

from:req.body.from[i],

to:req.body.to[i],

fare:req.body.fare[i],

arrivalTime:req.body.arrivalTime[i]

});

}

await Route.findByIdAndUpdate(
req.params.id,
{
vehicleType:req.body.vehicleType,
vehicleNumber:req.body.vehicleNumber,
contactNumber:req.body.contactNumber,
totalSeats:req.body.totalSeats,
availableSeats:req.body.availableSeats,
stops:stops
}
);

req.flash(
"success",
"Route Updated Successfully"
);

res.redirect(
"/driver/dashboard"
);

});

app.get(
"/routes/:id/cancel",
isLoggedIn,
async(req,res)=>{

try{

const route =
await Route.findById(req.params.id);

if(!route){

req.flash(
"error",
"Route not found"
);

return res.redirect("/driver/dashboard");

}

// Cancel Route
route.status="cancelled";

await route.save();

// Find all confirmed bookings
const bookings =
await Booking.find({

route:route._id,

status:"confirmed"

});

// Restore seats
let totalSeats=0;

for(const booking of bookings){

totalSeats += booking.seatsBooked;

booking.status="cancelled_by_driver";

await booking.save();

// Notification
await Notification.create({

user:booking.passenger,

title:"❌ Route Cancelled",

type:"route_cancel",

passengerName:booking.passengerName,

passengerPhone:booking.phoneNumber,

fromCity:booking.fromPlace,

toCity:booking.toPlace,

seatsBooked:booking.seatsBooked,

amount:booking.totalAmount,

arrivalTime:booking.arrivalTime,

travelDate:booking.travelDate,

message:`Your booking from ${booking.fromPlace} to ${booking.toPlace} has been cancelled by the driver.`

});

}

// Restore seats
route.availableSeats += totalSeats;

await route.save();

req.flash(
"success",
"Route cancelled successfully."
);

res.redirect("/driver/dashboard");

}catch(err){

console.log(err);

req.flash(
"error",
"Something went wrong"
);

res.redirect("/driver/dashboard");

}

});




app.post(
"/bookings/:id/cancel",
isLoggedIn,
async(req,res)=>{

try{

const booking = await Booking.findById(req.params.id);

if(!booking){

req.flash(
"error",
"Booking not found"
);

return res.redirect(req.get("Referrer") || "/driver/dashboard");

}

if(booking.status !== "confirmed"){

req.flash(
"error",
"Booking already cancelled"
);

return res.redirect(req.get("Referrer") || "/driver/dashboard");

}

const route = await Route.findById(booking.route);

if(!route){

req.flash(
"error",
"Route not found"
);

return res.redirect(req.get("Referrer") || "/driver/dashboard");

}

// Return the booked seats
route.availableSeats += booking.seatsBooked;

await route.save();

// Cancel booking
booking.status = "cancelled_by_driver";

await booking.save();

// Notify passenger
await Notification.create({

user: booking.passenger,

title: "❌ Booking Cancelled",

type: "cancel",

passengerName: booking.passengerName,

passengerPhone: booking.phoneNumber,

fromCity: booking.fromPlace,

toCity: booking.toPlace,

seatsBooked: booking.seatsBooked,

amount: booking.totalAmount,

arrivalTime: booking.arrivalTime,

travelDate: booking.travelDate,

message: `Your booking from ${booking.fromPlace} to ${booking.toPlace} has been cancelled by the driver.`

});

req.flash(
"success",
"Passenger booking cancelled successfully."
);

return res.redirect(req.get("Referrer") || "/driver/dashboard");

}catch(err){

console.log(err);

req.flash(
"error",
"Something went wrong."
);

res.redirect("driver/passengers.ejs");

}

});




app.get(
"/routes/:id/passengers",
isLoggedIn,
async(req,res)=>{

const route = await Route.findById(req.params.id);

const bookings = await Booking.find({
route:req.params.id
})
.populate("passenger");

res.render(
"driver/passengers.ejs",
{
route,
bookings
}
);

});


app.get(
"/routes/:id/activate",
isLoggedIn,
isDriver,
async(req,res)=>{

try{

const route = await Route.findById(req.params.id);

if(!route){

req.flash("error","Route not found");

return res.redirect("/driver/dashboard");

}

// Delete all bookings for this route
// await Booking.deleteMany({
// route: route._id
// });

// Delete notifications for this driver
await Notification.deleteMany({
user: req.user._id
});

// Reset route
route.status = "waiting";

// Restore seats
route.availableSeats = route.totalSeats;

// Update departure date/time
route.travelDate = new Date();

await route.save();

req.flash(
"success",
"Route reopened successfully."
);

res.redirect("/driver/dashboard");

}catch(err){

console.log(err);

req.flash(
"error",
"Something went wrong."
);

res.redirect("/driver/dashboard");

}

});

app.get(
"/routes/:id/start",
isLoggedIn,
isDriver,
async(req,res)=>{

const route =
await Route.findById(req.params.id);

if(!route){
    req.flash("error","Route not found");
    return res.redirect("/driver/dashboard");
}

route.status = "active";

await route.save();

req.flash(
"success",
"Route Started Successfully"
);

res.redirect("/driver/dashboard");

});

// app.get(
// "/routes/:id/stop",
// isLoggedIn,
// isDriver,
// async(req,res)=>{

// const route =
// await Route.findById(req.params.id);

// route.status = "stopped";

// await route.save();

// req.flash(
// "success",
// "Route Stopped Successfully"
// );

// res.redirect("/driver/dashboard");

// });


app.get(
"/routes/:id/complete",
isLoggedIn,
async(req,res)=>{

try{

const route = await Route.findById(req.params.id);

if(!route){

req.flash("error","Route not found");

return res.redirect("/driver/dashboard");

}

route.status="completed";

await route.save();

const bookings = await Booking.find({

route:route._id,

status:"confirmed"

});

for(const booking of bookings){

booking.status="completed";

await booking.save();

}

const updatedBookings = await Booking.find({
route: route._id
});

console.log(updatedBookings);

req.flash(

"success",

"Trip completed successfully."

);

res.redirect("/driver/dashboard");

}catch(err){

console.log(err);

req.flash(

"error",

"Something went wrong."

);

res.redirect("/driver/dashboard");

}

});

io.on(

    "connection",

    (socket) => {

        console.log(
            "User Connected"
        );
  
        // Chat Messages

        socket.on(

            "send-message",

            async (data) => {

                const message =
                new Message({

                    sender:
                    data.userId,

                    trip:
                    data.tripId,

                    text:
                    data.message

                });

                await message.save();

                const user =
                await User.findById(
                    data.userId
                );

                io.emit(

                    "receive-message",

                    {

                        username:
                        user.username,

                        message:
                        data.message,

                        userId:
                        data.userId

                    }

                );

            }

        );

        // Driver Live Location

        socket.on(

            "driver-location",

            (data) => {

                io.emit(

                    "update-location",

                    {

                        tripId:
                        data.tripId,

                        lat:
                        data.lat,

                        lng:
                        data.lng

                    }

                );

            }

        );

        socket.on(

            "disconnect",

            () => {

                console.log(
                    "User Disconnected"
                );

            }

        );

    }

);

// Server
server.listen(

    3000,

    () => {

        console.log(
            "Server Running"
        );

});