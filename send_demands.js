const axios = require('axios');
var validator = require("email-validator");
const cron = require("node-cron");
const express = require("express");
const fs = require("fs");
app = express();
var log4js = require('log4js');
var oracledb = require('oracledb');
var amqp = require('amqplib/callback_api');
oracledb.outFormat = oracledb.OBJECT;
oracledb.autoCommit = true;
var dbConfig = require('./dbconfig.js');

log4js.configure({
    appenders: { demands: { type: 'file', filename: 'demands.log' } },
    categories: { default: { appenders: ['demands'], level: 'trace' } }
});

var logger = log4js.getLogger('demands');


function currentDate() {
    const currentDate = new Date();
    let day = '' + currentDate.getDate();
    let month = '' + (currentDate.getMonth() + 1);
    const year = currentDate.getFullYear();

    if (month.length < 2) { month = '0' + month; }
    if (day.length < 2) { day = '0' + day; }

    return year + '-' + month + '-' + day;
}

// schedule tasks to be run on the server
cron.schedule("* * * * *", function () {
    //
    console.log("---------------------");
    console.log("Running Cron Job");

    // get demands due
    var sqldd = "select * from demandsdue where status = 'pending' offset 0 rows fetch next 1 rows only"
    oracledb.getConnection(
        {
            user: dbConfig.user,
            password: dbConfig.password,
            connectString: dbConfig.connectString
        }, function (err, connection) {
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
                    console.log(result.rows.length);
                    if (result.rows.length > 0) {
                        for (i = 0; i < result.rows.length; i++) {
                            var record = result.rows[i];
                            console.log('=======record=======');
                            console.log(record)
                            if (validator.validate(result.rows[i].EMAILADDRESS)) {
                                console.log('... valid email ....');
                                // console.log(result.rows[i]);
                                (async function () {
                                    try {
                                        var id = result.rows[i].ID;
                                        console.log('=======id=======' +id);
                                        const response = await axios.get(dbConfig.API + '/api/tqall/' + result.rows[i].ACCNUMBER);
                                        if (response.data) {
                                            const bodyletter = {};
                                            bodyletter.demand = record.DEMANDLETTER;
                                            bodyletter.letterid = id;
                                            bodyletter.showlogo = true;
                                            bodyletter.format = 'pdf';
                                            bodyletter.cust = response.data.custnumber;
                                            bodyletter.acc = response.data.accnumber;
                                            bodyletter.custname = response.data.client_name;
                                            bodyletter.address = response.data.addressline1;
                                            bodyletter.telnumber= response.data.telnumber,
                                            bodyletter.postcode = response.data.postcode;
                                            bodyletter.arocode = response.data.arocode;
                                            bodyletter.branchname = response.data.branchname;
                                            bodyletter.branchcode = response.data.branchcode;
                                            bodyletter.manager = response.data.manager;
                                            bodyletter.customeremail = record.EMAILADDRESS;
                                            bodyletter.branchemail = response.data.branchemail || 'Customer Service <customerservice@co-opbank.co.ke>';
                                            bodyletter.ccy = response.data.currency;
                                            bodyletter.demand1date = new Date();
                                            bodyletter.guarantors = response.data.guarantors || [];
                                            bodyletter.settleaccno = response.data.settleaccno || '00000000000000';
                                            bodyletter.kbbr = response.data.kbbr;
                                            bodyletter.instamount = response.data.instamount;
                                            bodyletter.oustbalance = response.data.oustbalance;
                                            bodyletter.currency = response.data.currency;

                                            const acc_resp = await axios.get(dbConfig.API + '/api/tqall?filter[where][custnumber]=' + record.CUSTNUMBER);
                                            bodyletter.accounts = acc_resp.data;


                                            // push to queue
                                            amqp.connect(dbConfig.RABBITMQ, (err, conn) => {
                                                if (err != null) bail(err);
                                                conn.createChannel(on_open);
                                                function on_open(err, ch) {
                                                    if (err != null) bail(err);
                                                    var queue = 'demands_togenerate';
                                                    ch.assertQueue(queue, { durable: false });
                                                    ch.sendToQueue(queue, Buffer.from(JSON.stringify(bodyletter)));
                                                    console.log('demands_togenerate was sent');
                                                }
                                            })
                                        } else {
                                            // no data
                                            console.log( record.ACCNUMBER + ' has no account info')
                                        }
                                    } catch (error) {
                                        console.error(error);
                                        // logger.error(error);
                                    }
                                })();
                            } else {
                                // console.log(result.rows[i].ACCNUMBER + '..with email of ' + result.rows[i].EMAILADDRESS + ' is invalid');
                                // logger.trace(result.rows[i].ACCNUMBER + '..with email of ' + result.rows[i].EMAILADDRESS + ' is invalid');
                                // update with invalid email
                                const status = {
                                    id: record.ID,
                                    from: 'loans',
                                    datesent: currentDate(),
                                    status: 'invalid emailaddress',
                                    sentby: 'auto'
                                };
                                // push to queue
                                
                                amqp.connect(dbConfig.RABBITMQ, (err, conn) => {
                                    if (err != null) bail(err);
                                    conn.createChannel(on_open);
                                    function on_open(err, ch) {
                                        if (err != null) bail(err);
                                        var queue = 'demandstatus';
                                        ch.assertQueue(queue, { durable: false });
                                        ch.sendToQueue(queue, Buffer.from(JSON.stringify(status)));
                                        console.log('status message was sent to demandstatus queue');
                                    }
                                })
                            }
                        }
                    } else {
                        console.log('no demands due')
                    }
                    doRelease(connection);
                }
            )
        }
    )
});

function doRelease(connection) {
    connection.close(
        function (err) {
            if (err)
                console.error(err.message);
        });
}

function bail(err) {
    console.error(err);
    process.exit(1);
}

app.listen('2500');
console.log('send dd letters cron app running ....')
