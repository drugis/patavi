cp -r ssl ssl_copy
sudo chown -R :9999 ssl_copy
sudo chmod -R 775 ssl_copy

docker volume create patavi_server_certs
docker run -v patavi_server_certs:/patavi --name helper busybox true
docker cp ./ssl_copy/server-crt.pem helper:/patavi/
docker cp ./ssl_copy/server-key.pem helper:/patavi/
docker rm helper

sudo rm -r ssl_copy

docker run -d --name patavi-server \
  --link my-rabbit:rabbit \
  --link postgres \
  -e PATAVI_BROKER_HOST=rabbit \
  -p 3000:3000 \
  -e PATAVI_SELF=//localhost:3000 \
  -e PATAVI_PORT=3000 \
  -e PATAVI_DB_HOST=postgres \
  -e PATAVI_DB_NAME=patavi \
  -e PATAVI_DB_USER=patavi \
  -e PATAVI_DB_PASSWORD=develop \
  --mount source=patavi_server_certs,target=/var/lib/patavi/mount \
  addis/patavi-server

docker exec -ti patavi-server sh -c "cp /var/lib/patavi/mount/* /var/lib/patavi/ssl/"
