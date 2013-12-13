﻿var fs = require('fs');
var extend = require('./node.extend');
var util = require('util');
var startTime = new Date();
var debug = true;
var newCount = 0;

//Since Plug.dj cuts off chat messages at 250 characters, you can choose to have your bot split up chat messages into multiple lines:
//bot.multiLine = true; // Set to true to enable multiline chat. Default is false
//bot.multiLineLimit = 5; // Set to the maximum number of lines the bot should split messages up into. Any text beyond this number will just be omitted.

if (!debug) {
    /* to hopefully keep bot from crashing */
    process.on('uncaughtException', function (err) {
        botSpeak('console', getTimestamp() + ' Caught : ' + err);
    });
}

var bot = null;
var config = null;
var plugRoom = {
    userList: {},
};

var User = function () {
    //username = '';  //status = 0; //language = ''; //dateJoined = ''; //djPoints = 0; //fans = 0; //listenerPoints = 0; //avatarID = 0; //curatorPoints = 0; //permission = 0; //staffRank = ''; //lastActivity = '';
    this.id = '';
    this.username = '';
    this.status = 0;
    this.language = '';
    this.dateJoined = '';
    this.djPoints = 0;
    this.fans = 0;
    this.listenerPoints = 0;
    this.avatarID = 0;
    this.curatorPoints = 0;
    this.permission = 0;
    this.staffRank = '';
    this.isDj = false;
    this.onWait = false;
    this.noPlays = 0;
    this.lastActivity = '';
};
var Song = function () {
    this.djId = '';
    this.djName = '';
    this.title = '';
    this.artist = '';
    this.duration = '';
    this.score = { 'woots': 0, 'mehs': 0, 'grabs': 0 };
    this.newTrack = 0;
};

var currentSong = new Song();
var escortId = null;
var newCount = 0;

