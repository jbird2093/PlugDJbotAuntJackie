var testrunner = require("qunit");

testrunner.run({
	"code" : "lib/commands.js",
	"tests" : "test/commands.js"
});

testrunner.run({
	"code" : "lib/track_enforce.js",
	"tests" : "test/track_enforce.js"
});
