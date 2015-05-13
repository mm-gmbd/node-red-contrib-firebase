module.exports = function(RED) {
    'use strict';
    var path= require('path');

    String.prototype.capitalize = function() {
        return this.charAt(0).toUpperCase() + this.slice(1);
    }

    function FirebaseOnDisconnect(n) {
        RED.nodes.createNode(this,n);

        this.config = RED.nodes.getNode(n.firebaseconfig);
        this.childpath = n.childpath;
        this.method = n.method;
        this.value = n.value;
        this.fbRequests = [];

        this.ready = false;

        this.validMethods = {
          "set": true,
          "update": true,
          "remove": true//,
          //"setWithPriority": true,
          //"cancel": true
        }

        // Check credentials
        if (!this.config) {
            this.status({fill:"red", shape:"ring", text:"invalid credentials"})
            this.error('You need to setup Firebase credentials!');
            return
        }

        this.fbOnComplete = function(error) {
            //this.log("fb oncomplete.  error = " + error)
            var msg = this.fbRequests.shift() //Firebase will call these in order for us
            //TODO: Once Node-Red supports it, we should flash the Node when we receive this data.
            if(error){
              this.log("firebase synchronization failed")
              this.error("firebase synchronization failed - " + error, msg)
            }
        }.bind(this);


        //this.config.fbConnection EventEmitter Handlers
        this.fbInitailizing = function(){  //This isn't being called because its emitted too early...
          // this.log("initailizing")
          this.status({fill:"grey", shape:"ring", text:"initailizing..."})
          this.ready = false;
        }.bind(this)

        this.fbConnected = function(){
          // this.log("connected")
          this.status({fill:"green", shape:"ring", text:"connected"})
          // this.ready = false;
        }.bind(this)

        this.fbDisconnected = function(){
          // this.log("disconnected")
          this.status({fill:"red", shape:"ring", text:"disconnected"})
          this.ready = false;
        }.bind(this)

        this.fbAuthorized = function(authData){
          // this.log("authorized")
          this.status({fill:"green", shape:"dot", text:"ready"})
          this.ready = true;
        }.bind(this)

        this.fbUnauthorized = function(){
          // this.log("unauthorized")
          this.status({fill:"red", shape:"dot", text:"unauthorized"})
          this.ready = false;
        }.bind(this)

        this.fbError = function(error){
          // this.log("error")
          this.status({fill:"red", shape:"ring", text:error})
          this.error(error, {})
        }.bind(this)

        this.fbClosed = function(error){
          // this.log("closed")
          this.status({fill: "gray", shape: "dot", text:"connection closed"})
          this.ready = false;
        }.bind(this)


        //Register Handlers
        this.config.fbConnection.on("initailizing", this.fbInitailizing)
        this.config.fbConnection.on("connected", this.fbConnected)
        this.config.fbConnection.on("disconnected", this.fbDisconnected)
        this.config.fbConnection.on("authorized", this.fbAuthorized)
        this.config.fbConnection.on("unauthorized", this.fbUnauthorized)
        this.config.fbConnection.on("error", this.fbError)
        this.config.fbConnection.on("closed", this.fbClosed)


        this.log("setting initial state to [fb" + this.config.fbConnection.lastEvent.capitalize()+ "]("+this.config.fbConnection.lastEventData+")" )

        //set initial state (depending on the deployment strategy, for newly deployed nodes, some of the events may not be refired...)
        switch(this.config.fbConnection.lastEvent) {
          case "initailizing":
          case "connected":
          case "disconnected":
          case "authorized":
          case "unauthorized":
          case "error":
          case "closed":
            this["fb" + this.config.fbConnection.lastEvent.capitalize()](this.config.fbConnection.lastEventData)  //Javascript is really friendly about sending arguments to functions...
            break;
          // case "undefined":
          // case "null":
          //   break;  //Config node not yet setup
          default:
            this.error("Bad lastEvent Data from Config Node - " + this.config.fbConnection.lastEvent)
        }


        this.on('input', function(msg) {
          if(this.ready){

            //TODO: this seems to be mostly working, but we really ought to do some more due diligence here...
            //Try to convert to JSON object...
            var payload
            if (this.value == "msg.payload"){
              if ("payload" in msg){
              //if (msg.hasOwnProperty("payload")) {
                payload = msg.payload;
                if (!Buffer.isBuffer(payload)) {
                    if (typeof payload === "object") {

                    } else {
                        try{
                          payload = JSON.parse(payload)
                        } catch(e){
                          payload = msg.payload.toString();
                        }
                    }
                }
                msg.payload = payload
              } else {
                msg.payload = null;
              }
            } else if(this.value == "Firebase.ServerValue.TIMESTAMP") {
              msg.payload = this.config.fbConnection.Firebase.ServerValue.TIMESTAMP
            } else{
              msg.payload = this.value;
            }

            var method = this.method
            if(method == "msg.method"){
              if("method" in msg){
                method = msg.method
              } else {
                this.error("Expected \"method\" property in msg object", msg)
                return;
              }
            }

            var childpath = this.childpath
            if(!childpath || childpath == ""){
              if("childpath" in msg){
                childpath = msg.childpath
              }
            }
            childpath = childpath || "/"

            console.log(msg.payload)

            switch (method) {
                case "set":
                case "update":
                case "push":
                  this.fbRequests.push(msg)
                  this.config.fbConnection.fbRef.child(childpath).onDisconnect()[method](msg.payload, this.fbOnComplete.bind(this)); //TODO: Why doesn't the Firebase API support passing a context to these calls?
                  break;javas
                case "remove":
                  this.fbRequests.push(msg)
                  this.config.fbConnection.fbRef.child(childpath).onDisconnect()[method](this.fbOnComplete.bind(this));
                  break;
                default:
                  this.error("Invalid msg.method property \"" + method + "\".  Expected one of the following: [\"" + Object.keys(this.validMethods).join("\", \"") + "\"].", msg)
                  break;
            }
          } else {
            this.warn("Received msg before firebase modify node was ready.  Not processing: " + JSON.stringify(msg, null, "\t"))
          }
        });


          this.on('close', function() {
            //Cancel modify request to firebase??
          });

    }
    RED.nodes.registerType("firebase ondisconnect", FirebaseOnDisconnect);

    RED.httpAdmin.get('/firebase/js/*', function(req, res){
       var filename = path.join(__dirname , '../static/js', req.params[0]);
       res.sendfile(filename);
   });
};
