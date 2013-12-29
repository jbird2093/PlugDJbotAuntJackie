(function() {

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

	function getTrackTime(seconds) {
		var timeMs = new Date(seconds * 1000);
		var trackTime;
		trackTime = timeFormat(timeMs.getUTCMinutes()) + ":" + timeFormat(timeMs.getUTCSeconds());
		return trackTime;
	}

	function getIdleTime(userid, room) {
		var idleTime;
		try {
			var now = new Date();
			var userObj = room.getUser(userid);
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

	module.exports = {
		getGetOrdinal: getGetOrdinal,
		convNumToEmoji: convNumToEmoji,
		getTimestamp: getTimestamp,
		getTimeShort: getTimeShort,
		timeFormat: timeFormat,
		dateDiff: dateDiff,
		getTrackTime: getTrackTime,
		getIdleTime: getIdleTime
	};

})();

