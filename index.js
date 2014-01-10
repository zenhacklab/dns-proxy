
var dns = require('native-dns'),
    http = require('http'),
    util = require('util'),
    fs = require('fs'),
    tcpserver = dns.createTCPServer(),
    server = dns.createServer(),
    argv = require('optimist')
    .default('dns_host', '127.0.0.1')
    .default('web_host', '127.0.0.1')
    .default('dns_proxy', '8.8.8.8')
    .default('dns_port', 53)
    .default('web_port', 80)
    .default('log_file', 'log.txt')
    .argv;

var log = fs.createWriteStream(argv.log_file, {'flags': 'a', encoding: null});

// proxy hash table
var hashMap = {
  "www.example.example.com" : "127.0.0.1"
};

// dns proxy server
var onMessage = function (request, response) {
  var address = request.address.address;
  var host = request.question[0].name;

  // log request
  console.log(util.format("[%s] Lookup %s", address, host));
  log.write(util.format("[%s] Lookup %s\n", address, host));

  // parse request
  if( hashMap[ host ] ) {

    // intercept & reroute
    var newHost = hashMap[ host ];

    console.log(util.format("[%s] Intercept %s -> %s", address, host, newHost));
    log.write(util.format("[%s] Intercept %s -> %s\n", address, host, newHost));

    response.answer.push(dns.A({
      name: host,
      address: newHost,
      ttl: 600,
    }));

    response.send();
  } else {
    // forward
    console.log(util.format("[%s] Forward %s", address, host));
    log.write(util.format("[%s] Forward %s\n", address, host));

    var question = dns.Question({
      name: host,
      type: dns.consts.NAME_TO_QTYPE.A
    });

    var newreq = dns.Request({
      question: question,
      server: { address: argv.dns_proxy, port: 53, type: 'udp' },
      timeout: 1000,
    });

    newreq.on('message', function (err, answer) {
      answer.answer.forEach(function (res) {
        if( res.type == 1 ) {
          response.answer.push(dns.A({
            name: host,
            address: res.address,
            ttl: 1000,
          }));
        }
      });

        response.send();
    });

    newreq.send();
  }
};

var onError = function (err, buff, req, res) {
  console.log( err.stack );
};

var onListening = function () {
  console.log('dns server listening on', this.address().address);
};

var onSocketError = function (err, socket) {
  console.log(err);
};

var onClose = function () {
  console.log('server closed ', this.address().address);
};

server.on('request', onMessage);
server.on('error', onError);
server.on('listening', onListening);
server.on('socketError', onSocketError);
server.on('close', onClose);

tcpserver.on('request', onMessage);
tcpserver.on('error', onError);
tcpserver.on('listening', onListening);
tcpserver.on('socketError', onSocketError);
tcpserver.on('close', onClose);

server.serve(argv.dns_port, argv.dns_host);
tcpserver.serve(argv.dns_port, argv.dns_host);

// http server
var onRequest = function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});

  fs.readFile('log.txt', function (err, data) {
    if (err) throw err;
    res.write(data);
    res.end();
  });
};

http.createServer( onRequest ).listen(argv.web_port, argv.web_host);

console.log('web server listening on '+ argv.web_host +':'+ argv.web_port);
