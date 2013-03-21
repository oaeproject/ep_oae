/*!
 * Copyright 2012 Sakai Foundation (SF) Licensed under the
 * Educational Community License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may
 * obtain a copy of the License at
 *
 *     http://www.osedu.org/licenses/ECL-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS"
 * BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

var Crypto = require('crypto');
var util = require('util');

var settings = require('ep_etherpad-lite/node/utils/Settings.js');
var authorManager = require("ep_etherpad-lite/node/db/AuthorManager");

var staticRegex = /^\/(static|javascripts|pluginfw|api|locales.json|favicon.ico)/;


///////////
// Hooks //
///////////


/**
 * Checks if a user is authorized to view the pad.
 * @see http://etherpad.org/doc/v1.2.6/#index_authorize
 *
 * @param  {String}     hook            The hook name
 * @param  {Object}     args            The arguments passed into this hook.
 * @param  {Request}    args.req        The expressJS request object.
 * @param  {Response}   args.res        The expressJS response object.
 * @param  {Function}   args.next       The expressJS next method in the middleware
 * @param  {String}     args.resource   The path.
 * @param  {Function}   callback        Standard callback method.
 */
exports.authorize = function(hook, args, callback) {
    // Don't bother with authorizing static requests.
    if (args.resource.substr(0, 3) !== '/p/') {
        return callback([ true ]);
    }

    // Strip out the /p/ from /p/padname
    if (args.req.session && args.req.session.user && args.req.session.user.username) {
        var pad = args.req._parsedUrl.pathname.substr(3).replace(/:/g, '_');
        if (args.req.session.pad[pad]) {
            callback([ true ]);
        } else {
            callback([ false ]);
        }
    } else {
        callback([ false ]);
    }
};

/**
 * A hook for authenticating users.
 * @see http://etherpad.org/doc/v1.2.6/#index_authenticate
 *
 * @param  {String}     hook            The hook name.
 * @param  {Object}     args            The arguments passed into this hook.
 * @param  {Request}    args.req        The expressJS request object.
 * @param  {Response}   args.res        The expressJS response object.
 * @param  {Function}   args.next       The expressJS next method in the middleware
 * @param  {Function}   callback        Standard callback method.
 */
exports.authenticate = function(hook, args, callback) {
    if (_verifySignature(args.req.query.signature, args.req.query.tenantAlias, args.req.query.expires, args.req.query.contentId, args.req.query.principalId, args.req.query.username)) {
        var username = args.req.query.username;
        args.req.session.user = { 'is_admin': false, 'username': args.req.query.username };
        args.req.session.pad = args.req.session.pad || {};
        args.req.session.pad[args.req.query.contentId.replace(/:/g, '_')] = true;
        callback([ true ]);
    } else {
        callback([ false ]);
    }
};

/**
 * A hook for handling messages.
 * @see  http://etherpad.org/doc/v1.2.6/#index_handlemessage
 *
 * @param  {String}     hook            The hook name.
 * @param  {Object}     args            The arguments passed into this hook.
 * @param  {Object}     args.message    The incoming message.
 * @param  {Function}   callback        Standard callback method.
 */
exports.handleMessage = function(hook, args, callback) {
    if (args.message.type === 'CLIENT_READY' && args.message.token) {
        // Set the authorname to the username that sits in the session.
        // This came in earlier when doing the authentication.
        var client_id = args.client.id;
        var username = args.client.manager.handshaken[client_id].session.user.username;
        setAuthor(args.message.token, username, function(err) {
            if (err) {
                // Drop the message if something goes wrong.
                return callback([ null ]);
            }

            // Otherwise the message can be passed on.
            callback([ args.message ]);
        });
    } else if (args.message.type == "COLLABROOM" && args.message.data.type == "USERINFO_UPDATE") {
        // Discard any user updates.
        return callback([null]);
    } else {
        // Pass on any other messages.
        return callback([args.message]);
    }
};


/////////////////////
// Utility methods //
/////////////////////


/**
 * Verifies a signature against some values.
 *
 * @param  {String}     signature   The signature to check.
 * @param  {String}     tenantAlias The tenant alias.
 * @param  {Number}     expires     When the signature expires (in ms since epoch.)
 * @param  {String}     contentId   The ID of the piece of OAE content that represents this pad.
 * @param  {String}     principalId The ID of the user who wants to access this pad.
 * @param  {String}     username    The name of the user who wants to access this pad.
 * @return {Boolean}                A boolean that is true when the signature matches, false otherwise.
 * @api private
 */
var _verifySignature = function(signature, tenantAlias, expires, contentId, principalId, username) {
    // Check if all variables are passed in.
    if (!signature || !tenantAlias || !contentId || !principalId || !username) {
        return false;
    }

    // The signature should be defined in the main settings.json file.
    var signKey = settings.ep_oae.signKey;

    // Check the signature.
    var msg = tenantAlias + '#' + expires + '#' + principalId + ':' + contentId + ':' + username;
    var hmac = Crypto.createHmac('sha1', signKey);
    hmac.update(msg);
    var sig = hmac.digest('hex');
    return sig === signature;
};

/**
 * Sets the authorname for a certain token.
 *
 * @param {String} token        The token that identifies a user.
 * @param {String} desiredName  The desired authorname.
 */
var setAuthor = function (token, desiredName, callback) {
    authorManager.getAuthor4Token(token, function(err, author) {
        if (err || !author) {
            console.error('Could not get an author for token %s: err', token, err);
            return callback(err || new Error('No author returned for token ' + token));
        }

        authorManager.setAuthorName(author, desiredName);
    });
};

