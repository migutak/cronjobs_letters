const axios = require('axios');
var validator = require("email-validator");
const cron = require("node-cron");
const express = require("express");
const fs = require("fs");
app = express();
var log4js = require('log4js');
var oracledb = require('oracledb');
oracledb.outFormat = oracledb.OBJECT;
oracledb.autoCommit = true;
var dbConfig = require('./dbconfig.js');

log4js.configure({
    appenders: { demands: { type: 'file', filename: 'demands.log' } },
    categories: { default: { appenders: ['demands'], level: 'trace' } }
});

var logger = log4js.getLogger('demands');

const URL = 'http://localhost:8004/docx/Demand1/download';
const API = 'http://localhost:8000';
const bodyletter = {};

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
    var sqldd = "select * from demandsdue where status = 'PENDING'"
    oracledb.getConnection(
        {
            user: dbConfig.user,
            password: dbConfig.password,
            connectString: dbConfig.connectString
        },
        function (err, connection) {
            if (err) {
                console.error(err.message);
                logger.error(err.message);
                return;
            }
            connection.execute(
                sqldd,
                [],  // bind value for :id
                {},
                function (err, result) {
                    if (err) {
                        console.error(err.message);
                        logger.error(err.message);
                        doRelease(connection);
                        return;
                    }
                    // each row, validate email
                    console.log(result.length);
                    if(result.length > 0) {
                        for(i=0; i<result.length; i++) {
                            if(validator.validate(result[i].EMAILADDRESS)) {
                                async function getAccount() {
                                    try {
                                      const response = await axios.get(API + '/api/tqall/' + result[i].ACCNUMBER);
                                      console.log(response);
                                      if (response && response.length > 0) {
                                        bodyletter.demand = letter.demand;
                                        bodyletter.showlogo = true;
                                        bodyletter.format = 'pdf';
                                        bodyletter.cust = data[0].custnumber;
                                        bodyletter.acc = data[0].accnumber;
                                        bodyletter.custname = data[0].client_name;
                                        bodyletter.address = letter.addressline1;
                                        bodyletter.postcode = letter.postcode;
                                        bodyletter.arocode = data[0].arocode;
                                        bodyletter.branchname = data[0].branchname;
                                        bodyletter.branchcode = data[0].branchcode;
                                        bodyletter.manager = data[0].manager;
                                        bodyletter.branchemail = data[0].branchemail || 'Collection Support <collectionssupport@co-opbank.co.ke>';
                                        bodyletter.ccy = data[0].currency;
                                        bodyletter.demand1date = new Date();
                                        bodyletter.guarantors = data[0].guarantors;
                                        bodyletter.settleaccno = data[0].settleaccno || '00000000000000';
                                        bodyletter.kbbr = data[0].kbbr;
                                        bodyletter.instamount = data[0].instamount;
                                        bodyletter.oustbalance = data[0].oustbalance;
                                        bodyletter.currency = data[0].currency;

                                        console.log('generate letter ', bodyletter)
                                      } else {
                                          // no data
                                          console.log('no account info')
                                      }
                                    } catch (error) {
                                      console.error(error);
                                      logger.error(error);
                                    }
                                }
                            } else {
                                // email invalid
                                logger.trace('.... record email invalid .....');
                                logger.info(result[i])
                            }
                        }
                    }
                    doRelease(connection);
                });
        });
    
    // generate demands
    // send email
    // send sms
    // add to history
    // log at each step
    // update demandsdue table

   /* axios.post(URL, data)
        .then(function (response) {
            console.log(response.data);
            console.log(response.status);
            console.log(response.statusText);
            logger.trace('success ....');
            logger.info(response.data);
            logger.info('STATUS - ' + response.status);
        })
        .catch(function (error) {
            console.log(error);
            logger.error(error)
        });*/
});

function doRelease(connection) {
    connection.close(
        function (err) {
            if (err)
                console.error(err.message);
        });
}

app.listen('3218');
console.log('letters cron running ....')
