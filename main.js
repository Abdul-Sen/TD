var express = require("express");
var app = express();
var TD = require("./TD_API.js");
HTTP_PORT = process.env.PORT || 8080;

app.get("/",function (req,res) {
    res.send();
});

app.listen(HTTP_PORT,function(){
    console.log("listening on" + HTTP_PORT);
})