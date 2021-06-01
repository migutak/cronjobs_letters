const express = require("express");
app = express();
var oracledb = require('oracledb');
var amqp = require('amqplib/callback_api');
oracledb.outFormat = oracledb.OBJECT;
oracledb.autoCommit = true;
var dbConfig = require('./dbconfig.js');
// var bail = require('bail');

function doRelease(connection) {
    connection.close(
        function(err) {
            console.log(err)
        }
    )
}

amqp.connect(dbConfig.RABBITMQ, (err, conn) => {
    if (err != null) bail(err);
    conn.createChannel(on_open);
    function on_open(err, ch) {
        if (err != null) bail(err);
        var queue = 'demandstatus';
        ch.assertQueue(queue, { durable: false });
        console.log('waiting for messages in demandstatus queue')
        ch.consume(queue, (message) => {
            var buf = message.content
            var record = JSON.parse(buf.toString());
            var sql = "update demandsdue set status = '"+record.status+"', sentby= '"+record.sentby+"', datesent='"+record.datesent+"'  where id = " + record.id

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
                            console.log('row updated');
                            doRelease(connection);
                        }
                    )
                }
            )
        }, {noAck: true})
    }
})

function bail(err) {
    console.error(err);
    process.exit(1);
}

console.log('dd status update app running')
