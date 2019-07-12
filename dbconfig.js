module.exports = {
    user          : process.env.NODE_ORACLEDB_USER || "ecol",
  
    // Instead of hard coding the password, consider prompting for it,
    // passing it in an environment variable via process.env, or using L#TTc011
    // External Authentication.
    password      : process.env.NODE_ORACLEDB_PASSWORD || 'L#TTc011',
  
    // For information on connection strings see:
    // https://oracle.github.io/node-oracledb/doc/api.html#connectionstrings dbsvr2dr:1523/ecoltst
    // connectString : process.env.NODE_ORACLEDB_CONNECTIONSTRING || "dbsvr2dr:1523/ecoltst",
    // connectString : process.env.NODE_ORACLEDB_CONNECTIONSTRING || "dbsvr2dr:1523/ecoltst",
    connectString : process.env.NODE_ORACLEDB_CONNECTIONSTRING || "172.16.210.14:1564/ecollect",
  
    // Setting externalAuth is optional.  It defaults to false.  See:
    // https://oracle.github.io/node-oracledb/doc/api.html#extauth
    externalAuth  : process.env.NODE_ORACLEDB_EXTERNALAUTH ? true : false,
    RABBITMQ : 'amqp://guest:guest@172.16.19.151',
    LETTERGENERATEURL: 'http://172.16.19.151:8004/docx/',
    SENDEMAILURL: 'http://172.16.204.71:8005/demandemail/email',
    API: 'http://172.16.204.71:8000',
    NODEAPI: 'http://172.16.204.71:6001/nodeapi'
  };