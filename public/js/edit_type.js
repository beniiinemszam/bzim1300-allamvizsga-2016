function getInformation(){
	var select = document.getElementById('edittype');
	var type = select.options[select.selectedIndex].value;
	
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

        document.getElementById('number').value 		= myArr.number;
        document.getElementById('description').value 	= myArr.descr;
      }
    };

    xhttp.open("GET", "/type/"+type, true);
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
	var x = document.getElementById("editTypeForm");
	var select = document.getElementById('edittype');
	var type = select.options[select.selectedIndex].value;
	if(select.selectedIndex!=0){
	    var params = {};
	    for (var i = 0; i < x.length-2; i++) {
	    	params[x.elements[i].name] = x.elements[i].value;
	    }
	    
        sendRequest('/type/'+type, params, 'put');
	}
	else{
		alert("Select a type!");
	}
}

function deleteType(){
    var x = document.getElementById("editTypeForm");
    var select = document.getElementById('edittype');
    var type = select.options[select.selectedIndex].value;
    if(select.selectedIndex!=0){
        var params = {};
        for (var i = 0; i < x.length-2; i++) {
            params[x.elements[i].name] = x.elements[i].value;
        }
        
        sendRequest('/type/'+type, params, 'delete');
    }
    else{
        alert("Select a type!");
    }
}