//internal functions
function getUserName(userid) {
    var user = bot.getUser(userid);
    var username = user.username;
    return username;
};
function getUpTime() {
    var startTime = config.startTime;
    var cur = new Date() - startTime;
    var days = Math.floor(cur / 86400000);
    cur = cur % 86400000;
    var hours = Math.floor(cur / 3600000);
    cur = cur % 3600000;
    var minutes = Math.floor(cur / 60000);
    cur = cur % 60000;
    var response = 'uptime: ';
    if (days > 0) {
        response += days + 'd:';
    }
    var response = (response + hours + 'h:' + minutes + 'm:' + Math.floor(cur / 1000) + 's.');
    return response;
};
function getTimestamp() {
    var timestamp = '';
    var now = new Date();
    var mm = now.getMonth() + 1; //January is 0!
    var dd = now.getDate();
    var yyyy = now.getFullYear();
    if (dd < 10) { dd = '0' + dd; }
    if (mm < 10) { mm = '0' + mm; }
    today = mm + '/' + dd + '/' + yyyy;
    var hour = now.getHours();
    var minute = now.getMinutes();
    var second = now.getSeconds();
    timestamp = mm + "-" + dd + "-" + yyyy + " " + hour + ":" + minute + ":" + second;
    return timestamp;
};
function getTimeShort() {
    var timestamp = '';
    var now = new Date();
    var hour = now.getHours();
    var minute = now.getMinutes();
    var second = now.getSeconds();
    timestamp = hour + ":" + minute + ":" + second;
    return timestamp;
};
function getIdleTime(userid) {
    var idleTime;
    try {
        var now = new Date();
        var userObj = plugRoom.userList[userid];
        var lastActivity = userObj.lastActivity;
        var diffMS = now - lastActivity;
        var diff = new Date(diffMS);
        if (diff.getUTCHours() > 0) {
            idleTime = timeFormat(diff.getUTCHours()) + ":" + timeFormat(diff.getUTCMinutes()) + ":" + timeFormat(diff.getUTCSeconds());
        } else {
            idleTime = timeFormat(diff.getUTCMinutes()) + ":" + timeFormat(diff.getUTCSeconds());
        }
    } catch (e) {
        console.log(e.message);
    }

    return idleTime;
};
function randomBop() {
    var min = 15000;
    var max = 45000;
    var rand = Math.floor(Math.random() * (max - min + 1)) + min;
    setTimeout(function () { bot.woot(); }, rand);
};
function timeFormat(num) {
    return (num < 10) ? "0" + num : num;
};
function dateDiff(inputDate) {
    var now = new Date();
    var input = new Date(inputDate);
    var diffMS = input - now;
    if (toString.call(diffMS) == "[object Number]" && diffMS != +diffMS) {
        throw "input date was not valid";
    }

    var totalsecs = diffMS / 1000;
    var totalmins = totalsecs / 60;
    var totalhours = totalmins / 60;
    var totaldays = totalhours / 24;
    var diffsecs = totalsecs % 60;
    var diffmins = totalmins % 60;
    var diffhours = totalhours % 24;
    var diffdays = totalhours / 24;

    return {
        secs: Math.floor(diffsecs),
        mins: Math.floor(diffmins),
        hours: Math.floor(diffhours),
        days: Math.floor(diffdays)
    };
};
function getGetOrdinal(n) {
    var s = ["th", "st", "nd", "rd"],
       v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
function convNumToEmoji(myNum) {
    myNum = myNum + '';
    var nums = myNum.split('');
    var str = '';
    for (var i = 0; i < nums.length; i++) {
        var tempNum = parseInt(nums[i], 10);
        switch (tempNum) {
            case 0: str = str + ':zero:'; break;
            case 1: str = str + ':one:'; break;
            case 2: str = str + ':two:'; break;
            case 3: str = str + ':three:'; break;
            case 4: str = str + ':four:'; break;
            case 5: str = str + ':five:'; break;
            case 6: str = str + ':six:'; break;
            case 7: str = str + ':seven:'; break;
            case 8: str = str + ':eight:'; break;
            case 9: str = str + ':nine:'; break;
        }
    }
    return str;
}
function loadUserList() {
    var users = bot.getUsers();
    for (var i in users) {
        var user = users[i];
        userJoin(user, true);
    }
    return true;
};
function updateWaitList() {
    var str = '';
    var loopcnt = 0;
    var waitList = bot.getWaitList();
    for (var i in waitList) {
        plugRoom.userList[waitList[i].id].onWait = true;
    }
    return true;
};
function getUserList() {
    var str = '';
    var now = new Date();
    var loopcnt = 0;
    for (var i in plugRoom.userList) {
        var user = new User();
        user = plugRoom.userList[i];
        var idleTime = getIdleTime(user.id);
        loopcnt = loopcnt + 1;
        str = str + util.format('%s%s(%s):%s ', convNumToEmoji(loopcnt), user.username, user.language, idleTime);
    }
    return loopcnt + " users: " + str;
};
function getCurrentStaff() {
    var response = 'Current staff: ';
    var loopcnt = 0;
    for (i in plugRoom.userList) {
        loopcnt = loopcnt += 1;
        if (plugRoom.userList[i].staffRank != '') {
            response = response + util.format('%s%s:%s ', convNumToEmoji(loopcnt), plugRoom.userList[i].username, plugRoom.userList[i].staffRank);
        }
    }
    return response;
};
function getCurrentWaitList() {
    var response = 'Wait list: ';
    var loopcnt = 0;
    if (plugRoom.userList.length > 0) {
        for (var i in plugRoom.userList) {
            var user = new User();
            user = plugRoom.userList[i];
            var idleTime = getIdleTime(user.id);
            if (user.onWait) {
                loopcnt = loopcnt += 1;
                response = response + util.format('%s%s:%s', convNumToEmoji(loopcnt), user.username, idleTime);
            }
        }
    } else {
        response = "No wait list at this time.";
    }
    return response;
};
function getTrackTime(seconds) {
    var timeMs = new Date(seconds * 1000);
    var trackTime;
    trackTime = timeFormat(timeMs.getUTCMinutes()) + ":" + timeFormat(timeMs.getUTCSeconds());
    return trackTime;
};

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
};

