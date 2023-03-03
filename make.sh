#!/bin/bash
set -e
cd docker
deno task build-common

export DOCKER_BUILDKIT=0
docker build -t pipe-webserver/puppeteer -f Dockerfile.puppeteer ..
docker build -t pipe-webserver/vim -f Dockerfile.vim ..
docker build -t pipe-webserver/golang-builder -f Dockerfile.golang-builder ..

docker build -t pipe-webserver/magikarp -f Dockerfile.magikarp ..
docker build -t pipe-webserver/magikarp.dev -f Dockerfile.magikarp.dev ..
[[ "$1" != "all" ]] && exit

docker build -t pipe-webserver/example1 -f Dockerfile.example1 ..
docker build -t pipe-webserver/example2 -f Dockerfile.example2 ..
docker build -t pipe-webserver/example3 -f Dockerfile.example3 ..
docker build -t pipe-webserver/example5 -f Dockerfile.example5 ..
docker build -t pipe-webserver/example6 -f Dockerfile.example6 ..
docker build -t pipe-webserver/example7 -f Dockerfile.example7 ..
docker build -t pipe-webserver/example8 -f Dockerfile.example8 ..
docker build -t pipe-webserver/example9 -f Dockerfile.example9 ..
docker build -t pipe-webserver/example10 -f Dockerfile.example10 ..

docker build -t pipe-webserver/packer -f Dockerfile.packer.macosx64 ..