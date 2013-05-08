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

exports.expressCreateServer = function(hook, args, callback) {
    /*!
     * Registers a simple endpoint at /oae that sets the sessionID as a cookie and redirects
     * the user to the pad.
     * We use an endpoint rather than some middleware as we cannot guarantee the order
     * in which plugins get loaded and thus cannot be sure that our middleware gets picked
     * up before Etherpad's session middleware.
     */
    args.app.get('/oae/:padId', function(req, res) {
        if (req.query.sessionID) {
            req.cookies.sessionID = req.query.sessionID;
            res.cookie('sessionID', req.query.sessionID);
            res.redirect('/p/' + req.params.padId);
        } else {
            res.send(401, 'Unauthorized');
        }
    });

    // This hook is done.
    callback();
};
