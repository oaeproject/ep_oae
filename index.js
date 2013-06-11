/*!
 * Copyright 2013 Apereo Foundation (AF) Licensed under the
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

var util = require('util');
var AuthorManager = require('ep_etherpad-lite/node/db/AuthorManager');

/**
 * The `handleMessage` hook.
 * Registers a simple endpoint at /oae that sets the sessionID as a cookie and redirects
 * the user to the pad.
 * We use an endpoint rather than some middleware as we cannot guarantee the order
 * in which plugins get loaded and thus cannot be sure that our middleware gets picked
 * up before Etherpad's session middleware.
 * If a language has been specified, we'll set it in a cookie as well.
 *
 * @param  {String}   hook     The hook name (in this case `expressCreateServer`).
 * @param  {Object}   args     The arguments to this hook. In this case it's the express `app` object.
 * @param  {Function} callback Standard etherpad callback function
 */
exports.expressCreateServer = function(hook, args, callback) {
    args.app.get('/oae/:padId', function(req, res) {
        if (!req.query.sessionID) {
            res.send(401, 'Unauthorized');
            return;
        }

        // Set the session cookie.
        req.cookies.sessionID = req.query.sessionID;
        res.cookie('sessionID', req.query.sessionID);

        // Set the language (if one is specified).
        if (req.query.language) {
            req.cookies.language = req.query.language;
            res.cookie('language', req.query.language);
        }

        // Redirect to the pad.
        res.redirect('/p/' + req.params.padId);
    });

    // This hook is done.
    callback();
};

/**
 * The `handleMessage` hook.
 * It takes care of dropping username updates as those are not allowed.
 *
 * @param  {String}   hook     The hook name (in this case `handleMessage`).
 * @param  {Object}   args     The arguments to this hook. In this case it's a `client` socket.io object and a `message` object.
 * @param  {Function} callback Standard etherpad callback function
 */
exports.handleMessage = function(hook, args, callback) {
    // Username updates appear in USERINFO_UPDATE messages.
    if (args.message && args.message.data && args.message.data.type === 'USERINFO_UPDATE') {
        // Unfortunately color and IP updates also appear in USERINFO_UPDATE messages
        // and there is no way to distinct between the two. We need to fetch the original
        // author name and compare it with the name in the message object.
        // If it's the same we let the update flow through, otherwise we deny it.
        AuthorManager.getAuthor(args.message.data.userInfo.userId, function(err, user) {
            if (err) {
                return callback(err);

            // If the user tries to update his name, drop the message
            } else if (user.name !== args.message.data.userInfo.name) {
                // The documentation mentions we should be doing callback(null)
                // but that gets normalized to callback([]) which would not drop the message.
                return callback([null]);

            // Otherwise, pass it on
            } else {
                callback();
            }
        });
    } else {
        callback();
    }
};
