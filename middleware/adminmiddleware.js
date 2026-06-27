module.exports.isAdmin = (req, res, next) => {

    if(
        !req.user ||
        req.user.role !== "admin"
    ){

        req.flash(
            "error",
            "Admin Access Only"
        );

        return res.redirect("/");
    }

    next();

};