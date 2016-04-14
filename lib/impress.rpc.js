'use strict';

// RPC (Remote Procedure Call) protocol for Impress Application Server

// RPC Application plugin initialization
//
impress.rpc.mixin = function(application) {

  application.rpc.connections = {};
  application.rpc.nextConnectionId = 1;

  // RPC initialization (to be called automatically by Impress core)
  //
  application.rpc.initialize = function(client) {
    client.rpc = client.res.websocket;

    if (client.rpc) {

      // Accept websocket RPC connection
      //
      client.rpc.accept = function(namespaces) {
        client.rpc.isAccepted = true;
        client.rpc.nextMessageId = 0;
        client.rpc.callCollection = {};
        client.rpc.namespaces = namespaces;

        var connection = client.rpc.request.accept('', client.rpc.request.origin);
        client.rpc.connection = connection;

        // Send data to RPC connection
        //
        client.rpc.send = function(data) {
          if (connection.connected) connection.send(JSON.stringify(data));
        };

        // Execute RPC call
        //
        client.rpc.call = function(name, parameters, callback) {
          client.rpc.nextMessageId++;
          var data = {
            id: 'S' + client.rpc.nextMessageId,
            type: 'call',
            name: name,
            data: parameters
          };
          data.callback = callback;
          client.rpc.callCollection[data.id] = data;
          connection.send(JSON.stringify(data));
        };

        // Dispatch RPC message
        //
        connection.on('message', function(message) {
          var dataName = message.type + 'Data',
              data = message[dataName];
          var packet = JSON.parse(data);
          if (packet.type === 'call') {
            // implement here: send call result to client
            // packet fields:
            //   id: call id, 'C' + id
            //   type: call
            //   namespace: namespace name
            //   function: function name
            //   data: call parameters
            //

            var namespace = client.rpc.namespaces[packet.namespace],
                fn = namespace ? namespace[packet.function] : null;
            if (fn) {
              client.rpc.send({
                id: packet.id,
                type: 'result',
                result: fn()
              });
            } else {
              client.rpc.send({
                id: packet.id,
                type: 'result',
                result: data.toString()
              });
            }

          } else if (packet.type === 'ajax') {
            // implement here: send call result to client
            // packet fields:
            //   id: call id, 'C' + id
            //   type: call
            //   method: get, post...
            //   name: method name
            //   data: call parameters
            //

            var req = impress.rpc.reqStub(client, packet),
                res = impress.rpc.resStub(client, packet);

            application.dispatch(req, res);

          } else if (packet.type === 'result') {
            // implement here: receive call result from client
            // packet fields:
            //   id: call id, 'S' + id (equal to call id sent from server)
            //   type: result
            //   method: get, post...
            //   name: method name
            //   data: call parameters
            //
          } else if (packet.type === 'event') {
            // implement here: receive event from client
            // packet fields:
            //   type: event
            //   name: event name
            //   data: call parameters
            //
            application.frontend.emit(packet.name, packet.data);
          }
        });

        // connection.on('close', function(reasonCode, description) {
        //   console.log(api.common.nowDateTime() + ' RPC peer ' + connection.remoteAddress + ' disconnected.');
        // });

        application.rpc.connections[application.rpc.nextConnectionId++] = client;

        return connection;
      };

    } else client.error(400);

  };

  // Finalize websocket RPC connection
  //
  application.rpc.finalize = function(client) {
    var rpc = client.rpc;
    if (rpc && !rpc.isAccepted) rpc.request.reject();
  };

  // Multicst RPC event
  //
  application.rpc.sendGlobal = function(eventName, data) {
    var client, connections = application.rpc.connections;
    for (var connectionId in connections) {
      client = connections[connectionId];
      client.rpc.send({
        type: 'event',
        name: eventName,
        data: data
      });
    }
  };

};

// Request object stub for req emulation
//
impress.rpc.reqStub = function(client, packet) {
  var parameters = (packet && packet.data) ? packet.data.parameters : null;
  return ({
    url: packet.name,
    method: packet.method,
    parameters: parameters,
    connection: {
      remoteAddress: client.socket.remoteAddress
    },
    socket: {
      server: {
        serverName: client.server.name
      }
    },
    headers: {
      host: client.host
    }
  });
};

// Response object stub for res emulation
//
impress.rpc.resStub = function(client, packet) {
  return ({
    on: api.common.emptyness,
    statusCode: 200,
    getHeader: api.common.emptyness,
    setHeader: api.common.emptyness,
    end: function(data) {
      client.rpc.send({
        id: packet.id,
        type: 'result',
        result: data.toString()
      });
    }
  });
};
