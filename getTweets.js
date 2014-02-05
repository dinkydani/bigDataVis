var twitter = require('ntwitter');
var request = require('superagent');
var credentials = require('./credentials.js');
var Db = require('./mongo.js');

var twit = new twitter({
    consumer_key: credentials.consumer_key,
    consumer_secret: credentials.consumer_secret,
    access_token_key: credentials.access_token_key,
    access_token_secret: credentials.access_token_secret
});

/*mongo*/
//var mongoUri = 'mongodb://localhost/finalyearproject';
var mongoUri = 'mongodb://dinkydani:' + credentials.mongo_password + '@ds061238.mongolab.com:61238/heroku_app21304795';
var db = new Db(mongoUri);

//variables for sentiment batching (dont want to kill their server)
var sentimentBatch = []; //array to store tweets until they are sent to sentiment analysis
var sentimentUrl = 'http://www.sentiment140.com/api/bulkClassifyJson'; //url of sentiment analysis

var batchSize = 25; //number of tweets to batch 

var topicToTrack = ['Sochi2014', 'sochi', 'olympics', 'olympic']; //'track' : topicToTrack, 

var GetTweets = function(){}; //define a tweet streamer object

GetTweets.prototype.stream = function() {
        //call the stream with a filter to ensure tweets have geo 
        //twit.stream('statuses/filter', {'locations':'-180,-90,180,90'}, function (stream) {
        twit.stream('statuses/filter', {'track': topicToTrack}, function (stream) {
        	//when a tweet comes in strip the data out, get sentiment and store in mongo
	      	stream.on('data', function (data) {
	        	processTweet(data);
	      	});
	      	stream.on('end', function (response) {
				// Handle a disconnection
				console.error("Stream disconnected");
			});
			stream.on('destroy', function (response) {
				// Handle a 'silent' disconnection from Twitter, no end/error event fired
				console.error("Stream destroyed");
			});

	        //kill the stream after x seconds
	        //setTimeout(stream.destroy, 15000);
        });
};

function processTweet(data){
	//take the large data object and only store the information needed
	var tweet = {
		id : data.id,
		time : data.created_at,
		text : data.text,
		hashtags : data.entities.hashtags || [],
		retweets : data.retweet_count,
		geo : {
			geo : data.geo, // lat long
			coords : data.coordinates, // long lat (geojson form)
			place : data.place //sometimes null, can have place.country_code or place.country if not null
		}
	};
	//if the user data is not null then might be useful if allow clicking on individual tweets later
	if ( typeof data.user !== 'undefined' ) {
	    tweet.user = {
		    id : data.user.id,
		    name : data.user.name,
		    followers : data.user.followers_count,
		    screen_name : data.user.screen_name
	    };
	};

	//get the sentiment for this tweet
	getGeo(tweet, function(tweet, data){
		getSentiment(tweet, function(data){
		console.log("Got sentiment");

		//store tweets in mongo
		db.insert(data, function(err, res){
			if(err)console.error("Error saving to Mongo: ", err.message);
			else console.log("Success saving to Mongo");
		});
	});
	});
	
};

function getSentiment(tweet, callback){
	
	/* Polarity
		0: negative
		2: neutral
		4: positive
	*/
	//push the tweet to the array to be sent to sentiment analysis
	sentimentBatch.push({
		id : sentimentBatch.length,
		text : tweet.text,
		tweet : tweet
	});
	console.log("batch length: " + sentimentBatch.length);

	// if the batch becomes full
	if(sentimentBatch.length === batchSize){
		console.log("Batch full, getting sentiment");

		//set the batch to the data of attribute data for sentiment url
		var data = {
			data : sentimentBatch
		};

		//use superagent to make http request
		request
      		.post(sentimentUrl)
      		.send(data)
    		.end(function (error, res) {
		    	if (res.ok) {
		    		callback(res.body.data);
		    	}
		    	else {  
		    		console.error('Error getting sentiments', res.text);
		    	}
    	});

    console.log('Reset batch');
    sentimentBatch = [];

	}
}

function getGeo(tweet, callback){
	//if a tweet has a place (country code)
	if(tweet.geo.place){
		//if a tweet has geo and coordinates for mapping 
		if(tweet.geo.geo){
			//then it can be sent for sentiment analysis
			callback(tweet);
		}else{
			//console.log("no geo tweet disposed");
		}
	} else{
		//console.log("no place tweet disposed");
	}
}

//setup the streamer object and start the stream
var tweets = new GetTweets();
tweets.stream();

//module.exports = GetTweets;