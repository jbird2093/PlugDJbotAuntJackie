var mockbot;
QUnit.module("Command Module", {setup: function() {
	mockbot = {
		speak: function() {
			this.speakCalled || (this.speakCalled = 0);
			this.speakCalled++;
		}
	};
}});

var ParamCmd = Base.extend({
	needsParam: true
});
var NumberParamCmd = Base.extend({
	needsParam: true,
	isValid: validations.hasNumberParam
});

var cmdObj = {
	who: {
		isOwner: false,
		isStaff: false,
		isSelf: false
	}
};

test("test base command", function(assert) {
	var cmd = new Base({bot: mockbot});
	var result = cmd.execute(cmdObj);
	// execute will reutrn false on error
	equal(result, undefined, "no validition/permission errors");
});

test("permission anyone", function(assert) {
	var cmd = new Base({bot: mockbot, permissions: permissions.PERMISSION_ANYONE});
	ok(cmd.hasPermission(cmd.who), "everybody has access");
});

test("permission staff", function(assert) {
	var cmd = new Base({bot: mockbot, permissions: permissions.PERMISSION_STAFF});
	ok(cmd.hasPermission({isStaff: true}), "staff has access");
	ok(!cmd.hasPermission({isStaff: false}), "non-staff no access");
});

test("permission big kid", function(assert) {
	var cmd = new Base({bot: mockbot, permissions: permissions.PERMISSION_BIG_KID});
	equal(cmd.PERMISSION_LEVEL, permissions.PERMISSION_BIG_KID, "permission passed in correctly");

	ok(cmd.hasPermission({isStaff: true}), "staff has access");
	ok(cmd.hasPermission({isOwner: true}), "owner has access");
	ok(cmd.hasPermission({isJBIRD: true}), "master has access");
	ok(!cmd.hasPermission({}), "no access");
});

test("echo command", function(assert) {
	var cmd = new Echo({bot:mockbot});
	cmd.execute({param: "hello world"});
	equal(1, mockbot.speakCalled, "speak was called once");
});

test("param validation", function(assert) {
	var cmd = new ParamCmd({bot: mockbot});
	equal(cmd.execute(), "param", "failed on param");
});

test("number param validation", function(assert) {
	var cmd = new NumberParamCmd({bot: mockbot});
	equal(cmd.execute({"param":"foo"}), "param", "failed on param");
});
