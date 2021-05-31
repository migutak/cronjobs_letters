var express = require('express');
var app = express();
var amqp = require('amqplib/callback_api');
var dbConfig = require('./dbconfig.js');
const axios = require('axios');


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
        var queue = 'demands_togenerate';
        ch.assertQueue(queue, { durable: false });
        console.log('waiting for messages in demands_togenerate queue')
        ch.consume(queue, (message) => {

            // generate letter
            (async function () {
                try {

                    var buf = message.content
                    var record = JSON.parse(buf.toString());
                    var emaildata = {};

                    const dd_resp = await axios.post(dbConfig.LETTERGENERATEURL + record.demand + '/download', record);
                    console.log('=========letter generated========')
                    //console.log(dd_resp.data);
                    emaildata.name = record.client_name,
                        emaildata.email = record.customeremail,
                        emaildata.branchemail = record.branchemail || 'Collection Support <collectionssupport@co-opbank.co.ke>',
                        emaildata.title = record.demand,
                        emaildata.file = dd_resp.data.message

                    // send Demand Email
                    const send_email_resp = await axios.post(dbConfig.SENDEMAILURL, emaildata);
                    console.log(send_email_resp.data);
                    if (send_email_resp.data.result == 'success') {
                        // send sms
                        // get template
                        const emailtemp_resp = await axios.get(dbConfig.API + '/api/demandsettings/' + (record.demand).toLowerCase());
                        const sms = emailtemp_resp.data.smstemplate;
                        const smsMessage = sms.replace('[emailaddressxxx]', 'email address ' + record.customeremail);
                        const smsdata = {
                            'demand': record.demand,
                            'accnumber': record.acc,
                            'custnumber': record.cust,
                            'telnumber': record.telnumber,
                            'owner': 'auto',
                            'message': smsMessage,
                        };

                        // send to demand queue
                        amqp.connect(dbConfig.RABBITMQ, (err, conn) => {
                            if (err != null) bail(err);
                            conn.createChannel(on_open);
                            function on_open(err, ch) {
                                if (err != null) bail(err);
                                var queue = 'dd_sms';
                                ch.assertQueue(queue, { durable: false });
                                ch.sendToQueue(queue, Buffer.from(JSON.stringify(smsdata)));
                                console.log('...entry sent to dd_sms queue');
                            }
                        })

                        //send to status

                        const status = {
                            id: record.letterid,
                            from: 'loans',
                            datesent: currentDate(),
                            status: 'sent',
                            sentby: 'auto'
                        };

                        amqp.connect(dbConfig.RABBITMQ, (err, conn) => {
                            if (err != null) bail(err);
                            conn.createChannel(on_open);
                            function on_open(err, ch) {
                                if (err != null) bail(err);
                                var queue = 'demandstatus';
                                ch.assertQueue(queue, { durable: false });
                                ch.sendToQueue(queue, Buffer.from(JSON.stringify(status)));
                                console.log('...entry sent to demandstatus queue');
                            }
                        })


                        // send to ddhis
                        var demandhisdetails = {}

                        demandhisdetails.accnumber = record.acc,
                            demandhisdetails.custnumber = record.cust,
                            demandhisdetails.address = record.addressline1,
                            demandhisdetails.email = record.emailaddress,
                            demandhisdetails.telnumber = record.telnumber,
                            demandhisdetails.filepath = dd_resp.data.message,
                            demandhisdetails.filename = dd_resp.data.filename,
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
                            demandhisdetails.sendemail = record.branchemail || 'Customer Service <customerservice@co-opbank.co.ke>'

                        amqp.connect(dbConfig.RABBITMQ, (err, conn) => {
                            if (err != null) bail(err);
                            conn.createChannel(on_open);
                            function on_open(err, ch) {
                                if (err != null) bail(err);
                                var queue = 'dd_his';
                                ch.assertQueue(queue, { durable: false });
                                ch.sendToQueue(queue, Buffer.from(JSON.stringify(demandhisdetails)));
                                console.log('...entry sent to dd_his queue');
                            }
                        })

                    }  // end if email send success
                    else {
                        // set status to pending
                        const status = {
                            id: record.letterid,
                            from: 'loans',
                            datesent: currentDate(),
                            status: 'pending',
                            sentby: ''
                        };

                        amqp.connect(dbConfig.RABBITMQ, (err, conn) => {
                            if (err != null) bail(err);
                            conn.createChannel(on_open);
                            function on_open(err, ch) {
                                if (err != null) bail(err);
                                var queue = 'demandstatus';
                                ch.assertQueue(queue, { durable: false });
                                ch.sendToQueue(queue, Buffer.from(JSON.stringify(status)));
                                console.log('...entry sent to demandstatus queue status set back to pending');
                            }
                        })
                    }

                } catch (error) {
                    console.log(error)
                }

            })();

        }, { noAck: true })
    }
})

function bail(err) {
    console.error(err);
    process.exit(1);
}

//app.listen('2503');
console.log('dd generate app running ');
