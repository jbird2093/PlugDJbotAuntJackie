module.exports = {
    avNumber: function (userid) {
        var str = '';
        switch (userid) {
            case 'greenhairgirl':
                str = '2'
                break;
            case 'gingergirl':
                str = '3'
                break;
            case 'blondefreckled':
                str = '4'
                break;
            case 'blackpointgirl':
                str = '1003'
                break;

                //100 point level BEARS
            case 'pincushionbear':
                str = '10'
                break;
            case 'greenbear':
                str = '11'
                break;
            case 'bluebear':
                str = '13'
                break;
            case 'orangebear':
                str = '15'
                break;

                //300 level pussycats
            case 'pinkpussy':
                str = '121'
                break;
            case 'gorilla':
                str = '23'
                break;
            case 'boymonkey':
                str = '36'
                break;
            case 'girlmonkey':
                str = '37'
                break;
            case 'pinkspace':
                str = '218'
                break;
            case 'purplespace':
                str = '219'
                break;
            case 'yellowspace':
                str = '221'
                break;
        }
        return str;
    }
};
