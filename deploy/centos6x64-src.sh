#!/bin/bash
yum -y update
yum -y install wget mc
yum -y groupinstall "Development Tools"
cd /usr/src
wget http://nodejs.org/dist/v5.5.0/node-v5.5.0.tar.gz
tar zxf node-v5.5.0.tar.gz
rm -f ./node-v5.5.0.tar.gz
cd node-v5.5.0
./configure
make
make install
cd ~
rm -rf /usr/src/node-v5.5.0
ln -s /usr/local/bin/node /bin
ln -s /usr/local/bin/npm /bin
cat >/etc/yum.repos.d/mongodb.repo <<EOL
[mongodb]
name=MongoDB Repository
baseurl=http://downloads-distro.mongodb.org/repo/redhat/os/x86_64/
gpgcheck=0
enabled=1
EOL
yum -y install mongo-10gen mongo-10gen-server
service mongod start
chkconfig mongod on
sudo mkdir /ias
cd /ias
sudo npm install mongodb nodemailer websocket geoip-lite
sudo npm install impress --unsafe-perm
