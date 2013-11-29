var	express = require('express');
var	http = require('http');
var path = require('path');
var app = express();

/*tweet streamer*/
//tweetStream = require('./tweetStream'),

/*mongo*/
var mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/finalyearproject';
var Db = require('./mongo.js');
var db = new Db(mongoUri);

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));

//root get
app.get('/findAll', function(req, res){
    db.findAll( function(err, data){
        res.json(data); 
    })
});


app.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});