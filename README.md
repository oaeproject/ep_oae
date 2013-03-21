ep_oae
=======

A simple authentication plugin for the [https://github.com/sakaiproject/Hilary](Sakai OAE system).

You will need to add the following object to your etherpads' settings.json file:

```javascript
"ep_oae": {
    "signKey": "The default signing key, please change me."
}
```

Obviously this should match with what you've defined in the `config.js` file in Hilary.

