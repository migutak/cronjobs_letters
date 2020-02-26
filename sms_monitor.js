var express = require('express');
var app = express();
var amqp = require('amqplib/callback_api');
var dbConfig = require('./dbconfig.js');
const axios = require('axios');
var oracledb = require('oracledb');
oracledb.outFormat = oracledb.OBJECT;
oracledb.autoCommit = true;

function doRelease(connection) {
    connection.close(
        function (err) {
            console.log(err)
        }
    )
}

function currentDate() {
    const currentDate = new Date();
    let day = '' + currentDate.getDate();
    let month = '' + (currentDate.getMonth() + 1);
    const year = currentDate.getFullYear();

    if (month.length < 2) { month = '0' + month; }
    if (day.length < 2) { day = '0' + day; }

    return year + '-' + month + '-' + day;
}

amqp.connect(dbConfig.RABBITMQ, (err, conn) => {
    if (err != null) bail(err);
    conn.createChannel(on_open);
    function on_open(err, ch) {
        if (err != null) bail(err);
        var queue = 'dd_sms';
        ch.assertQueue(queue, { durable: false });
        console.log('waiting for messages in dd_sms queue')
        ch.consume(queue, (message) => {
            var buf = message.content
            var record = JSON.parse(buf.toString());
            // send sms 
            var sql = "insert into sms(accnumber,custnumber,message,telnumber,owner) values('" + record.accnumber + "','" + record.custnumber + "','" + record.message + "','" + record.telnumber + "','" + record.owner + "')"
            console.log(sql);
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
                        sql, [],  // bind value for :id
                        {},
                        function (err, result) {
                            if (err) {
                                console.error(err.message);
                                doRelease(connection);
                                return;
                            }
                            // console.log(result.data);
                            console.log('sms inserted ... ');
                            doRelease(connection);
                        }
                    )
                }
            )

        }, { noAck: true })
    }
})

function bail(err) {
    console.error(err);
    process.exit(1);
}

app.listen('2504');
console.log('dd sms update app running .... 2504');                    