// vim: set expandtab ts=4 sw=4:
var fs = require('fs');
var _ = require('./underscore');
var extend = require('./node.extend');
var util = require('util');
var entities = require('entities');
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

var bot = null;
var config = null;
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
            console.log(user);
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

var User = function (user) {
    //username = '';  //status = 0; //language = ''; //dateJoined = ''; //djPoints = 0; //fans = 0; //listenerPoints = 0; //avatarID = 0; //curatorPoints = 0; //permission = 0; //lastActivity = '';

    this.id = user.id;
    this.username = user.username;
    this.status = user.status;
    this.language = user.language;
    this.dateJoined = user.dateJoined;
    this.djPoints = user.djPoints;
    this.fans = user.fans;
    this.listenerPoints = user.listenerPoints;
    this.avatarID = user.avatarID;
    this.curatorPoints = user.curatorPoints;
    this.permission = user.permission;
    this.lastActivity = new Date();
    this.onWait = false;
    this.isDj = false;
    this.noPlays = 0;
    this.escort = false;
    switch (this.permission) {
        case 10: //ADMIN
            this.staffRank = 'Admin';
            break;
        case 8: //AMBASSADOR
            this.staffRank = 'Ambassador';
            break;
        case 5: //HOST
            this.staffRank = 'Host';
            break;
        case 4: //COHOST
            this.staffRank = 'Co-Host';
            break;
        case 3: //MANAGER
            this.staffRank = 'Manager';
            break;
        case 2: //BOUNCER
            this.staffRank = 'Bouncer';
            break;
        case 1: //RESIDENTDJ
            this.staffRank = 'Resident DJ';
            break;
        default:
            this.staffRank = '';
    }
};
var Song = function () {
    this.id = '';
    this.djId = '';
    this.djName = '';
    this.title = '';
    this.artist = '';
    this.duration = '';
    this.score = { 'woots': 0, 'mehs': 0, 'grabs': 0 };     //Votes: %d:+1: %d:-1: %d:heart:
    this.newTrack = 0;
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
    response = (response + hours + 'h:' + minutes + 'm:' + Math.floor(cur / 1000) + 's.');
    return response;
}
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
}
function getTimeShort() {
    var timestamp = '';
    var now = new Date();
    var hour = now.getHours();
    var minute = now.getMinutes();
    var second = now.getSeconds();
    timestamp = hour + ":" + minute + ":" + second;
    return timestamp;
}
function getIdleTime(userid) {
    var idleTime;
    try {
        var now = new Date();
        var userObj = plugRoom.getUser(userid);
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
}
function randomBop() {
    var min = 15000;
    var max = 45000;
    var rand = Math.floor(Math.random() * (max - min + 1)) + min;
    setTimeout(function () { bot.woot(); }, rand);
}
function timeFormat(num) {
    return (num < 10) ? "0" + num : num;
}
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
}
function getGetOrdinal(n) {
    var s = ["th", "st", "nd", "rd"],
       v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
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
function getUserList() {
    var str = '';
    var now = new Date();
    var loopcnt = 0;
    for (var i in plugRoom.userList) {
        var user = plugRoom.userList[i];
        var idleTime = getIdleTime(user.id);
        loopcnt = loopcnt + 1;
        str = str + util.format('%s%s(%s):%s ', convNumToEmoji(loopcnt), user.username, user.language, idleTime);
    }
    return loopcnt + " users: " + str;
}
function getCurrentWaitList() {
    var response = 'Wait list: ';
    var loopcnt = 0;
    var waitlist = bot.getWaitList();
    if (waitlist.length > 0) {
        for (var i in waitlist) {
            var user = waitlistt[i];
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
}
function getTrackTime(seconds) {
    var timeMs = new Date(seconds * 1000);
    var trackTime;
    trackTime = timeFormat(timeMs.getUTCMinutes()) + ":" + timeFormat(timeMs.getUTCSeconds());
    return trackTime;
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
            str = str + util.format('%s %s has %d:musical_note:', convNumToEmoji(num), name, plays);
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
}
function addSongToDb(song) {
    if (config.usedb) {
        if (song.songTitle !== '') {
            client.query('INSERT INTO ' + config.botName + 'songs SET title = ?, artist = ?, duration = ?, userid = ?, username = ?, woots = ?, mehs = ?, grabs = ?, newtrack = ?', [song.title, song.artist, song.duration, song.djId, song.djName, song.score.woots, song.score.mehs, song.score.grabs, song.newTrack]);
        }
    }
}

//db queries - select
function getSmoke() {
    var text = "";
    if (config.usedb) {
        var cmdget = "SELECT text FROM " + config.botName + "smoke ORDER BY rand() LIMIT 1";
        client.query(cmdget, function (err, results, fields) {
            if (err) {
                console.log(err + " getSmoke");
            }
            if (results) {
                var text = results[0].text;
            }
        });
    }
    botSpeak('chat', ':herb:SMOKE IT IF YOU GOT IT!:herb: ' + text);
}
function getTeachme() {
    if ((config.usedb) && (config.sexy)) {
        var cmdget = "SELECT text FROM " + config.botName + "teachme ORDER BY rand() LIMIT 1";
        client.query(cmdget, function (err, results, fields) {
            if (err) {
                botSpeak('console', err + " getTeachme");
            }
            if (results) {
                var text = results[0].text;
                botSpeak('chat', text);
            }
        });
    }
}
function getFunny() {
    if (config.usedb) {
        var cmdget = "SELECT text FROM " + config.botName + "funnyme ORDER BY rand() LIMIT 1";
        client.query(cmdget, function (err, results, fields) {
            if (err) {
                botSpeak('console', err + " getFunny");
            }
            if (results) {
                var text = results[0].text;
                botSpeak('chat', text);
            }
        });
    }
}
function getGay() {
    if (config.usedb) {
        var cmdget = "SELECT text FROM " + config.botName + "gay ORDER BY rand() LIMIT 1";
        client.query(cmdget, function (err, results, fields) {
            if (err) {
                botSpeak('console', err + " getGay");
            }
            if (results) {
                var text = results[0].text;
                botSpeak('chat', text);
            }
        });
    }
}
function getPersonalGreet(user) {
    var min = 0;
    var max = null;
    if (config.usedb) {
        var cmd = "SELECT text FROM " + config.botName + "pgreets WHERE (userid = '" + user.id + "') ORDER BY rand() LIMIT 1";
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

function getLastSongs() {
    var string = '';        //Votes: %d:+1: %d:-1: %d:heart:     :musical_note:
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
                    song.djName = results[i].username;
                    song.title = results[i].title;
                    song.artist = results[i].artist;
                    song.duration = getTrackTime(results[i].duration);
                    song.score.woots = results[i].woots;
                    song.score.mehs = results[i].mehs;
                    song.score.grabs = results[i].grabs;
                    if (results[i].newTrack) {
                        song.newTrack = 'Y';
                    } else {
                        song.newTrack = 'N';
                    }
                    string = string + util.format('%s %s played "%s" by %s %s, %d:+1: %d:-1: %d:heart:, new= ', convNumToEmoji(i + 1), song.djName, song.title, song.artist, song.duration, song.score.woots, song.score.mehs, song.score.grabs, song.newTrack);
                }
                botSpeak('chat', string);
            }
        });
    } else {
        botSpeak('chat', "Sorry I've got nothing right now.");
    }
}
function getMyStats(userid) {
    if (config.usedb) {     //Votes: %d:+1: %d:-1: %d:heart:
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
                        var name = results[i].username;
                        var plays = results[i].plays;
                        var playhours = getTrackTime(results[i].hours);
                        var woots = results[i].woots;
                        var mehs = results[i].mehs;
                        var grabs = results[i].grabs;
                        var avg = results[i].avg;
                        response = util.format('%s you are ranked %s with %s:musical_note:, %s playhours, Votes: %d:+1: %d:-1: %d:heart:, averaging %s :+1:/play (ranked by :+1:total since ' + config.openDate + ')', name, convNumToEmoji(i + 1), plays, playhours, woots, mehs, grabs, avg);
                        botSpeak('chat', response);
                    }
                }
            } else {
                botSpeak('chat', "Sorry no results.");
            }
        });
    }
}
function getTopDjs(where, userid) {
    if (config.usedb) {     //Votes: %d:+1: %d:-1: %d:heart:
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
                    var username = results[i].username;
                    //var plays = results[i]['plays'];
                    var woots = results[i].woots;
                    //var mehs = results[i]['mehs'];
                    //var grabs = results[i]['grabs'];
                    response = response + util.format('%s %s %d:+1: ', convNumToEmoji(i + 1), username, woots);
                }
                botSpeak(where, response + 'in ' + config.room + '(since ' + config.openDate + ', not counting ' + 
                         config.botName + ' :musical_note:) sorted by :+1:', userid);
            } else {
                botSpeak(where, "Sorry no results.", userid);
            }
        });
    }
}
function getNewStats(where, userid) {
    if (config.usedb) {
        var cmd = "SELECT DATE_FORMAT(`timestamp`, '%m/%d/%y') as dateplay, COUNT(title) AS plays, SUM(woots) AS woots, SUM(mehs) AS mehs, SUM(grabs) AS grabs " + 
            "FROM " + config.botName + "songs GROUP BY userid, Date(`timestamp`) HAVING (userid = '" + userid + "') ORDER BY dateplay DESC LIMIT 7";
        client.query(cmd, function (err, results, fields) {
            if (err) {
                botSpeak('console', err + " getNewStats");
            }
            if (results) {
                var totPlays = 0;
                var totWoots = 0;
                var totMehs = 0;
                var totGrabs = 0;
                var totAvg = 0;
                var response = '';
                for (i = 0; i < results.length; i++) {
                    var dateplay = results[i].dateplay;
                    var plays = parseInt(results[i]['plays'], 10);
                    var woots = parseInt(results[i]['woots'], 10);
                    var mehs = parseInt(results[i]['mehs'], 10);
                    var grabs = parseInt(results[i]['grabs'], 10);
                    var average = (woots / plays).toFixed(2, 10);
                    response = response + util.format('day %s%s: %s:musical_note: %d:+1: %d:-1: %d:heart: %s avg. ', convNumToEmoji(i), dateplay, plays, woots, mehs, grabs, average);
                    totPlays = totPlays + plays;
                    totWoots = totWoots + woots;
                    totMehs = totMehs + mehs;
                    totGrabs = totGrabs + grabs;
                }
                totAvg = (totWoots / totPlays).toFixed(2);
                var strTotal = util.format(getUserName(userid, "getNewStats") + " totals: " + results.length + "Days:%s plays, %d:+1: %d:-1: %d:heart: %d/play. ", totPlays, totWoots, totMehs, totGrabs, totAvg);
                botSpeak(where, strTotal + response);
            } else {
                botSpeak(where, "Sorry no results.");
            }
        });
    }
}
function getTodayStats(where, userid) {
    if (config.usedb) {
        var cmd = "SELECT date(" + config.botName + "songs.`timestamp`) as date, COUNT(" + config.botName + "songs.title) as plays, "
            + config.botName + "songs.userid, " + config.botName + "users.username, SUM(" + config.botName + "songs.woots) as woots, SUM("
            + config.botName + "songs.mehs) as mehs, SUM(" + config.botName + "songs.grabs) as grabs "
            + "FROM " + config.botName + "songs INNER JOIN " + config.botName + "users ON " + config.botName + "songs.userid = " + config.botName + "users.id "
            + "WHERE (" + config.botName + "songs.userid = '" + userid + "') AND (Date(" + config.botName + "songs.`timestamp`) = date(sysdate())) GROUP BY Date(" + config.botName + "songs.`timestamp`), userid ORDER BY Date(" + config.botName + "songs.`timestamp`) desc";
        client.query(cmd, function (err, results, fields) {
            if (err) {
                botSpeak('console', err + " getTodayStats");
            }
            if (results.length > 0) {
                var username = results[0].username;
                var plays = results[0].plays;
                var woots = results[0].woots;
                var mehs = results[0].mehs;
                var grabs = results[0].grabs;
                var average = (woots / plays).toFixed(2);
                var response = util.format('%s play history: %s:musical_note:, %d:+1: %d:-1: %d:heart: averaging %s:+1:/play. ', username, plays, woots, mehs, grabs, average);
                botSpeak(where, response, userid);
            } else {
                botSpeak(where, "Sorry no results. You have not played yet today.", userid);
            }
        });
    }
}
function getDjX(djRank, where, userid) {
    if (config.usedb) {
        var response = '';
        var cmd = "SELECT " + config.botName + "users.id, " + config.botName + "users.username, COUNT(" + config.botName + "songs.title) AS plays, SUM("
            + config.botName + "songs.woots) AS woots, SUM(" + config.botName + "songs.mehs) AS mehs, SUM(" + config.botName + "songs.grabs) AS grabs, "
            + config.botName + "songs.userid FROM " + config.botName + "songs INNER JOIN " + config.botName + "users ON " + config.botName + "songs.userid = "
            + config.botName + "users.id WHERE (" + config.botName + "songs.userid <> '" + config.userid + "') "
            + "GROUP BY " + config.botName + "songs.userid ORDER BY woots desc";
        client.query(cmd, function (err, results, fields) {
            if (err) {
                botSpeak('console', err + " getDjX");
            }
            if (results.length > 0) {
                for (i = 0; i < djRank - 1; i++) {
                    if (i = (djRank - 1)) {
                        var qryuserid = results[i].userid;
                        var username = results[i].username;
                        var plays = results[i].plays;
                        var woots = results[i].woots;
                        var mehs = results[i].mehs;
                        var grabs = results[i].grabs;
                        response = response + util.format('%s %s %s:musical_note: %d:+1: %d:-1: %d:heart:. ', convNumToEmoji(i + 1), username, plays, woots, mehs, grabs);
                    }
                }
                botSpeak(where, response + 'in ' + config.room + '(since ' + config.openDate + ', not counting ' + 
                         config.botName + ' :musical_note:) sorted by :+1:', userid);
            } else {
                botSpeak(where, "Sorry no results.", userid);
            }
        });
    }
}
function getTrackStats(where, userid, title, thistrack) {
    response = '';
    if (config.usedb) {
        if (title != 'Untitled') {
            client.query("SELECT COUNT(title) AS plays, SUM(woots) AS woots, SUM(mehs) AS mehs, SUM(grabs) AS grabs " + 
                         "FROM " + config.botName + "songs WHERE title = ? AND userid <> ?", [title, config.userid],
                    function select(err, results) {
                        if (err) {
                            botSpeak('console', err + " getTrackStats");
                        }
                        if (results[0].plays > 0) {
                            if (config.newMode) {
                                newCount = 0;
                                var plays = results[0].plays;
                                var woots = results[0].woots;
                                var mehs = results[0].mehs;
                                var grabs = results[0].grabs;
                                var average = (woots / plays).toFixed(2);
                                response = util.format('%s has %s:musical_note:, %d:+1: %d:-1: %d:heart: averaging %s:+1:/play (since ' + config.openDate + ', not counting ' + 
                                                       config.botName + ' plays).', currentSong.songTitle, plays, woots, mehs, grabs, average);
                                botSpeak(where, response, userid);
                            }
                        } else {
                            currentSong.newTrack = 1;
                            if (!thistrack) {
                                bot.vote('up');
                                newCount += 1;
                            } else {
                                response = "This is a track I've not heard yet. (since " + config.openDate + ", not counting " + 
                                    config.botName + " :musical_note:).";
                            }
                            botSpeak(where, response, userid);
                        }
                    });
        } else {
            botSpeak('chat', "Sorry I don't count Untitled.");
        }
    }
}
function getTopTracks(where, userid) {
    if (config.usedb) {
        var limit = 10;
        var response = '';
        var cmd = "SELECT COUNT(title) AS plays, title, SUM(woots) AS woots, SUM(mehs) AS mehs, SUM(grabs) AS grabs " + 
            "FROM " + config.botName + "songs WHERE (userid <> '" + config.userid + "') AND (title <> 'Untitled') " + 
            "GROUP BY title ORDER BY woots DESC LIMIT " + limit;
        client.query(cmd, function (err, results, fields) {
            if (err) {
                botSpeak('console', err + " getTopTracks");
            }
            if (results.length > 0) {
                for (i = 0; i < limit; i++) {
                    var title = results[i].title;
                    var plays = results[i].plays;
                    var woots = results[i].woots;
                    var mehs = results[i].mehs;
                    var grabs = results[i].grabs;
                    response = response + util.format('%s%s has %s:musical_note:, %s:+1: %s:-1: %s:heart:. ', convNumToEmoji(i + 1), title, plays, woots, mehs, grabs);
                }
                botSpeak(where, response + ' sorted by :+1: (since ' + config.openDate + ', not counting ' + config.botName + ' :musical_note:).', userid);
            } else {
                botSpeak(where, "Sorry no results.", userid);
            }
        });
    }
}
function getMyFavs(where, userid) {
    if (config.usedb) {
        var limit = 7;
        var response = '';
        var cmd = "SELECT COUNT(title) AS plays, title, SUM(woots) AS woots, SUM(mehs) AS mehs, SUM(grabs) AS grabs FROM " + config.botName + "songs " + 
            "WHERE (userid = '" + userid + "') GROUP BY title ORDER BY plays DESC, woots DESC limit " + limit;
        client.query(cmd, function (err, results, fields) {
            if (err) {
                botSpeak('console', err + " getMyFavs");
            }
            if (results.length > 0) {
                var length = null;
                if (results.length < limit) {
                    length = results.length;
                } else {
                    length = limit;
                }
                for (i = 0; i < length; i++) {
                    var name = getUserName(userid, "getMyFavs");
                    var plays = results[i].plays;
                    var title = results[i].title;
                    var woots = results[i].woots;
                    var mehs = results[i].mehs;
                    var grabs = results[i].grabs;
                    response = response + util.format('%s%s has %s:musical_note:: %d:+1: %d:-1: %d:heart:. ', convNumToEmoji(i + 1), title, plays, woots, mehs, grabs);
                }
                botSpeak(where, response + 'in ' + config.room + '(since ' + config.openDate + ', sorted by:musical_note:/:+1:)', userid);
            } else {
                botSpeak(where, "Sorry no results.", userid);
            }
        });
    }
}

