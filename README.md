# pipe-webserver

A web server in [Deno](https://github.com/denoland/deno) using UNIX pipelines.

## Summary

One of the most amazing things that I love about UNIX is the ways of work that arose from the UNIX philosophy but, in the age of the internet, we saw ever more complicated web servers emerge.

Be it Apache, NGINX, IIS, or Tomcat truth is they do a lot more than serving webpages!
They parse, zip, process, add headers, check security, route requests, adapt templates, do TLS, provide dashboards, manage other sub-processes through the way of workers and also do some process management using Fast-CGI or other APIs.

This project tries to follow the UNIX principles and create a web server based on nothing more than open standards and the pure UNIX philosophy while focusing on per process security and making developing web servers/applications a lot simpler and open.

As summarized by Peter H. Salus in A Quarter-Century of Unix (1994):
- "Write programs that do one thing and do it well."
- "Write programs to work together."
- "Write programs to handle text streams, because that is a universal interface."

## API

The processes share requests one line at a time so that the request object is an [NDJSON](http://ndjson.org/) document following a JSON schema, see version 1 for details.

The API is also versioned from the start allowing you to mix and match components with different versions without breaking functionality in between them.
Programs

The programs can be any Linux executable that works with text and talks through the standard *STDIN/STDOUT/STDERR* interfaces, some basic programs are already included for you to start a simple HTTP 1.0 web-server implementation. ( Check the docker examples )

The initial programs are written for [Deno](https://github.com/denoland/deno) since the Deno internal sandbox disallows access to the external resources by default, this is great for security reasons and lets you control security per process by only allowing the receiver and emitter programs to connect to the internet.

## Architecture

![dot diagram](./docs/example.png)

Processes can be programmed in any language and can only talk through standard UNIX pipelines and should start with a receiver program (which translates the HTTP request to the internal representation) and end with the emitter (responsible for sending the request back to the client).

Besides these two processes, the order of the programs in the pipeline is not in any way enforced and can change in any combination possible.

Even though the messages are processed in a synchronized way nothing prevents the processes from treating them asynchronously or even prevents some of them from reaching the end of the pipeline, all requests without a reply will be canceled after 5 seconds and return 408 (Request Timedout) to the client.

The applications print to the standard error output other messages for debugging purposes.

## Examples

### Example 1

Receive requests on the default port pass them through a filter ("that marks the request as filtered") and return a response to the user

```sh
$ receiver | filter | emitter
```

This example is implemented in the ```Dockerfile.example1``` file.

To build: ```$ docker build -f Dockerfile.example1 -t server .```

Then to run: ```$ docker run -p 8000:8000 server```

### Example 2

Receive requests on the default port pass them through a filter ("that only allow a certain url to pass") and return a response to the user

```sh
$ receiver | filter --filterUrl="/helloworld" | hello-world | emitter
```

This example is implemented in the ```Dockerfile.example2``` file.

To build: ```$ docker build -f Dockerfile.example2 -t server .```

Then to run: ```$ docker run -p 8000:8000 server```

### Example 2.1

Receive requests on the default port pass them through sed ("that writes hello world in the body") and return a response to the user.

```sh
$ receiver | \
  sed 's/}$/body:"<h1>Hello world</h1>"}/g' | \
  emmiter 
```

### Example 3

Receive requests on the default port, reply with the favicon if requested, and reply with helloworld all the other requests.

```sh
$ receiver | favicon | hello-world | emmiter 
```

This example is implemented in the ```Dockerfile.example3``` file.

To build: ```$ docker build -f Dockerfile.example3 -t server .```

Then to run: ```$ docker run -p 8000:8000 server```

### Example 4

Receive requests on the default port, log the requests, pass them through sed (writing a log message), log the reply and return a response to the user.

```sh
$ receiver | \
  tee access.log | \
  sed 's/"reply":{}/"reply":{"body":"<h1>This response is being logged</h1>"}/g' | \
  tee response.log | \
  emmiter 
```

### Example 5

Receive requests on the default port, pass them through the blog program to fetch the static blog file from the docs folder.

```sh
$ receiver | blog | emmiter 
```

This example is implemented in the ```Dockerfile.example5``` file.

To build: ```$ docker build -f Dockerfile.example5 -t server .```

Then to run: ```$ docker run -p 8000:8000 server```

### Example 6

Receive requests on the default port, require basic-auth, pass them through the blog program to fetch the static blog file from the docs folder.

```sh
$ receiver | basic-auth | blog | emmiter 
```

This example is implemented in the ```Dockerfile.example6``` file.

To build: ```$ docker build -f Dockerfile.example6 -t server .```

Then to run: ```$ docker run -p 8000:8000 server```

Credentials: ```tim:scott```

## Independent processes

Since we are using Deno as our main driver for this project it is possible to bundle the scripts and pack the execution into individual executables that will be run separately.

For that we can use the 'warp-packer' project and now we will have different executables that we can mix and match to do the multiple webserver configurations.

To build: ```$ docker build -f Dockerfile.packer,nacosx64 -t packer .```

And then to get the executables: 
```
$ INSTANCE=$(docker create packer)
$ docker cp $INSTANCE:/root/receiver.bin receiver
$ chmod +x receiver
$ 
$ docker stop $INSTANCE

```

## Features and TODO list

Tasks strikedthrough are already done, others are in the roadmap.

* ~~Create the request API 0.1 schema~~
* ~~Implement the "Receiver" program~~
* ~~Implement the "Emitter" program~~
* ~~Create an basic example of an http server that receives a input text and replies with "Hello world"~~
* ~~Create an example of the same program but logging the events to an external file. ( access.log )~~
* ~~Add docker files with examples of the webservers~~
* ~~Implement a "Filter" program~~
* ~~Create an example of a program that filters the given requests and only allow for a given url to reply to the user.~~
* ~~Implement a "Blog" program ( replies with a given html file )~~
* ~~Create the request API 0.2 schema~~
* ~~Implement a HTTP basic authentication program~~
* ~~Implement a static favicon program as an example~~
* ~~Added a packer docker build that will create independent executables~~
* Implement a "Router" program
* Implement a "Redirect" program

## Features that will not be considered or not part of the design

* SSL/TLS implementation - just use stunnel4 a great program which already follows the unix way.
* Websockets and other "stream" based apis - makes no sense to be controlled by pipelines.
* Logging - there's already a lot of great tools to do this job.

