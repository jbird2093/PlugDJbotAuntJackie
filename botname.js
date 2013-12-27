// vim: set expandtab ts=4 sw=4:
var _ = require("./lib/underscore");
var plugAPI;
try {
	PlugAPI = require('./plugapi'); // git clone (or unzip) into the same directory as your .js file. There should be plugapi/package.json, for example (and other files)
} catch ( ex ) {
	PlugAPI = require('plugapi');
}
var UPDATECODE = '_:8s[H@*dnPe!nNerEM'; // We're not quite sure what this is yet, but the API doesn't work without it. It's possible that a future Plug update will change this, so check back here to see if this has changed, and set appropriately, if it has. You can omit using it if you wish - the value as of writing needs to be '$&2h72=^^@jdBf_n!`-38UHs', and is hardcoded into the bot in the event it is not specified below.
var botBase = require('./lib/bot_base.js');
var mysql;

// get our config
var config = require("./config");

var defaults = {
    botName: 'unnamed bot',
    botGreetings: ['/', 'bot ', 'bot', 'j'],
    botCall: 'j',
    openDate: 'XX/XX/XX',
    roomTheme: 'Welcome to the room', //only echoed out in commands, no functionality
    startTime: new Date(),
    usedb: true,
    dbhost: 'localhost',
    dbname: 'jackie',
    dbusername: 'root',
    dbpassword: 'jbird2663',
    pgreets: true,
    afkCheck: false,
    offDeckThresh: 5000,  //milliseconds
    afkMin: 15, //default value for afk checking
    songTimer: false,
    songLimit: 8, //minutes
    songCheck: false,
    deckPlays: 5,
    danceMode: true,
    games: true,
    sexy: true,
    autobop: false,
};

_.defaults(config, defaults);

function startCLI() {
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', function (line) {
        if (typeof line === "string" && line.length > 0) {
            bot.chat(line);
        }
    });
};

//Initializes request module
try {
    request = require('request');
} catch (e) {
    console.log(e);
    console.log('It is likely that you do not have the request node module installed.'
			+ '\nUse the command \'npm install request\' to install.');
    process.exit(33);
}

//Connects to mysql server
var client = null;
if (config.usedb) {
    try {
        mysql = require('mysql');
    } catch (e) {
        console.log(e);
        console.log('It is likely that you do not have the mysql node module installed.'
            + '\nUse the command \'npm install mysql\' to install.');
        console.log('Starting bot without database functionality.');
        config.usedb = false;
    }

    //Connects to mysql server
    try {
        client = mysql.createClient({ user: config.dbusername, password: config.dbpassword, database: config.dbname, host: config.dbhost });
    } catch (e) {
        console.log(e);
        console.log('Make sure that a mysql server instance is running and that the username and password information are correct.');
        console.log('Starting bot without database functionality.');
        config.usedb = false;
    }
}

// Create Bot
var bot = new PlugAPI(config.auth, UPDATECODE);

var botObj = {
    'config': config,
    'bot': bot,
    'db' : client
};

bot.on("reconnect", function() {
    console.log("here...");
    bot = new PlugAPI(config.auth, UPDATECODE);
    bot.connect(config.room);
});

/* ===== REQUIRED MODULES ====== */
// init base bot
botBase.init(botObj);
bot.connect(config.room);

/* ===== OPTIONAL MODULES ===== */
// init server listening
var httpServer = require('./lib/server-http.js');
botObj.commands = botBase.commands;
httpServer.init(botObj);
bot.listen(config.port, '127.0.0.1');

// start listening on the CLI when we join the room
bot.on("roomJoin", startCLI);
