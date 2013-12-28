// vim: set expandtab ts=4 sw=4:
(function() {

    var util = require('util');
    var _ = require('./underscore');
    var helpers = require('./helpers');
    var models = require('./models');

    var extend = function(protoProps, staticProps) {
        var parent = this;
        var child;

        if (protoProps && _.has(protoProps, 'constructor')) {
            child = protoProps.constructor;
        } else {
            child = function() { return parent.apply(this, arguments); };
        }

        var Surrogate = function() { this.constructor = child; };
        Surrogate.prototype = parent.prototype;
        child.prototype = new Surrogate();

        if ( protoProps) _.extend(child.prototype, protoProps);
        child.__super__ = parent.prototype;
        return child;
    };

    var PERMISSION_ANYONE = 1,
        PERMISSION_ADMIN = 2,
        PERMISSION_STAFF = 4,
        PERMISSION_OWNER =  8,
        PERMISSION_MASTER = 16,
        PERMISSION_SELF = 32;

    var BaseCommand = function(options) {
        options || (options = {});
        this.options = options;
        this.bot = this.options.bot;
        if (_.isUndefined(this.bot)) {
            throw "Commands require a bot option";
        }
        if (this.options.permissions) {
            this.PERMISSION_LEVEL = this.options.permissions;
        }
        this.initialize.apply(this, arguments);
    };

    BaseCommand.extend = extend;

    _.extend(BaseCommand.prototype, {

        PERMISSION_LEVEL: PERMISSION_OWNER | PERMISSION_STAFF | PERMISSION_MASTER,

        needsDB: false,

        needsParam: false,

        initialize: function() {
        },

        speak: function(arg) {
            this.bot.speak(arg);
        },

        getCurrentDJ: function() {
            var djs = this.bot.getDJs();
            return djs[0];
        },

        hasPermission: function(who) {
            who || (who = {});
            var mask = PERMISSION_ANYONE;
            if (who.isJBIRD)  mask |= PERMISSION_MASTER;
            if (who.isOwner)  mask |= PERMISSION_OWNER;
            if (who.isStaff)  mask |= PERMISSION_STAFF;
            if (who.isSelf)   mask |= PERMISSION_SELF;
            return (this.PERMISSION_LEVEL & mask);
        },

        execute: function(cmd) {
            if ( this.hasPermission(cmd.who)) {
                var validation = this.isValid(cmd);
                if (_.isUndefined(validation)) {
                    return this._execute(cmd);
                } else {
                    console.log("command was not valid: " + validation);
                }
            } else {
                this.bot.speak("I'm sorry that is a big kid's command.");
            }
        },

        isValid: function(cmd) {
            if ( this.needsParam && !cmd.param) {
                return "param";
            }
        }
    });

    var DBCommand = BaseCommand.extend({
        needsDB: true,

        initialize: function() {
            if (!this.options.db) {
                throw "db is a required option for this command";
            }
            this.db = this.options.db;
        },

        // run a query, callback with reuslts
        select: function(query, callback) {
            if (typeof callback !== "function") return;
            var _callback = function (err, results, fields) {
                if (err) {
                    console.log(err + " getTeachme");
                }
                if (results) {
                    callback(results);
                }
            };
            if ( typeof query == "object" ) {
                var q = query.q;
                var args = query.args;
                if (!q || !args) return;
                this.db.query(q, args, _callback);
            } else {
                this.db.query(query, _callback);
            }
        },

        // run query return first result
        selectOne: function(query, callback) {
            this.select(query, function(results) {
                if ( results.length > 0) {
                    callback(results[0]);
                }
            });
        }
    });

    DBCommand.extend = extend;

    var EchoCommand = BaseCommand.extend({
        needsParam: true,

        _execute: function(cmd) {
            this.bot.speak(cmd.param);
        },
    });

    var DjsCommand = BaseCommand.extend({
        getPlayCount: function() {
            str = '';
            var num = 1;
            var users = this.options.room.userList;
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
        },
        _execute: function() {
            var s = "Play counts are: " + this.getPlayCount();
            bot.speak(s);
        }
    });

    var DJCommand = BaseCommand.extend({
        PERMISSION_LEVEL: PERMISSION_STAFF,

        _execute: function() {
            this.bot.joinBooth();
        }
    });

    var DJDownCommand = BaseCommand.extend({
        PERMISSION_LEVEL: PERMISSION_STAFF,

        _execute: function() {
            this.bot.waitListLeave();
        }
    });

    var DanceCommand = BaseCommand.extend({
        _execute: function() {
            if (config.danceMode) this.bot.woot();
        }
    });

    var SpeakCommand = BaseCommand.extend({
        initialize: function() {
            this.MESSAGE = this.options.message;
            if ( _.isUndefined(this.MESSAGE)) {
                throw "StringOutputCommand requires a message option";
            }
        },

        _execute: function() {
            this.bot.speak(this.MESSAGE);
        }
    });

    var RulesCommand = BaseCommand.extend({
        _execute: function() {
            var str = "Theme is: " + config.roomTheme + ". ";
            if (config.songTimer) {
                str = str + config.songLimit + " minute song limit at this time. ";
            }
            if (config.afkCheck) {
                str = str + config.afkMin + " inactive to dj limit at this time. ";
            }
            this.speak(str);
        }
    });

    var SnagCommand = BaseCommand.extend({
        PERMISSION_LEVEL: PERMISSION_STAFF,

        _execute: function(cmd) {
            var media = this.bot.getMedia();
            if (media.id) {
                this.bot.addSongToPlaylist(this.options.room.playlistID, media.id);
                if ( cmd.command == "snatch" && config.sexy ) {
                    this.speak("Mmmm have some of mine.");
                } else {
                    this.speak("snagged.");
                }
            }
        }

    });

    var CurrentCommand = BaseCommand.extend({

        _execute: function() {
            var media = this.bot.getMedia();
            var stats = this.bot.getRoomScore();
            var djs = this.bot.getDJs();

            if ( djs.length > 0 ) {
                var string = util.format('%s is playing "%s" by %s length %s. Votes: %d:+1: %d:-1: %d:heart:',
                    djs[0].username,
                    media.title, 
                    media.author, 
                    helpers.getTrackTime(media.duration),
                    stats.positive,
                    stats.negative,
                    +stats.curates);

                this.speak(string);
            }
        }
    });

    var SmokeCommand = BaseCommand.extend({

        PERMISSION_LEVEL: PERMISSION_ANYONE,

        getSmoke: function() {
            var text = "";
            if (config.usedb && this.options.db) {
                var cmdget = "SELECT text FROM " + config.dbprefix + "smoke ORDER BY rand() LIMIT 1";
                this.options.db.query(cmdget, function (err, results, fields) {
                    if (err) {
                        console.log(err + " getSmoke");
                    }
                    if (results) {
                        var text = results[0].text;
                    }
                });
            }
            return ':herb:SMOKE IT IF YOU GOT IT!:herb: ' + text;
        },

        _execute: function() {
            if (config.danceMode) {
                this.bot.woot();
                this.speak(this.getSmoke());
            }
        }

    });

    var UptimeCommand = BaseCommand.extend({

        getUpTime: function() {
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
        },

        _execute: function() {
            this.speak(this.getUpTime());
        }
    });

    var UserListCommand = BaseCommand.extend({
        getUserList: function() {
            var str = '';
            var now = new Date();
            var loopcnt = 0;
            for (var i in this.options.room.userList) {
                var user = this.options.room.userList[i];
                var idleTime = helpers.getIdleTime(user.id, this.options.room);
                loopcnt = loopcnt + 1;
                str = str + util.format('%s%s(%s):%s ', 
                                        helpers.convNumToEmoji(loopcnt), 
                                        user.username, 
                                        user.language, 
                                        idleTime);
            }
            return loopcnt + " users: " + str;
        },
        _execute: function() {
            this.speak(this.getUserList());
        }
    });

    var GoogleCommand = BaseCommand.extend({
        PERMISSION_LEVEL: PERMISSION_ANYONE,

        _execute: function() {
            var media = this.bot.getMedia();
            var searchQuery = media.author + " " + media.title;
            //replace the most common special characters to +
            searchQuery = searchQuery.replace(/\'/g, "%27").replace(/;/g, "%3B").replace(/#/g, "%23").replace(/@/g, "%40").replace(/&/g, "%26").replace(/</g, "%3C").replace(/>/g, "%3E").replace(/=/g, "%3D").replace(/\+/g, "%2B");
            //replace spaces with +
            searchQuery = searchQuery.split(' ').join('+');
            this.speak(media.author + " " + media.title + ": https://www.google.com/search?q=" + searchQuery);
        }
    });

    var SearchCommand = BaseCommand.extend({
        needsParam: true,

        _execute: function(cmd) {
            var searchQuery = cmd.param;
            //replace the most common special characters and turn spaces into +
            searchQuery = searchQuery
                .replace(/\'/g, "%27")
                .replace(/;/g, "%3B")
                .replace(/#/g, "%23")
                .replace(/@/g, "%40")
                .replace(/&/g, "%26")
                .replace(/</g, "%3C")
                .replace(/>/g, "%3E")
                .replace(/=/g, "%3D")
                .replace(/\+/g, "%2B");

            //replace spaces with +
            searchQuery = searchQuery.split(' ').join('+');
            this.speak(cmd.param + " search: https://www.google.com/search?q=" + searchQuery);
        }
    });

    var ListCommand = BaseCommand.extend({
        _execute: function() {
            // no-op right now
        }
    });

    var StageDiveCommand = BaseCommand.extend({
        _execute: function(cmd) {
            var userid = cmd.userid;
            var username = cmd.username;
            var dj = this.getCurrentDJ();

            if (dj && userid === dj.id) {
                this.options.room.getUser(userid).escort = true;
                this.speak("Ok I'll escort ya after this track @" + username);
            } else {
                this.bot.moderateRemoveDJ(userid);
                this.speak("BOOYAA!");
            }
        }
    });

    var ThemeCommand = BaseCommand.extend({
        _execute: function() {
            this.speak("Current theme is: " + config.roomTheme);
        }
    });

    var TeachMeCommand = DBCommand.extend({
        getTeachme: function() {
            var self = this;
            if (config.sexy) {
                var cmdget = "SELECT text FROM " + config.dbname + "teachme ORDER BY rand() LIMIT 1";
                this.selectOne(cmdget, function (row) {
                    self.speak(row.text);
                });
            }
        },
        _execute: function() {
            if (config.games) {
                this.getTeachme();
            }
        }
    });

    var FunnyMeCommand = DBCommand.extend({
        getFunny: function() {
            var self;
            var cmdget = "SELECT text FROM " + config.dbprefix + "funnyme ORDER BY rand() LIMIT 1";
            this.selectOne(cmdget, function(row) {
                self.speak(row.text);
            });
        },
        _execute: function() {
            if ( config.games ) {
                this.getFunny();
            }
        }
    });

    var GayCommand = DBCommand.extend({
        getGay: function() {
            var self = this;
            var cmdget = "SELECT text FROM " + config.dbprefix + "gay ORDER BY rand() LIMIT 1";
            this.selectOne(cmdget, function(row) {
                self.speak(row.text);
            });
        },
        _execute: function() {
            // no-op right now
            if(config.games) {
                this.getGay();
            }
        }
    });

    var LastCommand = DBCommand.extend({
        getLast: function() {
            var self = this;
            var string = '';
            //Votes: %d:+1: %d:-1: %d:heart:     :musical_note:
            var limit = 3;
            var cmd = "SELECT username, title, artist, duration, woots, mehs, grabs, newtrack FROM " + config.dbprefix + "songs ORDER BY `timestamp` DESC LIMIT " + limit;

            this.select(cmd, function(results) {
                var song = new models.Song();
                for (var i = 0; i < limit; i++) {
                    var row = results[i];
                    song.djName = row.username;
                    song.title = row.title;
                    song.artist = row.artist;
                    song.duration = helpers.getTrackTime(row.duration);
                    song.score.woots = row.woots;
                    song.score.mehs = row.mehs;
                    song.score.grabs = row.grabs;
                    if (row.newTrack) {
                        song.newTrack = 'Y';
                    } else {
                        song.newTrack = 'N';
                    }
                    string = string + util.format('%s %s played "%s" by %s %s, %d:+1: %d:-1: %d:heart:, new= ', helpers.convNumToEmoji(i + 1), song.djName, song.title, song.artist, song.duration, song.score.woots, song.score.mehs, song.score.grabs, song.newTrack);
                }
                self.speak(string);
            });
        },
        _execute: function() {
            this.getLast();
        }
    });

    var MyStatsCommand = DBCommand.extend({
        getMyStats: function(userid) {
            var self = this;
            var cmd = "SELECT " + config.dbprefix + "users.username, round((SUM(woots)/COUNT(title)),2) AS avg, COUNT(" + config.dbprefix + "songs.title) AS plays, "
            + "SUM(" + config.dbprefix + "songs.woots) AS woots, SUM(" + config.dbprefix + "songs.mehs) AS mehs, SUM(" + config.dbprefix + "songs.grabs) AS grabs, ROUND(SUM(duration) / 60, 2) AS hours, "
            + "" + config.dbprefix + "songs.userid FROM " + config.dbprefix + "songs INNER JOIN " + config.dbprefix + "users ON " + config.dbprefix + "songs.userid = " + config.dbprefix + "users.id "
            + "WHERE (" + config.dbprefix + "users.id <> '" + config.userid + "') "
            + "GROUP BY " + config.dbprefix + "users.id ORDER BY woots DESC";

            this.select(cmd, function(results) {
                if (results) {
                    for (i = 0; i < results.length; i++) {
                        if (userid === results[i].userid) {
                            var name = results[i].username;
                            var plays = results[i].plays;
                            var playhours = helpers.getTrackTime(results[i].hours);
                            var woots = results[i].woots;
                            var mehs = results[i].mehs;
                            var grabs = results[i].grabs;
                            var avg = results[i].avg;
                            response = util.format('%s you are ranked %s with %s:musical_note:, %s playhours, Votes: %d:+1: %d:-1: %d:heart:, averaging %s :+1:/play (ranked by :+1:total since ' + config.openDate + ')', name, helpers.convNumToEmoji(i + 1), plays, playhours, woots, mehs, grabs, avg);
                            self.speak(response);
                        }
                    }
                } else {
                    self.speak("Sorry no results.");
                }
            });
        },
        _execute: function(cmd) {
            this.getMyStats(cmd.userid);
        }
    });

    var TopDJsCommand = DBCommand.extend({
        getTopDJs: function() {
            var self = this;
            var limit = 7;
            var response = '';
            var cmd = "SELECT " + config.dbprefix + "users.id, " + config.dbprefix + "users.username, COUNT(" + config.dbprefix + "songs.title) AS plays, SUM(" + config.dbprefix + "songs.woots) AS woots, SUM(" + config.dbprefix + "songs.mehs) AS mehs, "
            + "SUM(" + config.dbprefix + "songs.grabs) AS grabs, " + config.dbprefix + "songs.userid FROM " + config.dbprefix + "songs INNER JOIN " + config.dbprefix + "users ON " + config.dbprefix + "songs.userid = " + config.dbprefix + "users.id WHERE (" + config.dbprefix + "songs.userid "
            + "<> '" + config.userid + "') GROUP BY " + config.dbprefix + "songs.userid ORDER BY woots DESC LIMIT " + limit;

            this.select(cmd, function(results) {
                if (results.length > 0) {
                    for (i = 0; i < limit; i++) {
                        var username = results[i].username;
                        //var plays = results[i]['plays'];
                        var woots = results[i].woots;
                        //var mehs = results[i]['mehs'];
                        //var grabs = results[i]['grabs'];
                        response = response + util.format('%s %s %d:+1: ', helpers.convNumToEmoji(i + 1), username, woots);
                    }
                    self.speak(response + 'in ' + config.room + 
                               '(since ' + config.openDate + ', not counting ' +
                               config.botName + ' :musical_note:) sorted by :+1:');
                } else {
                    self.speak("Sorry no results.");
                }
            });
        },
        _execute: function() {
            this.getTopDJs();
        }
    });

    var NewStatsCommand = DBCommand.extend({
        getNewStats: function(userid, username) {
            var self = this;
            var cmd = "SELECT DATE_FORMAT(`timestamp`, '%m/%d/%y') as dateplay, COUNT(title) AS plays, SUM(woots) AS woots, SUM(mehs) AS mehs, SUM(grabs) AS grabs " + 
                "FROM " + config.dbprefix + "songs GROUP BY userid, Date(`timestamp`) HAVING (userid = '" + userid + "') ORDER BY dateplay DESC LIMIT 7";

            this.select(cmd, function(results) {
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
                    var strTotal = util.format(username + " totals: " + results.length + "Days:%s plays, %d:+1: %d:-1: %d:heart: %d/play. ", totPlays, totWoots, totMehs, totGrabs, totAvg);
                    self.speak(strTotal + response);
                } else {
                    self.speak("Sorry no results.");
                }

            });
        },
        _execute: function(cmd) {
            this.getNewStats(cmd.userid, cmd.username);
        }
    });

    var TodayStatsCommand = DBCommand.extend({
        getTodayStats: function(userid) {
            var self = this;
            var cmd = "SELECT date(" + config.dbprefix + "songs.`timestamp`) as date, COUNT(" + config.dbprefix + "songs.title) as plays, "
            + config.dbprefix + "songs.userid, " + config.dbprefix + "users.username, SUM(" + config.dbprefix + "songs.woots) as woots, SUM("
            + config.dbprefix + "songs.mehs) as mehs, SUM(" + config.dbprefix + "songs.grabs) as grabs "
            + "FROM " + config.dbprefix + "songs INNER JOIN " + config.dbprefix + "users ON " + config.dbprefix + "songs.userid = " + config.dbprefix + "users.id "
            + "WHERE (" + config.dbprefix + "songs.userid = '" + userid + "') AND (Date(" + config.dbprefix + "songs.`timestamp`) = date(sysdate())) GROUP BY Date(" + config.dbprefix + "songs.`timestamp`), userid ORDER BY Date(" + config.dbprefix + "songs.`timestamp`) desc";


            this.select(cmd, function(results) {
                if (results.length > 0) {
                    var username = results[0].username;
                    var plays = results[0].plays;
                    var woots = results[0].woots;
                    var mehs = results[0].mehs;
                    var grabs = results[0].grabs;
                    var average = (woots / plays).toFixed(2);
                    var response = util.format('%s play history: %s:musical_note:, %d:+1: %d:-1: %d:heart: averaging %s:+1:/play. ', username, plays, woots, mehs, grabs, average);
                    self.speak(response);
                } else {
                    self.speak("Sorry no results. You have not played yet today.");
                }
            });
        },
        _execute: function(cmd) {
            this.getTodayStats(cmd.userid);
        }
    });

    var DJRankCommand = DBCommand.extend({
        needsParam: true,

        getDJX: function(djRank) {
            var self = this;
            var response = '';
            var cmd = "SELECT " + config.dbprefix + "users.id, " + config.dbprefix + "users.username, COUNT(" + config.dbprefix + "songs.title) AS plays, SUM("
            + config.dbprefix + "songs.woots) AS woots, SUM(" + config.dbprefix + "songs.mehs) AS mehs, SUM(" + config.dbprefix + "songs.grabs) AS grabs, "
            + config.dbprefix + "songs.userid FROM " + config.dbprefix + "songs INNER JOIN " + config.dbprefix + "users ON " + config.dbprefix + "songs.userid = "
            + config.dbprefix + "users.id WHERE (" + config.dbprefix + "songs.userid <> '" + config.userid + "') "
            + "GROUP BY " + config.dbprefix + "songs.userid ORDER BY woots desc";

            this.select(cmd, function(results) {
                if ( results.length >= djRank - 1) {
                    var idx = djRank-1;
                    var row = results[idx];
                    var qryuserid = row.userid;
                    var username = row.username;
                    var plays = row.plays;
                    var woots = row.woots;
                    var mehs = row.mehs;
                    var grabs = row.grabs;
                    response = response + util.format('%s %s %s:musical_note: %d:+1: %d:-1: %d:heart:. ', helpers.convNumToEmoji(djRank), username, plays, woots, mehs, grabs);
                    self.speak(response + 'in ' + config.room + '(since ' + config.openDate + ', not counting ' + 
                             config.botName + ' :musical_note:) sorted by :+1:');
                } else {
                    self.speak("Sorry no results.");
                }
            });
        },
        _execute: function(cmd) {
            this.getDJX(cmd.param);
        },
        isValid: function(cmd) {
            var param = parseInt(cmd.param, 10);
            if (!_.isNumber(param) || _.isNaN(param) ) {
                return "param";
            }
            if ( param < 1) {
                return "param";
            }
        }
    });

    var ThisTrackCommand = DBCommand.extend({
        getTrackStats: function(media, thistrack) {
            var self = this;
            var title = media.title;
            response = '';
            if (title != 'Untitled') {
                this.selectOne({q: "SELECT COUNT(title) AS plays, SUM(woots) AS woots, SUM(mehs) AS mehs, SUM(grabs) AS grabs " + 
                                    "FROM " + config.dbprefix + "songs WHERE title = ? AND userid <> ?", 
                                args: [title, config.userid]},
                function(row) {
                    if (row.plays > 0) {
                        // wha is new mode?
                        //if (config.newMode) {
                            var plays = row.plays;
                            var woots = row.woots;
                            var mehs = row.mehs;
                            var grabs = row.grabs;
                            var average = (woots / plays).toFixed(2);
                            response = util.format('%s has %s:musical_note:, %d:+1: %d:-1: %d:heart: averaging %s:+1:/play (since ' + config.openDate + ', not counting ' + 
                                                   config.botName + ' plays).', title, plays, woots, mehs, grabs, average);
                            self.speak(response);
                        //}
                    } else {
                        //currentSong.newTrack = 1;
                        if (!thistrack) {
                            self.bot.vote('up');
                        } else {
                            response = "This is a track I've not heard yet. (since " + config.openDate + ", not counting " + 
                                config.botName + " :musical_note:).";
                        }
                        self.speak(response);
                    }
                });
            } else {
                self.speak("Sorry I don't count Untitled.");
            }
        },
        _execute: function(cmd) {
            var media = this.bot.getMedia();
            this.getTrackStats(media, true);
        }
    });

    var TopTracksCommand = DBCommand.extend({
        getTopTracks: function() {
            var self = this;
            var limit = 10;
            var response = '';
            var cmd = "SELECT COUNT(title) AS plays, title, SUM(woots) AS woots, SUM(mehs) AS mehs, SUM(grabs) AS grabs " + 
                "FROM " + config.dbprefix + "songs WHERE (userid <> '" + config.userid + "') AND (title <> 'Untitled') " + 
                "GROUP BY title ORDER BY woots DESC LIMIT " + limit;

            this.select(cmd, function(results) {
                if (results.length > 0) {
                    for (i = 0; i < limit; i++) {
                        var row = results[i];
                        var title = row.title;
                        var plays = row.plays;
                        var woots = row.woots;
                        var mehs = row.mehs;
                        var grabs = row.grabs;
                        response = response + util.format('%s%s has %s:musical_note:, %s:+1: %s:-1: %s:heart:. ', helpers.convNumToEmoji(i + 1), title, plays, woots, mehs, grabs);
                    }
                    self.speak(response + ' sorted by :+1: (since ' + config.openDate + ', not counting ' + config.botName + ' :musical_note:).');
                } else {
                    self.speak("Sorry no results.");
                }
            });
        },
        _execute: function() {
            this.getTopTracks();
        }
    });

    var MyFavsCommand = DBCommand.extend({
        getMyFavs: function(userid, username) {
            var self = this;
            var limit = 7;
            var response = '';
            var cmd = "SELECT COUNT(title) AS plays, title, SUM(woots) AS woots, SUM(mehs) AS mehs, SUM(grabs) AS grabs FROM " + config.dbprefix + "songs " + 
                "WHERE (userid = '" + userid + "') GROUP BY title ORDER BY plays DESC, woots DESC limit " + limit;

            this.select(cmd, function(results) {
                if (results.length > 0) {
                    var length = (results.length < limit) ?  results.length : limit;
                    for (i = 0; i < length; i++) {
                        var plays = results[i].plays;
                        var title = results[i].title;
                        var woots = results[i].woots;
                        var mehs = results[i].mehs;
                        var grabs = results[i].grabs;
                        response = response + util.format('%s%s has %s:musical_note:: %d:+1: %d:-1: %d:heart:. ', helpers.convNumToEmoji(i + 1), title, plays, woots, mehs, grabs);
                    }
                    self.speak(response + 'in ' + config.room + '(since ' + config.openDate + ', sorted by:musical_note:/:+1:)');
                } else {
                    self.speak("Sorry no results.");
                }
            });
        },
        _execute: function(cmd) {
            this.getMyFavs(cmd.userid, cmd.username);
        }
    });

    // NOTE: 
    // this does not currently work
    // the plugapi is not getting the room id correctly
    var UsePlaysCommand = BaseCommand.extend({
        needsParam: true,

        _execute: function(cmd) {
            config.deckPlays = cmd.param;
            //changeRoomOptions: (boothLocked, waitListEnabled, maxPlays, maxDJs, [, callback:fn ])
            bot.changeRoomOptions(false, true, config.deckPlays, 10);
        },

        isValid: function(cmd) {
            var param = parseInt(cmd.param, 10);
            if (!_.isNumber(param) || _.isNaN(param) ) {
                return "param";
            }
            if ( param < 1) {
                return "param";
            }
        }
    });

    var SkipCommand = BaseCommand.extend({
        _execute: function() {
            this.bot.moderateForceSkip();
        }
    });

    var PuntCommand = BaseCommand.extend({
        _execute: function() {
            var puntee = this.getCurrentDJ();
            if (puntee) bot.moderateRemoveDJ(puntee.id);
        }
    });

    var SetThemeCommand = BaseCommand.extend({
        needsParam: true,

        _execute: function(cmd) {
            config.roomTheme = cmd.param;
            this.speak('Theme set to: ' + config.roomTheme);
        }
    });

    var AfkCheckCommand = BaseCommand.extend({
        needsParam: true,

        _execute: function(cmd) {
            config.afkCheck = cmd.param;
            this.speak('AFK deck checking is set to: ' + config.afkCheck);
        },

        isValid: function(cmd) {
            var param = parseInt(cmd.param, 10);
            if (!_.isNumber(param) || _.isNaN(param) ) {
                return "param";
            }
            if ( param < 1) {
                return "param";
            }
        }
    });

    var SetAFKCommand = BaseCommand.extend({
        needsParam: true,

        _execute: function(cmd) {
            config.afkCheck = true;
            config.afkMin = cmd.param;
            this.speak('afkCheck Minutes set to: ' + config.afkMin);
        },

        isValid: function(cmd) {
            var param = parseInt(cmd.param, 10);
            if (!_.isNumber(param) || _.isNaN(param) ) {
                return "param";
            }
            if ( param < 1) {
                return "param";
            }
        }
    });

    var SetGamesCommand = BaseCommand.extend({
        needsParam: true,

        _execute: function(cmd) {
            var map = {
                "0": false,
                "1": true,
                "true":true,
                "false":true
            };
            config.games = map[cmd.param];
            this.speak("Games set to: " + config.games);
        },

        isValid: function(cmd) {
            var valid = ["true", "false", "0", "1"];
            if (!_.contains(valid, cmd.param)) {
                return "param";
            }
        }
    });

    var SetSexyCommand = BaseCommand.extend({
        needsParam: true,

        _execute: function(cmd) {
            var map = {
                "0": false,
                "1": true,
                "true":true,
                "false":true
            };
            config.sexy = map[cmd.param];
            this.speak("sexy Mode set to: " + config.sexy);
        },

        isValid: function(cmd) {
            var valid = ["true", "false", "0", "1"];
            if (!_.contains(valid, cmd.param)) {
                return "param";
            }
        }
    });

    var HelpCommand = BaseCommand.extend({
        _execute: function(cmd) {
            this.speak("ANYONE: " + 
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
                config.botCall + "stats.");

            if (cmd.who.isStaff) {
                this.speak("STAFF: " +
                    config.botCall + "uptime, " + 
                    config.botCall + "userlist, " + 
                    config.botCall + "skip, " + 
                    config.botCall + "punt, " + 
                    config.botCall + "dj, " + 
                    config.botCall + "down, " + 
                    config.botCall + "settheme X, " + 
                    config.botCall + "afkcheck (true/false), " + 
                    config.botCall + "setafk X, " + 
                    config.botCall + "setgames (true/false), " + 
                    config.botCall + "setsexy (true/false), "
                );
            }
        }
    });

    module.exports = {
        Echo: EchoCommand,
        Speak: SpeakCommand,
        Djs: DjsCommand,
        DJ: DJCommand,
        DJDown: DJDownCommand,
        Rules: RulesCommand,
        Dance: DanceCommand,
        Snag: SnagCommand,
        Current: CurrentCommand,
        Smoke: SmokeCommand,
        Uptime: UptimeCommand,
        UserList: UserListCommand,
        Google: GoogleCommand,
        List: ListCommand,
        StageDive: StageDiveCommand,
        Help: HelpCommand,
        Search: SearchCommand,
        Theme: ThemeCommand,
        TeachMe: TeachMeCommand,
        FunnyMe: FunnyMeCommand,
        Gay: GayCommand,
        Last: LastCommand,
        MyStats: MyStatsCommand,
        TopDJs: TopDJsCommand,
        NewStats: NewStatsCommand,
        TodayStats: TodayStatsCommand,
        DJRank: DJRankCommand,
        ThisTrack: ThisTrackCommand,
        TopTracks: TopTracksCommand,
        MyFavs: MyFavsCommand,
        UsePlays: UsePlaysCommand,
        Skip: SkipCommand,
        Punt: PuntCommand,
        SetTheme: SetThemeCommand,
        AfkCheck: AfkCheckCommand,
        SetAFK: SetAFKCommand,
        SetGames: SetGamesCommand,
        SetSexy: SetSexyCommand,



        permissions: {
            PERMISSION_ANYONE: PERMISSION_ANYONE,
            PERMISSION_ADMIN: PERMISSION_ADMIN,
            PERMISSION_STAFF: PERMISSION_STAFF,
            PERMISSION_OWNER:  PERMISSION_OWNER,
            PERMISSION_MASTER: PERMISSION_MASTER,
            PERMISSION_SELF: PERMISSION_SELF
        }
    };

})();
