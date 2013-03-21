# ep_oae

This Etherpad plugin creates an integration for the [Sakai OAE system](https://github.com/sakaiproject/Hilary).
It provides a way to do:
 * simple authentication (via signed urls)
 * skinning of the editor interface.

## Configuration

You will need to add the following object to your etherpads' settings.json file:

```javascript
"ep_oae": {
    "signKey": "The default signing key, please change me."
}
```

Obviously this should match with what you've defined in the `config.js` file in Hilary.

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

## Deployment

TODO
