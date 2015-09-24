### How to share session across mutiple nodejs http server instances

Nodejs applications can utilize all the CPU power and run on multiple threads using [JXcore's multithreading feature](http://jxcore.com/multithreaded-javascript-tasks/). Although Node.JS by default uses multiple threads for IO, JXcore makes JavaScript side is also benefiting from multi core as it's a very good deal for the high traffic and logic heavy applications. 

JXcore threads handle requests from the clients with priority first approach. Less busy thread is most likely the one to answer to request. This approach alone gives a great performance boost.

Each instance has it's own isolated memory. Sometimes you need to share data among multiple instances as you need to do it with multiple processes. i.e. You might need to share session data in express application. Following part of this tutorial, I will show how to do it.

Assuming you already have installed JXcore from [downloads page](http://jxcore.com/downloads), the next step is to install express and express-session modules:

```bash
jx install express@4.13.3 --save
jx install express-session@1.11.3 --save
```

Implement class that will inherit from `require('express-session').Store`:

```javascript
var Store = require('express-session').Store;

function JXSessionStore() {
    Store.call(this);
}

JXSessionStore.prototype.__proto__ = Store.prototype;
```

Then add necessary methods:

```javascript
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
```

When you set property of `req.session` object, then `JXSessionStore.prototype.set` function is called and data is stored in `jxcore.store.shared`, which is shared memory across JXcore tasks. So whenever any task gets value from `req.session` object's property, `JXSessionStore.prototype.get` function gets called and returns shared data. So we just changed session object's getter and setter logic. Now let's create express app:

```javascript
var app = require('express')(),
    server = require('http').createServer(app),
    Session = require('express-session');

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
```

You can run server on multiple threads with `jx mt-keep` command:

    jx mt-keep:5 index

This means that 5 server instances will be started with `keepAlive` flag. Go to `localhost/set` to set session value and go to `localhost` to get it. Every thread will return same session data.
