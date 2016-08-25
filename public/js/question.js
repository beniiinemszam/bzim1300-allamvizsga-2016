var finished = false;

window.onload = function() {
  var xhttp;
  if(window.XMLHttpRequest){
      xhttp = new XMLHttpRequest();
  }
  else{
      xhttp = new ActiveXObject("Microsoft.XMLHTTP");
  }
  xhttp.onreadystatechange = function(){
    if (xhttp.readyState == 4 && xhttp.status == 200){
      var myArr = JSON.parse(xhttp.responseText);

      if(myArr.qnumber == 1){
        setFinished();
      }
    }
  };

  xhttp.open("GET", '/getquestionnumber/' + document.getElementById('bt1').value, true);
  xhttp.send();
};

$("button").click(function() {
    if(!finished){
      newQuestion(this.value);
    }
    else{
      post(this.value);
    }
});

function setFinished(){
  finished = true;
}

function post(param) {
    var method  = "post";
    var path    = window.location.pathname;

    var form = document.createElement("form");
    form.setAttribute("method", method);
    form.setAttribute("action", path);

    var field = document.createElement("input");
    field.setAttribute("type", "hidden");
    field.setAttribute("name", "aid");
    field.setAttribute("value", param);

    form.appendChild(field);

    document.body.appendChild(form);
    form.submit();
}

function newQuestion(id){
    var path = window.location.pathname;
    var xhttp;
    if(window.XMLHttpRequest){
        xhttp = new XMLHttpRequest();
    }
    else{
        xhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }
    xhttp.onreadystatechange = function(){
      if (xhttp.readyState == 4 && xhttp.status == 200){
        var myArr = JSON.parse(xhttp.responseText);

        var cn = parseInt(myArr.qn) + 1

        document.getElementById('question-number').innerText  = 'question: ' + myArr.qtn + ' / ' + cn;
        document.getElementById('question-correct').innerText = 'correct: ' + myArr.cn;
        document.getElementById('question').innerText = myArr.question;
        document.getElementById('bt1').innerText      = myArr.ans1;
        document.getElementById('bt2').innerText      = myArr.ans2;
        document.getElementById('bt3').innerText      = myArr.ans3;
        document.getElementById('bt4').innerText      = myArr.ans4;
        document.getElementById('bt1').value = myArr.aid1;
        document.getElementById('bt2').value = myArr.aid2;
        document.getElementById('bt3').value = myArr.aid3;
        document.getElementById('bt4').value = myArr.aid4;



        if(myArr.qtn == myArr.qn + 1){
          setFinished();
        }
      }
    };

    xhttp.open("POST", path, true);
    xhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhttp.send(JSON.stringify({aid: id}));
}