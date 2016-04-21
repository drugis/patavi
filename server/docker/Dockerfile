FROM phusion/baseimage

ENV LANG C.UTF-8
ENV LC_ALL C.UTF-8

RUN apt-get update
RUN apt-get upgrade -y

# Install nodejs
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_5.x | bash -
RUN apt-get install -y nodejs

RUN apt-get install -y unzip

RUN useradd --create-home --home /var/lib/patavi patavi

USER patavi
WORKDIR /var/lib/patavi
ENV HOME /var/lib/patavi

ADD ssl ssl

ARG sha=feature/amqp

RUN curl -sL https://github.com/gertvv/patavi/archive/$sha.zip -o patavi.zip
RUN unzip patavi.zip && mv patavi-*/server-amqp/* .

RUN npm install --production

CMD node server