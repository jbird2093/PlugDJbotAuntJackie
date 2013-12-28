// vim: set expandtab ts=4 sw=4:
var fs = require('fs');
var _ = require('./underscore');
var extend = require('./node.extend');
var util = require('util');
var models = require('./models');
var helpers = require('./helpers');
var entities = require('entities');
var commands = require('./commands');
var startTime = new Date();
var debug = true;
var newCount = 0;

if (!debug) {
    /* to hopefully keep bot from crashing */
    process.on('uncaughtException', function (err) {
        botSpeak('console', getTimestamp() + ' Caught : ' + err);
    });
}

var DEFAULT_PLAYLIST_NAME = "Default";


var Song = models.Song;
var User = models.User;
var getTimestamp = helpers.getTimestamp;
var getTimeShort = helpers.getTimeShort;
var timeFormat = helpers.timeFormat;
var getTrackTime = helpers.getTrackTime;
var getIdleTime = helpers.getIdleTime;
var dateDiff = helpers.dateDiff;

var bot = null;
var config = null;
var db  = null, client = null;
var plugRoom = {

    history: [],

    addHistoryItem: function(item) {
        this.history.unshift(item);
    },

    getHitoryItem: function(idx) {
        if (!_.isNumber(idx)) {
            idx = 0;
        }
        return this.history[idx];
    },

    playlistID: '',
    userList: {},
    addUser: function (user) {
        plugRoom.userList[user.id] = user;
    },
    removeUser: function (user) {
        delete plugRoom.userList[user.id];
    },
    getUser: function (userid) {
        var user = plugRoom.userList[userid];
        if (typeof user == "undefined") {
            var str = getTimestamp() + " " + "activty from user we do not know about, fetch it";
            var puser = bot.getUser(userid);
            if (!_.isEmpty(puser)) {
                user = new User(puser);
            } else {
                // NULL user for now, will get replace when we get our plug event
                user = new User({
                    id: -1,
                    permission: -1
                });
            }
            plugRoom[userid] = user;
        }
        return user;
    }
};


var currentSong = new Song();
var escortId = null;
var newCount = 0;

