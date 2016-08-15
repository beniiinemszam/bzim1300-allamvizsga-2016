function getInformation(){
	var select = document.getElementById('editquestion');
    var ids = document.getElementById('questionids');
	var id = ids.options[select.selectedIndex-1].value;
	
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

        document.getElementById('canswer').value 	= myArr.correct;
        document.getElementById('wanswer1').value 	= myArr.wrong1;
        document.getElementById('wanswer2').value   = myArr.wrong2;
        document.getElementById('wanswer3').value   = myArr.wrong3;
        document.getElementById('wanswer3').value   = myArr.wrong3;
        document.getElementById('edittype').value   = myArr.type;

        document.getElementById('squestion').value  = myArr.id;
      }
    };

    xhttp.open("GET", "/question/"+id, true);
    xhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhttp.send();
}

function post(path, params, method) {
    var form = document.createElement("form");
    form.setAttribute("method", method);
    form.setAttribute("action", path);

    for(var key in params) {
        if(params.hasOwnProperty(key)) {
            var field = document.createElement("input");
            field.setAttribute("type", "hidden");
            field.setAttribute("name", key);
            field.setAttribute("value", params[key]);

            form.appendChild(field);
         }
    }

    document.body.appendChild(form);
    form.submit();
}

function sendRequest(path, params, method){
    $.ajax({
        url: path,
        type: method,
        contentType: "application/json",
        data: JSON.stringify(params),
        success: function(result) {
            window.location.href = '/admin';
        }
    });
}

function saveChanges(){
	var x = document.getElementById("editQuestionForm");
	var selecttype         = document.getElementById('edittype');
    var selectquestion     = document.getElementById('editquestion');
	var type               = selecttype.options[selecttype.selectedIndex].value;
    var question           = selectquestion.options[selectquestion.selectedIndex].value;
	if(selecttype.selectedIndex!=0){
	    var params = {};
	    for (var i = 0; i < x.length-2; i++) {
	    	params[x.elements[i].name] = x.elements[i].value;
	    }

        params["edittype"] = type;
        params["editquestion"] = question;
	    
        sendRequest('/question/', params, 'put');
	}
	else{
		alert("Select a type!");
	}
}

function deleteType(){
    var id = document.getElementById("squestion").value;
    var select = document.getElementById('edittype');
    if(select.selectedIndex!=0){       
        sendRequest('/question/'+id, {}, 'delete');
    }
    else{
        alert("Select a type!");
    }
}