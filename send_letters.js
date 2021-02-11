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

const URL = dbConfig.LETTERGENERATEURL; // 'http://172.16.19.151:8004/docx/';
const API = dbConfig.API; // 'http://172.16.204.71:8000';
const EMAIL = dbConfig.SENDEMAILURL; // 'http://172.16.204.71:8005/demandemail/email';
const NODEAPI = dbConfig.NODEAPI; // 'http://172.16.204.71:6001/nodeapi';
const bodyletter = {};
const emaildata = {};
const demandhisdetails = {};

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
    // get demands due
    var sqldd = "select * from demandsdue where status = 'pending'"
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
                    if(result.rows.length > 0) {
                        for(i=0; i<result.rows.length; i++) {
                            if(validator.validate(result.rows[i].EMAILADDRESS)) {
                                console.log('... valid email ....');
                                // console.log(result.rows[i]);
                                var record = result.rows[i];
                                (async function() {
                                    try {
                                      const response = await axios.get(API + '/api/tqall/' + result.rows[i].ACCNUMBER);
                                      // console.log(response.data);
                                      if (response.data) {
                                        bodyletter.demand = record.DEMANDLETTER;
                                        bodyletter.showlogo = true;
                                        bodyletter.format = 'pdf';
                                        bodyletter.cust = response.data.custnumber;
                                        bodyletter.acc = response.data.accnumber;
                                        bodyletter.custname = response.data.client_name;
                                        bodyletter.address = response.data.addressline1;
                                        bodyletter.postcode = response.data.postcode;
                                        bodyletter.arocode = response.data.arocode;
                                        bodyletter.branchname = response.data.branchname;
                                        bodyletter.branchcode = response.data.branchcode;
                                        bodyletter.manager = response.data.manager;
                                        bodyletter.branchemail = response.data.branchemail || 'Collection Support <collectionssupport@co-opbank.co.ke>';
                                        bodyletter.ccy = response.data.currency;
                                        bodyletter.demand1date = new Date();
                                        bodyletter.guarantors = response.data.guarantors || [];
                                        bodyletter.settleaccno = response.data.settleaccno || '00000000000000';
                                        bodyletter.kbbr = response.data.kbbr;
                                        bodyletter.instamount = response.data.instamount;
                                        bodyletter.oustbalance = response.data.oustbalance;
                                        bodyletter.currency = response.data.currency;

                                        const acc_resp = await axios.get(API + '/api/tqall?filter[where][custnumber]=' + record.CUSTNUMBER);
                                        bodyletter.accounts = acc_resp.data;

                                        emaildata.name = response.data.client_name,
                                        emaildata.email = record.EMAILADDRESS,
                                        emaildata.branchemail = response.data.branchemail || 'Collection Support <collectionssupport@co-opbank.co.ke>',
                                        emaildata.title = record.DEMANDLETTER,
                                        emaildata.guarantor = response.data.guarantors || []

                                        console.log('generate letter =start=' + bodyletter.acc);
                                        // generate letter
                                        const dd_resp = await axios.post(URL + record.DEMANDLETTER + '/download', bodyletter);

                                        console.log('generate letter =end=' + bodyletter.acc);

                                        demandhisdetails.accnumber = record.ACCNUMBER,
                                        demandhisdetails.custnumber= record.CUSTNUMBER,
                                        demandhisdetails.address= response.data.addressline1,
                                        demandhisdetails.email= response.data.emailaddress,
                                        demandhisdetails.telnumber= response.data.telnumber,
                                        demandhisdetails.filepath= dd_resp.data.message,
                                        demandhisdetails.filename= dd_resp.data.filename,
                                        demandhisdetails.datesent= new Date(),
                                        demandhisdetails.owner= 'auto',
                                        demandhisdetails.byemail= 'Y',
                                        demandhisdetails.byphysical= 'N',
                                        demandhisdetails.bypost= 'N',
                                        demandhisdetails.demand= record.DEMANDLETTER,
                                        demandhisdetails.customeremail= record.EMAILADDRESS,
                                        demandhisdetails.status= 'sent',
                                        demandhisdetails.reissued= 'N',
                                        demandhisdetails.guarantorsno= 0,
                                        demandhisdetails.guarantorsemail = '',
                                        demandhisdetails.sendemail= dd_resp.data.branchemail || 'Collection Support <collectionssupport@co-opbank.co.ke>'

                                        emaildata.file = dd_resp.data.message

                                        console.log('....demandhisdetails..', demandhisdetails);

                                        console.log('send email letter =start=' + bodyletter.acc);
                                        const send_email_resp = await axios.post(EMAIL, emaildata);
                                        console.log('send email letter =end=' + bodyletter.acc);
                                        // send sms
                                        // get template
                                        const emailtemp_resp = await axios.get(EMAIL + '/api/demandsettings/' + demand.toLowerCase());
                                        const sms = emailtemp_resp.data.smstemplate;
                                        const smsMessage = sms.replace('[emailaddressxxx]', 'email address ' + demandhisdetails.customeremail);
                                        const smsdata = {
                                            'demand': demandhisdetails.demand,
                                            'custnumber': demandhisdetails.custnumber,
                                            'accnumber': demandhisdetails.accnumber,
                                            'telnumber': demandhisdetails.telnumber,
                                            'owner': 'auto',
                                            'message': smsMessage,
                                        };

                                        const sendemail_resp = await axios.post(API + '/api/sms', smsdata);
                                        
                                        // add to history
                                        const ddhistory_resp = await axios.post(API + '/api/demandshistory', demandhisdetails);

                                        // statusupdate
                                        const status = {
                                            id: record.ID,
                                            from : 'loans',
                                            datesent : currentDate(),
                                            sentby: 'auto'
                                          };

                                        const ddstatus_resp = await axios.post(NODEAPI + '/demandstatus/demandstatus', status);

                                        console.log('demand send complete!!!!')
                                      } else {
                                          // no data
                                          console.log('no account info')
                                      }
                                    } catch (error) {
                                      console.error(error);
                                      logger.error(error);
                                    }
                                })();
                            } else {
                                // email invalid
                                // console.log('.... record email invalid .....');
                                logger.trace('.... record email invalid .....');
                                logger.info(result.rows[i])
                            }
                        }
                    }
                    doRelease(connection);
                });
        });
    
    
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