//internal functions
function initializeUsers() {
    var users = bot.getUsers();
    for (var i = 0; i < users.length; i++) {
        plugRoom.addUser(users[i]);
    }
}
function getUserName(userid) {
    var user = bot.getUser(userid);
    var username = user.username;
    return username;
}
function getUserId(username) {
    return param.match(/\@.+/i);

}
function randomBop() {
    var min = 15000;
    var max = 45000;
    var rand = Math.floor(Math.random() * (max - min + 1)) + min;
    setTimeout(function () { bot.woot(); }, rand);
}
function loadUserList() {
    var users = bot.getUsers();
    for (var i in users) {
        var user = users[i];
        userJoin(user, true);
    }
    return true;
}
function updateWaitList() {
    var str = '';
    var loopcnt = 0;
    var audience = bot.getAudience();
    var i;
    var uid;
    for (i in audience) {
        uid = audience[i].id;
        plugRoom.getUser(uid).onWait = false;
        plugRoom.getUser(uid).isDj = false;
    }
    var waitList = bot.getWaitList();
    for (i in waitList) {
        uid = waitList[i].id;
        plugRoom.getUser(uid).onWait = true;
        plugRoom.getUser(uid).isDj = false;
    }
    return true;
}
function getCurrentWaitList() {
    var response = 'Wait list: ';
    var loopcnt = 0;
    var waitlist = bot.getWaitList();
    if (waitlist.length > 0) {
        for (var i in waitlist) {
            var user = waitlistt[i];
            var idleTime = getIdleTime(user.id, plugRoom);
            if (user.onWait) {
                loopcnt = loopcnt += 1;
                response = response + util.format('%s%s:%s', helpers.convNumToEmoji(loopcnt), user.username, idleTime);
            }
        }
    } else {
        response = "No wait list at this time.";
    }
    return response;
}
function getPlayCount() {
    str = '';
    var num = 1;
    var users = plugRoom.userList;
    for (var i in users) {
        var user = users[i];
        if (user.onWait || user.isDj) {
            var name = user.username;
            var plays = user.noPlays;
            str = str + util.format('%s %s has %d:musical_note:', helpers.convNumToEmoji(num), name, plays);
            num += 1;
        }
    }
    return str;
}
function puntUser(userid) {
    bot.moderateRemoveDJ(userid);
}
function getDefaultPlaylistID() {
    bot.getPlaylists(function (playlists) {
        var foundDefault = false;
        for (var i in playlists) {
            if (playlists[i].name === DEFAULT_PLAYLIST_NAME) {
                plugRoom.playlistID = playlists[i].id;
                foundDefault = true;
                break;
            }
        }

        if (!foundDefault) {
            console.log("no default playlist found, creating it now");
            bot.createPlaylist(DEFAULT_PLAYLIST_NAME, function(playlist) {
                plugRoom.playlistID = playlist.id;
                console.log("default playlist created <" + playlist.id + ">");
            });
        }
    });
}
function moveUserOnList(userid, position) {
    bot.moveDJ(userid, position);
}
function get420() {
    if ((config.pgreets) && (config.sexy)) {
        var response = '';
        var now = new Date();
        var hour = now.getHours();
        var minute = now.getMinutes();
        var second = now.getSeconds();
        if ((hour === 15) && (minute === 20)) {
            botSpeak('chat', util.format("HAPPY 4:20 EASTERN TIME!"));
            botSpeak('chat', util.format("https://dl.dropboxusercontent.com/u/55722261/MnM/Jackie/420TIME.gif"));
        } else if ((hour === 16) && (minute === 20)) {
            botSpeak('chat', util.format("HAPPY 4:20 CENTRAL TIME!"));
            botSpeak('chat', util.format("https://dl.dropboxusercontent.com/u/55722261/MnM/Jackie/420TIME.gif"));
        } else if ((hour === 17) && (minute === 20)) {
            botSpeak('chat', util.format("HAPPY 4:20 MOUNTAIN TIME!"));
            botSpeak('chat', util.format("https://dl.dropboxusercontent.com/u/55722261/MnM/Jackie/420TIME.gif"));
        } else if ((hour === 18) && (minute === 20)) {
            botSpeak('chat', util.format("HAPPY 4:20 PACIFIC TIME!"));
            botSpeak('chat', util.format("https://dl.dropboxusercontent.com/u/55722261/MnM/Jackie/420TIME.gif"));
        }
    }
}
setInterval(get420, 60000); //This repeats the every 60 second

// where to speak, what to speak, who to speak to (pm only)
function botSpeak(where, what, who) {
    switch (where) {
        case 'chat':
            bot.chat(what);
            break;
        case 'console':
            console.log(">" + what);
            break;
    }
}

