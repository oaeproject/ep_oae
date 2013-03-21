ep_oae
=======

This etherpad plugin creates an integration for the [Sakai OAE system](https://github.com/sakaiproject/Hilary).
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

