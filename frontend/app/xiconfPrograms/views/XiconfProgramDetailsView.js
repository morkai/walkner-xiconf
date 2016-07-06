// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

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
