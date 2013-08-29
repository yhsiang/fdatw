

var https = require('https')
	, fs = require('fs')
	,	Server = require('mongodb').Server
	,	MongoClient = require('mongodb').MongoClient
	, Db = require('mongodb').Db
	,	parseString = require('xml2js').parseString
	, config = require('./config');

var mongoclient = new MongoClient();

var dburl = config.db;

function storeIt(docs) {
	mongoclient.connect(dburl, function (err, db) {
		var FoodAdditives = db.collection('FoodAdditives');
				FoodAdditives.insert(docs, function(err, docs) {
					if(!err) 
						console.log('Insert Success');
					if(err)
						throw err;
					db.close();
				});
	});
}

function fetch (config, callback) {

	var host = config.url.split('/')[2]
		,	path = config.url.split(host)[1]
		, pageNo = config.pageNo || 500
		, start = config.start || 0
		, params = '?pageNo='+pageNo+'&start='+start;

		var options = {
			host: host,
			path: path+params,
			rejectUnauthorized: false
		};

		https.request(options, function (res) {
			var xml = '';
			res.on('data', function(chunk) {
				xml += chunk;
			});
			res.on('end', function () {
				xml = xml.replace("\ufeff", "");
				parseString(xml, function (err, result) {
					var total = result.root.docNo[0]
					, data = result.root.results[0].aResult
					,	pages = Math.ceil(total/ pageNo);
					callback(pages, result);
				});
			})
		}).end();
}

function parseAndstore(data) {
	var newData = [];
	data.forEach(function (item) {
		var newItem = {};
		for(var key in item) {
			newItem[key]=item[key][0].trim();
		}
		newData.push(newItem);
	});
	storeIt(newData);
}

fetch(config, function (pages, result) {
	parseAndstore(result.root.results[0].aResult);	
	for(i=1 ; i< pages; i++ ) {
		config.start =i ;
		fetch(config, function (pages, result) {
			parseAndstore(result.root.results[0].aResult);
		});
	}
});