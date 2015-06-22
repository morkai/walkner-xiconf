// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'underscore',
  'jquery',
  'app/i18n',
  'app/viewport',
  'app/core/View',
  'app/dashboard/templates/programPicker'
], function(
  _,
  $,
  t,
  viewport,
  View,
  template
) {
  'use strict';

  return View.extend({

    dialogClassName: 'dashboard-programPickerDialog',

    template: template,

    events: {
      'click .list-group-item': function(e)
      {
        this.socket.emit('programmer.setProgram', e.target.dataset.id, function(err)
        {
          if (err)
          {
            viewport.msg.show({
              type: 'error',
              time: 2500,
              text: t('dashboard', 'program:picker:failure')
            });
          }
          else
          {
            viewport.msg.show({
              type: 'success',
              time: 1500,
              text: t('dashboard', 'program:picker:success')
            });
          }
        });

        return false;
      },
      'input #-filter': function(e)
      {
        var filter = e.target.value.trim().toLowerCase();

        _.forEach(this.$els.list[0].children, function(programEl)
        {
          programEl.style.display = filter === '' || programEl.innerText.toLowerCase().indexOf(filter) !== -1
            ? 'block'
            : 'none';
        });
      }
    },

    initialize: function()
    {
      this.$els = null;
      this.onResize = _.debounce(this.resize.bind(this), 33);

      this.listenTo(this.collection, 'reset', this.render);

      $(window).on('resize.programPickerView', this.onResize);

      this.promised(this.collection.fetch({reset: true}));
    },

    destroy: function()
    {
      $(window).off('.programPickerView');

      this.$els = null;
    },

    serialize: function()
    {
      return {
        idPrefix: this.idPrefix,
        programs: this.collection.sortNaturally().filterByProdLine(this.options.prodLineId)
      };
    },

    afterRender: function()
    {
      this.$els = {
        header: this.$el.closest('.modal-content').find('.modal-header'),
        filter: this.$id('filter'),
        list: this.$id('list')
      };
    },

    resize: function()
    {
      if (this.$els)
      {
        var height = window.innerHeight - this.$els.header.outerHeight() - this.$els.filter.outerHeight();

        this.$els.list.css('max-height', height + 'px');
      }
    },

    onDialogShown: function()
    {
      this.resize();

      this.$id('filter').focus();
    }

  });
});
