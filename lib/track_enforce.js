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
		this.current_dj = null;
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
		this.current_dj = dj;

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

			var total = over.total;
			if ( total > 0 ) {
				var warning_time = this.limit-15;
				var boot_time = this.limit;
				var warning = _.bind(this.warning, this, dj.id);
				var boot = _.bind(this.skipTrack, this, dj.id);

				if ((total-15) > 0) {
					this.warning_func = setTimeout(warning, warning_time*1000);
				}
				this.boot_func = setTimeout(boot, boot_time*1000);
			}
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

	TrackEnforce.prototype.warning = function(dj) {
		console.log('warning');
		if (dj == this.current_dj.id) {
			this.bot.speak("@" + this.current_dj.username + " please skip or you will be escorted in 15 seconds");
		}
	};

	TrackEnforce.prototype.skipTrack = function(dj) {
		console.log('boot');
		if (dj==this.current_dj.id) {
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
