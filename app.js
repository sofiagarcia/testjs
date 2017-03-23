var connect = require('connect');
var urlParse = require('url').parse;
var fs = require('fs');


var iconList = fs.readFileSync(__dirname + '/data/icons.list').toString().split('\n').filter(function(site){
	return site;
});


var random = function(max){
	return Math.floor(Math.random() * max);
};

var icon2Site = function(icon){
	var site = icon.replace(/_/g,'.').replace(/\.png$/,'');

	if(Math.random() > 0.9){
		return 'web-' + site;
	}
	return site;
};

var breaches = [];

// breaches generation
(function(){
	for(var i =0; i< 1000; i++){
		var index = random(iconList.length);
		breaches.push({
			site : icon2Site(iconList[index]),
			date : Date.now() - 432000000 + random(432000000),
			number : random(100000)
		});
	}
})();

breaches.sort(function(a,b){
	return a.date - b.date;
});

var randomResponse = function(respondSuccess, respondError){
	var respond = Math.random() < 0.9 ? respondSuccess : respondError;
	var timeRandom = Math.random();
	var responseTime = 100;
	if(timeRandom < 0.05){
		responseTime = 10000;
	} else if(timeRandom < 0.2){
		responseTime = 1000;
	}
	setTimeout(respond, responseTime);
};

var jsonResponse = function(res, code, body){
	res.writeHead(code, {
		'Content-Type' : 'application/json',
        'Content-Length' : Buffer.byteLength(body)
    });
	res.end(body);
};

var app = connect()
	.use(connect.logger('dev'))
	.use(function(req,res,next){
		req.parsedUrl = urlParse(req.url, true);
		next();
	})
    .use(function(req,res,next){
		if(req.parsedUrl.pathname !== '/ws/breaches'){
			return next();
		}
		var index = parseInt(req.parsedUrl.query.index, 10) || 0;
		var respondSuccess = function(){
			jsonResponse(res,200,JSON.stringify({
				result : breaches.slice(index, index + 20)
			}));
		};
		var respondError = function(){
			jsonResponse(res,500,JSON.stringify({
				error : 'internal error, try again later'
			}));
		};
		randomResponse(respondSuccess,respondError);
	})
	.use(function(req,res,next){
		if(req.parsedUrl.pathname !== '/ws/icon'){
			return next();
		}
		var site = req.parsedUrl.query.site || "";
        console.log(req.parsedUrl.query.site);
		site = site.replace(/\./g,'_') + ".png";
		var hasIcon = iconList.indexOf(site) >= 0;
        console.log( site + " " + hasIcon);

		var respondSuccess = function(){
			if(hasIcon){
				jsonResponse(res,200,JSON.stringify({
					result : "https://s3-eu-west-1.amazonaws.com/static-icons/" + site
				}));
			} else {
				jsonResponse(res,404,JSON.stringify({
					result : null
				}));
			}
		};
		var respondError = function(){
			jsonResponse(res,500,JSON.stringify({
				error : 'internal error, try again later'
			}));
		};
		randomResponse(respondSuccess,respondError);
	})
	.use(connect.static(__dirname + '/public', {
        maxAge : 1000 * 60 * 5 // Five minutes of cache
    }));

app.listen(4242);
