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
        var queue = 'pending';
        ch.assertQueue(queue, { durable: false });
        console.log('waiting for messages in pending queue');
        ch.consume(queue, (message) => {
            
            // generate letter
            (async function () {
                try {
                    
                    var buf = message.content
                    var record = JSON.parse(buf.toString());
                    const accnumber = record[i].ACCNUMBER;
                    const custnumber = record[i].CUSTNUMBER;
                    // generate letterdata
                    const agent = new https.Agent({ rejectUnauthorized: false });
                    const agentSSL = new https.Agent({
                        requestCert: true,
                        rejectUnauthorized: false,
                         ca:fs.readFileSync("./cert/server.cert"),
                         cert: fs.readFileSync("./usercert.pem"),
                         key: fs.readFileSync("./key.pem"),
                     });
                    const response = await axios.get(dbConfig.ACCOUNTSAPI + '/accountsapi/account/' + accnumber +'/' + custnumber, { httpsAgent: agent });
                    
                    if (response.data) {
                        const bodyletter = {};
                        bodyletter.demand = record.DEMANDLETTER;
                        bodyletter.letterid = id;
                        bodyletter.showlogo = true;
                        bodyletter.format = 'pdf';
                        bodyletter.cust = response.custnumber;
                        bodyletter.acc = response.accnumber;
                        bodyletter.custname = response.client_name;
                        bodyletter.address = response.addressline1;
                        bodyletter.telnumber= response.telnumber,
                        bodyletter.postcode = response.postcode;
                        bodyletter.arocode = response.arocode;
                        bodyletter.branchname = response.branchname;
                        bodyletter.branchcode = response.branchcode;
                        bodyletter.manager = response.manager;
                        bodyletter.customeremail = record.EMAILADDRESS;
                        bodyletter.branchemail = response.branchemail || 'Customer Service <customerservice@co-opbank.co.ke>';
                        bodyletter.ccy = response.currency;
                        bodyletter.demand1date = new Date();
                        bodyletter.guarantors = response.guarantors || [];
                        bodyletter.settleaccno = response.settleaccno || '00000000000000';
                        bodyletter.kbbr = response.kbbr;
                        bodyletter.instamount = response.instamount;
                        bodyletter.oustbalance = response.oustbalance;
                        bodyletter.currency = response.currency;
                        bodyletter.accounts = response.accounts;

                        // push to queue
                        amqp.connect(dbConfig.RABBITMQ, (err, conn) => {
                            if (err != null) bail(err);
                            conn.createChannel(on_open);
                            function on_open(err, ch) {
                                if (err != null) bail(err);
                                var queue = 'demands_togenerate';
                                ch.assertQueue(queue, { durable: false });
                                ch.sendToQueue(queue, Buffer.from(JSON.stringify(bodyletter)));
                                console.log('==entry=added=to=>demands_togenerate');
                            }
                        });

                        // update with invalid email
                        const status = {
                            id: record.ID,
                            from: 'loans',
                            datesent: currentDate(),
                            status: 'processing',
                            sentby: 'auto'
                        };
                        // push to queue
                        //
                        amqp.connect(dbConfig.RABBITMQ, (err, conn) => {
                            if (err != null) bail(err);
                            conn.createChannel(on_open);
                            function on_open(err, ch) {
                                if (err != null) bail(err);
                                var queue = 'demandstatus';
                                ch.assertQueue(queue, { durable: false });
                                ch.sendToQueue(queue, Buffer.from(JSON.stringify(status)));
                                console.log('Status processing sent to demandstatus queue');
                            }
                        })
                    } else {
                        // no data
                        console.log( record.ACCNUMBER + ' has no account info')
                    }

                } catch (error) {
                    console.log(error.message)
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
