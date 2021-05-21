FROM phusion/baseimage:18.04-1.0.0

ENV LANG C.UTF-8
ENV LC_ALL C.UTF-8

ENV DEBIAN_FRONTEND noninteractive

RUN apt update
RUN apt upgrade -y -f -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" 

# Install R and required R packages
RUN apt install --no-install-recommends software-properties-common dirmngr
RUN apt-key adv --keyserver keyserver.ubuntu.com --recv-keys E298A3A825C0D65DFD57CBB651716619E084DAB9
RUN add-apt-repository "deb https://cloud.r-project.org/bin/linux/ubuntu $(lsb_release -cs)-cran40/"
RUN apt update
RUN apt install -y -q r-base r-base-dev
RUN apt install -y -q libxt-dev libcairo2-dev
RUN R -e 'install.packages("https://www.rforge.net/Rserve/snapshot/Rserve_1.8-8.tar.gz", repos=NULL, type="source"); if (!require("Rserve")) quit(save="no", status=8)'
RUN R -e 'install.packages("RJSONIO", repos="http://cran.rstudio.com/"); if (!require("RJSONIO")) quit(save="no", status=8)'
RUN R -e 'install.packages("Cairo", repos="http://cran.rstudio.com/"); if (!require("Cairo")) quit(save="no", status=8)'
RUN R -e 'install.packages("base64enc", repos="http://cran.rstudio.com/"); if (!require("base64enc")) quit(save="no", status=8)'

# Install JRE
RUN apt install -y -q openjdk-8-jre-headless

RUN apt install -y -q unzip

# create patavi user
RUN useradd --create-home --home /var/lib/patavi patavi

USER patavi
WORKDIR /var/lib/patavi
RUN mkdir bin
ENV PATH /var/lib/patavi/bin:$PATH

RUN mkdir log
ENV RSERVE_LOGS=log/rserve.log

ADD patavi.worker-0.3-standalone.jar .

ENV PATAVI_BROKER_HOST=rabbit

RUN echo '#!/bin/bash\njava -jar patavi.worker-0.3-standalone.jar "$@"' > bin/patavi-worker
RUN chmod +x bin/patavi-worker
