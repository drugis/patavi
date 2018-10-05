docker run -i -v `pwd`:`pwd` -w `pwd` --rm --link postgres:postgres postgres psql -h postgres -U postgres \
  -c "CREATE USER patavi WITH PASSWORD 'develop'" -c "CREATE DATABASE patavi ENCODING 'utf-8' OWNER patavi" \
  -c '\c patavi patavi' -f schema.sql
