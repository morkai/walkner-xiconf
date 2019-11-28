// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

define([
  'underscore',
  'js2form',
  'app/i18n',
  'app/time',
  'app/core/View',
  'app/history/templates/filter'
], function(
  _,
  js2form,
  t,
  time,
  View,
  filterTemplate
) {
  'use strict';

  return View.extend({

    template: filterTemplate,

    events: {
      'submit .filter-form': function(e)
      {
        e.preventDefault();

        this.changeFilter();
      }
    },

    afterRender: function()
    {
      var formData = this.serializeRqlQuery();

      js2form(this.el.querySelector('.filter-form'), formData);

      if (formData.result.length === 1)
      {
        this.$('.history-filter-' + formData.result[0]).addClass('active');
      }
      else
      {
        this.$('.history-filter-result > label').addClass('active');
      }
    },

    serializeRqlQuery: function()
    {
      var datetimeFormat = this.$id('from').prop('type') === 'datetime-local'
        ? 'YYYY-MM-DDTHH:mm:ss'
        : 'YYYY-MM-DD HH:mm';
      var rqlQuery = this.model.rqlQuery;
      var formData = {
        from: '',
        to: '',
        serviceTag: '',
        no: '',
        nc12: '',
        result: ['success', 'failure'],
        limit: rqlQuery.limit < 5 ? 5 : (rqlQuery.limit > 100 ? 100 : rqlQuery.limit)
      };

      rqlQuery.selector.args.forEach(function(term)
      {
        var property = term.args[0];

        switch (property)
        {
          case 'startedAt':
            formData[term.name === 'ge' ? 'from' : 'to'] = time.format(term.args[1], datetimeFormat);
            break;

          case 'serviceTag':
          case 'no':
          case 'nc12':
            formData[property] = term.args[1];
            break;

          case 'result':
            if (term.args[1] === 'success' || term.args[1] === 'failure')
            {
              formData.result = [term.args[1]];
            }
            break;
        }
      });

      return formData;
    },

    changeFilter: function()
    {
      var rqlQuery = this.model.rqlQuery;
      var selector = [];
      var fromMoment = time.getMoment(this.$id('from').val());
      var toMoment = time.getMoment(this.$id('to').val());
      var serviceTag = this.$id('serviceTag').val().trim().toUpperCase();
      var no = this.$id('no').val().trim();
      var nc12 = this.$id('nc12').val().trim();
      var $result = this.$('input[name="result[]"]:checked');

      if (/^P[0-9]+$/.test(serviceTag))
      {
        selector.push({name: 'eq', args: ['serviceTag', serviceTag]});
      }

      if (/^[0-9]{9}$/.test(no))
      {
        selector.push({name: 'eq', args: ['no', no]});
      }

      if (/^[0-9]{12}$/.test(nc12))
      {
        selector.push({name: 'eq', args: ['nc12', nc12]});
      }

      if (fromMoment.isValid())
      {
        selector.push({name: 'ge', args: ['startedAt', fromMoment.valueOf()]});
      }

      if (toMoment.isValid())
      {
        selector.push({name: 'lt', args: ['startedAt', toMoment.valueOf()]});
      }

      if ($result.length === 1)
      {
        selector.push({name: 'eq', args: ['result', $result.val()]});
      }

      rqlQuery.selector = {name: 'and', args: selector};
      rqlQuery.limit = parseInt(this.$id('limit').val(), 10) || 20;
      rqlQuery.skip = 0;

      this.trigger('filterChanged', rqlQuery);
    }

  });
});
