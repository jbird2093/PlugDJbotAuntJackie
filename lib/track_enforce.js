(function() {
	var _ = require("./underscore");

	/**
	 * bot and limit are required options
	 *
	 * * limit is in seconds
	 */
	var TrackEnforce = function(options) {
		options || (options = {});
		this.bot = options.bot;
		this.enforce = false;
		this.check_interval = 5; // 5 seconds
		this.setTrackLimit(options.limit);
		this.bot.on('djAdvance', _.bind(this.nextDJ, this));
		this.has_dj = false;
		this.warning_func = null;
		this.boot_func = null;
	};

	TrackEnforce.prototype.nextDJ = function(data) {
		clearTimeout(this.boot_func);
		clearTimeout(this.warning_func);
		this.boot_func = null;
		this.warning_func = null;

		var media = this.bot.getMedia();
		var djs = this.bot.getDJs();
		var dj = djs[0];
		if (dj) {
			this.has_dj = true;
		} else {
			this.has_dj = false;
		}

		this.current_track_len = media.duration;
		if ( this.enforce && (this.current_track_len > this.limit) ) {
			var over = this.getOverage();
			var sec = over.sec;
			if (sec < 10) {
				sec = "0" + sec;
			}
			this.bot.speak('@' + dj.username + ' Track length greater than ' + 
						this.limit_min + ' minutes, please skip with ' +
						over.min + ':' + sec + ' remaining.');

			var warning_time = over-15;
			if (warning_time > 0) {
				this.warning_func = setInterval(this.warning, warning_time*1000);
			}
			this.boot_func = setInterval(this.skipTrack, over*1000);
		}
	};

	TrackEnforce.prototype.getOverage = function() {
		var over = this.current_track_len - this.limit;
		if ( over <= 0 ) {
			return {
				min: 0,
				sec: 0,
				total: 0
			};
		}

		return {
			min: Math.floor(over/60),
			sec: Math.floor(over%60),
			total: over
		};
	};

	TrackEnforce.prototype.setTrackLimit = function(limit) {
		if (_.isNumber(limit) && limit > 0) {
			this.limit = limit;
			this.limit_min = Math.floor(limit/60);
		}
	};

	TrackEnforce.prototype.warning = function(TTL) {
		this.bot.speak("@" + "");
	};

	TrackEnforce.prototype.skipTrack = function() {
		if (this.has_dj) {
			this.bot.moderateForceSkip();
		}
	};

	TrackEnforce.prototype.start = function() {
		this.enforce = true;
	};

	TrackEnforce.prototype.stop = function() {
		this.enforce = false;
	};

	module.exports = {
		TrackEnforce: TrackEnforce
	};
})();
