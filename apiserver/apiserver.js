'use strict';
const log4js = require('log4js');
const logger = log4js.getLogger('BasicNetwork');
const bodyParser = require('body-parser');
const http = require('http')
const util = require('util');
const express = require('express')
const app = express();
const expressJWT = require('express-jwt');
const jwt = require('jsonwebtoken');
const bearerToken = require('express-bearer-token');
const cors = require('cors');

const helper = require('./util/helper');
const jsonHelper = require('./util/jsonHelper');
//const app = express();
//app.use(bodyParser.json());

app.options('*', cors());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

// set secret variable
app.set('secret', 'thisismysecret');
app.use(expressJWT({
  secret: 'thisismysecret'
}).unless({
  path: ['/users', '/users/login', '/register']
}));
app.use(bearerToken());

var aucID = 0;
var slaID = 0;
// Setting for Hyperledger Fabric
/*const { Wallets, Gateway } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
*/
const {
  Wallets,
  Gateway
} = require('fabric-network');
const fs = require('fs');
const path = require('path');

app.use((req, res, next) => {
  logger.debug('New req for %s', req.originalUrl);
  if (req.originalUrl.indexOf('/users') >= 0 || req.originalUrl.indexOf('/users/login') >= 0 || req.originalUrl.indexOf('/register') >= 0) {
    return next();
  }
  var token = req.token;
  jwt.verify(token, app.get('secret'), (err, decoded) => {
    if (err) {
      console.log(`Error ================:${err}`)
      res.send({
        success: false,
        message: 'Failed to authenticate token. Make sure to include the ' +
          'token returned from /users call in the authorization header ' +
          ' as a Bearer token'
      });
      return;
    } else {
      req.username = decoded.username;
      req.orgname = decoded.orgName;
      logger.debug(util.format('Decoded from JWT token: username - %s, orgname - %s', decoded.username, decoded.orgName));
      return next();
    }
  });
});

var server = http.createServer(app).listen(8080, function() {
  console.log(`Server started on ${8080}`)
});
logger.info('****************** SERVER STARTED ************************');
//logger.info('***************  http://%s:%s  ******************', host, port);
server.timeout = 240000;

function getInput() {
  return new Promise((resolve, reject) => {
    let input = [];
    fs.readFile('./data.json', (err, data) => {
      return resolve(JSON.parse(data));
    })
  });
}

getInput().then(function(data) {
  console.log(data);
});

app.post('/users/login', async function(req, res) {
  var username = req.body.username;
  var orgName = req.body.orgName;
  logger.debug('End point : /users');
  logger.debug('User name : ' + username);
  logger.debug('Org name  : ' + orgName);
  if (!username) {
    res.json(getErrorMessage('\'username\''));
    return;
  }
  if (!orgName) {
    res.json(getErrorMessage('\'orgName\''));
    return;
  }

  var token = jwt.sign({
    exp: Math.floor(Date.now() / 1000) + parseInt(36000),
    username: username,
    orgName: orgName
  }, app.get('secret'));

  let isUserRegistered = await helper.isUserRegistered(username, orgName);

  if (isUserRegistered) {
    res.json({
      success: true,
      message: {
        token: token
      }
    });

  } else {
    res.json({
      success: false,
      message: `User with username ${username} is not registered with ${orgName}, Please register first.`
    });
  }
});

