$(function()
{
  var $programsList = $('#programsList');
  var $reloadPassword = $('#reloadPassword');
  var $reloadPrograms = $('#reloadPrograms');

  $reloadPrograms.click(function()
  {
    $reloadPrograms.attr('disabled', true);

    var password = $reloadPassword.val();

    $reloadPassword.val('');

    $.ajax({
      type: 'post',
      url: '/programs;reload',
      data: {
        password: password
      },
      success: function(programs)
      {
        $programsList.fadeOut(function()
        {
          $programsList.empty();

          programs.forEach(function(program, i)
          {
            var html = '<tr>'
              + '<td>' + (i + 1) + '</td>'
              + '<td>' + program.nc + '</td>'
              + '<td>' + program.label + '</td>'
              + '<td>' + program.aoc + '</td>';

            $programsList.append(html);
          });

          $programsList.fadeIn();
        });
      },
      complete: function()
      {
        $reloadPrograms.attr('disabled', false);
      }
    })
  });
});
