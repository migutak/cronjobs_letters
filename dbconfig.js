module.exports = {
    user          : process.env.DB_USER || "ecol",
    password      : process.env.DB_PASSWORD || 'ecol', //L#TTc011
    connectString : process.env.NODE_ORACLEDB_CONNECTIONSTRING || "52.117.54.217:1521/ORCLCDB.localdomain",
    RABBITMQ         : process.env.RABBITMQ || 'amqp://guest:guest@ecollectweb.co-opbank.co.ke',
    //RABBITMQ         : process.env.RABBITMQ || 'amqp://guest:guest@127.0.0.1',
    LETTERGENERATEURL: process.env.LETTERGENERATEURL || 'http://172.16.204.71:8004/docx/',
    SENDEMAILURL     : process.env.SENDEMAILURL || 'http://172.16.204.71:8005/demandemail/email',
    API              : process.env.API || 'http://172.16.204.71:8000',
    NODEAPI          : process.env.NODEAPI || 'http://172.16.204.71:6001/nodeapi',
    ACCOUNTSAPI : process.env.ACCOUNTSAPI || 'http://172.16.204.71:5001/accountsapi'
  };
