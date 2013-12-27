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
                    string = string + util.format('%s %s played "%s" by %s %s, %d:+1: %d:-1: %d:heart:, new= ', helpers.convNumToEmoji(i + 1), song.djName, song.title, song.artist, song.duration, song.score.woots, song.score.mehs, song.score.grabs, song.newTrack);
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
                        response = util.format('%s you are ranked %s with %s:musical_note:, %s playhours, Votes: %d:+1: %d:-1: %d:heart:, averaging %s :+1:/play (ranked by :+1:total since ' + config.openDate + ')', name, helpers.convNumToEmoji(i + 1), plays, playhours, woots, mehs, grabs, avg);
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
                    response = response + util.format('%s %s %d:+1: ', helpers.convNumToEmoji(i + 1), username, woots);
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
                    response = response + util.format('day %s%s: %s:musical_note: %d:+1: %d:-1: %d:heart: %s avg. ', helpers.convNumToEmoji(i), dateplay, plays, woots, mehs, grabs, average);
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
                        response = response + util.format('%s %s %s:musical_note: %d:+1: %d:-1: %d:heart:. ', helpers.convNumToEmoji(i + 1), username, plays, woots, mehs, grabs);
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
                    response = response + util.format('%s%s has %s:musical_note:, %s:+1: %s:-1: %s:heart:. ', helpers.convNumToEmoji(i + 1), title, plays, woots, mehs, grabs);
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
                    response = response + util.format('%s%s has %s:musical_note:: %d:+1: %d:-1: %d:heart:. ', helpers.convNumToEmoji(i + 1), title, plays, woots, mehs, grabs);
                }
                botSpeak(where, response + 'in ' + config.room + '(since ' + config.openDate + ', sorted by:musical_note:/:+1:)', userid);
            } else {
                botSpeak(where, "Sorry no results.", userid);
            }
        });
    }
}
