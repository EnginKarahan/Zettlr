/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrDialog class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         MIT
 *
 * Description:     This class displays big modals on the app.
 *
 * END HEADER
 */

const fs = require('fs');
const path = require('path');
const {trans} = require('../common/lang/i18n.js');

/**
 * Dialog errors may occur.
 * @param       {String} [msg=''] An additional error message.
 * @constructor
 */
function DialogError(msg = '') {
    this.name = trans('dialog.error.name');
    this.message = trans('dialog.error.message', msg);
}

/**
 * This class definitely needs a revamp, because it is not self-sustaining but
 * relies to a mind-boggling extent on functionality and assumptions about the
 * ZettlrBody-class. While in the early days of Zettlr, this class's task was to
 * provide windows for everything (even renaming files or creating new), with
 * the advent of the ZettlrPopup class, most of the functionality went there.
 * What has remained is the Preferences window. What will, in the future, be
 * added, is the About window. And maybe something else. But as I said, first,
 * it needs a revamp.
 */
class ZettlrDialog
{
    /**
     * Prepare the dialog
     * @param {Mixed} [parent=null] The containing object
     */
    constructor(parent = null)
    {
        // Used to retrieve some configuration options
        this._parent = parent;
        this._body = $('body');
        this._container = $('#container');
        this._modal = $('<div>').addClass('modal');
        this._dlg = null;
        this._passedObj = null;
    }

    /**
     * Opens a dialog after it has been initialized
     * @return {ZettlrDialog} Chainability.
     */
    open()
    {
        if(!this.isInitialized()) {
            throw new DialogError(trans('dialog.error.no_init'));
        }

        this._container.addClass('blur');
        this._body.append(this._modal);

        // Adjust the margins
        let dialog = this._modal.find('.dialog').first();
        let diaH = dialog.outerHeight();
        let winH = $(window).height();

        if(diaH < winH) {
            let margin = (winH-diaH) / 2;
            dialog.css('margin-top', margin + "px");
            dialog.css('margin-bottom', margin + "px");
        } else {
            dialog.css('margin-top', '15%'); // Otherwise enable scrolling
            dialog.css('margin-bottom', '15%');
        }

        // Activate event listeners
        return this._act();
    }

    /**
     * Closes the dialog.
     * @return {ZettlrDialog} Chainability.
     */
    close()
    {
        this._modal.detach();
        this._container.removeClass('blur');
        this._modal.html('');
        this._dlg = null;
        this._passedObj = null;
        return this;
    }

    /**
     * Has the dialog been initialized?
     * @return {Boolean} True, if the initialization has occurred previously.
     */
    isInitialized()
    {
        return (this._dlg !== null);
    }

    /**
     * Initializes the dialog.
     * @param  {String} dialog     The dialog type (i.e. template name)
     * @param  {Mixed} [obj=null] An object representing things to be replaced
     * @return {ZettlrDialog}            Chainability.
     */
    init(dialog, obj = null)
    {
        // POSSIBLE DIALOGS:
        // preferences

        if(!obj) {
            throw new DialogError(trans('dialog.error.no_data', obj));
        }

        this._passedObj = obj;
        this._dlg = dialog;

        let replacements = [];
        switch(dialog) {
            case 'preferences':
            let dark = (obj.darkTheme) ? 'checked="checked"' : '';
            let snippets = (obj.snippets) ? 'checked="checked"' : '';
            let debug = (obj.debug) ? 'checked="checked"' : '';
            let autosave = (obj.autosave) ? 'checked="checked"' : '';
            replacements.push('%DARK%|' + dark);
            replacements.push('%SNIPPETS%|' + snippets);
            replacements.push('%DEBUG%|' + debug);
            replacements.push('%AUTOSAVE%|' + autosave);
            replacements.push('%PANDOC%|' + obj.pandoc);
            replacements.push('%PDFLATEX%|' + obj.pdflatex);
            let spellcheck = '';
            for(let l in obj.spellcheck) {
                let sel = (obj.spellcheck[l]) ? 'checked="checked"' : '';
                spellcheck += '<div>';
                spellcheck += `<input type="checkbox" value="${l}" ${sel} name="spellcheck[]" id="${l}"><label for="${l}">${trans('dialog.preferences.app_lang.'+l)}</label>`;
                spellcheck += '</div>';
            }
            replacements.push('%SPELLCHECK%|' + spellcheck);
            let lang_selection = '';
            for(let l of obj.supportedLangs) {
                if(l === this._parent.getLocale()) {
                    lang_selection += `<option value="${l}" selected="selected">${trans('dialog.preferences.app_lang.'+l)}</option>`;
                } else {
                    lang_selection += `<option value="${l}">${trans('dialog.preferences.app_lang.'+l)}</option>`;
                }
            }
            replacements.push('%APP_LANG%|' + lang_selection)
            break;

            case 'update':
            replacements.push('%NEWVER%|' + obj.newVer);
            replacements.push('%CHANGELOG%|' + obj.changelog);
            replacements.push('%RELEASEURL%|' + obj.releaseURL);
            break;

            default:
            throw new DialogError(trans('dialog.error.unknown_dialog', dialog));
            break;
        }

        this._modal.html(this._get('dialog-' + dialog, replacements));

        return this;
    }

