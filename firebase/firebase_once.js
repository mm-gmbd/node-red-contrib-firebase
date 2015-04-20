module.exports = function(RED) {
    'use strict';

    function FirebaseOnce(n) {
        RED.nodes.createNode(this,n);

        this.config = RED.nodes.getNode(n.firebaseconfig);
        this.childpath = n.childpath;
        this.eventType = n.eventType;
        this.activeRequests = [];
        this.ready = false;

        // Check credentials
        if (!this.config) {
            this.status({fill:"red", shape:"ring", text:"invalid credentials"})
            this.error('You need to setup Firebase credentials!');
            return
        }

        this.validEventTypes = {
          "value": true,
          "child_added": true,
          "child_changed": true,
          "chiled_removed": true,
          "child_moved": true
        }

        this.onFBData = function(snapshot, prevChildName) {
            //console.log("In onFBData + " + JSON.stringify(snapshot.val()))
            //TODO: Once Node-Red supports it, we should flash the Node when we receive this data.

            // if(!snapshot.exists()){
            //   //The code below will simply send a payload of nul if there is no data
            // }

            //Tstart with original message object so we retain all of those properties...
            var msg = this.activeRequests.shift();

            msg.href = snapshot.ref().toString();
            msg.key = snapshot.key();
            msg.payload = snapshot.val();
            if(snapshot.getPriority())
              msg.priority = snapshot.getPriority();
            if(prevChildName)
              msg.previousChildName = prevChildName;

            this.send(msg)
        }.bind(this);

        this.onFBError = function(error){
          this.error(error, {})
          //TODO: Set status?
        }.bind(this);

        this.registerListeners = function(msg){

          var eventType = this.eventType
          if(eventType == "msg.eventType"){
            if("eventType" in msg){
              eventType = msg.eventType
            } else {
              this.error("Expected \"eventType\" property in msg object", msg)
              return;
            }
          }

          if(!(eventType in this.validEventTypes)){
            this.error("Invalid msg.eventType property \"" + eventType + "\".  Expected one of the following: [\"" + Object.keys(this.validEventTypes).join("\", \"") + "\"].", msg)
            return;
          }

          var childpath = this.childpath
          if(!childpath || childpath == ""){
            if("childpath" in msg){
              childpath = msg.childpath
            }
          }


          msg.eventType = eventType;
          msg.childpath = childpath || "/";
          this.activeRequests.push(msg)

          if(msg.childpath){
            this.config.fbConnection.fbRef.child(msg.childpath).once(eventType, this.onFBData, this.onFBError, this);
          }else{
            this.config.fbConnection.fbRef.once(eventType, this.onFBData, this.onFBError, this);
          }
        }.bind(this);

        this.destroyListeners = function(reason){
          if(this.activeRequests.length > 0 && reason){  //ensure the close function doesn't trigger this
            // var msg = {};
            // msg.href = this.config.firebaseurl;
            // msg.payload = "ERROR: " + reason;
            var msg = this.activeRequests.shift()
            this.error(reason, msg)

            var eventType = this.eventType
            if(eventType == "msg.eventType")
              eventType = msg.eventType

            if(!(eventType in this.validEventTypes)){
              //this.error("Invalid eventType - \"" + eventType + "\"", msg)  //We have already errored on the registerListener call
              return;
            }

            // We need to unbind our callback, or we'll get duplicate messages when we redeploy
            if(msg.childpath)
              this.config.fbConnection.fbRef.child(msg.childpath).off(eventType, this.onFBData, this);
            else
              this.config.fbConnection.fbRef.off(eventType, this.onFBData, this);
          }
        }.bind(this);


        //this.config.fbConnection EventEmitter Handlers
        this.fbConnecting = function(){  //This isn't being called because its emitted too early...
          // this.log("connecting...")
          this.status({fill:"grey", shape:"ring", text:"connecting..."})
          this.ready = false;
        }.bind(this)

        this.fbConnected = function(){
          // this.log("connected")
          this.status({fill:"green", shape:"ring", text:"connected"})
          this.ready = false;
        }.bind(this)

        this.fbDisconnected = function(){
          // this.log("disconnected")
          this.status({fill:"red", shape:"ring", text:"disconnected"})
          this.ready = false;
        }.bind(this)

        this.fbAuthorized = function(authData){
          // this.log("authorized: " + JSON.stringify(authData))
          this.status({fill:"green", shape:"dot", text:"ready"})
          this.ready = true;
        }.bind(this)

        this.fbUnauthorized = function(){
          // this.log("unauthorized")
          this.status({fill:"red", shape:"dot", text:"unauthorized"})
          this.ready = false;
          this.destroyListeners();
        }.bind(this)

        this.fbError = function(error){
          //this.log("error: " + JSON.stringify(error))
          this.status({fill:"red", shape:"ring", text:error})
          this.error(error, {})
          this.destroyListeners();
        }.bind(this)

        this.fbClosed = function(error){
          //this.log("closed")
          this.status({fill: "gray", shape: "dot", text:"connection closed"})
          this.ready = false;
          this.destroyListeners();  //TODO: this is being called in too many places but better safe than sorry?  Really need to figure out execution flow of Node-Red and decide if we can only have it here instead of also in this.on("close")
        }.bind(this)

        //Register Handlers
        this.config.fbConnection.on("connecting", this.fbConnecting)
        this.config.fbConnection.on("connected", this.fbConnected)
        this.config.fbConnection.on("disconnected", this.fbDisconnected)
        this.config.fbConnection.on("authorized", this.fbAuthorized)
        this.config.fbConnection.on("unauthorized", this.fbUnauthorized)
        this.config.fbConnection.on("error", this.fbError)
        this.config.fbConnection.on("closed", this.fbClosed)

        //set initial state (depending on the deployment strategy, for newly deployed nodes, some of the events may not be refired...)
        switch(this.config.fbConnection.lastEvent) {
          case "connecting":
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
              this.registerListeners(msg);
            } else {
              this.warn("Received msg before firebase.once() node was ready.  Not processing: " + JSON.stringify(msg, null, "\t"))
            }
        });

        this.on('close', function() {
          this.destroyListeners();
        });

    }
    RED.nodes.registerType('firebase.once', FirebaseOnce);
};
