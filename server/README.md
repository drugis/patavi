Patavi server standalone
========================

This readme provides instructions for running the patavi server as a NodeJS process. For docker instructions please follow the readme in the `server/docker` folder.

For more information on all components of the ADDIS project, please refer to its [OVERALL-README.md](https://github.com/drugis/addis-core/blob/master/OVERALL-README.md).

Prerequisites:

- Install a recent (> 8) version of NodeJS
- Install bower (optional, this is only required for the rudimentary web interface)
- Create an `ssl` directory (e.g. /patavi/server/ssl/), containing:
  - `/server-crt.pem` and `/server-key.pem`, the public/private certificate/key pair for the server
  - `/ca-crt.pem`, the CA certificate file for the server to trust client connections with. *Note*: This is only required if you expect connections from clients presenting certificates that are not in the normal trust chain, e.g. self-signed ones.
- Make sure to have a rabbitmq container running (see the README in the root of this repository for an example run command)
- Have a postgres database running. The `setup-db.sh` script will initialise an existing `postgres` docker container with appropriate settings. Alternately, if you have a postgres running outside of a container, execute:

  ```
  psql \
   -c "CREATE USER patavi WITH PASSWORD 'develop'" \
   -c "CREATE DATABASE patavi ENCODING 'utf-8' OWNER patavi" \
   -c '\c patavi patavi' \
   -f schema.sql \
  ```

- ensure that the environment variables are set up:

 ```
 export PATAVI_BROKER_HOST=guest:guest@localhost
 export PATAVI_DB_HOST=localhost
 export PATAVI_DB_NAME=patavi
 export PATAVI_DB_USER=patavi
 export PATAVI_DB_PASSWORD=develop
 export PATAVI_HOST=localhost
 export PATAVI_PORT=3000
 export PATAVI_SELF=//localhost:3000
 export PATAVI_CLIENT_KEY=/path/to/ssl/key.pem
 export PATAVI_CLIENT_CRT=/path/to/ssl/crt.pem
 # export PATAVI_CA=/home/daan/repos/mcda-elicitation-web/ssl/ca-crt.pem // optional, see above
 ```

Building:

```
npm install --production
cd public && bower install
```

Running:

```
node server.js
```
