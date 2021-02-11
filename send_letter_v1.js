const axios = require('axios');
var validator = require("email-validator");
const cron = require("node-cron");
const express = require("express");

app = express();
var log4js = require('log4js');
var oracledb = require('oracledb');
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
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
//cron.schedule("* * * * *", function () {
    async function run() {
        let connection;
        let rowcount = 0;    
        try {
          connection = await oracledb.getConnection( {
            user: dbConfig.user,
            password: dbConfig.password,
            connectString: dbConfig.connectString
          });


          const sql = `SELECT accnumber,
                    CURSOR(SELECT *
                           FROM tqall e
                           WHERE e.accnumber = d.accnumber) as nc
             FROM demandsdue d`;
      
          const result = await connection.execute(sql,
            [],
            {
                resultSet: true
            }
          );
          const queryStream = result.resultSet.toQueryStream();
          const consumeStream = new Promise((resolve, reject) => {
            queryStream.on('data', function(row) {
              console.log(row);
              rowcount++;
            });
            queryStream.on('error', reject);
            queryStream.on('end', function() {
              queryStream.destroy();  // free up resources
            });
            queryStream.on('close', resolve(rowcount));
          });
      
          const numrows = await consumeStream;
          console.log('Rows selected: ' + numrows)
      
        } catch (err) {
          console.error(err);
        } finally {
          if (connection) {
            try {
              await connection.close();
            } catch (err) {
              console.error(err);
            }
          }
        }
      }
      
      run();
//})
