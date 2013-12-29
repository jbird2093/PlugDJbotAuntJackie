var User = function (user) {
    //username = '';  //status = 0; //language = ''; //dateJoined = ''; //djPoints = 0; //fans = 0; //listenerPoints = 0; //avatarID = 0; //curatorPoints = 0; //permission = 0; //lastActivity = '';

    this.id = user.id;
    this.username = user.username;
    this.status = user.status;
    this.language = user.language;
    this.dateJoined = user.dateJoined;
    this.djPoints = user.djPoints;
    this.fans = user.fans;
    this.listenerPoints = user.listenerPoints;
    this.avatarID = user.avatarID;
    this.curatorPoints = user.curatorPoints;
    this.permission = user.permission;
    this.lastActivity = new Date();
    this.onWait = false;
    this.isDj = false;
    this.noPlays = 0;
    this.escort = false;
    switch (this.permission) {
        case 10: //ADMIN
            this.staffRank = 'Admin';
            break;
        case 8: //AMBASSADOR
            this.staffRank = 'Ambassador';
            break;
        case 5: //HOST
            this.staffRank = 'Host';
            break;
        case 4: //COHOST
            this.staffRank = 'Co-Host';
            break;
        case 3: //MANAGER
            this.staffRank = 'Manager';
            break;
        case 2: //BOUNCER
            this.staffRank = 'Bouncer';
            break;
        case 1: //RESIDENTDJ
            this.staffRank = 'Resident DJ';
            break;
        default:
            this.staffRank = '';
    }
};
var Song = function () {
    this.id = '';
    this.djId = '';
    this.djName = '';
    this.title = '';
    this.artist = '';
    this.duration = '';
    this.score = { 'woots': 0, 'mehs': 0, 'grabs': 0 };     //Votes: %d:+1: %d:-1: %d:heart:
    this.newTrack = 0;
};

module.exports = {
	Song: Song,
	User: User
};
