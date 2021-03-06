const msal = require('@azure/msal-node');
const {log, safeLog, safeError} = require('./winston-logger.js');

const config = {
    auth: {
        clientId: process.env.APPLICATION_CLIENT_ID,
        authority: `${process.env.CLOUD_INSTANCE_ID}/${process.env.TENANT_ID}`,
        clientSecret: process.env.CLIENT_SECRET_VALUE
    },
    system: {
        loggerOptions: {
            loggerCallback(loglevel, message, containsPii) {
                log.debug(message);
            },
            piiLoggingEnabled: false,
            logLevel: msal.LogLevel.Verbose,
        }
    }
}
const cca = new msal.ConfidentialClientApplication(config);

exports.validate = (req, res, next)=>{
  
  if(req.session.user) {
    log.info('user has a valid session', req.session.user)
    return next()
  } else if (req.query.debug || ("DEBUG" in process.env && process.env.DEBUG.toString()==="true")){
    log.debug('debug user view')
    
    req.session.user = {
      name: {
        full:"erin sparling", 
        first:"erin", 
        last:"sparling"
      }, 
      email:"Erin.Sparling@cooper.edu"
    }    
    
    return next()
  } else {
    log.debug('user has no session')
    const authCodeUrlParameters = {
        scopes: ["user.read"],
        redirectUri: "https://eoys-uploader-2021.glitch.me/auth/redirect",
    };

    // get url to sign user in and consent to scopes needed for application
    cca.getAuthCodeUrl(authCodeUrlParameters).then((response) => {
        return res.redirect(response);
    }).catch((error) => log.error(JSON.stringify(error)));  
  }
}

exports.redirect = (req, res, next)=>{
  const tokenRequest = {
      code: req.query.code,
      scopes: ["user.read"],
      redirectUri: "https://eoys-uploader-2021.glitch.me/auth/redirect",
  };

  cca.acquireTokenByCode(tokenRequest).then((response) => {
      log.debug("\nResponse: \n:", response.account);

      req.session.user = {
        name: { 
          full: response.account.name,
          first: response.account.name.split(" ")[0],
          last: response.account.name.split(" ")[1],
        },
        email: response.account.username
      }
      return res.redirect('/')
  }).catch((error) => {
      log.error(error);
      return res.status(500).send(error);
  });
}

exports.logout = (req, res) =>{
  req.session = null
  res.redirect('/')
}