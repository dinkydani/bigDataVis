// (function(){
	$.ajax({
		type: "GET",
		url: "/getAll",
		contentType: "application/json; charset=utf-8",
		success: function(data){
			$("#rawData").text(JSON.stringify(data));
		},
		error: function(error){
			//$("#rawData").append(data);
		}
	});
// })();