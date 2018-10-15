Patavi server dockerfile
========================

For more information on all components of the drugis project, please refer to the OVERALL-README.md in the root folder of the ADDIS-CORE project.

Prerequisites:

 - Create an `ssl` directory (e.g. /patavi/server/docker/ssl/), containing:

   - `/server-crt.pem` and `/server-key.pem`, the public/private certificate/key pair for the server
   - `/ca-crt.pem`, the CA certificate file for the server to trust client connections with. *Note*: This is only required if you expect connections from clients presenting certificates that are not in the normal trust chain, e.g. self-signed ones.

Building:

```
docker build -t patavi/server-amqp --build-arg sha=`git rev-parse --short HEAD` .
```

Running:
Make sure to have a rabbitmq container running, as well as a postgres database. If the database is running on the same server, you can use another `--link postgres:localhost` argument to make it available directly.

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
  patavi/server-amqp
```
