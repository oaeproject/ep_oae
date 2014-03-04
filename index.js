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

var fs = require('fs');
var util = require('util');

var AuthorManager = require('ep_etherpad-lite/node/db/AuthorManager');
var DB = require('ep_etherpad-lite/node/db/DB').db;
var PadMessageHandler = require('ep_etherpad-lite/node/handler/PadMessageHandler');

var RecentAuthors = require('./lib/RecentAuthors');

var APIKEY = null;
try {
    APIKEY = fs.readFileSync('./APIKEY.txt', 'utf8');
} catch (err) {
    console.error('Could not read the APIKEY: ', err);
}

/**
 * The `handleMessage` hook
 *
 * @param  {String}     hook        The hook name (in this case `expressCreateServer`)
 * @param  {Object}     args        The arguments to this hook. In this case it's the express `app` object
 * @param  {Function}   callback    Standard etherpad callback function
 */
exports.expressCreateServer = function(hook, args, callback) {
    /*!
     * Registers a simple endpoint that sets the sessionID as a cookie and redirects
     * the user to the pad.
     * We use an endpoint rather than some middleware as we cannot guarantee the order
     * in which plugins get loaded and thus cannot be sure that our middleware gets picked
     * up before Etherpad's session middleware.
     * If a language has been specified, we'll set it in a cookie as well.
     */
    args.app.get('/oae/:padId', function(req, res) {
        if (!req.query.sessionID || !req.query.pathPrefix) {
            res.send(401, 'Unauthorized');
            return;
        }

        // Set the session cookie
        req.cookies.sessionID = req.query.sessionID;
        res.cookie('sessionID', req.query.sessionID);

        // Set the language (if one is specified)
        if (req.query.language) {
            req.cookies.language = req.query.language;
            res.cookie('language', req.query.language);
        }

        // Redirect to the pad
        res.redirect(req.query.pathPrefix + '/p/' + req.params.padId);
    });

    /*!
     * Returns whether or not a user made a change in a certain pad
     */
    args.app.get('/oae/:padId/recentAuthors', function(req, res) {
        if (req.query.apikey !== APIKEY) {
            return res.send(401, 'Missing or wrong api key');
        } else if (!req.params.padId || !req.query.userId) {
            return res.send(400, 'Missing padId or userId');
        }

        // We need to retrieve the etherpad author ID for the given OAE user id
        DB.get('mapper2author:' + req.query.userId, function(err, authorId) {
            if (err) {
                console.error('Error when retrieving author for userId: ', err);
                return res.send(500, 'Error when retrieving author author for userId');
            } else if (!authorId) {
                return res.send(404, 'No author found for that user ID');
            }

            /*
             * We perform a check and clear as the user could do:
             *   1.  Make a couple of changes
             *   2.  Navigate away from the page (thus triggering a publication)
             *   3.  Come back to the document in 5 minutes
             *   4.  Watch another user make some changes
             *   5.  Navigate away from the page
             *
             * Step 5 should not trigger a second publication as he did not make any changes.
             * If we would not remove the user from the recent authors list in step 2, we would wrongly
             * generate that second publication in step 5
             */
            var isRecent = RecentAuthors.checkAndClearRecentAuthor(req.params.padId, authorId);
            return res.send(200, {'recent': isRecent});
        });
    });

    return callback();
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
    if (args.message && args.message.data) {
        // Username updates appear in USERINFO_UPDATE messages
        if (args.message.data.type === 'USERINFO_UPDATE') {
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
                    // but that gets normalized to callback([]) which would not drop the message
                    return callback([null]);

                // Otherwise, pass it on
                } else {
                    return callback();
                }
            });

        // Somebody made a change to a document
        } else if (args.message.data.type === 'USER_CHANGES') {
            var apool = args.message.data.apool;
            if (apool && apool.nextNum !== 0 && apool.numToAttrib && apool.numToAttrib['0'] && apool.numToAttrib['0'].length === 2 && apool.numToAttrib['0'][0] === 'author') {
                var authorId = args.message.data.apool.numToAttrib["0"][1];
                var padId = PadMessageHandler.sessioninfos[args.client.id].padId;
                RecentAuthors.addRecentAuthor(padId, authorId);
            }
            return callback();
        } else {
            return callback();
        }
    } else {
        return callback();
    }
};