//db queries - inserts/updates
function addBotlogToDb(userid, text) {
    if (config.usedb) {
        client.query('INSERT INTO ' + config.dbprefix + 'botlog SET userid = ?, text = ?', [userid, text]);
    }
}
function updateUser(user) {
    if (config.usedb) {
        //.id = '';.username = '';.status = 0;.language = '';.dateJoined = '';.djPoints = 0;.fans = 0;.listenerPoints = 0;.avatarID = 0;.curatorPoints = 0;
        //this.permission = 0;.staffRank = '';.isDj = false;.onWait = false;.noPlays = 0;.lastActivity = '';

        var cmd = "SELECT id FROM " + config.dbprefix + "users WHERE (id = '" + user.id + "')";
        client.query(cmd, function select(err, results) {
            if (err) {
                botSpeak('console', err + " updateUser");
            }
            if ((results) && (results.length > 0) && (results.length !== undefined)) {
                //<{id: }>,<{username: }>,<{language: }>,<{djPoints: }>,<{fans: }>,<{listenerPoints: }>,<{avatarid: }>,{curatorPoints: }>,<{lastActivity: }>
                client.query('UPDATE ' + config.dbprefix + 'users SET username = ?, language = ?, djPoints = ?, fans = ?, listenerPoints = ?, avatarid = ?, curatorPoints = ?, lastActivity = ? WHERE (id = ?)',
                    [user.username, user.language, user.djPoints, user.fans, user.listenerPoints, user.avatarid, user.curatorPoints, user.lastActivity, user.id],
                    function (err, results) {
                        if (err) {
                            botSpeak('console', err + " updateUsers");
                        }
                    });
            } else {
                //<{id: }>,<{username: }>,<{language: }>,<{dateJoined: }>,<{djPoints: }>,<{fans: }>,<{listenerPoints: }>,<{avatarid: }>,{curatorPoints: }>,<{lastActivity: }>
                client.query('INSERT INTO ' + config.dbprefix + 'users SET id = ?, username = ?, language = ?, dateJoined = ?, djPoints = ?, fans = ?, listenerPoints = ?, avatarid = ?, curatorPoints = ?, lastActivity = ?',
                    [user.id, user.username, user.language, user.dateJoined, user.djPoints, user.fans, user.listenerPoints, user.avatarid, user.curatorPoints, user.lastActivity]);
            }
        });
    }
}
function addSongToDb(song) {
    if (config.usedb) {
        if (song.songTitle !== '') {
            client.query('INSERT INTO ' + config.dbprefix + 'songs SET title = ?, artist = ?, duration = ?, userid = ?, username = ?, woots = ?, mehs = ?, grabs = ?, newtrack = ?', [song.title, song.artist, song.duration, song.djId, song.djName, song.score.woots, song.score.mehs, song.score.grabs, song.newTrack]);
        }
    }
}

function getPersonalGreet(user) {
    var min = 0;
    var max = null;
    if (config.usedb) {
        var cmd = "SELECT text FROM " + config.dbprefix + "pgreets WHERE (userid = '" + user.id + "') ORDER BY rand() LIMIT 1";
        client.query(cmd, function (err, results) {
            if (err) { botSpeak('console', err + " getPersonalGreet"); }
            if ((results) && (results.length > 0) && (results.length !== undefined)) {
                var text = results[0].text;
                setTimeout(function () { botSpeak('chat', text); }, 2500);
            }
        });
    }
    botSpeak('chat', "@" + user.username + "(" + user.language + ") in tha house.  Welcome to the MnM.  Current theme is: " + config.roomTheme);
}

//// ============= EVENT FUNCTIONS ==================

//updates on events
function userChatted(userid) {
    //console.log(userid);
    updateUserLastActivity(userid);
}
function updateScore() {
    var score = bot.getRoomScore();
    currentSong.score.woots = score.positive;
    currentSong.score.mehs = score.negative;
    currentSong.score.grabs = score.curates;
}
function voteUpdate(vote) {
    //console.log(vote);
    updateScore();
    updateUserLastActivity(vote.id);
}
function curateUpdate(userid) {
    //updateScore();
    updateUserLastActivity(userid.id);
}
function updateUserLastActivity(userid) {
    try {
        plugRoom.getUser(userid).lastActivity = new Date();
    } catch (e) {
        console.log(e.message);
    }
}

//permissions
function isOfStaff(userid) {
    return _.contains(_.pluck(bot.getStaff(), 'id'), userid);
}
function isDj(userid) {
    return _.contains(_.pluck(bot.getDJs(), 'id'), userid);
}

