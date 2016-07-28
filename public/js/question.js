$("button").click(function() {
    post(this.id);
});

function post(param) {
    var method  = "post";
    var path    = window.location.pathname;

    var form = document.createElement("form");
    form.setAttribute("method", method);
    form.setAttribute("action", path);

    var field = document.createElement("input");
    field.setAttribute("type", "hidden");
    field.setAttribute("name", "ansID");
    field.setAttribute("value", param);

    form.appendChild(field);

    document.body.appendChild(form);
    form.submit();
}

/*function newQuestion(id){
    var path = window.location.pathname;
    $.ajax({
      type: 'POST',
      url: '/quiz/'+path,
      data: id
    })
    .done(function (data) {
      // clear form
      $('input[name=name]').val('');
      $('input[name=age]').val('')


      alert(data);
    });
}*/