    /**
     * Activates the event listeners.
     * @return {ZettlrDialog} Chainability.
     */
    _act()
    {
        // Select the "untitled"-content
        let form = this._modal.find('form#dialog');
        form.find('input').first().select();

        // Activate the form to be submitted
        form.on('submit', (e) => {
            e.preventDefault();
            // Give the ZettlrBody object the results
            // Form: dialog type, values, the originally passed object
            this._parent.proceed(this._dlg, form.serializeArray(), this._passedObj);
        });

        // Abort integration if an abort button is given
        this._modal.find('#abort').on('click', (e) => {
            this.close();
        });

        // Don't bubble so that the user may click on the dialog without
        // closing the whole modal.
        this._modal.find('.dialog').on('click', (e) => { e.stopPropagation(); });

        // Abort on click
        this._modal.on('click', (e) => { this.close(); });

        // Tabbify the settings dialog
        if(this._dlg === 'preferences') {
            this._modal.find('.dialog').tabs({
                heightStyle: 'auto' // All tabs same height
            });
        }

        return this;
    }

    /**
     * Reads and return a template file, applying replacements if given
     * @param  {String} template          The template to load
     * @param  {Array}  [replacements=[]] Replacement table for variables
     * @return {String}                   Returns the template with replaced vars.
     */
    _get(template, replacements = [])
    {
        let p = path.join(__dirname, 'assets', 'tpl', template + '.htm');

        try {
            let stat = fs.lstatSync(p);
        } catch (e) {
            throw new DialogError(trans('dialog.error.no_template', template));
        }

        let cnt = fs.readFileSync(p, { encoding: 'utf8' });

        // Translation-strings:
        let i18n = this._getLanguageTable(cnt);
        replacements = i18n.concat(replacements);

        // Replace variables
        for(let r of replacements) {
            r = r.split('|');
            cnt = cnt.replace(new RegExp(r[0], 'g'), r[1]);
        }

        return cnt;
    }

    /**
     * This function creates a replacement table for all language strings that
     * should be translated.
     * @param  {String} text The string in which i18n strings should be replaced.
     * @return {String}      The text with translation strings replaced.
     */
    _getLanguageTable(text)
    {
        // How it works: In the template files are replacement strings in the
        // following format:
        // %i18n.<dialog>.<stringidentifier>%
        // Benefit: We can programmatically create the array based on the
        // JSON values of trans, because the i18n-placeholder exactly matches
        // a string!

        let replacements = [];

        // First find all i18n-strings
        let regex = /%i18n\.(.+?)%/g, result, i18n_strings = [];
        while(result = regex.exec(text)) {
            i18n_strings.push(result[0]);
        }

        for(let str of i18n_strings) {
            let lang_opt = str.substr(0, str.length-1).split('.').slice(1); // Omit first index
            let obj = global.i18n.dialog;

            for(let x of lang_opt) {
                // Navigate into the object
                if(obj.hasOwnProperty(x)) {
                    obj = obj[x];
                } else {
                    // Doesn't exist, throw back the string itself
                    obj = lang_opt.join('.');
                    break;
                }
            }
            replacements.push(str + '|' + obj);
        }

        return replacements;
    }
}

module.exports = ZettlrDialog;
