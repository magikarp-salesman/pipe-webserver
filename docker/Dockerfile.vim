FROM ubuntu:focal

RUN apt-get -qq update \
    && apt-get -qq install -y --no-install-recommends \
    locales \
    ca-certificates \
    software-properties-common

ENV LANG C.UTF-8
ENV LC_ALL C.UTF-8

RUN add-apt-repository ppa:jonathonf/vim

RUN apt-get -qq update \
    && apt-get -qq install -y --no-install-recommends \
    curl \
    wget \
    vim \
    ca-certificates \
    git \
    ssh \ 
    locales

WORKDIR /root

RUN curl -o .vim_magikarp/.vimrc --create-dirs https://raw.githubusercontent.com/magikarp-salesman/magikarp.vim/master/.vimrc \
    && ln -sf .vim_magikarp/.vimrc .vimrc \
    && bash .vimrc

COPY docker/autocommand.vim /root/.vim_magikarp/plugin/pipe/

COPY docker/id_rsa.pub /root/.ssh/authorized_keys

EXPOSE 22

CMD service ssh start && tail -F /dev/null
