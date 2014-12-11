/**
 * A hook that gets called when the edit has been initialized.
 *
 * @param  {String}      hook_name    The name of the hook (postAceInit in this case).
 * @param  {Object}      args         A set of arguments
 * @param  {Function}    cb           Standard etherpad callback function
 */
exports.postAceInit = function (hook_name, args, cb) {
    // Track whether or not authorship colors are visible
    var authorColors = false;

    // Disable the input field where the user can change his or her name.
    $('#myusernameedit').prop('disabled', true);

    // Replace the icon in the show users button
    $('.buttonicon-showusers').removeClass('buttonicon-showusers').addClass('buttonicon-oae buttonicon-user');

    // Add extra buttons to the toolbar *after* the style select
    $('ul.menu_left').append('<li data-type="button" data-key="colorcheck"><a class="grouped-left" data-l10n-id="pad.settings.colorcheck" title="Toggle authorship colors"><span class="buttonicon buttonicon-oae buttonicon-clearauthorship"></span></a></li>');
    $('ul.menu_left').append('<li data-type="button" data-key="download"><a target="_blank" href="' + window.location.pathname + '/export/pdf" class="grouped-right" data-l10n-id="pad.importExport.exportpdf" title="Download"><span class="buttonicon buttonicon-oae buttonicon-download"></span></a></li>');

    // Show the toolbar
    $('.toolbar').animate({
        'height': '52px',
        'opacity': '1'
    }, 500);
    $('#editorcontainerbox').animate({
        'top': '55px',
    }, 500);

    // Enable the spellchecker
    $('iframe[name="ace_outer"]').contents().find('iframe').contents().find('#innerdocbody').attr('spellcheck', 'true');

    // Hide line numbers by default
    pad.changeViewOption('showLineNumbers', false);

    // Set default authorship colors
    pad.changeViewOption('showAuthorColors', authorColors);
    
    // And toggle when button is clicked
    $('a[data-l10n-id="pad.settings.colorcheck"]').on('click', function() {
        authorColors = !authorColors;
        pad.changeViewOption('showAuthorColors', authorColors);
        return false;
    });

    // Tweak the online count style. We need to wait for the call stack to clear as the
    // event is sent out before the count html is updated. We could use _.defer here but
    // to avoid importing another dependency setTimeout is used.
    setTimeout(function() {
        updateUserCount();
    }, 1);
};

/**
 * A function to keep the user count badge updated correctly
 */

updateUserCount = function() {
    // Restore classes that etherpad may remove
    $('#online_count').addClass('badge badge-important');
    // No need to show a badge if only one user is accessing the document
    if ($('#online_count').text() === "1") {
        $('#online_count').hide();
    } else {
        $('#online_count').show();
    }
}

/**
 * A hook that gets called when a user joins or updates the pad.
 *
 * @param  {String}      hook_name    The name of the hook (userJoinOrUpdate in this case).
 * @param  {Object}      args         A set of arguments
 * @param  {Function}    cb           Standard etherpad callback function
 */
exports.userJoinOrUpdate = function(hook_name, args, cb) {
    // Tweak the online count style. We need to wait for the call stack to clear as the
    // event is sent out before the count html is updated. We could use _.defer here but
    // to avoid importing another dependency setTimeout is used.
    setTimeout(function() {
        updateUserCount();
    }, 1);
};

/**
 * A hook that gets called when a user leaves the pad.
 *
 * @param  {String}      hook_name    The name of the hook (userLeave in this case).
 * @param  {Object}      args         A set of arguments
 * @param  {Function}    cb           Standard etherpad callback function
 */
exports.userLeave = function(hook_name, args, cb) {
    // Tweak the online count style. We need to wait for the call stack to clear as the
    // event is sent out before the count html is updated. We could use _.defer here but
    // to avoid importing another dependency setTimeout is used.
    setTimeout(function() {
        updateUserCount();
    }, 1);
};

/**
 * A hook that allows us to inject CSS stylesheets into the editor frame
 *
 * @return {String[]}   A set of paths that point to CSS files that need to be injected in the editor frame
 */
exports.aceEditorCSS = function() {
    return ['ep_oae/static/css/editor.css']
};
