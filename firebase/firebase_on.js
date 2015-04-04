module.exports = function(RED) {
    'use strict';

    function FirebaseOn(n) {
        RED.nodes.createNode(this,n);

        this.config = RED.nodes.getNode(n.firebaseconfig);
        this.childpath = n.childpath;
        this.atStart = n.atStart;
        this.eventType = n.eventType

        this.ignoreFirst = this.atStart;

        // Check credentials
        if (!this.config) {
            this.status({fill:"red", shape:"ring", text:"invalid credentials"})
            this.error('You need to setup Firebase credentials!');
            return
        }

        this.onFBValue = function(snapshot, prevChildName) {
            //console.log("In onFBValue + " + JSON.stringify(snapshot.val()))
            //TODO: Once Node-Red supports it, we should flash the Node when we receive this data.

            if(this.ignoreFirst == false){
              this.ignoreFirst = true
              return;
            }

            // if(!snapshot.exists()){
            //   //The code below will simply send a payload of nul if there is no data
            // }

            var msg = {};
            msg.href = snapshot.ref().toString();
            msg.key = snapshot.key();
            msg.payload = snapshot.val();
            if(snapshot.getPriority())
              msg.priority = snapshot.getPriority();
            if(prevChildName)
              msg.previousChildName = prevChildName;

            this.send(msg);
        }.bind(this);

        this.onFBError = function(error){
          this.error(error, {})
          //TODO: Set status?
        }.bind(this);

        this.registerListeners = function(){
          //this.log("Registering Listener for " + this.config.firebaseurl + (this.childpath || ""))

          this.ignoreFirst = this.atStart;  //Reset if we are re-registering listeners

          if(this.childpath){
            this.config.fbConnection.fbRef.child(this.childpath).on(this.eventType, this.onFBValue, this.onFBError, this);
          }else{
            this.config.fbConnection.fbRef.on(this.eventType, this.onFBValue, this.onFBError, this);
          }
        }.bind(this);

        this.destroyListeners = function(){
          // We need to unbind our callback, or we'll get duplicate messages when we redeploy
          if(this.childpath)
            this.config.fbConnection.fbRef.child(this.childpath).off(this.eventType, this.onFBValue, this);
          else
            this.config.fbConnection.fbRef.off(this.eventType, this.onFBValue, this);
        }.bind(this);


        //this.config.fbConnection EventEmitter Handlers
        this.fbConnecting = function(){  //This isn't being called because its emitted too early...
          this.status({fill:"grey", shape:"ring", text:"connecting..."})
        }.bind(this)

        this.fbConnected = function(){
          this.status({fill:"green", shape:"ring", text:"connected"})
        }.bind(this)

        this.fbDisconnected = function(){
          this.status({fill:"red", shape:"ring", text:"disconnected"})
        }.bind(this)

        this.fbAuthorized = function(authData){
          this.status({fill:"green", shape:"dot", text:"ready"})
          this.registerListeners();
        }.bind(this)

        this.fbUnauthorized = function(){
          this.status({fill:"red", shape:"dot", text:"unauthorized"})
          this.destroyListeners();
        }.bind(this)

        this.fbError = function(error){
          this.status({fill:"red", shape:"ring", text:error})
          this.error(error, {})
        }.bind(this)

        this.fbClosed = function(error){
          this.status({fill: "gray", shape: "dot", text:"connection closed"})
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

        this.on('close', function() {
          this.destroyListeners();
        });

    }
    RED.nodes.registerType('firebase.on', FirebaseOn);
};
