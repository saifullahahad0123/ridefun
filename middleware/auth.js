module.exports.isLoggedIn = (req, res, next) => {

    if(!req.isAuthenticated()){

        req.flash(
            "error",
            "You must login first"
        );

        return res.redirect("/login");
    }

    next();

};


module.exports.isDriver = (req, res, next) => {

    if(req.user.role !== "driver"){

        req.flash(
            "error",
            "Only drivers can add trips"
        );

        return res.redirect("/trips");
    }

    next();

};