app.get('/api/query', async function(req, res) {
  console.log(req.username);
  console.log(req.orgname);
  try {
    let fcn = req.query.fcn;
    let args = req.query.args;
    args = args.replace(/'/g, '"');
    args = JSON.parse(args);
    let ccp = await helper.getCCP(req.orgname);
    let walletPath = await helper.getWalletPath(req.orgname);
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);
    const identity = await wallet.get(req.username);
    if (!identity) {
      console.log('An identity for the user does not exist in the wallet');
      console.log('Run the registerUser.js application before retrying');
      return;
    }
    const gateway = new Gateway();
    console.log(req.username);
    console.log(req.orgname);
    await gateway.connect(ccp, {
      wallet,
      identity: req.username,
      discovery: {
        enabled: true,
        asLocalhost: true
      }
    });
    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('awesome');
    let result;
    if (fcn == "queryService") {
      result = await contract.evaluateTransaction(fcn, args[0]);
      console.log(result);
    } else if (fcn == "queryAllServicesAsOwner") {
      result = await contract.evaluateTransaction(fcn);
    } else if (fcn == "queryServiceAsCustomer") {
      result = await contract.evaluateTransaction(fcn, args[0]);
    } else if (fcn == "queryAllServicesAsCustomer") {
      result = await contract.evaluateTransaction(fcn);
    } else if (fcn == "queryAllSLAs") {
      result = await contract.evaluateTransaction(fcn);
    } else if (fcn == "queryAllSLAsAsWitness") {
      result = await contract.evaluateTransaction(fcn);
    } else if (fcn == "queryAllServices") {
      result = await contract.evaluateTransaction(fcn);
    } else if (fcn == "queryMySLAsAsWitness") {
      result = await contract.evaluateTransaction(fcn);
    } else if (fcn == "queryUserData") {
      result = await contract.evaluateTransaction(fcn);
    }
    result = JSON.parse(result.toString());
    console.log(result);
    let message = result;
    const response_payload = {
      result: message,
      error: null,
      errorData: null
    }
    console.log(response_payload);
    res.send(response_payload);
    /*console.log(`Transaction has been evaluated, result is: ${result.toString()}`);
    res.status(200).json({
      response: result.toString()
    });*/
    await gateway.disconnect();
  } catch (error) {
    console.log(error);
    const response_payload = {
      result: null,
      error: error.name,
      errorData: error.message
    }
    console.log(response_payload);
    res.send(response_payload)
  }
  /*catch (error) {
    console.error(`Failed to evaluate transaction: ${error}`);
    res.status(500).json({
      error: error
    });
    process.exit(1);
  }*/
});

app.post('/api/invoke', async function(req, res) {
  console.log("invoke");
  console.log(req.username);
  console.log(req.orgname);
  try {
    let fcn = req.body.fcn;
    let args = req.body.args;
    console.log(args);
    let ccp = await helper.getCCP(req.orgname);
    let walletPath = await helper.getWalletPath(req.orgname);
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);
    const identity = await wallet.get(req.username);
    if (!identity) {
      console.log('An identity for the user does not exist in the wallet');
      console.log('Run the registerUser.js application before retrying');
      return;
    }
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: req.username,
      discovery: {
        enabled: true,
        asLocalhost: true
      }
    });
    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('awesome');
    let result;
    let identifier;
    let message;
    if (fcn == "submitAuction") {
      getAuctionID(async function(data) {
        console.log("im arg 0");
        console.log(args[0]);
        result = await contract.submitTransaction(fcn, data, args[0]);
        message = `Successfully submitted auction`;
        response(res, message);
        incrementAuctionID(data, args[0]);
      });
      return;
    } else if (fcn == "submitBid") {
      result = await contract.submitTransaction(fcn, args[0], args[1]);
      message = `Successfully submitted bid`;
    } else if (fcn == "endAuction") {
      var slaID = "_" + args[0];
      result = await contract.submitTransaction(fcn, args[0], slaID);
      //await contract.submitTransaction("setSLAdeadline","sla"+slaID);
      //await new Promise(resolve => setImmediate(resolve));
      message = `Successfully ended auction`;
      //remove auction from here too
      var now = new Date();
      console.log(now);
      removeAuction(args[0]);
      //let slaData = await contract.evaluateTransaction("queryService", "sla" + slaID);
      //writeSLA("sla" + slaID, slaData);
    } else if (fcn == "submitWitness") {
      result = await contract.submitTransaction(fcn, args[0]);
      message = `Successfully submitted witness`;
    } else if (fcn == "loginWitness") {
      result = await contract.submitTransaction(fcn);
      message = `Successfully logged in witness`;
    } else if (fcn == "submitWitnessVote") {
      result = await contract.submitTransaction(fcn, args[0], parseInt(args[1]));
      message = `Successfully submitted vote`;
    } else if (fcn == "endSLA") {
      result = await contract.submitTransaction(fcn, args[0]);
      message = `Successfully ended SLA and paid out users`;
    }
    else if (fcn == "slaPayout") {
      result = await contract.submitTransaction(fcn, args[0]);
      message = `Successfully paid out SLA`;
    } else if (fcn == "addBalance") {
      result = await contract.submitTransaction(fcn, args[0]);
      message = `Successfully changed funds`;
    } else if (fcn == "withdrawBalance") {
      result = await contract.submitTransaction(fcn, args[0]);
      message = `Successfully changed funds`;
    }
    /*let response = {
      message: message
    }
    console.log(`Transaction has been evaluated, result is: ${result.toString()}`);
    const response_payload = {
      result: response,
      error: null,
      errorData: null
    }
    res.send(response_payload);
    await gateway.disconnect();*/
    response(res, message);
  } catch (error) {
    const response_payload = {
      result: null,
      error: error.name,
      errorData: error.message
    }
    res.send(response_payload)
  }
  /*catch (error) {
    console.error(`Failed to evaluate transaction: ${error}`);
    res.status(500).json({
      error: error
    });
    process.exit(1);
  }*/
});

