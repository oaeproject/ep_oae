/**
 * A hook that gets called when the edit has been initialized.
 *
 * @param  {String}      hook_name    The name of the hook (postAceInit in this case).
 * @param  {Object}      args         A set of arguments
 * @param  {Function}    cb           Standard etherpad callback function
 */
exports.postAceInit = function (hook_name, args, cb) {
    // Disable the input field where the user can change his or her name.
    $('#myusernameedit').prop('disabled', true);
    // Replace the bold icon with a font awesome icon
    $('.buttonicon-bold').html('<i class="icon-bold"></i>');
    // Replace the italic icon with a font awesome icon
    $('.buttonicon-italic').html('<i class="icon-italic"></i>');
    // Replace the underline icon with a font awesome icon
    $('.buttonicon-underline').html('<i class="icon-underline"></i>');
    // Replace the strikethrough icon with a font awesome icon
    $('.buttonicon-strikethrough').html('<i class="icon-strikethrough"></i>');
    // Replace the insertorderedlist icon with a font awesome icon
    $('.buttonicon-insertorderedlist').html('<i class="icon-list-ol"></i>');
    // Replace the insertunorderedlist icon with a font awesome icon
    $('.buttonicon-insertunorderedlist').html('<i class="icon-list-ul"></i>');
    // Replace the indent icon with a font awesome icon
    $('.buttonicon-indent').html('<i class="icon-indent-right"></i>');
    // Replace the outdent icon with a font awesome icon
    $('.buttonicon-outdent').html('<i class="icon-indent-left"></i>');
    // Replace the showusers icon with a font awesome icon
    $('.buttonicon-showusers').html('<i class="icon-user"></i>');
    // Add the custom authorship colour toggle button
    $('ul.menu_left').append('<li data-type="button" data-key="colorcheck"><label for="options-colorscheck" data-l10n-id="pad.settings.colorcheck"><a class="grouped-right"><span class="buttonicon buttonicon-adjust" data-l10n-id="pad.settings.colorcheck" title="Toggle authorship colors"><i class="icon-adjust"></i></span></a></label></li>');
    $('ul.menu_left').append('<li data-type="button" data-key="download"><a target="_blank" href="export/pdf"><div class="buttonicon buttonicon-download" data-l10n-id="pad.importExport.exportpdf" title="Download"><i class="icon-download-alt"></i></div></a></li>');
    // Tweak the online count style
    $('#online_count').addClass('badge badge-important');
    // Show the toolbar
    $('.toolbar').animate({
        'height': '52px',
        'opacity': '1'
    }, 500);
    $('#editorcontainerbox').animate({
        'top': '55px',
    }, 500);
    // Hide line numbers by default
    pad.changeViewOption('showLineNumbers', false);
    // Hide authorship colours by default
    pad.changeViewOption('showAuthorColors', false);
    // Enable the spellchecker
    $('iframe[name="ace_outer"]').contents().find('iframe').contents().find('#innerdocbody').attr('spellcheck', 'true');
};

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
        $('#online_count').addClass('badge badge-important');
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
        $('#online_count').addClass('badge badge-important');
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