//room events
function onConnected(data) {
    botSpeak('console', config.botName + " has connected.");
}
function reconnect() {
    bot.emit("reconnect");
    return;
    bot.ws.close();
    setTimeout(function() {
        bot.connect(config.room);
        console.log(getTimestamp() + " reconnect.");
    }, 10000);
}
function onRoomJoin(data) {
    if (config.usedb) {
        addBotlogToDb(config.userid, config.botName + '********bot started.********');
    }
    botSpeak('console', config.botName + " has joined room: " + data.room.id);

    if (loadUserList()) {
        if (data.room.currentDJ !== null) {
            currentSong.id = data.room.media.id;
            currentSong.djId = data.room.currentDJ;
            currentSong.djName = getUserName(data.room.currentDJ);
            currentSong.title = data.room.media.title;
            currentSong.artist = data.room.media.author;
            currentSong.duration = data.room.media.duration;
            updateScore();
            plugRoom.userList[currentSong.djId].isDj = true;
        }
        getDefaultPlaylistID();

    }

    if (config.autobop) {
        randomBop();
    }

    buildCommandReg();
}
function userJoin(user, quiet) {
    updateUser(user);
    newUser = new User(user);
    plugRoom.addUser(newUser);
    if (config.pgreets && !quiet) {
        // greet user, get pgreet from database
        getPersonalGreet(newUser);
    }
    return true;
}
function userLeave(user) {
    // update user in db.users
    plugRoom.removeUser(user);
}
function djAdvance(data) {
    //currentDJ: '529c182b96fba51341b05ccf',djs: [ { user: [Object] }, { user: [Object] }, { user: [Object] } ],mediaStartTime: '2013-12-22 22:48:53.194256',
    //media:{ title: 'EDM Death Machine (Powered Djs Club Mix) UKF Dubstep',format: '1',author: 'Knife Party',cid: 'B2S55INhXy0',duration: 316,id: '1:B2S55INhXy0' },
    //playlistID: '529c1a1cc3b97a7234929521',earn: true,historyID: '52b76c5560acd804d00a392b'

    addSongToDb(currentSong);

    if (config.pgreets) {
        botSpeak('chat', util.format('%s played %s by: %s (%s) Votes: %d:+1: %d:-1: %d:heart:', currentSong.djName, currentSong.title, currentSong.artist, getTrackTime(currentSong.duration), currentSong.score.woots, currentSong.score.mehs, currentSong.score.grabs));
    }

    //handle stagedive if we need to punt the most recent jd
    if (plugRoom.getUser(currentSong.djId).escort) {
        puntUser(currentSong.djId);
        plugRoom.getUser(currentSong.djId).escort = false;
    }

    currentSong.djId = data.currentDJ;
    currentSong.djName = getUserName(data.currentDJ);
    currentSong.title = data.media.title;
    currentSong.artist = data.media.author;
    currentSong.duration = data.media.duration;
    currentSong.score = { 'woots': 0, 'mehs': 0, 'grabs': 0 };
    currentSong.newTrack = 0;

    var NewSongLimitMin = config.songLimit; //minutes
    NewSongLimit = NewSongLimitMin * 60; //convert to seconds 
    var NewSongLen = (currentSong.duration);
    if (config.songTimer && (NewSongLen > NewSongLimit) && (currentSong.djId != config.userid)) {
        var min = (((NewSongLen - NewSongLimit) / 60) - ((((NewSongLen - NewSongLimit) / 60) % 1)));
        var sec = Math.round(((((((NewSongLen - NewSongLimit) / 60) % 1) * 60) * 100) / 100), 2);
        if (sec < 10) sec = '0' + sec.toString();
        botSpeak('chat', '@' + djName + ' Track length greater than ' + NewSongLimitMin + ' minutes, please skip with ' +
                 min + ':' + sec + ' remaining.');
    }

    if (config.autobop) {
        randomBop();
    }

}
function djLeave(userid) {
    console.log(userid);
}
function onChat(chatItem) {
    //fromID: 'user id'   //message: 'message text'   //from: 'username'   //type: 'message type'   //chatID: 'chat id'

    userChatted(chatItem.fromID);

    //// decode HTML entities that come across the chat
    var msgText = entities.decode(chatItem.message, 2);

    if ( msgText.match(/!!/) ) {
        var historyItem = plugRoom.getHitoryItem();
        if (historyItem) {
            var historyMessage = entities.decode(historyItem.message, 2);
            msgText = msgText.replace("!!", historyMessage);
        }
    }

    if (config.pgreets || config.games) {
        //if (text.match(/flyby/i)) botSpeak('chat', "Negative, Ghost Rider, the pattern is full.");
        //if (text.match(/ARMAGEDDON/i)) botSpeak('chat', "RAGGID GET OUTTA THERE! http://youtu.be/cTrOb8zyrZk");
        //if (text.match(/sweet/i)) botSpeak('chat', "http://stream1.gifsoup.com/view3/3633922/sweet-brown-o.gif");
        if (msgText.match(/cock/i)) botSpeak('chat', "8=====D");
        if (msgText.match(/mulva/i)) botSpeak('chat', "Which would you like? (|) or (O)");
        if (msgText.match(/skeet/i)) botSpeak('chat', "8==:fist:==D:sweat_drops::relieved:");
    }

    var isOwner = (chatItem.fromID === config.botOwner);
    var isJBIRD = (chatItem.fromID === config.JBIRD);
    var isSelf = (chatItem.fromID === config.userid);
    var isStaff = isOfStaff(chatItem.fromID);
    var isDj = false;

    var greetings = config.botGreetings;
    var result;

    for (var i = 0, len = greetings.length; i < len; i++) {
        var pattern = new RegExp('(^' + greetings[i] + ')(.*?)( .*)?$');
        result = msgText.match(pattern);
        if (result) break;
    }

    if (result) {
        var greeting = result[1].trim();
        var command = result[2].trim();
        var param = '';
        var paramOrig = '';
        if (result.length == 4 && result[3]) {
            param = result[3].trim();
            paramOrig = result[2].trim();
        }
        var who = {
            isOwner: isOwner,
            isJBIRD: isJBIRD,
            isSelf: isSelf,
            isStaff: isStaff,
        };

        var commandObj = {
            'command': command,
            'userid': chatItem.fromID,
            'username': chatItem.from,
            'param': param,
            'paramOrig': paramOrig,
            'who': who,
            'where': 'chat'
        };

        doCommand(commandObj);
    }

    // add to history
    plugRoom.addHistoryItem(chatItem);
}

