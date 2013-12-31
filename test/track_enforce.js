var __extends = function(child, parent) { for (var key in parent) { if (parent.hasOwnProperty(key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };
var EventEmitter = require('events').EventEmitter;

var enforce;
var mockbot;
var media;// = {duration: 100};
var Bot = function() {
	var self = this;
	this.forceSkipCount=0;
	this.getMediaCount=0;
	this.speakCount=0;

	this.getMedia = function() {
		self.getMediaCount++;
		return media;
	};

	this.getDJs = function() {
		return [
			{username: "DJ Name"}
		];
	};

	this.moderateForceSkip = function() {
		self.forceSkipCount++;
	};

	this.speak = function() {
		self.speakCount++;
	};
};

__extends(Bot, EventEmitter);

QUnit.module("TrackEnforce Module", {setup: function() {
	media = {duration: 100};
	mockbot = new Bot();
	enforce = new TrackEnforce({bot:mockbot, limit: 60});
	enforce.start();
}});

test("track length enforce", function(assert) {
	// if we got loaded up in the middle of a song.. do not speak
	equal(mockbot.speakCount, 0, "bot spoke about track len");
	equal(mockbot.forceSkipCount, 0, "user was forced to skip");

	// fake a dj advance and make sure we spoke
	enforce.nextDJ();
	equal(mockbot.speakCount, 1, "bot spoke about track len");
	ok(enforce.warning_func, "warning func registered");
	ok(enforce.boot_func, "boot func registered");
});

test("track length with no warning", function(assert) {
	media.duration = 74;
	enforce.nextDJ();
	// make sure warning func got registered
	equal(enforce.warning_func, null, "warning func registered incorrectly");
});

test("enforce can be stopped", function(assert) {
	enforce.stop();
	equal(mockbot.forceSkipCount, 0, "user was not forced to skip");
});

test("get overage", function(assert) {
	enforce.setTrackLimit(1);
	enforce.nextDJ();
	var overage = enforce.getOverage();
	// 100 sec track ( 1min 40secs)
	// 1 second limit
	// overage should be 1 minute 39 sec
	equal(overage.total, 99);
	equal(overage.min, 1, "1 min over");
	equal(overage.sec, 39, "39 sec over");

	enforce.setTrackLimit(60);
	overage = enforce.getOverage();
	equal(overage.min, 0, "0 min over");
	equal(overage.sec, 40, "40 sec over");

	// bump track limit
	enforce.setTrackLimit(500);
	overage = enforce.getOverage();
	equal(overage.min, 0, "0 min over");
	equal(overage.sec, 0, "0 sec over");
});
