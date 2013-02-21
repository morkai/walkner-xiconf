$(function()
{
  var helpContainerEl = $('#helpContainer');
  var currentPage = 1;

  function buildToc(tocEl, sections, level)
  {
    sections.each(function()
    {
      var sectionEl = $(this);

      if (sectionEl.hasClass('todo'))
      {
        return;
      }

      var sectionId = sectionEl.attr('id');
      var sectionName = sectionEl.find('h1').first().contents()[0].nodeValue;

      if (sectionEl.hasClass('pbb'))
      {
        var sectionPage = parseInt(sectionEl.attr('data-page'));

        if (isNaN(sectionPage))
        {
          currentPage += 1;
        }
        else
        {
          currentPage = sectionPage;
        }
      }
      else
      {
        var pbbEl = sectionEl.find('.pbb').first();

        if (pbbEl.closest('section')[0] === sectionEl[0])
        {
          currentPage += 1;
        }
      }

      var sectionLiEl = $('<li><a href="#' + sectionId + '"><span class="sectionName">' + sectionName + '</span> <span class="pageNumber">' + currentPage + '</span></a></li>');

      tocEl.append(sectionLiEl);

      var subsections = sectionEl.children('section');

      if (subsections.length)
      {
        var subsectionsOlEl = $('<ol></ol>').appendTo(sectionLiEl);

        buildToc(subsectionsOlEl, subsections, level + 1);
      }
    });
  }

  buildToc($('#toc ol').first().empty(), helpContainerEl.children('section'), 0);
});