var command_reg = {};
function buildCommandReg() {
    command_reg = {
        'speak' : MakeCommand(commands.Echo),
        'djs' : MakeCommand(commands.Djs),
        'dj' : MakeCommand(commands.DJ),
        'up' : MakeCommand(commands.DJ),
        'down' : MakeCommand(commands.DJDown),
        'rules' : MakeCommand(commands.Rules),
        'tools' : MakeCommand(commands.Speak, {
            message: "Here are tools for using plug and Mix-N-Mash: http://bit.ly/186fpWD"
        }),
        'fb' : MakeCommand(commands.Speak, {
            message: "Join the " + config.room + " FB group to receive invites to our events and parties: " + config.fbLink
        }),
        'zombies' : MakeCommand(commands.Speak, {message: "٩(๏๏)۶٩(××)۶٩(●•)۶"}),
        'fliptable' : MakeCommand(commands.Speak, {message: "(ノಠ益ಠ)ノ彡┻━┻"}),
        'fixtable' : MakeCommand(commands.Speak, {message: "┬─┬ノ( º _ ºノ)"}),
        'boobies' : MakeCommand(commands.Speak, {message: "( • Y • )"}),
        'racist' : MakeCommand(commands.Speak, { message: "https://dl.dropboxusercontent.com/u/55722261/MnM/ThatsRacist.gif" }),
        'tiny' : MakeCommand(commands.Speak, { message: config.room + " tinychat link: " + config.tinyLink }),
        'emoji' : MakeCommand(commands.Speak, { message: "http://www.emoji-cheat-sheet.com/" }),
        'whoo' : MakeCommand(commands.Speak, { message: "WoWOOOOOOO" }),
        'snag' : MakeCommand(commands.Snag),
        'snatch' : MakeCommand(commands.Snag),
        'current' : MakeCommand(commands.Current),
        'smoke' : MakeCommand(commands.Smoke),
        'uptime' : MakeCommand(commands.Uptime),
        'userlist': MakeCommand(commands.UserList),
        'google' : MakeCommand(commands.Google),
        'list' : MakeCommand(commands.List),
        'stagedive' : MakeCommand(commands.StageDive),
        'help' : MakeCommand(commands.Help),
        'search' : MakeCommand(commands.Search),
        // db
        'theme' : MakeCommand(commands.Theme),
        'teachme': MakeCommand(commands.TeachMe),
        'funnyme': MakeCommand(commands.TeachMe),
        'gay': MakeCommand(commands.Gay),
        'last' : MakeCommand(commands.Last),
        'stats' : MakeCommand(commands.Speak, {message: 
                              "STATS COMMANDS: " + 
                              config.botCall + "mystats, " +
                              config.botCall + "topdjs, " +
                              config.botCall + "newstats, " +
                              config.botCall + "todaystats, " +
                              config.botCall + "djrank X, " +
                              config.botCall + "thistrack, " +
                              config.botCall + "toptracks, " +
                              config.botCall + "myfavs, " }),
        'mystats' : MakeCommand(commands.MyStats),
        'topdjs' : MakeCommand(commands.TopDJs),
        'newstats' : MakeCommand(commands.NewStats),
        'todaystats' : MakeCommand(commands.TodayStats),
        'djrank' : MakeCommand(commands.DJRank),
        'thistrack' : MakeCommand(commands.ThisTrack),
        'toptracks' : MakeCommand(commands.TopTracks),
        'myfavs' : MakeCommand(commands.MyFavs),
        //'useplays' : MakeCommand(commands.UsePlays),
        'skip' : MakeCommand(commands.Skip),
        'punt' : MakeCommand(commands.Punt),
        'settheme' : MakeCommand(commands.SetTheme),
        'afkcheck' : MakeCommand(commands.AfkCheck),
        'setafk' : MakeCommand(commands.SetAFK),
        'setgames' : MakeCommand(commands.SetGames),
        'setsexy' : MakeCommand(commands.SetSexy),
    };
}

