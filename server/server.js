const http = require('http'),
    fs = require('fs'),
    path = require('path'),
    mime = require('mime');

var cache = {};
var socketServer = require('./socketServer');

// Routes root url to '/public/index.html' and sends 404 error to all HTTP requests that have no endpoint.

var staticServer = {
    send404: function(response) {
        fs.readFile('./public/404.html', 'utf-8', (err, content) => {
            response.writeHead(404, { 'Content-Type': 'text/html' });
            response.write(content);
            response.end();
        });
    },
    sendFile: function(response, filePath, fileContents) {
        response.writeHead(200, { 'Content-Type': mime.lookup(path.basename(filePath)) });
        response.end(fileContents);
    },
    sendStatic: function(response, cache, absPath) {
        if (cache[absPath]) {
            this.sendFile(response, absPath, cache[absPath]);
        } else {
            fs.exists(absPath, (exists) => {
                if (exists) {
                    fs.readFile(absPath, (err, data) => {
                        if (err) this.send404(response);

                        cache[absPath] = data;
                        this.sendFile(response, absPath, data);
                    });
                } else {
                    this.send404(response);
                }
            });
        }
    }
}

// Main HTTP server instance
var server = http.createServer((request, response) => {
    var filePath;

    if (request.url == '/') {
        filePath = 'public/index.html';
    } else {
        filePath = 'public' + request.url;
    }

    var absPath = './' + filePath;
    staticServer.sendStatic(response, cache, absPath);
});

server.listen(3000, () => {
    console.log('Listening...');
});

// socketServer will piggyback on our main HTTP server
socketServer.listen(server);
