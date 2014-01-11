var dns = require('native-dns'),
    http = require('http'),
    util = require('util'),
    fs = require('fs'),
    options = require('commander'),
    tcpserver = dns.createTCPServer(),
    server = dns.createServer();

options
  .version('0.1.0')
  .option('-dh, --dns_host [ip]', 'DNS Host Address', '127.0.0.1')
  .option('-wh, --web_host [ip]', 'HTTP Server Host Address', '127.0.0.1')
  .option('-dph, --dns_proxy [ip]', 'DNS Proxy Host Address', '8.8.8.8')
  .option('-dp, --dns_port [port]', 'DNS Server Port', 53)
  .option('-wp, --web_port [port]', 'HTTP Server Port', 1337)
  .option('-lf, --log_file [file]', 'Log file name', 'log.txt')
  .parse(process.argv);

var log = fs.createWriteStream(options.log_file, {'flags': 'a', encoding: null});

// proxy hash table
// "target-host" : "returned-host"
var hashMap = {
  "www.example.com" : "127.0.0.1"
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
      server: { address: options.dns_proxy, port: 53, type: 'udp' },
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

server.serve(options.dns_port, options.dns_host);
tcpserver.serve(options.dns_port, options.dns_host);

// http server
var onRequest = function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});

  fs.readFile('log.txt', function (err, data) {
    if (err) throw err;
    res.write(data);
    res.end();
  });
};

http.createServer( onRequest ).listen(options.web_port, options.web_host);

console.log('web server listening on '+ options.web_host +':'+ options.web_port);