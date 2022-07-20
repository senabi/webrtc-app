FROM ubuntu
RUN apt-get update && apt-get install -y \
  build-essential \
  python3 \
  python3-pip \
  net-tools \
  iputils-ping \
  iproute2 \
  curl \
  mysql-client \
  git

RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -i && \
  apt-get install -y nodejs 

RUN npm install -g watchify

EXPOSE 3000
EXPOSE 3001
EXPOSE 2000-2020
EXPOSE 10000-10100
