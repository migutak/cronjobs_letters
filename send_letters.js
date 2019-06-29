const axios = require('axios');
var validator = require("email-validator");
const cron = require("node-cron");
const express = require("express");
const fs = require("fs");
app = express();
var log4js = require('log4js');

log4js.configure({
    appenders: { demands: { type: 'file', filename: 'demands.log' } },
    categories: { default: { appenders: ['demands'], level: 'trace' } }
});

var logger = log4js.getLogger('demands');

const URL = 'http://localhost:8004/docx/Demand1/download';
const data = {
    format: "docx",
    acc: "00000000000000",
    custnumber: "0000000",
    accounts: [],
    guarantors: []
};

// schedule tasks to be run on the server
cron.schedule("* * * * *", function () {
    //
    console.log("---------------------");
    console.log("Running Cron Job");

    // get demands due
    // each row, validate email
    // generate demands
    // send email
    // send sms
    // add to history
    // log at each step
    // update demandsdue table

    axios.post(URL, data)
        .then(function (response) {
            console.log(response.data);
            console.log(response.status);
            console.log(response.statusText);
            // logger.info(validator.validate("test@email.co.ke"));
            logger.trace('success ....');
            logger.info(response.data);
            logger.info('STATUS - ' + response.status);
        })
        .catch(function (error) {
            console.log(error);
            logger.error(error)
        });
})

app.listen('3218');
console.log('letters cron running ....')
