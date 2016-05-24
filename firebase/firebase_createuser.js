module.exports = function(RED) {
    'use strict';
    var Firebase = require('firebase');

    function FirebaseCreateUser(n) {
      RED.nodes.createNode(this, n);

      this.users = n.users;
      this.firebase = n.firebase;

      this.createUser = function(fbRef, email, password) {
        fbRef.createUser({ email: email, password: password }, function(error, userData) {
          if (error) {
            switch (error.code) {
              case "EMAIL_TAKEN":
                console.log("The new user account cannot be created because the email (\""+email+"\") is already in use.");
                break;
              case "INVALID_EMAIL":
                console.log("The specified email (\""+email+"\") is not a valid email.");
                break;
              default:
                console.log("Error creating user (\""+email+"\"): ", error);
            }

            this.send({payload: error});
          } else {
            this.send({payload: "Successfully created user account (uid: \""+userData.uid+"\") with email \""+email+"\""});
          }
        }.bind(this));
      }

      this.on('input', function(msg) {

        if (this.firebase == null) {
          this.send({payload: "Must set Firebase in Create User node first"});
          console.error("Must set Firebase in Create User node first")
          return;
        }

        var users = (msg.users == null ? this.users : msg.users);
        var fbRef = new Firebase('https://'+this.firebase+'.firebaseio.com');

        for (var i = 0; i < users.length; i++) {
          console.log("Creating user \""+users[i].email+"\" at Firebase \""+this.firebase+"\"...");
          this.send({payload: "Creating user \""+users[i].email+"\" at Firebase \""+this.firebase+"\"..."})
          this.createUser(fbRef, users[i].email, users[i].password);
        }
      });

      this.on('close', function() {
        //Nothing to do here?
      });

    }
    RED.nodes.registerType('firebase.createUser', FirebaseCreateUser);
};
