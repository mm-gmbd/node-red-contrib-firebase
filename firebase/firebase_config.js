//All references to a Firebase share the same authentication status,
//so if you call new Firebase() twice and call any authentication method
//on one of them, they will both be authenticated.
module.exports = function (RED) {
    'use strict';
    var Firebase = require('firebase');
    var events = require("events");

    // Firebase Full Error Listing - https://www.firebase.com/docs/web/guide/user-auth.html#section-full-error
    // AUTHENTICATION_DISABLED	The requested authentication provider is disabled for this Firebase.
    // EMAIL_TAKEN	The new user account cannot be created because the specified email address is already in use.
    // INVALID_ARGUMENTS	The specified credentials are malformed or incomplete. Please refer to the error message, error details, and Firebase documentation for the required arguments for authenticating with this provider.
    // INVALID_CONFIGURATION	The requested authentication provider is misconfigured, and the request cannot complete. Please confirm that the provider's client ID and secret are correct in your Firebase Dashboard and the app is properly set up on the provider's website.
    // INVALID_CREDENTIALS	The specified authentication credentials are invalid. This may occur when credentials are malformed or expired.
    // INVALID_EMAIL	The specified email is not a valid email.
    // INVALID_ORIGIN	A security error occurred while processing the authentication request. The web origin for the request is not in your list of approved request origins. To approve this origin, visit the Login & Auth tab in your Firebase dashboard.
    // INVALID_PASSWORD	The specified user account password is incorrect.
    // INVALID_PROVIDER	The requested authentication provider does not exist. Please consult the Firebase authentication documentation for a list of supported providers.
    // INVALID_TOKEN	The specified authentication token is invalid. This can occur when the token is malformed, expired, or the Firebase secret that was used to generate it has been revoked.
    // INVALID_USER	The specified user account does not exist.
    // NETWORK_ERROR	An error occurred while attempting to contact the authentication server.
    // PROVIDER_ERROR	A third-party provider error occurred. Please refer to the error message and error details for more information.
    // TRANSPORT_UNAVAILABLE	The requested login method is not available in the user's browser environment. Popups are not available in Chrome for iOS, iOS Preview Panes, or local, file:// URLs. Redirects are not available in PhoneGap / Cordova, or local, file:// URLs.
    // UNKNOWN_ERROR	An unknown error occurred. Please refer to the error message and error details for more information.
    // USER_CANCELLED	The current authentication request was cancelled by the user.
    // USER_DENIED	The user did not authorize the application. This error can occur when the user has cancelled an OAuth authentication request.

    //connectionPool is responsible for managing Firebase Connections, Authentication, etc.
    //connectionPool emits the following events:
      //connecting
      //connected
      //disconnected
      //authorized
      //unauthorized
      //error //TODO: need to wrap everything in a try/catch to make sure we don't ever crash node-red
      //closed
    var connectionPool = function(){
      var connections = {}
      return {
        get: function(firebaseurl){
          if(!connections[firebaseurl]){ //Lazily create a new Firebase Reference if it does not exist

            connections[firebaseurl] = function(){

              //console.log("Creating new connection for " + firebaseurl)

              var obj = {
                _emitter: new events.EventEmitter(),
                fbRef: new Firebase(firebaseurl),
                authExpiration: null,
                loginType: null,
                uid: null,
                password: null,
                nodeCount: 0,
                lastEvent: null,
                lastEventData: null,

                on: function(a,b) { this._emitter.on(a,b); },

                emit: function(a,b){
                  //console.log(firebaseurl + " - emitting " + a)
                  this.lastEvent = a;
                  this.lastEventData = b;
                  this._emitter.emit(a,b)
                },

                authorize: function(loginType, uid, password){
                  this.loginType = loginType
                  this.uid = uid
                  this.password = password

                  switch (loginType) {
                      case 'none':
                          this.emit("authorized");
                          //this.fbRef.offAuth(this.onAuth, this);
                          break;
                      case 'custom':
                          this.fbRef.authWithCustomToken(uid, this.onLoginAuth.bind(this))
                          this.fbRef.onAuth(this.onAuth, this);

                          break;
                      case 'customGenerated':
                        //TODO:  this.fbRef.authWithCustomToken(this.credentials.uid, onCustomToken.bind(this))
                        break;

                      case 'email':
                          this.fbRef.authWithPassword({
                            email: uid,
                            password: password
                          }, this.onLoginAuth.bind(this))

                          this.fbRef.onAuth(this.onAuth, this);

                          break;
                  }
                },

                //Note, connected and disconnected can happen without our auth status changing...
                onConnectionStatusChange: function(snap){
                  //var obj = connections[snap.ref().parent().parent().toString()]  //Not the most elegant, but it works
                  if (snap.val() === true) {
                    if(this.lastEvent != "authorized")//TODO: BUG: there is some kind of sequencing bug that can cause connected to be set to true after we have already emitted that authorized is true.  This is patch for that issue but we really should ge tht execution order correct...
                      this.emit("connected")
                  } else {
                    this.emit("disconnected")
                  }
                },

                //However, it looks like with our current setup auth will get re-emitted after we reconnect.
                onAuth: function(authData){
                  if(authData){
                    this.authExpiration = new Date(authData.expires*1000)

                    if(this.lastEvent != "authorized")  //TODO: BUG: once again another I don't understand node-red function flow... This patch is to make sure listeners don't get set twice...
                      this.emit("authorized", authData)
                  } else {
                    if(this.authExpiration){
                      var now = new Date()

                      if(this.authExpiration.getTime()-10000 <= now.getTime()){  //TODO: Do some research on this, we are subtracting 10 seconds - Firebase gets a little greedy with expirations (perhaps this is because of clock differences and network latencies?)
                        //Auth has expired - need to reauthorize
                        this.authExpiration = null;
                        this.authorize(this.loginType, this.uid, this.password) //Single Shot Reauth attempt
                      }
                    }

                    this.emit("unauthorized");
                  }
                },

                onLoginAuth: function(error, authData) {
                  if (error) {
                    // switch (error.code) {
                    //   case "INVALID_EMAIL":
                    //     error = "The specified user account email is invalid.";
                    //     break;
                    //   case "INVALID_PASSWORD":
                    //     error = "The specified user account password is incorrect.";
                    //     break;
                    //   case "INVALID_USER":
                    //     error = "The specified user account does not exist.";
                    //     break;
                    //   default:
                    //     error = "Error logging user in: " + error.toString();
                    // }
                    this.emit("error", error.code);  //TODO: evaluate being verbose vs. using the error.code...
                  } //onAuth handles success conditions
                }

                //TODO: wrap the firebase .on events here?
                //close: function(cb) { //this.serial.close(cb); },
                //write: function(m,cb) { this.serial.write(m,cb); },
              }

              obj._emitter.emit("connecting");
              obj.fbRef.child(".info/connected").on("value", obj.onConnectionStatusChange, obj);
              // obj.fbRef.onAuth(obj.onAuth, obj); //We are setting this up inside of our authorize function

              return obj;
            }();
          }

          connections[firebaseurl].nodeCount++;

          return connections[firebaseurl]
        },

        close: function(firebaseurl){
          var obj = connections[firebaseurl]

          obj.nodeCount--

          if(obj.nodeCount == 0){
            obj.emit("closed")

            //Clean up the Firebase Reference and tear down the connection
            obj.fbRef.offAuth(obj.onAuth, obj);
            obj.fbRef.child(".info/connected").off("value", obj.onConnectionStatusChange, obj);

            if(this.loginType && this.loginType != "none")
              obj.fbRef.unauth();

            delete connections[firebaseurl]
            //TODO: BUG: there is not way to do close/kill a connection with the current Firebase Library.  It is a low priority for them but is scheduled for release middle of 2015...    http://stackoverflow.com/questions/27641764/how-to-destroy-firebase-ref-in-node
          }
        },

        listURLs: function(){
          var urls = [];
          for(var url in connections){
              urls.push(url)
          }
          return urls
        }


      }
    }();

    //Makes the list of firebase connections avialable to the flow editor config node (so that we don't get duplicates)
    RED.httpAdmin.get("/firebase_connections", RED.auth.needsPermission('firebase.read'), function(req,res) {
      //TODO: BUG: If someone creates two config nodes with the same firebaseurl and different auth's before they deploy the first one, I don't currently have a way to stop them.  Likley need to add some logic to oneditsave in the .html to try and prevent this from happening
        res.json(connectionPool.listURLs())
    });

    //TODO: BUG: we need a way to do a put/post on the client during oneditsave: so that we don't let someone create two firebase config node's to the same URL before they deploy (which is currently possible).  The issue is how do we know to "unset" the unlock in case deploy is nver pressed and the page is reloaded - then that particular URL can never be used again until the node-red instance is restarted...  Need to work with the Node-Red guys to figure out how to handle this singleton use case...  Perhaps the firebase config node can just throw an error and relabel itself if this happens??

    function FirebaseConfig(n) {
        RED.nodes.createNode(this, n);

        // this.log(JSON.stringify(n, null, "\t"))
        // this.log(JSON.stringify(this, null, "\t"))

        //TODO: Input validation on the server (we are doing it on the client but not doing anything here...)
        this.firebaseurl = "https://" + n.firebaseurl + ".firebaseio.com";
        this.loginType = n.loginType;
        this.uid = this.credentials.uid;
        this.secret = this.credentials.secret;
        this.email = this.credentials.email;
        this.password = this.credentials.password;

        this.fbConnection = connectionPool.get(this.firebaseurl)

        this.fbConnection.on("connecting", function(){  //TODO: BUG: This isn't being called because its emitted too early...  Not sure if there is a way to change that...
          //this.log("connecting to " + this.firebaseurl)
          this.status({fill:"grey", shape:"ring", text:"connecting..."})
        }.bind(this))

        this.fbConnection.on("connected", function(){
          //this.log("connected to " + this.firebaseurl)
          this.status({fill:"green", shape:"ring", text:"connected"})
        }.bind(this))

        this.fbConnection.on("disconnected", function(){
          //this.log("disconnected from " + this.firebaseurl)
          this.status({fill:"red", shape:"ring", text:"disconnected"})
        }.bind(this))

        this.fbConnection.on("authorized", function(authData){
          //this.log("authorized to " + this.firebaseurl + " as " + JSON.stringify(authData))
        }.bind(this))

        this.fbConnection.on("unauthorized", function(){
          //this.log("unauthorized from " + this.firebaseurl)
          this.status({fill:"red", shape:"dot", text:"unauthorized"})
        }.bind(this))

        this.fbConnection.on("error", function(error){
          //this.log("error [" + this.firebaseurl + "]" + error)
          this.status({fill:"red", shape:"ring", text:error})
          this.error(error);
        }.bind(this))

        switch (this.loginType) {
            case 'none': //TODO:
              this.fbConnection.authorize(this.loginType);
              break;
            case 'custom':  //TODO:
              //this.fbConnection.authorize(this.loginType, this.uid, this.secret);
              break;
            case 'email':
              this.fbConnection.authorize(this.loginType, this.email, this.password);
              break;
            case 'anonymous': //TODO:
              break;
            case 'customGenerated': //TODO:
              break;
            case 'facebook': //TODO:
              break;
            case 'twitter': //TODO:
              break;
            case 'github': //TODO:
              break;
            case 'google': //TODO:
              break;
            default:
              this.error("Invalid loginType in firebase " + this.firebaseurl + " config - " + this.loginType, {})
              this.status({fill:"red", shape:"ring", text:"invalid loginType"})
              break;
        }

        // this.on('input', function(msg) { //Meaningless in a Config Node
        //     // do something with 'msg'
        // });

        //this.send({payload: "hi"})  //Also meaningless for Config Nodes

        this.on('close', function() {
            this.status({fill: "gray", shape: "dot", text:"connection closed"})
            // We need to unbind our callback, or we'll get duplicate messages when we redeploy
            connectionPool.close(this.firebaseurl)
        });


    }

    RED.nodes.registerType('firebase config', FirebaseConfig, {
      credentials: {
          loginType: {type: 'text'},
          uid: {type: 'text'},
          secret: {type: 'password'},
          email: {type: 'text'},
          password: {type: 'password'},
      }
    });
}
