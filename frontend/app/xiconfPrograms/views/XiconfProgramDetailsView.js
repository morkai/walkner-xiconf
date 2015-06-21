// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'app/core/views/DetailsView',
  'app/xiconfPrograms/templates/details'
], function(
  DetailsView,
  detailsTemplate
) {
  'use strict';

  return DetailsView.extend({

    template: detailsTemplate,

    toggleSteps: function()
    {
      if (this.el.querySelector('.xiconfPrograms-stepPanel').classList.contains('is-collapsed'))
      {
        this.expandSteps();
      }
      else
      {
        this.collapseSteps();
      }
    },

    expandSteps: function()
    {
      this.$('.xiconfPrograms-stepPanel').removeClass('is-collapsed');
    },

    collapseSteps: function()
    {
      this.$('.xiconfPrograms-stepPanel').addClass('is-collapsed');
    }

  });
});
