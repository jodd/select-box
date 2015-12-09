import $ from 'jquery';
import {SelectBox} from '../src/select-box.js';

$(document).ready(() => {

    $('select').each((index, el) => {
        const selectbox = new SelectBox(el);

        $(el).siblings('button').click(e => {
            e.preventDefault();

            if (selectbox.disabled) {
                selectbox.enable();
                e.target.textContent = 'Disable';
            } else {
                selectbox.disable();
                e.target.textContent = 'Enable';
            }
        });
    });

    $('form').on('submit', e => {
        e.preventDefault();
        $('#test-result').html(
            $(e.target).serialize().replace(/[^=]+=/, '').split(/&[^=]+=/).join('<br>')
        );
    });

});