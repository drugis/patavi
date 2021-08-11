# Docker compose setup for patavi

This docker compose setup is meant to provide an easier way to get patavi up and running on a personal computer or laptop. It is meant to be used in conjunction with the docker compose setup of our other modules (ADDIS, GeMTC, MCDA).

Prerequisites:

- Have docker installed (https://docs.docker.com/get-docker/).
- Have docker-compose installed (https://docs.docker.com/compose/install/).
- Have the files in this folder on your system.

The following components will be run inside of this compose:

- A Patavi server.
- A RabbitMQ.
- A Postgres database.
- A docker network for the other modules to connect to.

How to run:

In a terminal/command prompt type `docker-compose up`. The first time this command is run, all necessary docker images will be downloaded. After this, the setup can be ran without an internet connection by using the same command. If, after the first time, you want to make sure you are using the latest version, use `docker-compose pull` before running `docker-compose up`.

NB: **all services will be run with simple development/testing passwords. This is intended as a local, offline environment. For deployment in secure/online environments, apply different methodology and better security, or contact the developers for advice.**
