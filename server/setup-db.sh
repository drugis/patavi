# NB assumes a psql database docker container named 'postgres' to already be running. Adjust
# the script if your configuration is different.
# Example db run command: docker run --name postgres -e POSTGRES_PASSWORD=develop -d postgres
# Also, change the passwords if you are running the database on a public server.
cat > .pgpass <<EOF
postgres:5432:*:postgres:develop
postgres:5432:*:patavi:develop
EOF
cat > db.sh<<EOF
chmod 0600 root/.pgpass
psql -h postgres -U postgres \
  -c "CREATE USER patavi WITH PASSWORD 'develop'" \
  -c "CREATE DATABASE patavi ENCODING 'utf-8' OWNER patavi"
psql -h postgres -U patavi \
  -f /db-init.sql
EOF
chmod u+x db.sh
docker run -it --rm \
  --mount type=bind,source="$(pwd)"/.pgpass,target=/root/.pgpass \
  --mount type=bind,source="$(pwd)"/db.sh,target=/db.sh \
  --mount type=bind,source="$(pwd)"/schema/schema.sql,target=/db-init.sql \
  --link postgres:postgres postgres \
  /db.sh
rm .pgpass
rm db.sh
