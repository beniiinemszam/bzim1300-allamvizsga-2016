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

function login(){
    var x = document.getElementById("loginForm");
    var params = {};

    for (var i = 0; i < x.length; i++) {
        if(x.elements[i].name==="password"){
            params[x.elements[i].name] = window.btoa(x.elements[i].value);
        }else{
            params[x.elements[i].name] = x.elements[i].value;   
        }
    }
    
    post('/admin', params, 'post');
}