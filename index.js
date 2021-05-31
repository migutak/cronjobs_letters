var express = require('express');
var app = express();
var amqp = require('amqplib/callback_api');
var dbConfig = require('./dbconfig.js');
const axios = require('axios');
var oracledb = require('oracledb');
oracledb.outFormat = oracledb.OBJECT;
oracledb.autoCommit = true;

var sqldd = "select * from demandsdue where status = 'pending' offset 0 rows fetch next 1 rows only"
const sql = `SELECT accnumber,
                    CURSOR(SELECT accnumber, custnumber
                           FROM tqall t
                           WHERE t.custnumber='4414338'
                           ORDER BY t.oustbalance) as accounts
             FROM tqall d
             Where  d.accnumber='106C7441433800' `;


oracledb.getConnection(
    {
        user: dbConfig.user,
        password: dbConfig.password,
        connectString: dbConfig.connectString
    }, function (err, connection) {
        if (err) {
            console.error(err.message);
            return;
        }
        connection.execute(
            sql,
            [],  // bind value for :id
            {},
            function (err, result) {
                if (err) {
                    console.error(err.message);
                    doRelease(connection);
                    return;
                }
                console.dir(result.rows, {depth: null})
            })
    })

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

//app.listen('2500');
console.log('send dd letters cron app running ....')

