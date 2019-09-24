FROM phusion/baseimage

ENV LANG C.UTF-8
ENV LC_ALL C.UTF-8

RUN apt-get update
RUN apt-get upgrade -y -f -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" 

# Install nodejs
RUN apt install -y curl
RUN curl -sL https://deb.nodesource.com/setup_8.x | bash -
RUN apt install -y nodejs

RUN apt install -y unzip git

RUN npm install -g yarn
RUN npm install -g pm2

RUN useradd --create-home --home /var/lib/patavi patavi
WORKDIR /var/lib/patavi

ADD ssl ssl
RUN chown -R patavi ssl

USER patavi
ENV HOME /var/lib/patavi

ARG sha=master
ARG repo=https://github.com/drugis/patavi

RUN curl -sL $repo/archive/$sha.zip -o patavi.zip
RUN unzip patavi.zip && mv patavi-*/server/* .

RUN npm install --production
RUN cd public && yarn

CMD ["pm2", "start", "--no-daemon", "server.js"]
