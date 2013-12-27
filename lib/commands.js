// vim: set expandtab ts=4 sw=4:
(function() {

    var util = require('util');
    var _ = require('./underscore');
    var helpers = require('./helpers');

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
        this.initialize.apply(this, arguments);

    };

    BaseCommand.extend = extend;

    _.extend(BaseCommand.prototype, {

        PERMISSION_LEVEL: PERMISSION_ANYONE,

        needsDB: false,

        needsParam: false,

        initialize: function() {
            this.bot = this.options.bot;
            if (_.isUndefined(this.bot)) {
                throw "Commands require a bot option";
            }
            if (this.options.permissions) {
                this.PERMISSION_LEVEL = this.options.permissions;
            }
            if (this.needsDB && !this.options.db) {
                throw "db is a required option for this command";
            }
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

    var SpeakCommand = BaseCommand.extend({
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

    module.exports = {

        Speak: SpeakCommand,

        Djs: DjsCommand,

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
