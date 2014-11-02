var start = new Date();

var fs = require('fs');
var path = require('path');
var util = require('util');

var express = require('express');

app = express();

gracefullyClosing = false;

app.configure(function () {
	console.log("Environment: " + (app.get('env')));
	app.set('port', process.env.PORT || 8080);
	app.set("view options", {layout: false});
	app.disable("x-powered-by");
	app.use(function (req, res, next) {
		if (!gracefullyClosing) {
			return next();
		}
		res.setHeader("Connection", "close");
		return res.send(502, "Server is in the process of restarting");
	});
	app.use(function (req, res, next) {
		req.forwardedSecure = req.headers["x-forwarded-proto"] === "https";
		return next();
	});
	app.use(express.static(__dirname + '/public'));
	app.use(express.favicon('public/favicon.ico'));
	app.use(express.json());
	app.use(express.urlencoded());
	app.use(express.cookieParser());
	app.use(express.session({
		secret: process.env.SESSION_SECRET,
		maxAge: new Date(Date.now() + 3600000),
		key: "sessionId"
	}));
	app.use(express.logger());
	app.use(express.methodOverride());
	return app.use(function (err, req, res, next) {
		console.error("Error: " + err + ", Stacktrace: " + err.stack);
		return res.send(500, "Something broke! Error: " + err + ", Stacktrace: " + err.stack);
	});
});

app.get('/', function(req, res) {
	res.sendfile(__dirname + '/views/index.html');
});

app.configure('development', function () {
	return app.use(express.errorHandler({
		dumpExceptions: true,
		showStack: true
	}));
});

app.configure('production', function () {
	return app.use(express.errorHandler());
});

httpServer = app.listen(app.get('port'));

process.on('SIGTERM', function () {
	console.log("Received kill signal (SIGTERM), shutting down gracefully.");
	gracefullyClosing = true;
	httpServer.close(function () {
		console.log("Closed out remaining connections.");
		return process.exit();
	});
	return setTimeout(function () {
		console.error("Could not close connections in time, forcefully shutting down");
		return process.exit(1);
	}, 30 * 1000);
});

process.on('uncaughtException', function (err) {
	console.error("An uncaughtException was found, the program will end. " + err + ", stacktrace: " + err.stack);
	return process.exit(1);
});

console.log("Express listening on port: " + (app.get('port')));

console.log("Started in " + ((new Date().getTime() - start.getTime()) / 1000) + " seconds");
