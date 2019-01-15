Patavi server dockerfile
========================

This readme provides instructions for running the patavi server in a docker container. For instructions on running the application as a NodeJS process please follow the readme in the `server` folder.

For more information on all components of the drugis project, please refer to the OVERALL-README.md in the root folder of the ADDIS-CORE project.

Prerequisites:

- Create an `ssl` directory (e.g. /patavi/server/docker/ssl/), containing:
  - `/server-crt.pem` and `/server-key.pem`, the public/private certificate/key pair for the server
  - `/ca-crt.pem`, the CA certificate file for the server to trust client connections with. All clients attempting to post tasks must identify themselves with a certificate/key pair trusted by this authority.
- Make sure to have a rabbitmq container running (see the README in the root of this repository for an example run command)
- Have a postgres database running. The `setup-db.sh` script will initialise an existing `postgres` docker container with appropriate settings. Alternately, if you have a postgres running outside of a container, execute:

Building (optional, if you don't build you will use our pre-built docker image):

```
docker build -t addis/patavi-server --build-arg sha=`git rev-parse --short HEAD` .
```

Running:

Example run command (fill in terms between <> appropriately):

```
docker run -d --name patavi-server-amqp \
  --link <rabbitmq-container-name>:rabbit \
  -e PATAVI_BROKER_HOST=<user>:<pass>@rabbit \
  -p 3000:3000 \
  -e PATAVI_SELF=//localhost:3000 \
  -e PATAVI_PORT=3000 \
  -e PATAVI_DB_HOST=<db-host> \
  -e PATAVI_DB_NAME=<db-name> \
  -e PATAVI_DB_USER=<db-user> \
  -e PATAVI_DB_PASSWORD=<db-pass> \
  addis/patavi-server
```
