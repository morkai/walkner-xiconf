// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under CC BY-NC-SA 4.0 <http://creativecommons.org/licenses/by-nc-sa/4.0/>.
// Part of the walkner-xiconf project <http://lukasz.walukiewicz.eu/p/walkner-xiconf>

define([
  'underscore',
  'highlight',
  'app/i18n',
  'app/highcharts',
  'app/core/View',
  'app/dashboard/views/LedsView',
  'app/xiconfPrograms/views/XiconfProgramStepsView',
  'app/history/templates/details'
], function(
  _,
  hljs,
  t,
  Highcharts,
  View,
  LedsView,
  XiconfProgramStepsView,
  detailsTemplate
) {
  'use strict';

  return View.extend({

    template: detailsTemplate,

    events: {
      'click .history-tabs a': function(e)
      {
        e.preventDefault();

        var tab = this.$(e.target).tab('show').parent().attr('data-tab');

        this.broker.publish('router.navigate', {
          url: this.model.genClientUrl() + '?tab=' + tab,
          trigger: false,
          replace: true
        });
      },
      'shown.bs.tab': function(e)
      {
        var tabEl = e.target.parentNode;
        var tab = tabEl.dataset.tab;

        if (tab === 'program')
        {
          this.renderMetrics();

          return;
        }

        if (tabEl.dataset.highlight !== undefined)
        {
          this.highlight(tab);
        }
      }
    },

    initialize: function()
    {
      this.highlighted = {
        feature: false,
        gprsInputFile: false,
        gprsOutputFile: false
      };
      this.metricsChart = null;

      this.setView('.history-details-leds', new LedsView({model: this.model}));
      this.setView('.history-details-steps', new XiconfProgramStepsView({model: this.model}));
    },

    destroy: function()
    {
      if (this.metricsChart !== null)
      {
        this.metricsChart.destroy();
        this.metricsChart = null;
      }
    },

    serialize: function()
    {
      return {
        idPrefix: this.idPrefix,
        model: _.defaults(this.model.toJSON(), {
          programName: this.model.getProgramName()
        }),
        log: this.model.getDecoratedLog()
      };
    },

    beforeRender: function()
    {
      this.highlighted = {
        feature: false,
        gprsInputFile: false,
        gprsOutputFile: false
      };

      if (this.metricsChart !== null)
      {
        this.metricsChart.destroy();
        this.metricsChart = null;
      }

      this.stopListening(this.model, 'change', this.render);
    },

    afterRender: function()
    {
      this.listenTo(this.model, 'change', this.render);

      this.activateTab(this.options.tab || 'log');
    },

    activateTab: function(tab)
    {
      this.$('.nav-tabs > li[data-tab="' + tab + '"] > a').tab('show');
    },

    highlight: function(what)
    {
      if (this.highlighted[what])
      {
        return;
      }

      if (this.model.get(what))
      {
        hljs.highlightBlock(this.$id(what).find('code')[0]);
      }

      this.highlighted[what] = true;
    },

    renderMetrics: function()
    {
      if (this.metricsChart !== null)
      {
        this.metricsChart.reflow();

        return;
      }

      var metrics = this.model.get('metrics');

      if (!metrics)
      {
        return;
      }

      var chartData = {
        uSet: metrics.uSet,
        uGet: metrics.uGet,
        i: metrics.i,
        r: metrics.uGet.map(function(U, i) { return metrics.i[i] ? U / metrics.i[i] : 0; }),
        p: metrics.uGet.map(function(U, i) { return metrics.i[i] ? U * metrics.i[i] : 0; })
      };

      this.metricsChart = new Highcharts.Chart({
        chart: {
          renderTo: this.el.querySelector('.history-details-metrics'),
          zoomType: 'x',
          height: 400
        },
        title: {
          text: t('history', 'metrics:title')
        },
        noData: {},
        xAxis: {
          type: 'category'
        },
        yAxis: [
          {
            title: {
              text: t('history', 'metrics:u')
            },
            tickAmount: 6
          },
          {
            title: {
              text: t('history', 'metrics:i')
            },
            tickAmount: 6
          },
          {
            title: {
              text: t('history', 'metrics:r')
            },
            opposite: true,
            tickAmount: 6
          },
          {
            title: {
              text: t('history', 'metrics:p')
            },
            opposite: true,
            tickAmount: 6
          }
        ],
        tooltip: {
          shared: true,
          valueDecimals: 2
        },
        legend: {
          enabled: true
        },
        plotOptions: {
          line: {
            lineWidth: 1.5,
            pointInterval: 1,
            pointStart: 0,
            marker: {
              radius: 0,
              symbol: 'circle',
              lineWidth: 0,
              states: {
                hover: {
                  radius: 4
                }
              }
            }
          }
        },
        series: [
          {
            id: 'uSet',
            name: t.bound('history', 'metrics:uSet'),
            type: 'line',
            yAxis: 0,
            data: chartData.uSet,
            min: 0,
            tooltip: {
              valueSuffix: 'V'
            },
            zIndex: 1
          },
          {
            id: 'uGet',
            name: t.bound('history', 'metrics:uGet'),
            type: 'line',
            yAxis: 0,
            data: chartData.uGet,
            min: 0,
            tooltip: {
              valueSuffix: 'V'
            },
            zIndex: 2
          },
          {
            id: 'i',
            name: t.bound('history', 'metrics:i'),
            type: 'line',
            yAxis: 1,
            data: chartData.i,
            min: 0,
            tooltip: {
              valueSuffix: 'A'
            },
            zIndex: 3
          },
          {
            id: 'r',
            name: t.bound('history', 'metrics:r'),
            type: 'line',
            yAxis: 2,
            data: chartData.r,
            min: 0,
            tooltip: {
              valueSuffix: 'Ω'
            },
            zIndex: 4
          },
          {
            id: 'p',
            name: t.bound('history', 'metrics:p'),
            type: 'line',
            yAxis: 3,
            data: chartData.p,
            min: 0,
            tooltip: {
              valueSuffix: 'W'
            },
            zIndex: 5
          }
        ]
      });
    }

  });
});
