module.exports = {
    user          : process.env.NODE_ORACLEDB_USER || "ecol",
  
    // Instead of hard coding the password, consider prompting for it,
    // passing it in an environment variable via process.env, or using L#TTc011
    // External Authentication.
    password      : process.env.NODE_ORACLEDB_PASSWORD || 'ecol',
  
    // For information on connection strings see:
    // https://oracle.github.io/node-oracledb/doc/api.html#connectionstrings dbsvr2dr:1523/ecoltst
    connectString : process.env.NODE_ORACLEDB_CONNECTIONSTRING || "192.168.78.149:1521/ecol",
  
    // Setting externalAuth is optional.  It defaults to false.  See:
    // https://oracle.github.io/node-oracledb/doc/api.html#extauth
    externalAuth  : process.env.NODE_ORACLEDB_EXTERNALAUTH ? true : false
  };