var MakeCommand = function(Klass, opts) {
    opts || (opts = {});
    _.defaults(opts, {
        bot: bot,
        room: plugRoom,
        db: db
    });
    var cmd = new Klass(opts);
    return cmd;
};

function doCommand(commandObj) {
    var userid = commandObj.userid;
    var username = getUserName(userid);
    var who = commandObj.who;
    var spkr = {
        isOwner: false,
        isJBIRD: false,
        isStaff: false,
        isDj: false
    };
    extend(spkr, who);

    var param = commandObj.param;
    // set param to true/false based on string passed in
    if (param === "true") {
        param = true;
    } else if (param === "false") {
        param = false;
    }

    var where = commandObj.where || 'chat';

    var cmd = command_reg[commandObj.command];
    if ( cmd ) {
        cmd.execute(commandObj);
        return;
    }
}

//// ============= EXPORTED BOT ==================

var baseBot = {

    currVotes: { 'up': 0, 'down': 0 },

    init: function (botObj) {
        bot = botObj.bot;
        db = botObj.db;
        // backwards compat
        client = botObj.db;
        config = botObj.config;
        bot.on('connected', onConnected);
        bot.on('roomJoin', function (data) {
            // we are in the room, initialize our user list
            initializeUsers();
            onRoomJoin(data);

            //bot.on('close', reconnect);
            bot.on('error', reconnect);
            bot.on('chat', onChat);
            bot.on('userJoin', userJoin);
            bot.on('userLeave', userLeave);
            bot.on('djAdvance', djAdvance);
            bot.on('djLeave', djLeave);
            bot.on('voteUpdate', voteUpdate);
            bot.on('curateUpdate', curateUpdate);
        });
    },

    commands: doCommand
};

module.exports = baseBot;
