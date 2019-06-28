const axios = require('axios');
var validator = require("email-validator");

const URL = 'http://localhost:8004/docx/Demand1/download';
const data = {
    format: "docx",
    acc: "00000000000000",
    custnumber: "0000000",
    accounts: [],
    guarantors: []
};

axios.post(URL, data)
    .then(function (response) {
        console.log(response.data);
        console.log(response.status);
        console.log(response.statusText);
        console.log(validator.validate("test@email.co.ke"));
    })
    .catch(function (error) {
        console.log(error);
    });