//db queries - inserts/updates
function addBotlogToDb(userid, text) {
    //    
    if (config.usedb) {
        client.query('INSERT INTO ' + config.botName + 'botlog SET userid = ?, text = ?', [userid, text]);
    }
}
function updateUser(user) {
    if (config.usedb) {
        //.id = '';.username = '';.status = 0;.language = '';.dateJoined = '';.djPoints = 0;.fans = 0;.listenerPoints = 0;.avatarID = 0;.curatorPoints = 0;
        //this.permission = 0;.staffRank = '';.isDj = false;.onWait = false;.noPlays = 0;.lastActivity = '';

        var cmd = "SELECT id FROM " + config.botName + "users WHERE (id = '" + user.id + "')";
        client.query(cmd, function select(err, results) {
            if (err) {
                botSpeak('console', err + " updateUser");
            }
            if ((results) && (results.length > 0) && (results.length !== undefined)) {
                //<{id: }>,<{username: }>,<{language: }>,<{djPoints: }>,<{fans: }>,<{listenerPoints: }>,<{avatarid: }>,{curatorPoints: }>,<{lastActivity: }>
                client.query('UPDATE ' + config.botName + 'users SET username = ?, language = ?, djPoints = ?, fans = ?, listenerPoints = ?, avatarid = ?, curatorPoints = ?, lastActivity = ? WHERE (id = ?)',
                    [user.username, user.language, user.djPoints, user.fans, user.listenerPoints, user.avatarid, user.curatorPoints, user.lastActivity, user.id],
                    function (err, results) {
                        if (err) {
                            botSpeak('console', err + " updateUsers");
                        }
                    });
            } else {
                //<{id: }>,<{username: }>,<{language: }>,<{dateJoined: }>,<{djPoints: }>,<{fans: }>,<{listenerPoints: }>,<{avatarid: }>,{curatorPoints: }>,<{lastActivity: }>
                client.query('INSERT INTO ' + config.botName + 'users SET id = ?, username = ?, language = ?, dateJoined = ?, djPoints = ?, fans = ?, listenerPoints = ?, avatarid = ?, curatorPoints = ?, lastActivity = ?',
                    [user.id, user.username, user.language, user.dateJoined, user.djPoints, user.fans, user.listenerPoints, user.avatarid, user.curatorPoints, user.lastActivity]);
            }
        });
    }
};
function addSongToDb(song) {
    if (config.usedb) {
        if (song.songTitle != '') {
            client.query('INSERT INTO ' + config.botName + 'songs SET title = ?, artist = ?, duration = ?, userid = ?, username = ?, woots = ?, mehs = ?, grabs = ?, newtrack = ?', [song.title, song.artist, song.duration, song.djId, song.djName, song.score.woots, song.score.mehs, song.score.grabs, song.newTrack]);
        }
    }
}