function response(res, message) {
  let response = {
    message: message
  }
  //console.log(`Transaction has been evaluated, result is: ${result.toString()}`);
  /*res.status(200).json({
    response: "OK"
  });*/
  const response_payload = {
    result: response,
    error: null,
    errorData: null
  }
  res.send(response_payload);
}

function jsonReader(filePath, cb) {
  fs.readFile(filePath, (err, fileData) => {
    if (err) {
      return cb && cb(err);
    }
    try {
      const object = JSON.parse(fileData);
      return cb && cb(null, object);
    } catch (err) {
      return cb && cb(err);
    }
  });
}

function getAuctionID(callback) {
  jsonReader("./data.json", (err, data) => {
    if (err) {
      console.log(err);
      return;
    }
    callback(data.aucID);
  });
}

function getData(callback) {
  jsonReader("./data.json", (err, data) => {
    if (err) {
      console.log(err);
      return;
    }
    callback(data);
  });
}

function incrementAuctionID(identifier, arg) {
  console.log(identifier);
  identifier = "auction" + identifier;
  console.log(arg);
  jsonReader("./data.json", function(err, data) {
    if (err) {
      console.log(err);
      return;
    }
    data.aucID += 1;
    var argP = JSON.parse(arg);
    console.log(argP);
    var deadline = argP.auctionRules.deadline;
    var argO = {
      identifier,
      deadline
    }
    data.auctions.push(argO);
    //console.log(data.aucID);
    fs.writeFileSync("./data.json", JSON.stringify(data), err => {
      if (err) console.log("Error writing file:", err);
    }); // => "Infinity Loop Drive"
  });
}

function getSLAID(callback) {
  jsonReader("./data.json", (err, data) => {
    if (err) {
      console.log(err);
      return;
    }
    callback(data.slaID);
  });
}

function removeAuction(index) {
  jsonReader("./data.json", (err, data) => {
    if (err) {
      console.log(err);
      return;
    }
    data.auctions = data.auctions.filter(child => child.identifier !== index);
    //data.auctions.splice(index, 1);
    console.log(data.auctions);
    //console.log(newdata);
    fs.truncate('./data.json', 0, function() {
      console.log('File Content Deleted')
    });
    console.log("writing deleted auctions");
    fs.writeFile("./data.json", JSON.stringify(data), err => {
      if (err) console.log("Error writing file:", err);
    }); // => "Infinity Loop Drive"
  });
}

function removeSLA(index) {
  jsonReader("./data.json", (err, data) => {
    if (err) {
      console.log(err);
      return;
    }
    data.slas = data.slas.filter(child => child.identifier !== index);
    //data.auctions.splice(index, 1);
    console.log(data.slas);
    //console.log(newdata);
    fs.truncate('./data.json', 0, function() {
      console.log('File Content Deleted')
    });
    console.log("writing deleted auctions");
    fs.writeFile("./data.json", JSON.stringify(data), err => {
      if (err) console.log("Error writing file:", err);
    }); // => "Infinity Loop Drive"
  });
}

function incrementSLAID() {
  console.log("incrementing SLA ID...");
  jsonReader("./data.json", (err, data) => {
    if (err) {
      console.log(err);
      return;
    }
    data.slaID += 1;
    console.log(data.slaID);
    fs.writeFileSync("./data.json", JSON.stringify(data), err => {
      if (err) console.log("Error writing file:", err);
    }); // => "Infinity Loop Drive"
  });
}

