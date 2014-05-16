(function($) {
  $.fn.flipster = function(options) {
    var isMethodCall = typeof options === 'string' ? true : false;

    if (isMethodCall) {
      var method = options;
      var args = Array.prototype.slice.call(arguments, 1);
    } else {
      var defaults = {
        itemContainer:			'ul',
        itemSelector:				'li',
        style:							'carousel',
        start:							'center',
        onItemSwitch:				function(){},
        disableRotation: false
      };
      var settings = $.extend({}, defaults, options);
    }

    return this.each(function(){

      var _flipster = $(this);
      var methods;

      if (isMethodCall) {
        methods = _flipster.data('methods');
        return methods[method].apply(this, args);
      }

      var	_flipItemsOuter;
      var	_flipItems;
      var	_current = 0;

      // public methods
      methods = {
        jump: jump,
        resize: resize,
        center: center
      };
      _flipster.data('methods', methods);

      function resize(size) {
        _flipItemsOuter.height(size || settings.size || calculateBiggestFlipItemHeight());
        _flipster.css("height","auto");
        _flipItemsOuter.width(size || settings.size || _flipItems.width());
      }

      function calculateBiggestFlipItemHeight() {
        var biggestHeight = 0;
        _flipItems.each(function() {
          if ($(this).height() > biggestHeight) biggestHeight = $(this).height();
        });
        return biggestHeight;
      }

      function center(size) {
        var currentItem = $(_flipItems[_current]).addClass("flip-current");

        _flipItems.removeClass("flip-prev flip-next flip-current flip-past flip-future no-transition");

        _flipItems.addClass("flip-hidden");

        var nextItem = $(_flipItems[_current+1]),
          futureItem = $(_flipItems[_current+2]),
          prevItem = $(_flipItems[_current-1]),
          pastItem = $(_flipItems[_current-2]);

        if ( _current === 0 ) {
          prevItem = _flipItems.last();
          pastItem = prevItem.prev();
        }
        else if ( _current === 1 ) {
          pastItem = _flipItems.last();
        }
        else if ( _current === _flipItems.length-2 ) {
          futureItem = _flipItems.first();
        }
        else if ( _current === _flipItems.length-1 ) {
          nextItem = _flipItems.first();
          futureItem = $(_flipItems[1]);
        }

        futureItem.removeClass("flip-hidden").addClass("flip-future");
        pastItem.removeClass("flip-hidden").addClass("flip-past");
        nextItem.removeClass("flip-hidden").addClass("flip-next");
        prevItem.removeClass("flip-hidden").addClass("flip-prev");

        currentItem
          .addClass("flip-current")
          .removeClass("flip-prev flip-next flip-past flip-future flip-hidden");

        resize(size);

        settings.onItemSwitch.call(this);
      }

      function jump(to) {
        if ( _flipItems.length > 1 ) {
          if ( to === "left" ) {
            if ( _current > 0 ) { _current--; }
            else { _current = _flipItems.length-1; }
          }
          else if ( to === "right" ) {
            if ( _current < _flipItems.length-1 ) { _current++; }
            else { _current = 0; }
          } else if ( typeof to === 'number' ) {
            _current = to;
          } else if (typeof to === 'string' ) {
            _current = -1;
            for (var i = 0, l = _flipItems.length; i < l; ++i) {
              if (_flipItems[i].dataset.itemId === to) {
                _current = i;
                break;
              }
            }
          } else {
            // if object is sent, get its index
            _current = _flipItems.index(to);
          }
          center();
        }
      }

      function init() {
        _flipster.addClass("flipster flipster-active flipster-"+settings.style);
        if (settings.disableRotation)
          _flipster.addClass('no-rotate');
        _flipItemsOuter = _flipster.find(settings.itemContainer).addClass("flip-items");
        _flipItems = _flipItemsOuter.find(settings.itemSelector).addClass("flip-item").wrapInner("<div class='flip-content' />");

        // Set the starting item
        if ( settings.start && _flipItems.length > 1 ) {
          // Find the middle item if start = center
          if ( settings.start === 'center' ) {
            if (!_flipItems.length % 2) {
              _current = _flipItems.length/2 + 1;
            }
            else {
              _current = Math.floor(_flipItems.length/2);
            }
          } else {
            _current = settings.start;
          }
        }

        center(null);
      }

      if ( !_flipster.hasClass("flipster-active") ) { init(); }
    });
  };
})( jQuery );
