(function() {
	var _ = require('./underscore');
	var entities = require('entities');

	var CommandHandler = function(bot, config) {
		this.bot = bot;
		this.config = config;
		this.greetings = config.botGreetings;
		this._commands = {};
	};

	CommandHandler.prototype.on = function(command, handler) {
		if ( this.config.debug){
			console.log("command handler regisered for: " + command);
		}
		this._commands[command] = handler;
		return this;
	};
	
	CommandHandler.prototype.handleCommand = function(commandObj) {
		var cmd = this._commands[commandObj.command];
		if (cmd) {
			cmd.execute(commandObj);
		}
	};

	CommandHandler.prototype.parseChat = function(chatItem) {
		var msgText = entities.decode(chatItem.message, 2);

		var greetings = this.greetings;
		for (var i = 0, len = greetings.length; i < len; i++) {
			var pattern = new RegExp('(^' + greetings[i] + ')(.*?)( .*)?$');
			result = msgText.match(pattern);
			if (result) break;
		}

		if (result) {
			var command = result[2].trim();
			var param = '';
			var paramOrig = '';
			if (result.length == 4 && result[3]) {
				param = result[3].trim();
				paramOrig = result[2].trim();
			}

			var isOwner = (chatItem.fromID === this.config.botOwner);
			var isJBIRD = (chatItem.fromID === this.config.JBIRD);
			var isSelf = (chatItem.fromID === this.config.userid);
			var isStaff = _.contains(_.pluck(this.bot.getStaff(), 'id'), chatItem.fromID);

			var who = {
				isOwner: isOwner,
				isJBIRD: isJBIRD,
				isSelf: isSelf,
				isStaff: isStaff,
				isDj: false
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
			return commandObj;
		}
	};

	CommandHandler.prototype.listen = function(bot) {
		var self = this;
		bot.on("chat", function(chat) {
			if (cmd = self.parseChat(chat)) {
				self.handleCommand(cmd);
			}
		});
	};

	module.exports = {
		CommandHandler: CommandHandler
	};
})();