//// ============= EVENT FUNCTIONS ==================
function selfCommand(command, param) {
    var who = {
        isOwner: true,
        isJBIRD: true,
        isSelf: true,
        isStaff: true,
        //isDj: true,
    };
    var commandObj = {
        'command': command,
        'param': param,
        'who': who
    };
    doCommand(commandObj);
}

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
    var staff = false;
    var user = plugRoom.getUser(userid);
    if (user.permission > 0) {
        staff = true;
    } else {
        staff = false;
    }
    return staff;
}
function isDj(userid) {
    return plugRoom.userList[userid].isDj;
}

//room events
function onConnected(data) {
    botSpeak('console', config.botName + " has connected.");
}
function reconnect() {
    bot.connect(config.room);
    console.log(getTimestamp() + " reconnect.");
}
function onRoomJoin(data) {
    //console.log(); 
    //user.set_avatar

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

    //TODO
    //bot.setStatus('WORKING');

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

    //plugRoom.getUser(data.currentDJ).isDj = true;
    //plugRoom.getUser(data.currentDJ).noPlays += 1;

    //if (plugRoom.getUser(data.currentDJ).noPlays >= config.deckPlays) {
    //    var str = currentSong.djName + " plays: " + plugRoom.getUser(data.currentDJ).noPlays + " of " + config.deckPlays;
    //    console.log(str);
    //    botSpeak('chat', str);
    //    plugRoom.userList[data.currentDJ].escort = true;
    //}

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

function doCommand(commandObj) {
    var userid = commandObj.userid;
    var username = getUserName(userid);
    var who = commandObj.who;
    var spkr = {
        isOwner: false,
        isJBIRD: false,
        isStaff: false,
        isDj: false,
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
        case 'help':
            botSpeak(where, "ANYONE: " + 
                config.botCall + "list, " + 
                config.botCall + "djs, " +
                config.botCall + "rules, " +
                config.botCall + "stagedive, " +
                config.botCall + "current, " +
                config.botCall + "tools, " +
                config.botCall + "fb, " +
                config.botCall + "theme, " +
                config.botCall + "dance, " +
                config.botCall + "zombies, " +
                config.botCall + "fliptable, " +
                config.botCall + "fixtable, " +
                config.botCall + "boobies, " +
                config.botCall + "racist, " +
                config.botCall + "tiny, " +
                config.botCall + "emoji, " +
                config.botCall + "whoo, " +
                config.botCall + "search X, " +
                config.botCall + "google, " +
                config.botCall + "teachme, " +
                config.botCall + "funnyme, " +
                config.botCall + "gay, " +
                config.botCall + "last, " +
                config.botCall + "stats."
            );
            if (spkr.isStaff) {
                botSpeak(where, "STAFF: " +
                    //+ config.botCall + "useplays X, "
                    + config.botCall + "uptime, "
                    + config.botCall + "userlist, "
                    + config.botCall + "skip, "
                    + config.botCall + "punt, "
                    + config.botCall + "dj, "
                    + config.botCall + "down, "
                    + config.botCall + "settheme X, "
                    + config.botCall + "afkcheck (true/false), "
                    + config.botCall + "setafk X, "
                    + config.botCall + "setgames (true/false), "
                    + config.botCall + "setsexy (true/false), "
                );
            }
            break;
        case 'list':
            //botSpeak(where, getCurrentWaitList());
            break;
        case 'djs':
            if (config.songCheck) {
                var s = "Play counts are: " + getPlayCount();
                //var s = "Plays maximum is set to " + config.deckPlays + ":musical_note:. Play counts are: " + getPlayCount();
                botSpeak(where, s);
            }
            break;

        case 'dj':
        case 'up':
            if (spkr.isStaff || spkr.isOwner || spkr.isJBIRD) {
                bot.joinBooth();
            } else {
                botSpeak(where, "I'm sorry that is a big kid's command.");
            }
            break;

        case 'down':
            if (spkr.isStaff || spkr.isOwner || spkr.isJBIRD) {
                bot.leaveBooth();
            } else {
                botSpeak(where, "I'm sorry that is a big kid's command.");
            }
            break;

        case 'rules':
            var str = "Theme is: " + config.roomTheme + ". ";
            if (config.songTimer) {
                str = str + config.songLimit + " minute song limit at this time. ";
            }
            if (config.afkCheck) {
                str = str + config.afkMin + " inactive to dj limit at this time. ";
            }
            botSpeak('chat', str);
            break;
        case 'stagedive':
            if (userid === currentSong.djId) {
                plugRoom.getUser(userid).escort = true;
                botSpeak(where, "Ok I'll escort ya after this track @" + username);
            } else {
                puntUser(userid);
                botSpeak(where, "BOOYAA!");
            }
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
        case 'fb':
            botSpeak('chat', "Join the " + config.room + " FB group to receive invites to our events and parties: " + config.fbLink, commandObj.pmID);
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
        case 'tiny':
            botSpeak('chat', config.room + " tinychat link: " + config.tinyLink, commandObj.pmID);
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

            //stats
        case 'stats':
            botSpeak(where, "STATS COMMANDS: " + 
                config.botCall + "mystats, " +
                config.botCall + "topdjs, " +
                config.botCall + "newstats, " +
                config.botCall + "todaystats, " +
                config.botCall + "djrank X, " +
                config.botCall + "thistrack, " +
                config.botCall + "toptracks, " +
                config.botCall + "myfavs, "
                );
            break;
        case 'mystats':
            if (config.usedb) {
                getMyStats(userid);
            }
            break;
        case 'topdjs':
            if (config.usedb) {
                getTopDjs(where, userid);
            }
            break;
        case 'newstats':
            if (config.usedb) {
                getNewStats(where, userid);
            }
            break;
        case 'todaystats':
            if (config.usedb) {
                getTodayStats(where, userid);
            }
            break;
        case 'djrank':
            if (config.usedb) {
                var djRank = param;
                getDjX(djRank, where, userid);
            }
            break;
        case 'thistrack':
            if (config.usedb) {
                getTrackStats(where, userid, currentSong.songTitle, true);
            }
            break;
        case 'toptracks':
            if (config.usedb) {
                getTopTracks(where, userid);
            }
            break;
        case 'myfavs':
            if (config.usedb) {
                getMyFavs(where, userid);
            }
            break;


            //staff rights/////////////////////////////////////////////////////////////////////////////////////////////
        case 'useplays X':
            if (spkr.isStaff || spkr.isOwner || spkr.isJBIRD) {
                config.deckPlays = param;
                //changeRoomOptions: (boothLocked, waitListEnabled, maxPlays, maxDJs, [, callback:fn ])
                bot.changeRoomOptions(false, true, config.deckPlays, 10);
            } else {
                botSpeak(where, "I'm sorry that is a big kid's command.");
            }
            break;
        case 'uptime':
            if (spkr.isStaff || spkr.isOwner || spkr.isJBIRD) {
                botSpeak(where, getUpTime(), commandObj.pmID);
            } else {
                botSpeak(where, "I'm sorry that is a big kid's command.");
            }
            break;
        case 'userlist':
            if (spkr.isStaff || spkr.isOwner || spkr.isJBIRD) {
                botSpeak(where, getUserList());
            } else {
                botSpeak(where, "I'm sorry that is a big kid's command.");
            }
            break;
        case 'skip':
            if (spkr.isStaff || spkr.isOwner || spkr.isJBIRD) {
                bot.moderateForceSkip();
            } else {
                botSpeak(where, "I'm sorry that is a big kid's command.");
            }
            break;
        case 'punt':
            if (spkr.isStaff || spkr.isOwner || spkr.isJBIRD) {
                var puntee = currentSong.djId;
                bot.moderateRemoveDJ(puntee);
            } else {
                botSpeak(where, "I'm sorry that is a big kid's command.");
            }
            break;

        case 'dj':
            if (spkr.isStaff || spkr.isOwner || spkr.isJBIRD) {
                //bot.moderateAddDJ(config.userid);        //useless for this
                bot.waitListJoin();
            } else {
                botSpeak(where, "I'm sorry that is a big kid's command.");
            }
            break;
        case 'down':
            if (spkr.isStaff || spkr.isOwner || spkr.isJBIRD) {
                //bot.moderateRemoveDJ(config.userid);
                bot.waitListLeave();
            } else {
                botSpeak(where, "I'm sorry that is a big kid's command.");
            }
            break;

        case 'snatch':
            if (config.sexy) {
                if (spkr.isStaff || spkr.isOwner || spkr.isJBIRD) {
                    botSpeak(where, "Mmmm have some of mine.");
                    bot.addSongToPlaylist(plugRoom.playlistID, currentSong.id);
                } else {
                    botSpeak(where, "I'm sorry that is a big kid's command.");
                }
            } else {
                botSpeak(where, "I'm sorry that is disabled due to setsexy = false.");
            }
            break;
        case 'snag':
            if (spkr.isOwner || spkr.isJBIRD) {
                bot.addSongToPlaylist(plugRoom.playlistID, currentSong.id);
                botSpeak(where, "snagged.");
            } else {
                botSpeak(where, "I'm sorry that is a big kid's command.");
            }
            break;

        case 'settheme':
            if (spkr.isStaff || spkr.isOwner || spkr.isJBIRD) {
                config.roomTheme = param;
                botSpeak(where, 'Theme set to: ' + config.roomTheme);
            } else {
                botSpeak(where, "I'm sorry that is a big kid's command.");
            }
            break;
        case 'afkcheck':
            if (spkr.isStaff || spkr.isOwner || spkr.isJBIRD) {
                config.afkCheck = param;
                botSpeak(where, 'AFK deck checking is set to: ' + config.afkCheck);
            } else {
                botSpeak(where, "I'm sorry that is a big kid's command.");
            }
            break;
        case 'setafk':
            if (spkr.isStaff || spkr.isOwner || spkr.isJBIRD) {
                config.afkCheck = true;
                config.afkMin = param;
                botSpeak(where, 'afkCheck Minutes set to: ' + config.afkMin);
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

        case 'speak':
        case 'echo':
            botSpeak(where, param);
            break;

    }
}

//// ============= EXPORTED BOT ==================

var baseBot = {

    currVotes: { 'up': 0, 'down': 0 },

    init: function (botObj) {
        bot = botObj.bot;
        config = botObj.config;
        bot.on('connected', onConnected);
        bot.on('roomJoin', function (data) {
            // we are in the room, initialize our user list
            initializeUsers();
            onRoomJoin(data);

            bot.on('close', reconnect);
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
