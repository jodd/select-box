/* ==========================================================================
   SelectBox class definition
   ========================================================================== */
import $ from 'jquery';

/* Private
   ========================================================================== */
const defaults = {
    keypressDelay: 1000,
    offset: -0.3
};

const namespace = 'listbox';
const $W = $(window);
const $D = $(document);

// Alter the .on() jquery function to namespace events automatically.
// TODO : Not sure if it's clean and/or safe, didnt find any resource about this technique. Need to dig into this.
const jqueryOn = $.fn.on;
$.fn.on = function(events, ...args) {
    return jqueryOn.apply(this, [events.split(' ').join('.' + namespace + ' ') + '.' + namespace].concat(args));
};

/* _makeList ---------------------------------------------------------------- */
function _makeList(tag, object) {
    const list = document.createElement(tag);
    let node, text;

    list.setAttribute('aria-hidden', 'true');

    $(object).find('*').each((index, el) => {
        node = document.createElement('li');

        if (el.tagName.toLowerCase() === 'optgroup') {
            node.setAttribute('role', 'separator');
            text = document.createTextNode(el.label);
        }

        if (el.tagName.toLowerCase() === 'option') {
            node.setAttribute('role', 'option');
            node.tabIndex = 1;
            text = document.createTextNode(el.textContent);
        }

        node.appendChild(text);
        list.appendChild(node);
    });

    return list;
}

/* Public
   ========================================================================== */
