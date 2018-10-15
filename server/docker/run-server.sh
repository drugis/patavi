docker run -d --name patavi-server \
 --link my-rabbit:rabbit \
 --link postgres:postgres \
 -e PATAVI_BROKER_HOST=rabbit  \
 -p 3000:3000 \
 -e PATAVI_SELF=//localhost.com:3000 \
 -e PATAVI_PORT=3000 \
 -e PATAVI_DB_HOST=postgres \
 -e PATAVI_DB_NAME=patavitask \
 -e PATAVI_DB_USER=patavitask \
 -e PATAVI_DB_PASSWORD=develop \
 patavi-server
