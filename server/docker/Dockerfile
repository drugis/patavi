FROM phusion/baseimage

ENV LANG C.UTF-8
ENV LC_ALL C.UTF-8

RUN apt-get update
RUN apt-get upgrade -y

# Install nodejs
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_8.x | bash -
RUN apt-get install -y nodejs

RUN apt-get install -y unzip git

RUN npm install -g bower
RUN npm install -g pm2

RUN groupadd --gid 9999 drugis_group
RUN useradd --create-home --home /var/lib/patavi --gid 9999 patavi
WORKDIR /var/lib/patavi

RUN mkdir ssl
COPY ssl/ca-crt.pem ssl/
RUN chown -R patavi:drugis_group ssl

USER patavi

ENV HOME /var/lib/patavi

ARG sha=master
ARG repo=https://github.com/drugis/patavi

RUN curl -sL $repo/archive/$sha.zip -o patavi.zip
RUN unzip patavi.zip && mv patavi-*/server/* .

RUN npm install --production
RUN cd public && bower install

CMD ["pm2", "start", "--no-daemon", "server.js"]