//db queries - select
function getSmoke() {
    if (config.usedb) {
        var cmdget = "SELECT text FROM " + config.botName + "smoke ORDER BY rand() LIMIT 1";
        client.query(cmdget, function (err, results, fields) {
            if (err) {
                console.log(err + " getSmoke");
            }
            if (results) {
                var text = results[0]['text'];
                botSpeak('chat', ':herb:SMOKE IT IF YOU GOT IT!:herb: ' + text);
            }
        });
    }
};
function getTeachme() {
    if ((config.usedb) && (config.sexy)) {
        var cmdget = "SELECT text FROM " + config.botName + "teachme ORDER BY rand() LIMIT 1";
        client.query(cmdget, function (err, results, fields) {
            if (err) {
                botSpeak('console', err + " getTeachme");
            }
            if (results) {
                var text = results[0]['text'];
                botSpeak('chat', text);
            }
        });
    }
};
function getFunny() {
    if (config.usedb) {
        var cmdget = "SELECT text FROM " + config.botName + "funnyme ORDER BY rand() LIMIT 1";
        client.query(cmdget, function (err, results, fields) {
            if (err) {
                botSpeak('console', err + " getFunny");
            }
            if (results) {
                var text = results[0]['text'];
                botSpeak('chat', text);
            }
        });
    }
};
function getGay() {
    if (config.usedb) {
        var cmdget = "SELECT text FROM " + config.botName + "gay ORDER BY rand() LIMIT 1";
        client.query(cmdget, function (err, results, fields) {
            if (err) {
                botSpeak('console', err + " getGay");
            }
            if (results) {
                var text = results[0]['text'];
                botSpeak('chat', text)
            }
        });
    }
};
function getPersonalGreet(userid) {
    var min = 0;
    var max = null;
    if (config.usedb) {
        var cmd = "SELECT text FROM " + config.botName + "pgreets WHERE (userid = '" + userid + "') ORDER BY rand() LIMIT 1";
        client.query(cmd, function (err, results) {
            if (err) { botSpeak('console', err + " getPersonalGreet"); }
            if ((results) && (results.length > 0) && (results.length !== undefined)) {
                var text = results[0]['text'];
                setTimeout(function () { botSpeak('chat', text);; }, 2500);
            }
        });
    };
    botSpeak('chat', "@" + getUserName(userid) + " in tha house.  Welcome to the MnM.  Current theme is: " + config.roomTheme)
};
function getLastSongs() {
    var string = '';
    var limit = 3;
    if (config.usedb) {
        var cmd = "SELECT username, title, artist, duration, woots, mehs, grabs, newtrack FROM " + config.botName + "songs ORDER BY `timestamp` DESC LIMIT " + limit;
        client.query(cmd, function (err, results, fields) {
            if (err) {
                botSpeak('console', err + " getLastSongs");
            }
            if (results) {
                var song = new Song();

                for (var i = 0; i < limit; i++) {
                    song.djName = results[i]['username'];
                    song.title = results[i]['title'];
                    song.artist = results[i]['artist'];
                    song.duration = getTrackTime(results[i]['duration']);
                    song.score.woots = results[i]['woots'];
                    song.score.mehs = results[i]['mehs'];
                    song.score.grabs = results[i]['grabs'];
                    if (results[i]['newTrack']) {
                        song.newTrack = 'Y';
                    } else {
                        song.newTrack = 'N';
                    }
                    string = string + util.format('%s %s played "%s" by %s %s, %d⇑ %d⇓ %d♥s; new= ', convNumToEmoji(i + 1), song.djName, song.title, song.artist, song.duration, song.score.woots, song.score.mehs, song.score.grabs, song.newTrack);
                }
                botSpeak('chat', string);
            }
        });
    } else {
        botSpeak('chat', "Sorry I've got nothing right now.");
    }
};
function getMyStats(userid) {
    if (config.usedb) {
        var cmd = "SELECT " + config.botName + "users.username, round((SUM(woots)/COUNT(title)),2) AS avg, COUNT(" + config.botName + "songs.title) AS plays, "
        + "SUM(" + config.botName + "songs.woots) AS woots, SUM(" + config.botName + "songs.mehs) AS mehs, SUM(" + config.botName + "songs.grabs) AS grabs, ROUND(SUM(duration) / 60, 2) AS hours, "
        + "" + config.botName + "songs.userid FROM " + config.botName + "songs INNER JOIN " + config.botName + "users ON " + config.botName + "songs.userid = " + config.botName + "users.id "
        + "WHERE (" + config.botName + "users.id <> '" + config.userid + "') "
        + "GROUP BY " + config.botName + "users.id ORDER BY woots DESC";
        client.query(cmd, function (err, results) {
            if (err) {
                botSpeak('console', err + " getMyStats");
            }
            if (results) {
                for (i = 0; i < results.length; i++) {
                    if (userid === results[i].userid) {
                        var name = results[i]['username'];
                        var plays = results[i]['plays'];
                        var playhours = getTrackTime(results[i]['hours']);
                        var woots = results[i]['woots'];
                        var mehs = results[i]['mehs'];
                        var grabs = results[i]['grabs'];
                        var avg = results[i]['avg'];
                        response = util.format('%s you are ranked %s with %s plays, %s playhours, votes: %sW %sM %sGs, averaging %s W/play (ranked by Wtotal since ' + config.openDate + ')', name, convNumToEmoji(i + 1), plays, playhours, woots, mehs, grabs, avg);
                        botSpeak('chat', response);
                    }
                }
            } else {
                botSpeak('chat', "Sorry no results.");
            }
        });
    }
};
function getTopDjs(where, userid) {
    if (config.usedb) {
        var limit = 7;
        var response = '';
        var cmd = "SELECT " + config.botName + "users.id, " + config.botName + "users.username, COUNT(" + config.botName + "songs.title) AS plays, SUM(" + config.botName + "songs.woots) AS woots, SUM(" + config.botName + "songs.mehs) AS mehs, "
        + "SUM(" + config.botName + "songs.grabs) AS grabs, " + config.botName + "songs.userid FROM " + config.botName + "songs INNER JOIN " + config.botName + "users ON " + config.botName + "songs.userid = " + config.botName + "users.id WHERE (" + config.botName + "songs.userid "
        + "<> '" + config.userid + "') GROUP BY " + config.botName + "songs.userid ORDER BY woots DESC LIMIT " + limit;
        client.query(cmd, function (err, results, fields) {
            if (err) {
                botSpeak('console', err + " getTopDjs");
            }
            if (results.length > 0) {
                for (i = 0; i < limit; i++) {
                    var username = results[i]['username'];
                    var plays = results[i]['plays'];
                    var woots = results[i]['woots'];
                    var mehs = results[i]['mehs'];
                    var grabs = results[i]['grabs'];
                    response = response + util.format('%s %s %splays %sW %sM %sGs. ', convNumToEmoji(i + 1), username, plays, woots, mehs, grabs);
                }
                botSpeak(where, response + 'in ' + config.roomName + '(since ' + config.openDate + ', not counting '
                + config.botName + ' plays) sorted by woots', userid);
            } else {
                botSpeak(where, "Sorry no results.", userid);
            }
        });
    }
};