async function endAuction(auctionID) {
  var now = new Date();
  console.log(now);
  try {
    let ccp = await helper.getCCP("org1");
    let walletPath = await helper.getWalletPath("org1");
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);
    const identity = await wallet.get("admin");
    if (!identity) {
      console.log('An identity for the user does not exist in the wallet');
      console.log('Run the registerUser.js application before retrying');
      return;
    }
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: "admin",
      discovery: {
        enabled: true,
        asLocalhost: true
      }
    });
    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('awesome');
    var slaID = "_" + auctionID;
    let result = await contract.submitTransaction("endAuction", auctionID, slaID);
    let slaData = await contract.evaluateTransaction("queryService", "sla" + slaID);
    //writeSLA("sla" + slaID, slaData);
    //await contract.submitTransaction("setSLAdeadline", "sla"+slaID);
    await new Promise(resolve => setImmediate(resolve));
  } catch (e) {
    console.error(`Failed to evaluate transaction: ${e}`);
    process.exit(1);
  }
}

async function endSLA(slaID) {
  let result = "";
  let message = "";
  var now = new Date();
  console.log(now);
  try {
    let ccp = await helper.getCCP("org1");
    let walletPath = await helper.getWalletPath("org1");
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    //console.log(`Wallet path: ${walletPath}`);
    const identity = await wallet.get("admin");
    if (!identity) {
      console.log('An identity for the user does not exist in the wallet');
      console.log('Run the registerUser.js application before retrying');
      return;
    }
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: "admin",
      discovery: {
        enabled: true,
        asLocalhost: true
      }
    });
    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('awesome');
    var args = [slaID];
    result = await contract.submitTransaction("endSLA", args[0]);
    message = `Successfully ended SLA and paid out users`;
  } catch (e) {
    console.error(`Failed to evaluate transaction: ${e}`);
    process.exit(1);
  }
}

async function getActiveSLAs() {
  let result = "";
  let message = "";
  try {
    let ccp = await helper.getCCP("org1");
    let walletPath = await helper.getWalletPath("org1");
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);
    const identity = await wallet.get("admin");
    if (!identity) {
      console.log('An identity for the user does not exist in the wallet');
      console.log('Run the registerUser.js application before retrying');
      return;
    }
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: "admin",
      discovery: {
        enabled: true,
        asLocalhost: true
      }
    });
    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('awesome');
    result = await contract.evaluateTransaction("queryAllActiveSLAs");
    result = JSON.parse(result);
    for (var i = 0; i < result.length; i++) {
      //add if over logic
      var now = new Date();
      var deadline = result[i].Record.auctionObject.service.witnessGlobalRules.slaDeadline;
      var countDownDate = new Date(deadline);
      var distance = countDownDate - now;
      if (distance > 0) {
        console.log("still running " + result[i].Key);
      } else {
        console.log("over " + result[i].Key);
        await endSLA(result[i].Key);
      }
    }
    return;
  } catch (e) {
    console.error(`Failed to evaluate transaction: ${e}`);
    process.exit(1);
  }
}

/*function writeSLA(identifier, slaData) {
  var sla = JSON.parse(slaData);
  console.log(identifier);
  jsonReader("./data.json", function(err, data) {
    if (err) {
      console.log(err);
      return;
    }
    var deadline = sla.auctionObject.service.witnessGlobalRules.slaDeadline;
    var argO = {
      identifier,
      deadline
    }
    data.slas.push(argO);
    //console.log(data.aucID);
    fs.writeFileSync("./data.json", JSON.stringify(data), err => {
      if (err) console.log("Error writing file:", err);
    }); // => "Infinity Loop Drive"
  });
  console.log(sla.auctionObject.service);
}*/

async function slaHandling() {
  var now = new Date();
  console.log(now);
  await getActiveSLAs();
  await sleep(5000);
  var now2 = new Date();
  console.log(now2);
  console.log("done w SLAs");
  slaHandling();
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

slaHandling();

var interval = setInterval(function() {
  getData(async function(data) {
    var now = new Date();
    var auc_ids = [];
    for (var i = 0; i < data.auctions.length; i++) {
      var countDownDate = new Date(Date.parse(data.auctions[i].deadline));
      var distance = countDownDate - now;
      if (distance > 0) {
        //await incrementSLAID();
        console.log("still running" + JSON.stringify(data.auctions[i]));
      } else {
        console.log("over" + JSON.stringify(data.auctions[i]));
        //incrementSLAID();
        await endAuction(data.auctions[i].identifier);
        auc_ids.push(data.auctions[i].identifier);
        //removeAuction(data.auctions[i].identifier); // move this to after for loop?
      }
    }
    for (var i = 0; i < auc_ids.length; i++) {
      removeAuction(auc_ids[i]);
    }
  });
}, 5000);
