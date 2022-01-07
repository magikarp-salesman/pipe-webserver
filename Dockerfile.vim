FROM ubuntu:focal

RUN apt-get -qq update \
    && apt-get -qq install -y --no-install-recommends \
    curl \
    vim \
    ca-certificates \
    git \
    ssh \ 
    locales

ENV LANG C.UTF-8
ENV LC_ALL C.UTF-8

WORKDIR /root

RUN curl -o .vim_magikarp/.vimrc --create-dirs https://raw.githubusercontent.com/magikarp-salesman/magikarp.vim/master/.vimrc \
    && ln -sf .vim_magikarp/.vimrc .vimrc \
    && bash .vimrc

COPY id_rsa.pub /root/.ssh/authorized_keys

EXPOSE 22

CMD service ssh start && tail -F /dev/null