//// ============= EVENT FUNCTIONS ==================
function selfCommand(command, param) {
    var who = {
        isOwner: true,
        isJBIRD: true,
        isSelf: true,
        isStaff: true
    };
    var commandObj = {
        'command': command,
        'param': param,
        'who': who
    };
    doCommand(commandObj);
};

//updates on events
function updateScore() {
    var score = bot.getRoomScore();
    currentSong.score.woots = score.positive;
    currentSong.score.mehs = score.negative;
    currentSong.score.grabs = score.curates;
};
function voteUpdate(vote) {
    updateScore();
    updateUserLastActivity(vote.id);
};
function userChatted(userid) {
    updateUserLastActivity(userid);
};
function curateUpdate(userid) {
    updateScore();
    updateUserLastActivity(userid.id);
};
function updateUserLastActivity(userid) {
    try {
        plugRoom.userList[userid].lastActivity = new Date();
    } catch (e) {
        console.log(e.message);
    }
};

//permissions
var isOfStaff = function (userid) {
    var staff = false;
    if (plugRoom.userList[userid].permission > 0) {
        staff = true;
    } else {
        staff = false;
    }
    return staff;
};

//room events
function onConnected(data) {
    botSpeak('console', config.botName + " has connected.");
};
function onRoomJoin(data) {
    if (config.usedb) {
        addBotlogToDb(config.userid, config.botName + '********bot started.********');
    }
    botSpeak('console', config.botName + " has joined room: " + data.room.id);
    if (loadUserList()) {
        if (updateWaitList()) {
            //load currentSong
            if (data.room.currentDJ != null) {
                currentSong.djId = data.room.currentDJ;
                currentSong.djName = getUserName(data.room.currentDJ);
                currentSong.title = data.room.media.title;
                currentSong.artist = data.room.media.author;
                currentSong.duration = data.room.media.duration;
                updateScore();
            }
        }
    }
    if (config.autobop) {
        randomBop();
    }
};
function userJoin(user, quiet) {
    // add/update user in db.users
    updateUser(user);

    var newUser = new User();
    //username = '';  //status = 0; //language = ''; //dateJoined = ''; //djPoints = 0; //fans = 0; //listenerPoints = 0; //avatarID = 0; //curatorPoints = 0; //permission = 0; //lastActivity = '';
    newUser.id = user.id;
    newUser.username = user.username;
    newUser.status = user.status;
    newUser.language = user.language;
    newUser.dateJoined = user.dateJoined;
    newUser.djPoints = user.djPoints;
    newUser.fans = user.fans;
    newUser.listenerPoints = user.listenerPoints;
    newUser.avatarID = user.avatarID;
    newUser.curatorPoints = user.curatorPoints;
    newUser.permission = user.permission;
    newUser.lastActivity = new Date();
    switch (newUser.permission) {
        case 10: //ADMIN
            newUser.staffRank = 'Admin';
            break;
        case 8: //AMBASSADOR
            newUser.staffRank = 'Ambassador';
            break;
        case 5: //HOST
            newUser.staffRank = 'Host';
            break;
        case 4: //COHOST
            newUser.staffRank = 'Co-Host';
            break;
        case 3: //MANAGER
            newUser.staffRank = 'Manager';
            break;
        case 2: //BOUNCER
            newUser.staffRank = 'Bouncer';
            break;
        case 1: //RESIDENTDJ
            newUser.staffRank = 'Resident DJ';
            break;
        default:
            newUser.staffRank = '';
    }

    plugRoom.userList[newUser.id] = newUser;

    if (config.pgreets && !quiet) {
        // greet user, get pgreet from database
        getPersonalGreet(newUser.id);
    }
    return true;
};
function userLeave(user) {
    // update user in db.users
    delete plugRoom.userList[user.id];
};
function djAdvance(data) {
    // add currentSong to db. (last track played at this point).
    addSongToDb(currentSong);
    if (config.pgreets) {
        botSpeak('chat', util.format('%s played %s Votes: %d:+1: %d:-1: %d:heart:', currentSong.djName, currentSong.title, currentSong.score.woots, currentSong.score.mehs, currentSong.score.grabs));
    }
    plugRoom.userList[currentSong.djId].isdj = false;

    if (updateWaitList()) {
        currentSong.djId = data.currentDJ;
        currentSong.djName = getUserName(data.currentDJ);
        currentSong.title = data.media.title;
        currentSong.artist = data.media.author;
        currentSong.duration = data.media.duration;
        currentSong.score = { 'woots': 0, 'mehs': 0, 'grabs': 0 };
        currentSong.newTrack = 0;

        plugRoom.userList[data.currentDJ].isDj = true;
        plugRoom.userList[data.currentDJ].noPlays += 1;
    }
    if (config.autobop) {
        randomBop();
    }

};
function userSkip() {
    consol.log()
};
function onChat(chatItem) {
    //fromID: 'user id'   //message: 'message text'   //from: 'username'   //type: 'message type'   //chatID: 'chat id'
    userChatted(chatItem.fromID);

    if (config.pgreets && config.games) {
        //if (text.match(/flyby/i)) botSpeak('chat', "Negative, Ghost Rider, the pattern is full.");
        //if (text.match(/ARMAGEDDON/i)) botSpeak('chat', "RAGGID GET OUTTA THERE! http://youtu.be/cTrOb8zyrZk");
        //if (text.match(/sweet/i)) botSpeak('chat', "http://stream1.gifsoup.com/view3/3633922/sweet-brown-o.gif");
        if (chatItem.message.match(/cock/i)) botSpeak('chat', "8=====D");
        if (chatItem.message.match(/mulva/i)) botSpeak('chat', "Which would you like? (|) or (O)");
        if (chatItem.message.match(/skeet/i)) botSpeak('chat', "8==:fist:==D:sweat_drops::relieved:");
    }

    var isOwner = (chatItem.fromID === config.botOwner);
    var isJBIRD = (chatItem.fromID === config.JBIRD);
    var isSelf = (chatItem.fromID === config.userid);
    var isStaff = isOfStaff(chatItem.fromID);

    var greetings = config.botGreetings;
    var result;

    for (var i = 0, len = greetings.length; i < len; i++) {
        var pattern = new RegExp('(^' + greetings[i] + ')(.*?)( .*)?$');
        result = chatItem.message.match(pattern);
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

    if (chatItem.type == 'emote') {
        botSpeak('chat', chatItem.message);
    }
};

function doCommand(commandObj) {
    var userid = commandObj.userid;
    var username = getUserName(userid);
    var who = commandObj.who;
    var spkr = {
        isOwner: false,
        isJBIRD: false,
        isStaff: false,
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

    switch (commandObj.command) {
        //ANYONE COMMANDS  /////////////////////////////////////////////////////////////////////////////////////////////
        case 'commands':
            botSpeak(where, "ANYONE: "
                + config.botCall + "list, "
                + config.botCall + "current, "
                + config.botCall + "tools, "
                + config.botCall + "userlist, "
                + config.botCall + "staff, "
                + config.botCall + "theme, "
                + config.botCall + "dance, "
                + config.botCall + "zombies, "
                + config.botCall + "fliptable, "
                + config.botCall + "fixtable, "
                + config.botCall + "boobies, "
                + config.botCall + "racist, "
                + config.botCall + "emoji, "
                + config.botCall + "whoo, "
                + config.botCall + "search X, "
                + config.botCall + "google, "
                + config.botCall + "teachme, "
                + config.botCall + "funnyme, "
                + config.botCall + "gay, "
                + config.botCall + "last, "
                + config.botCall + "mystats, "
                + config.botCall + "topdjs, "        
            

                //+ config.botCall + "XXXXXXXX, "
            );
            if (spkr.isStaff) {
                botSpeak(where, "STAFF: "
                    + config.botCall + "uptime, "
                    + config.botCall + "settheme X, "
                    + config.botCall + "setgames (true/false), "
                    + config.botCall + "setsexy (true/false), "

                    //+ config.botCall + "XXXXXXXX, "
                );
            }
            break;
        case 'list':
            botSpeak(where, getCurrentWaitList());
            break;
        case 'current':
            var string = util.format('%s is playing "%s" by %s length %s. Votes: %d:+1: %d:-1: %d:heart:',
            currentSong.djName, currentSong.title, currentSong.artist, getTrackTime(currentSong.duration), currentSong.score.woots, currentSong.score.mehs,
            +currentSong.score.grabs, currentSong.newTrack);
            botSpeak(where, string);
            break;
        case 'tools':
            botSpeak(where, "Here are tools for using plug and Mix-N-Mash: http://bit.ly/186fpWD");
            break;
        case 'dance':
            if (config.danceMode) bot.woot();
            break;
        case 'zombies':
            if (config.games) {
                botSpeak(where, '٩(๏๏)۶٩(××)۶٩(●•)۶');
            }
            break;
        case 'fliptable':
            if (config.games) {
                botSpeak(where, '(ノಠ益ಠ)ノ彡┻━┻');
            }
            break;
        case 'fixtable':
            if (config.games) {
                botSpeak(where, '┬─┬ノ( º _ ºノ)');
            }
            break;
        case 'boobies':
            if (config.games) {
                botSpeak(where, "( • Y • )");
            }
            break;
        case 'racist':
            if (config.games) {
                botSpeak(where, "https://dl.dropboxusercontent.com/u/55722261/MnM/ThatsRacist.gif");
            }
            break;
        case 'search':
            var searchQuery = param;
            //replace the most common special characters and turn spaces into +
            searchQuery = searchQuery.replace(/\'/g, "%27").replace(/;/g, "%3B").replace(/#/g, "%23").replace(/@/g, "%40").replace(/&/g, "%26").replace(/</g, "%3C").replace(/>/g, "%3E").replace(/=/g, "%3D").replace(/\+/g, "%2B");
            //replace spaces with +
            searchQuery = searchQuery.split(' ').join('+');
            botSpeak(where, param + " search: https://www.google.com/search?q=" + searchQuery);
            break;
        case 'theme':
            botSpeak(where, "Current theme is: " + config.roomTheme);
            break;
        case 'emoji':
            botSpeak(where, "http://www.emoji-cheat-sheet.com/");
            break;
        case 'whoo':
            botSpeak(where, "WoWOOOOOOO!");
            break;
        case 'google':
            var searchQuery = currentSong.artist + " " + currentSong.title;
            //replace the most common special characters to +
            searchQuery = searchQuery.replace(/\'/g, "%27").replace(/;/g, "%3B").replace(/#/g, "%23").replace(/@/g, "%40").replace(/&/g, "%26").replace(/</g, "%3C").replace(/>/g, "%3E").replace(/=/g, "%3D").replace(/\+/g, "%2B");
            //replace spaces with +
            searchQuery = searchQuery.split(' ').join('+');
            botSpeak(where, currentSong.artist + " " + currentSong.title + ": https://www.google.com/search?q=" + searchQuery, commandObj.pmID);
            break;
        case 'userlist':
            botSpeak(where, getUserList());
            break;
        case 'staff':
            botSpeak(where, getCurrentStaff());
            break;


            //db commands/////////////////////////////////////////////////////////////////////////////////////////////
        case 'smoke':
            if (config.danceMode) {
                bot.woot();
                getSmoke();
            }
            break;
        case 'teachme':
            if (config.games) {
                getTeachme();
            }
            break;
        case 'funnyme':
            if (config.games) {
                getFunny();
            }
            break;
        case 'gay':
            if (config.games) {
                getGay();
            }
            break;
        case 'last':
            getLastSongs();
            break;
        case 'mystats':
            if (config.usedb) {
                getMyStats(userid);
            }
            break;
        case 'topdjs':
            if (config.usedb) {
                if (commandObj.where === 'chat') {
                    getTopDjs(where, commandObj.data.userid);
                } else if (commandObj.where === 'pm') {
                    getTopDjs(where, commandObj.data.senderid);
                }
            }
            break;

            //staff rights/////////////////////////////////////////////////////////////////////////////////////////////
        case 'uptime':
            if (spkr.isStaff || spkr.isOwner || spkr.isJBIRD) {
                botSpeak(where, getUpTime(), commandObj.pmID);
            } else {
                botSpeak(where, "I'm sorry that is a big kid's command.");
            }
            break;
        case 'settheme': settheme, setgames, setsexy
            if (spkr.isStaff || spkr.isOwner || spkr.isJBIRD) {
                config.roomTheme = param;
                botSpeak(where, 'Theme set to: ' + config.roomTheme);
                botSpeak('console', getTimestamp() + ' roomTheme set to: ' + config.roomTheme + " by: " + getUserName(commandObj.data.senderid, "theme"));
            } else {
                botSpeak(where, "I'm sorry that is a big kid's command.");
            }
            break;
        case 'setgames':
            if (spkr.isStaff || spkr.isOwner || spkr.isJBIRD) {
                config.games = param;
                botSpeak(where, "Games set to: " + config.games);
            } else {
                botSpeak(where, "I'm sorry that is a big kid's command.");
            }
            break;
        case 'setsexy':
            if (spkr.isStaff || spkr.isOwner || spkr.isJBIRD) {
                config.sexy = param;
                botSpeak(where, "sexy Mode set to: " + config.sexy);
            } else {
                botSpeak(where, "I'm sorry that is a big kid's command.");
            }
            break;

    }
};

//// ============= EXPORTED BOT ==================

var baseBot = {

    currVotes: { 'up': 0, 'down': 0 },

    init: function (botObj) {
        bot = botObj.bot;
        config = botObj.config;

        bot.on('connected', onConnected);
        bot.on('roomJoin', onRoomJoin);
        bot.on('chat', onChat);
        bot.on('userJoin', userJoin);
        bot.on('userLeave', userLeave);
        bot.on('djAdvance', djAdvance);
        //bot.on('modMoveDJ', modMoveDJ);
        bot.on('voteUpdate', voteUpdate);
        bot.on('curateUpdate', curateUpdate);


    },

    commands: doCommand
};

module.exports = baseBot;