docker run -d --name patavi-server \
  --link my-rabbit:rabbit \
  --link postgres \
  -e PATAVI_BROKER_HOST=rabbit \
  -p 3000:3000 \
  -e PATAVI_PORT=3000 \
  -e PATAVI_HOST=localhost \
  -e SECURE_TRAFFIC=false \
  -e PATAVI_AUTHORISED_TOKEN=someToken \
  -e PATAVI_DB_HOST=postgres \
  -e PATAVI_DB_NAME=patavi \
  -e PATAVI_DB_USER=patavi \
  -e PATAVI_DB_PASSWORD=develop \
  addis/patavi-server