export class SelectBox {

/* constructor -------------------------------------------------------------- */
constructor(element, options) {

    this.options = $.extend({}, defaults, options);

    this.el = element;

    // original select element is no longer focusable
    this.el.setAttribute('tabindex', '-1');

    this.isOpen = false; // default state is closed
    this.touchmove = false;
    this.timer = 0;
    this.input = '';
    
    this.disabled = this.el.disabled;

    this.init();
}

/* init --------------------------------------------------------------------- */
init() {

    // create wrapper
    this.$box = $('<div>', {
            'role': 'listbox',
            'aria-expanded': 'false',
            'aria-disabled': this.el.disabled,
            'tabindex': this.el.disabled ? -1 : 0
        }).insertBefore(this.el)
        // provide some keyboard control
        .on('keydown', this.onKeydown.bind(this))
        .on('keypress', this.onKeypress.bind(this));

    // create control element
    this.$control = $('<span>', {
        text: this.el.options[this.el.selectedIndex].textContent
    }).appendTo(this.$box);

    // create & insert the list of options
    this.$list = $(_makeList('ul', this.el))
        .css('max-height', $(window).height() / 2)
        .appendTo(this.$box);

    // cache links that stand for options
    this.$options = this.$list.children('[role="option"]')
        // always have only one option focused/hovered
        .on('mouseover', e => { e.target.focus() })
        .on('click', e => {
            this.update(this.$options.index(e.target));
            this.$box.focus();
        });

    // make sure control width is wide enough to display any option
    this.$control.css('min-width', this.$options.first().width());

    // set the default selected option
    this.$options.eq(this.el.selectedIndex).attr('aria-selected', 'true');

    // cache items that stand for optgroups
    this.$optgroups = this.$list.children('[role="separator"]');

    // manage user click inside and outside the listbox
    $D.on('click', e => {
        
        // click on label makes focus on listbox
        if ($(e.target).closest('label[for="' + this.el.id + '"]').length && !this.el.disabled) {
            e.preventDefault();
            this.$box.focus();
        }

        if ($(e.target).closest(this.$box).length && !this.el.disabled) {
            this.toggle();
        }
        // close unless user clicked on group separator
        else if (this.$optgroups.index(e.target) === -1) {
            this.close();
        }
    });

    // Trigger native select menu on touch devices.
    $W.on('touchmove', e => { this.touchmove = true });
    $W.on('touchend', e => {
        if (this.touchmove) {
            this.touchmove = false;
            return;
        } else if ($(e.target).closest(this.$box).length && !this.el.disabled) {
            e.preventDefault();
            this.el.focus();
        }
    });

    // alt + tab closes the box and move focus on itself
    // (rather than on the last focused option)
    $W.on('blur', e => {
        if (this.isOpen) {
            this.close();
            this.$box.focus();
        }
    });

    // Update this listbox selected element when native element changes.
    // (touch devices support)
    $(this.el).on('change', e => {
        this.update(e.target.selectedIndex);
    });

    this.position();

  }

/* position ----------------------------------------------------------------- */
position() {

    const defaultTop = this.options.offset * this.$list.height();
    const defaultOffset = this.$box.offset().top - $W.scrollTop() + defaultTop;
    const gap = Math.max(0, defaultOffset + this.$list.height() - $W.height() + 30);

    this.$list.css('top', defaultTop - gap);
}

/* open --------------------------------------------------------------------- */
open() {

    if (this.isOpen) { return; }
    
    this.position();
    this.$box.attr('aria-expanded', 'true');
    this.$list.attr('aria-hidden', 'false');
    this.$options.eq(this.el.selectedIndex).focus();
    this.isOpen = true;
}

/* close -------------------------------------------------------------------- */
close() {

    if (!this.isOpen) { return; }
    
    this.$box.attr('aria-expanded', 'false');
    this.$list.attr('aria-hidden', 'true');
    this.isOpen = false;
}

/* toggle ------------------------------------------------------------------- */
toggle() {
    this.isOpen ? this.close() : this.open();
}

/* update ------------------------------------------------------------------- */
update(index) {
    const $element = this.$options.eq(index);

    this.$control.text($element.text());
    this.el.selectedIndex = index;
    this.$options.attr('aria-selected', 'false');
    $element.attr('aria-selected', 'true');
}

/* onKeydown ---------------------------------------------------------------- */
onKeydown(e) {

    if (this.disabled) return;

    let index = this.isOpen ? this.$options.index(e.target) : this.el.selectedIndex;

    switch (e.keyCode) {

        case 9: // TAB
            if (this.isOpen)
                return false;
            break;

        case 32: // SPACE
            e.preventDefault();

            if (this.isOpen) {
                this.update(index);
                this.$box.focus();
            }

            this.toggle();
            break;

        case 38: // UP ARROW
            e.preventDefault();

            if (index--) {

                if (this.isOpen)
                    this.$options[index].focus();
                else
                    this.update(index);
            }
            break;

        case 40: // DOWN ARROW
            e.preventDefault();

            if (++index !== this.$options.length) {

                if (this.isOpen)
                    this.$options[index].focus();
                else
                    this.update(index);
            }
            break;

        case 27: // ESC
            
            if (this.isOpen) {
                this.close();
                this.$box.focus();
            }
    }
}

/* onKeypress --------------------------------------------------------------- */
onKeypress(e) {

    if (!e.charCode || this.disabled)
        return this;

    const key = String.fromCharCode(e.which);
    const elapsed = Date.now() - this.timer > this.options.keypressDelay;
    
    let i = elapsed ? this.el.selectedIndex : this.el.selectedIndex - 1,
        j = -1,
        $item;

    // concatenate input if pressed within delay
    this.input = elapsed ? key : this.input + key;

    // update timer
    this.timer = Date.now();

    // if the user input matches any option
    // focus proper item if list open
    // update listbox otherwise
    while (++j < this.$options.length) {
        i = ++i === this.$options.length ? 0 : i;
        $item = this.$options.eq(this.isOpen ? j : i);

        if (this.input === $item.text().substr(0, this.input.length).toLowerCase()) {

            if (this.isOpen) {
                $item.focus();
                return this;
            } else
                return this.update(i);
        }
    }
}

/* enable ------------------------------------------------------------------- */
enable() {

    this.disabled = this.el.disabled = false;

    this.$box.attr({
      'tabindex': 0,
      'aria-disabled': false
    });
}

/* disable ------------------------------------------------------------------ */
disable() {

    this.disabled = this.el.disabled = true;

    this.$box.attr({
        'tabindex': -1,
        'aria-disabled': true
    });
}

}
