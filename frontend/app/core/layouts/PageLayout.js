// Part of <https://miracle.systems/p/walkner-xiconf> licensed under <CC BY-NC-SA 4.0>

define([
  'underscore',
  'jquery',
  'app/user',
  '../View',
  'app/core/templates/pageLayout'
], function(
  _,
  $,
  user,
  View,
  pageLayoutTemplate
) {
  'use strict';

  var IS_EMBEDDED = true;// window.parent !== window;

  var PageLayout = View.extend({

    pageContainerSelector: '.bd',

    template: pageLayoutTemplate

  });

  PageLayout.prototype.initialize = function()
  {
    this.model = {
      id: null,
      actions: [],
      breadcrumbs: [],
      title: null
    };

    this.actionTimer = {
      action: null,
      time: null
    };

    /**
     * @private
     * @type {jQuery|null}
     */
    this.$header = null;

    /**
     * @private
     * @type {jQuery|null}
     */
    this.$breadcrumbs = null;

    /**
     * @private
     * @type {jQuery|null}
     */
    this.$actions = null;

    if (IS_EMBEDDED)
    {
      $(window).on('contextmenu.' + this.idPrefix, function(e) { e.preventDefault(); });
    }
  };

  PageLayout.prototype.destroy = function()
  {
    $(window).off('.' + this.idPrefix);

    if (this.el.ownerDocument)
    {
      this.el.ownerDocument.body.classList.remove('page');
    }

    this.$breadcrumbs = null;
    this.$actions = null;
  };

  PageLayout.prototype.serialize = function()
  {
    return _.extend(View.prototype.serialize.call(this), {
      version: this.options.version
    });
  };

  PageLayout.prototype.afterRender = function()
  {
    if (this.el.ownerDocument)
    {
      this.el.ownerDocument.body.classList.add('page');
    }

    this.$header = this.$('.page-header').first();
    this.$breadcrumbs = this.$('.page-breadcrumbs').first();
    this.$actions = this.$('.page-actions').first();

    this.changeTitle();
    this.renderBreadcrumbs();
    this.renderActions();

    if (this.model.id !== null)
    {
      this.setId(this.model.id);
    }
  };

  PageLayout.prototype.reset = function()
  {
    this.setId(null);

    this.model.title = null;

    if (this.$header)
    {
      this.$header.hide();
    }

    if (this.$breadcrumbs)
    {
      this.model.breadcrumbs = [];

      this.$breadcrumbs.empty();
    }

    if (this.$actions)
    {
      this.model.actions = [];

      this.$actions.empty();
    }

    this.removeView(this.pageContainerSelector);
  };

  PageLayout.prototype.setUpPage = function(page)
  {
    if (page.pageId)
    {
      this.setId(page.pageId);
    }

    if (page.breadcrumbs)
    {
      this.setBreadcrumbs(page.breadcrumbs, page);
    }
    else if (page.title)
    {
      this.setTitle(page.title, page);
    }
    else
    {
      this.changeTitle();
    }

    if (page.actions)
    {
      this.setActions(page.actions, page);
    }
  };

  /**
   * @param {string} id
   * @returns {PageLayout}
   */
  PageLayout.prototype.setId = function(id)
  {
    if (this.isRendered())
    {
      this.$el.attr('data-id', id);
    }

    this.model.id = id;

    return this;
  };

  PageLayout.prototype.setBreadcrumbs = function(breadcrumbs, context)
  {
    if (breadcrumbs == null)
    {
      return this;
    }

    if (typeof breadcrumbs === 'function')
    {
      breadcrumbs = breadcrumbs.call(context, this);
    }

    if (!Array.isArray(breadcrumbs))
    {
      breadcrumbs = [breadcrumbs];
    }

    this.model.breadcrumbs = breadcrumbs.map(function(breadcrumb)
    {
      var breadcrumbType = typeof breadcrumb;

      if (breadcrumbType === 'string' || breadcrumbType === 'function')
      {
        breadcrumb = {label: breadcrumb, href: null};
      }

      if (typeof breadcrumb.href === 'string' && breadcrumb.href[0] !== '#')
      {
        breadcrumb.href = '#' + breadcrumb.href;
      }

      return breadcrumb;
    });

    if (this.$breadcrumbs)
    {
      this.renderBreadcrumbs();
    }

    this.changeTitle();

    return this;
  };

  PageLayout.prototype.setTitle = function(title, context)
  {
    if (title == null)
    {
      return this;
    }

    if (typeof title === 'function')
    {
      title = title.call(context, this);
    }

    if (!Array.isArray(title))
    {
      title = [title];
    }

    this.model.title = title;

    this.changeTitle();

    return this;
  };

  PageLayout.prototype.setActions = function(actions, context)
  {
    if (actions == null)
    {
      return this;
    }

    if (typeof actions === 'function')
    {
      actions = actions.call(context, this);
    }

    if (!actions)
    {
      return this;
    }

    if (!Array.isArray(actions))
    {
      actions = [actions];
    }

    this.model.actions = actions.map(this.prepareAction.bind(this));

    if (this.$actions)
    {
      this.renderActions();
    }

    return this;
  };

  PageLayout.prototype.prepareAction = function(action)
  {
    if (action.prepared)
    {
      return action;
    }

    if (typeof action.href === 'string')
    {
      var firstChar = action.href.charAt(0);

      if (firstChar !== '#' && firstChar !== '/')
      {
        action.href = '#' + action.href;
      }
    }
    else
    {
      action.href = null;
    }

    if (typeof action.icon === 'string')
    {
      action.icon = 'fa-' + action.icon.split(' ').join(' fa-');
    }

    if (typeof action.className !== 'string')
    {
      action.className = '';
    }

    action.className = 'btn btn-' + (action.type || 'default')
      + ' ' + action.className;

    action.prepared = true;

    return action;
  };

  /**
   * @private
   */
  PageLayout.prototype.renderBreadcrumbs = function()
  {
    var breadcrumbs = this.model.breadcrumbs;
    var html = '';

    for (var i = 0, l = breadcrumbs.length; i < l; ++i)
    {
      var breadcrumb = breadcrumbs[i];

      html += '<li>';

      if (i === l - 1 || !breadcrumb.href)
      {
        html += breadcrumb.label;
      }
      else
      {
        html += '<a href="' + breadcrumb.href + '">'
          + breadcrumb.label + '</a>';
      }
    }

    this.$breadcrumbs.html(html);
    this.$header.show();
  };

  /**
   * @private
   */
  PageLayout.prototype.renderActions = function()
  {
    var actions = this.model.actions;
    var callbacks = {};
    var afterRender = {};
    var html = '';

    for (var i = 0, l = actions.length; i < l; ++i)
    {
      var action = actions[i];

      if (action.privileges)
      {
        if (_.isFunction(action.privileges))
        {
          if (!action.privileges())
          {
            continue;
          }
        }
        else if (!user.isAllowedTo(action.privileges))
        {
          continue;
        }
      }

      if (typeof action.callback === 'function')
      {
        callbacks[i] = action.callback.bind(this);
      }

      if (typeof action.afterRender === 'function')
      {
        afterRender[i] = action.afterRender.bind(this);
      }

      html += '<li data-index="' + i + '">';

      if (typeof action.template === 'function')
      {
        html += action.template(action);
      }
      else
      {
        if (action.href === null)
        {
          html += '<button class="' + action.className + '">';
        }
        else
        {
          html += '<a class="' + action.className + '" href="' + action.href + '">';
        }

        if (typeof action.icon === 'string')
        {
          html += '<i class="fa ' + action.icon + '"></i>';
        }

        html += '<span>' + action.label + '</span>' + (action.href ? '</a>' : '</button>');
      }
    }

    this.$actions.html(html);

    var $actions = this.$actions.find('li');

    Object.keys(callbacks).forEach(function(i)
    {
      $actions.filter('li[data-index="' + i + '"]').click(actions[i].callback);
    });

    Object.keys(afterRender).forEach(function(i)
    {
      afterRender[i]($actions.filter('li[data-index="' + i + '"]'), actions[i]);
    });

    this.$header.show();
  };

  /**
   * @private
   */
  PageLayout.prototype.changeTitle = function()
  {
    if (this.isRendered())
    {
      var newTitle = Array.isArray(this.model.title)
        ? [].concat(this.model.title)
        : _.pluck(this.model.breadcrumbs, 'label');

      this.broker.publish('page.titleChanged', newTitle);
    }
  };

  PageLayout.prototype.startActionTimer = function(action, e)
  {
    this.actionTimer.action = action;
    this.actionTimer.time = Date.now();

    if (e)
    {
      e.preventDefault();
    }
  };

  PageLayout.prototype.stopActionTimer = function(action)
  {
    if (this.actionTimer.action !== action)
    {
      return;
    }

    var long = (Date.now() - this.actionTimer.time) > 3000;

    if (action === 'switchApps')
    {
      if (long)
      {
        window.parent.postMessage({type: 'config'}, '*');
      }
      else
      {
        window.parent.postMessage({type: 'switch', app: 'xiconf'}, '*');
      }
    }
    else if (action === 'reboot')
    {
      if (long)
      {
        window.parent.postMessage({type: 'reboot'}, '*');
      }
      else
      {
        window.parent.postMessage({type: 'refresh'}, '*');
      }
    }
    else if (long && action === 'shutdown')
    {
      window.parent.postMessage({type: 'shutdown'}, '*');
    }

    this.actionTimer.action = null;
    this.actionTimer.time = null;
  };

  return PageLayout;
});
