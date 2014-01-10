dns-proxy
=========

A simple nodejs dns proxy server that can intercept targeted requests and forward the rest.

Installing
==========

To install dns-proxy, open a shell in the root folder and type
```
npm install
```

To configure the hash map of target : response edit hashMap in index.js

Using
=====

To start dns-proxy with the default settings simply type
```
npm start
```

You can then navigate to the web interface to read the log easily, which by default is http://127.0.0.1:80

To change settings you simply pass them as command-line arguments
```
node ./index.js --web_host 127.0.0.1 --web_port 80 --dns_host 127.0.0.1 --dns_port 53 --dns_proxy 8.8.8.8 --log_file log.txt
```