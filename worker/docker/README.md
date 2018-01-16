Patavi worker dockerfile
========================

For more information on all components of the drugis project, please refer to the OVERALL-README.md in the root folder of the ADDIS-CORE project.
First, build the worker uberjar (from the `worker` directory):


```
lein uberjar
cp target/patavi.worker-0.3-standalone.jar docker/
```

Then, build the base image:

```
docker build -t patavi/worker-amqp .
```

Build the example worker (you don't need the example worker to run patavi):

```
docker build -t patavi/worker-amqp-slow -f Dockerfile.slow .
```

Run the example worker:
Make sure to have a rabbitmq container running.

```
docker run -d --link <rabbitmq-container-name>:rabbit \
  -e PATAVI_BROKER_USER=<user> -e PATAVI_BROKER_PASSWORD=<pass> \
  --name amqp-slow patavi/worker-amqp-slow
```
