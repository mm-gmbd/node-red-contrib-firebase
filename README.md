node-red-contrib-firebase
=========================

<A HREF="http://nodered.org">node-red</A> <A HREF="http://nodered.org/docs/creating-nodes/">nodes</A> for interacting with <A HREF="https://www.firebase.com/">Firebase</A>.

The goal of this project is to provide an elegant GUI that allows you to interact with your Firebase data using Node-Red.  

As a side benefit, these nodes should be a natural complement to the data explorer interface offered by the Firebase Forge and a faster/easier to use tool than diving straight into the programming libraries offered for all of the <A HREF="https://www.firebase.com/docs/">Firebase supported platforms</A>.  

This project is a work in progress and currently only supports connections to Firebases without Authentication or those secured with Email and Password Authentication (other flavors are coming...)

#Install

Run the following command after you have done a global install of Node-RED (as described at <A HREF="http://nodered.org/docs/getting-started/installation.html">http://nodered.org/docs/getting-started/installation.html</A>)

	sudo npm install -g node-red-contrib-firebase

##Manual Installation
#####The following instructions assume a standard installation of Node-Red.  Please adjust directories accordingly if a non-standard installation is used.  
#####The Node-Red _user directory_ is printed to the Terminal whenever Node-Red is launched.
#####Windows users will need to replace "$HOME" with "%HOMEPATH%" and replace forwardslashes with backslashes.

To manually install :

1. Download this repository (via git clone, as a .zip, etc.)

2. Launch your favorite Terminal / Command Prompt

3. Create a `nodes` folder in the Node-Red _user directory_.  
_Don't worry if you see a `cannot create directory, File exists` error - that simply means this directory has already been created._

		mkdir $HOME/.node-red/nodes

4. cd into the `.node-red/nodes` user directory of Node-RED

		cd $HOME/.node-red/nodes

5. Copy the `node-red-contrib-firebase` folder into the `.node-red/nodes` directory.  The final directory structure should be `$HOME/.node-red/nodes/node-red-contrib-firebase/`

		cp -r $HOME/Downloads/node-red-contrib-firebase/ ./node-red-contrib-firebase/

6. cd into the `node-red-contrib-firebase` folder

		cd node-red-contrib-firebase

7. Install the required dependencies

		npm install

#Usage

To use the nodes, launch Node-RED (see <A HREF="http://nodered.org/docs/getting-started/running.html">http://nodered.org/docs/getting-started/running.html</A> for help getting started).

The firebase nodes will appear in their own "firebase" catagory on the Node-Red pallet. Drag and drop any node onto the canvas and configure as you would any other node-red node.  Node specific configuration information for each node is included in the info pane in Node-Red.

###Limitations
All references to a Firebase share the same authentication status, so if you create two config nodes pointing to the same Firebase they will end up sharing identical authentication credentials (whichever configuration node authenticates last will "win").

See <A HREF="http://stackoverflow.com/questions/25374999/multiple-firebases-instances">http://stackoverflow.com/questions/25374999/multiple-firebases-instances</A> for more information on this issue.  

#Example Application
If you are brand new to Node-Red, one simple way to get started is to use an existing flow.

- Start by copying the following to your clipboard

```
[{"id":"213f5b28.dec0a4","type":"debug","name":"","active":true,"console":"false","complete":"true","x":377,"y":389,"z":"2c582bd8.d3a7d4","wires":[]},{"id":"912d2b5a.6ed2d8","type":"catch","name":"","x":231,"y":389,"z":"2c582bd8.d3a7d4","wires":[["213f5b28.dec0a4"]]},{"id":"b87b9b56.478468","type":"debug","name":"","active":true,"console":"false","complete":"payload","x":570,"y":229,"z":"2c582bd8.d3a7d4","wires":[]},{"id":"eca2eba.f135d18","type":"comment","name":"firebase.once() example flow","info":"This flow is the same as the\nfirebase.on() example flow, \nexcept that it uses \nfirebase.once(\"value\") to query Firebase\nin the middle of a flow and return a \nresponse synchronously (as opposed to \nstarting a flow whenever the firebase.on()\nevent is triggered).\n\n\nThe inject node begins the flow\nevery 5 seconds and the debug node logs \nthe weather in San Francisco, CA.","x":120.5,"y":193,"z":"2c582bd8.d3a7d4","wires":[]},{"id":"c98d21ea.3672e","type":"firebase.once","name":"","firebaseconfig":"","childpath":"sanfrancisco","eventType":"value","x":345,"y":229,"z":"2c582bd8.d3a7d4","wires":[["b87b9b56.478468"]]},{"id":"2ca7a356.d3585c","type":"inject","name":"","topic":"","payload":"","payloadType":"date","repeat":"5","crontab":"","once":false,"x":127,"y":229,"z":"2c582bd8.d3a7d4","wires":[["c98d21ea.3672e"]]},{"id":"11357167.eeca8f","type":"firebase modify","name":"","firebaseconfig":"","childpath":"myHomeTown","method":"set","x":518,"y":335,"z":"2c582bd8.d3a7d4","wires":[]},{"id":"ef0fcf62.10f03","type":"inject","name":"","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":true,"x":125,"y":335,"z":"2c582bd8.d3a7d4","wires":[["d72d6f2a.28d29"]]},{"id":"d72d6f2a.28d29","type":"change","name":"","rules":[{"t":"set","p":"payload","to":"my weather station data..."}],"action":"","property":"","from":"","to":"","reg":false,"x":304,"y":335,"z":"2c582bd8.d3a7d4","wires":[["11357167.eeca8f"]]},{"id":"51aad36.fae552c","type":"comment","name":"firebase modify example flow","info":"This flow attempts to set data at the \nfirebase location.  \n\nUnfortunately, the open data set firebase\nwe are using has security rules in place\nand we are unauthorized!  \n\nThe set node will fail and generate a \nNode-Red error.  The catch node will \nreceive the message that caused this \nerror and log it to the debug tab.\n\nThis flow is fired once at Deploy time\nand when Node-Red is first started up.\nYou can also click the button on the \ninject node to fire it whenever you like.","x":120.5,"y":298,"z":"2c582bd8.d3a7d4","wires":[]},{"id":"885fa9db.77a058","type":"firebase.on","name":"","firebaseconfig":"","childpath":"/nashville","atStart":true,"eventType":"value","x":146,"y":118,"z":"2c582bd8.d3a7d4","wires":[["94393c88.6bc6c"]]},{"id":"94393c88.6bc6c","type":"debug","name":"","active":true,"console":"false","complete":"payload","x":344,"y":118,"z":"2c582bd8.d3a7d4","wires":[]},{"id":"6c02b399.93fd4c","type":"comment","name":"firebase.on() example flow","info":"This flow provides a simple example which\nconnects to the firebase \n[weather](https://publicdata-weather.firebaseio.com/)\n[open data set](https://www.firebase.com/docs/open-data/).\n\nFirebase.on(\"value\") events are fired\nwhenever the weather changes in \nNashville, TN and sent to the debug node.\n\nYou can view the data in the debug tab\nto the right.","x":113,"y":80,"z":"2c582bd8.d3a7d4","wires":[]},{"id":"6bc1f6a5.943e08","type":"comment","name":"-------------------CLICK ME AND READ THE INFO PANE-------------------","info":"Before clicking the Deploy button,\nYou need to configure login credentials \nfor each node with a Red Triangle (all of \nthe Firebase nodes)\n\nYou can add new credentials by double \nclicking on any firebase node and \nclicking on the pencil icon in the top \nright corner of the edit dialog box. \nOnce you have created a set of credentials\nthey will be available in the drop down\nbox.\n\nFor this example, you will want to set\nFirebase to \"publicdata-weather\" \n(without the quotes) and Auth Type to \nNone.","x":245.5,"y":20,"z":"2c582bd8.d3a7d4","wires":[]}]
```
- <A HREF="http://nodered.org/docs/getting-started/running.html">Launch Node-Red</A> and open the web user interface (Located at <A HREF="http://127.0.0.1:1880">http://127.0.0.1:1880</A> by default).

- Click the menu drop down in the top right corner and select Import -> Clipboard.

- Paste the contents of your clipboard in and click "OK".

- Click in the pallete to place the nodes.

- You now need to configure login credentials for each node with a Red Triangle.  You can add new credentials by double clicking on any firebase node and clicking on the pencil icon in the top right corner of the edit dialog box. Once you have created a set of credentials they will be available in the drop down box for use in other nodes.

- Press the Deploy Button in the top right corner and begin experimenting!

##Potential Node-Red Installation Issues on Windows

For Node-Red installations on Windows using Node.JS v0.12, you may run into missing compiler dependencies from npm and see MSBUILD errors.  Installing <A HREF="https://www.visualstudio.com/en-us/visual-studio-homepage-vs.aspx">Microsoft Visual Studio Community</A> should fix this issue.

##Node.JS on Windows behind a Corporate Proxy Server
If you are using Node.JS on Windows behind a corporate proxy server, you will likely run into issues with
node programs and npm.  Run the following commands to inform node of your proxy settings (modify the values to fit your proxy setup):

    set HTTP_PROXY=http://myproxy.myproxydomain.com:port
    set HTTPS_PROXY=http://myproxy.myproxydomain.com:port
    npm config set proxy http://myproxy.myproxydomain.com:port
    npm config set https-proxy http://myproxy.myproxydomain.com:port

If authentication is required by your proxy, you may need to use the following syntax:

    set HTTP_PROXY=http://domain%5Cuser:password@myproxy.myproxydomain.com:port
    set HTTPS_PROXY=http://domain%5Cuser:password@myproxy.myproxydomain.com:port
    npm config set proxy http://domain%5Cuser:password@myproxy.myproxydomain.com:port
    npm config set https-proxy http://domain%5Cuser:password@myproxy.myproxydomain.com:port

To undo these changes for use outside of a proxied environment run

    set HTTP_PROXY=
    set HTTPS_PROXY=
    npm config delete proxy
    npm config delete https-proxy

#Feedback and Support
For feedback or support on the Firebase Nodes, please submit issues to the <A HREF="https://github.com/deldrid1/node-red-contrib-firebase/issues">Github issue tracker</A>.

For more information, feedback, or community support on Node-Red, see the <A HREF="http://nodered.org/">Node-Red Website</A>, <A HREF="https://groups.google.com/forum/#!forum/node-red">Google groups forum</A>, and <A HREF="https://www.github.com/node-red/node-red">Github Repository</A>.

#//TODO: List
- All of the ones scattered throughout the code

- Code cleanup and commenting (using jsDoc?)

- Once Firebase allows multiple references to have different authentications, we will need to change the singleton architecture that we have in place currently...

- Validation on HTML and Javascript, ensuring that only a single firebaseurl is allowed in a config node at a time (due to the way firebase auth works)

- Add ability to set .priorities with firebase_modify nodes (none, timestamp, number, string, msg.priority, etc.)

- Extend .on and .once to optionally allow for Firebase queries
  orderby*, startAt (value and key for orderbypriority), endAt (value and key for orderbypriority), equalTo, limitToFirst, limitToLast, limit, etc.

- Checkbox for shallow queries in .once (this will need to use the Firebase REST API since that is the only way to execute a shallow query currently)

- Add support for all of Firebase's Authentication strategies (including anonymous, custom token, facebook, twitter, etc.)

- Add support for .ondisconnect to allow nodes to manage presence

- Expose more of the Firebase API and add nodes for creating users, updating passwords, etc.?
