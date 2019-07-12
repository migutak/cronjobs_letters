var express = require('express');
var app = express();
var amqp = require('amqplib/callback_api');
var dbConfig = require('./dbconfig.js');
const axios = require('axios');

amqp.connect(dbConfig.RABBITMQ, (err, conn) => {
    if (err != null) bail(err);
    conn.createChannel(on_open);
    function on_open(err, ch) {
        if (err != null) bail(err);
        var queue = 'dd_his';
        ch.assertQueue(queue, { durable: false });
        console.log('waiting for messages in dd_his queue')
        ch.consume(queue, (message) => {
            var buf = message.content
            var record = JSON.parse(buf.toString());
            // add to history
            var demandhisdetails = {}
            demandhisdetails.accnumber = record.accnumber,
            demandhisdetails.custnumber = record.custnumber,
            demandhisdetails.address = record.addressline1,
            demandhisdetails.email = record.emailaddress,
            demandhisdetails.telnumber = record.telnumber,
            demandhisdetails.filepath = record.filepath,
            demandhisdetails.filename = record.filename,
            demandhisdetails.datesent = new Date(),
            demandhisdetails.owner = 'auto',
            demandhisdetails.byemail = 'Y',
            demandhisdetails.byphysical = 'N',
            demandhisdetails.bypost = 'N',
            demandhisdetails.demand = record.demand,
            demandhisdetails.customeremail = record.customeremail,
            demandhisdetails.status = 'sent',
            demandhisdetails.reissued = 'N',
            demandhisdetails.guarantorsno = 0,
            demandhisdetails.guarantorsemail = '',
            demandhisdetails.sendemail = record.sendemail || 'Customer Service <customerservice@co-opbank.co.ke>'
            console.log(demandhisdetails);
            axios.post(dbConfig.API + '/api/demandshistory', demandhisdetails).then(function(resp){
                console.log('... added to ddhis ...');
            }).catch(function(error){
                console.log(error)
            });
            

        }, { noAck: true })
    }
})

app.listen('2505');
console.log('dd his update app running ....');                    