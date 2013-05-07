# ep_oae

This Etherpad plugin creates an integration for the [Sakai OAE system](https://github.com/sakaiproject/Hilary).
It provides a way to do:
 * simple authentication by passing in the sessionID (that was created in Hilary) in the querystring.
 * skinning of the editor interface.

## Configuration

You will need to set the `requireSession` value to `true` in etherpad's `settings.json` file.
It's recommended to also add in a `sessionKey`. This can be any random value, but should be the same across the cluster.

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
