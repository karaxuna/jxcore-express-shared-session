var express = require('express'),
    Session = require('express-session'),
    Store = Session.Store;

function JXSessionStore() {
    Store.call(this);
}

JXSessionStore.prototype.__proto__ = Store.prototype;

JXSessionStore.prototype.get = function (sessionId, callback) {
    var session = jxcore.store.shared.read(sessionId);
    var sessionParsed = session ? JSON.parse(session) : null;
    callback(null, sessionParsed);
}

JXSessionStore.prototype.set = function (sessionId, session, callback) {
    jxcore.store.shared.set(sessionId, JSON.stringify(session));
    callback(null, session);
}

JXSessionStore.prototype.touch = function (sessionId, session, callback) {
    jxcore.store.shared.set(sessionId, session);
    callback(null);
}

JXSessionStore.prototype.destroy = function (sessionId, callback) {
    jxcore.store.shared.remove(sessionId);
    callback(null);
}

var app = express(),
    server = require('http').createServer(app);

// set session middleware
app.use(new Session({
    store: new JXSessionStore(), // use custom store
    resave: true,
    saveUninitialized: false,
    secret: 'TEST_SECRET',
    cookie: {
        maxAge: 900000 // keep cookie
    }
}));

// get session data
app.get('/', function (req, res) {
    res.send({
        foo: req.session.foo || 'Not set. Go to \'/set\' to set value.',
        thread: process.threadId
    });
});

// set session data
app.get('/set', function (req, res) {
    req.session.foo = 'bar';
    res.send({
        thread: process.threadId,
        message: 'foo value set to \'bar\' in session.'
    });
});

// start server
var port = 80;
server.listen(port, function () {
    console.log("server (thread %s) listening on port %s", process.threadId, port);
});