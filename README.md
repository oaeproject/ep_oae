# Open Academic Environment (OAE Project) Etherpad Plugin

This Etherpad plugin creates an integration for the [Open Academic Environment (OAE)](https://github.com/oaeproject/Hilary) project.
It provides a way to do:
 * simple authentication by passing in the sessionID (that was created in Hilary) in the querystring.
 * skinning of the editor interface.

## Configuration

You will need to set the `requireSession` and `editOnly` values to `true` in etherpad's `settings.json` file.

It's recommended to also add in a `sessionKey`. This can be any random value, but should be the same across the cluster.

To get it working, change the `dbType` to `cassandra` and enter the following `dbSettings`:

```javascript
"dbSettings" : {
    "hosts": ["127.0.0.1:9160"],
    "keyspace": "oae",
    "cfName": "Etherpad",
    "user": "",
    "pass": "",
    "timeout": 3000,
    "replication": 1,
    "strategyClass": "SimpleStrategy"
}
```

The last step is to add the `websocket` protocol. It's important to add this as the first element of the array.

```javascript
"socketTransportProtocols" : ["websocket", "xhr-polling", "jsonp-polling", "htmlfile"]
```

## Installation

You should have the following structure (assuming you have etherpad at `/opt/etherpad`)

* /opt/etherpad
    * APIKEY.txt
    * src
    * settings.json
    * ...
    * node_modules/
         * ep_oae/
              * index.json
              * ep.json

Copy or symlink the `static/css/padd.css` file in this plugin to `your-etherpad-directory/src/static/custom/pad.css`. This file will skin the etherpad chrome. In order to have custom titles for headers, copy or symlink the `static/templates/editbarButtons.ejs` file in this plugin to `your-etherpad-directory/node_modules/ep_headings/templates/editbarButtons.ejs`.

In order to use the OAE toolbar, the etherpad `settings.json` file needs to be updated to reflect the following changes:

```javascript
"toolbar": {
    "left": [
        ["bold", "italic", "underline", "strikethrough", "orderedlist", "unorderedlist", "indent", "outdent"]
    ],
    "right": [
        ["showusers"]
    ]
}
```
