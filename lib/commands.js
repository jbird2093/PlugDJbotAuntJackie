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
            this.db.query(query, function (err, results, fields) {
                if (err) {
                    console.log(err + " getTeachme");
                }
                if (results) {
                    callback(results);
                }
            });
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
                var cmdget = "SELECT text FROM " + config.botName + "smoke ORDER BY rand() LIMIT 1";
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

    var StatsCommand = DBCommand.extend({
        _execute: function() {
            // no-op right now
        }
    });

    var MyStatsCommand = DBCommand.extend({
        _execute: function() {
            // no-op right now
        }
    });

    var TopDJsCommand = DBCommand.extend({
        _execute: function() {
            // no-op right now
        }
    });

    var NewStatsCommand = DBCommand.extend({
        _execute: function() {
            // no-op right now
        }
    });

    var TodayStatsCommand = DBCommand.extend({
        _execute: function() {
            // no-op right now
        }
    });

    var DJRankCommand = DBCommand.extend({
        _execute: function() {
            // no-op right now
        }
    });

    var ThisTrackCommand = DBCommand.extend({
        _execute: function() {
            // no-op right now
        }
    });

    var TopTracksCommand = DBCommand.extend({
        _execute: function() {
            // no-op right now
        }
    });

    var MyFavsCommand = DBCommand.extend({
        _execute: function() {
            // no-op right now
        }
    });

    var UsePlaysCommand = BaseCommand.extend({
        _execute: function() {
            // no-op right now
        }
    });

    var SkipCommand = BaseCommand.extend({
        _execute: function() {
            // no-op right now
        }
    });

    var PuntCommand = BaseCommand.extend({
        _execute: function() {
            // no-op right now
        }
    });

    var SetThemeCommand = BaseCommand.extend({
        _execute: function() {
            // no-op right now
        }
    });

    var AfkCheckCommand = BaseCommand.extend({
        _execute: function() {
            // no-op right now
        }
    });

    var SetAFKCommand = BaseCommand.extend({
        _execute: function() {
            // no-op right now
        }
    });

    var SetGamesCommand = BaseCommand.extend({
        _execute: function() {
            // no-op right now
        }
    });

    var SetSexyCommand = BaseCommand.extend({
        _execute: function() {
            // no-op right now
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
        Stats: StatsCommand,
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
