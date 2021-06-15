FROM phusion/baseimage:18.04-1.0.0

ENV LANG C.UTF-8
ENV LC_ALL C.UTF-8

RUN apt update
RUN apt upgrade -y -f -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" 

# Install nodejs
RUN apt install -y curl
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash -
RUN apt install -y nodejs
RUN npm install -g yarn

RUN groupadd --gid 9999 drugis_group
RUN useradd --create-home --home /var/lib/patavi --gid 9999 patavi

COPY . /var/lib/patavi
WORKDIR /var/lib/patavi
RUN chown -R patavi:drugis_group ssl

USER patavi
ENV HOME /var/lib/patavi
RUN yarn

CMD ["node", "server.js"]
