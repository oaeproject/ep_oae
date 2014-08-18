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

var _ = require('ep_etherpad-lite/node_modules/underscore');
var AttributePool = require('ep_etherpad-lite/static/js/AttributePool');
var AuthorManager = require('ep_etherpad-lite/node/db/AuthorManager');
var DB = require('ep_etherpad-lite/node/db/DB').db;
var PadManager = require('ep_etherpad-lite/node/db/PadManager');
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
 * @param  {Object}     args        The arguments to this hook. In this case the express `app` object
 * @param  {Function}   callback    Standard etherpad callback function
 */
exports.expressCreateServer = function(hook, args, callback) {
    /*!
     * Register a simple endpoint that sets the sessionID as a cookie and redirects
     * the user to the pad. If a language has been specified, that'll be set it in the
     * cookie as well. The `contentId`, `userId` and `authorId` parameters are all used
     * to add the user to the recent authors list for a pad.
     *
     * We use an endpoint rather than some middleware as we cannot guarantee the order
     * in which plugins get loaded and thus cannot be sure that our middleware gets picked
     * up before Etherpad's session middleware.
     */
    args.app.get('/oae/:padId', function(req, res) {
        if (!req.query.sessionID ||
            !req.query.pathPrefix ||
            !req.query.authorId ||
            !req.query.userId ||
            !req.query.contentId) {
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

        // Keep track of which pad the author joined
        RecentAuthors.join(req.params.padId, req.query.authorId, req.query.userId, req.query.contentId, req.query.displayName);

        // Redirect to the pad
        res.redirect(req.query.pathPrefix + '/p/' + req.params.padId);
    });

    return callback();
};

/**
 * The `handleMessage` hook takes care of:
 *  - dropping username updates as those are not allowed
 *  - keeping track of who made changes to a pad
 *
 * @param  {String}     hook        The hook name (in this case `handleMessage`)
 * @param  {Object}     args        The arguments to this hook. In this case a `client` socket.io object and a `message` object
 * @param  {Function}   callback    Standard etherpad callback function
 */
exports.handleMessage = function(hook, args, callback) {
    if (args.message && args.message.data) {
        // Username updates appear in USERINFO_UPDATE messages
        if (args.message.data.type === 'USERINFO_UPDATE') {
            // Unfortunately color and IP updates also appear in USERINFO_UPDATE messages
            // and there is no way to distinguish between the two. We need to fetch the original
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
            // Create a proper attribute pool object. The attribute pool
            // in the change event holds all the attributes that were changed
            // @see https://github.com/ether/etherpad-lite/wiki/Changeset-Library#apool
            if (!args.message.data.apool) {
                return callback();
            }
            var apool = new AttributePool().fromJsonable(args.message.data.apool);

            // Find out who the author of this change is
            var authorId = null;
            apool.eachAttrib(function(name, value) {
                if (name === 'author') {
                    authorId = value;
                }
            });

            // Determine what pad this change was made in
            var padId = PadMessageHandler.sessioninfos[args.client.id].padId;

            // Remember that the author made a change to the pad
            RecentAuthors.madeEdit(padId, authorId);
            return callback();
        } else {
            return callback();
        }
    } else {
        return callback();
    }
};

/**
 * This hook gets called when a user leaves a pad
 *
 * @param  {String}     hook                    The name of the hook
 * @param  {Object}     args                    The hook's arguments
 * @param  {Object}     args.session            The session information that is passed along when the hook is called
 * @param  {String}     args.session.padId      The etherpad pad id that the user left
 * @param  {String}     args.session.author     The etherpad author id of the user who left
 * @param  {Function}   callback                Standard callback function
 */
exports.userLeave = function(hook, session, callback) {
    RecentAuthors.getPadDisplayName(session.padId, session.author);
    RecentAuthors.leave(session.padId, session.author);
    return callback();
};

/**
 * A hook that gets called before a PDF is exported to retrieve a custom file name.
 *
 * @param  {String}      hook_name    The name of the hook (exportFileName in this case)
 * @param  {Object}      args         A set of arguments
 * @param  {Function}    cb           Standard etherpad callback function
 */
exports.exportFileName = function(hook_name, padId, cb) {
    // Get a user of the pad to retrieve the displayName.
    var session = _.filter(PadMessageHandler.sessioninfos, function(index, session) {
        if (session.padId === padId) {
            return session;
        }
    })[0];
    cb(RecentAuthors.getPadDisplayName(session.padId, session.author));
};
